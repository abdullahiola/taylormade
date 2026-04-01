import random
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth import hash_password, verify_password, create_access_token, get_current_user_id
from database import get_db
from email_service import send_otp_email, send_password_reset_email
from models import User
from schemas import (
    SignupRequest,
    VerifyEmailRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserInfo,
    MessageResponse,
)
from telegram_service import send_login_alert, send_new_user_alert

router = APIRouter()


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


# ─── SIGNUP ────────────────────────────────────────────────────────────────────
@router.post("/signup", response_model=MessageResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    body.email = body.email.lower().strip()

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    existing = db.query(User).filter(User.email == body.email).first()

    otp = generate_otp()
    otp_expiry = datetime.utcnow() + timedelta(minutes=10)

    if existing:
        if existing.is_verified:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        # Resend OTP to unverified account
        existing.name = body.name.strip()
        existing.hashed_password = hash_password(body.password)
        existing.otp_code = otp
        existing.otp_expires_at = otp_expiry
        db.commit()
    else:
        user = User(
            id=str(uuid.uuid4()),
            name=body.name.strip(),
            email=body.email,
            hashed_password=hash_password(body.password),
            is_verified=False,
            otp_code=otp,
            otp_expires_at=otp_expiry,
        )
        db.add(user)
        db.commit()

    # Send OTP email (non-blocking failure)
    email_sent = send_otp_email(body.email, body.name.strip(), otp)
    if not email_sent:
        print(f"[WARN] OTP email failed, OTP for {body.email} is: {otp}")

    return {"message": f"Verification code sent to {body.email}. Please check your inbox."}


# ─── VERIFY EMAIL ──────────────────────────────────────────────────────────────
@router.post("/verify-email", response_model=TokenResponse)
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    body.email = body.email.lower().strip()

    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified. Please log in.")

    if not user.otp_code or user.otp_code != body.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired. Please sign up again to get a new code.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    # Notify on Telegram about new verified user
    send_new_user_alert(user.name, user.email)

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user=UserInfo(id=user.id, name=user.name, email=user.email, is_admin=user.is_admin),
    )


# ─── LOGIN ─────────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    body.email = body.email.lower().strip()

    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please check your inbox for the verification code.",
        )

    # Get real IP (works behind nginx/proxy)
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "")
    if client_ip:
        client_ip = client_ip.split(",")[0].strip()

    send_login_alert(user_name=user.name, email=user.email, ip=client_ip)

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user=UserInfo(id=user.id, name=user.name, email=user.email, is_admin=user.is_admin),
    )


# ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    body.email = body.email.lower().strip()

    user = db.query(User).filter(User.email == body.email, User.is_verified == True).first()
    if not user:
        # Don't reveal whether the email exists
        return {"message": "If an account with that email exists, a reset code has been sent."}

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    email_sent = send_password_reset_email(body.email, user.name, otp)
    if not email_sent:
        print(f"[WARN] Password reset email failed, OTP for {body.email} is: {otp}")

    return {"message": "If an account with that email exists, a reset code has been sent."}


# ─── RESET PASSWORD ───────────────────────────────────────────────────────────
@router.post("/reset-password", response_model=MessageResponse)
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    body.email = body.email.lower().strip()

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found.")

    if not user.otp_code or user.otp_code != body.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid reset code.")

    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

    user.hashed_password = hash_password(body.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.commit()

    return {"message": "Password reset successfully. You can now sign in with your new password."}


# ─── GET CURRENT USER ──────────────────────────────────────────────────────────
@router.get("/me", response_model=UserInfo)
def get_me(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return UserInfo(id=user.id, name=user.name, email=user.email, is_admin=user.is_admin)

