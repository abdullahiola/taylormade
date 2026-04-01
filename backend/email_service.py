import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")


def send_otp_email(to_email: str, user_name: str, otp_code: str) -> bool:
    """Send a 6-digit OTP verification email via Gmail SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Charley Hull Stores Verification Code"
        msg["From"] = f"Charley Hull Stores <{SMTP_EMAIL}>"
        msg["To"] = to_email

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }}
    .container {{ max-width: 560px; margin: 40px auto; background: white; }}
    .header {{ background: #1A1A1A; padding: 32px; text-align: center; }}
    .header h1 {{ color: white; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; }}
    .header span {{ color: #E8001C; }}
    .body {{ padding: 40px 32px; }}
    .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0A0A0A; }}
    .body p {{ color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }}
    .otp-box {{ background: #f5f5f5; border: 2px solid #E8001C; text-align: center; padding: 24px; margin: 24px 0; }}
    .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0A0A0A; font-family: monospace; }}
    .otp-note {{ font-size: 12px; color: #888; margin-top: 8px; }}
    .footer {{ background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 20px 32px; text-align: center; }}
    .footer p {{ color: #888; font-size: 12px; margin: 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Charley <span>Hull</span> Stores</h1>
    </div>
    <div class="body">
      <h2>Hi {user_name},</h2>
      <p>Welcome to Charley Hull Stores! Please verify your email address using the code below to complete your registration.</p>
      <div class="otp-box">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-note">This code expires in <strong>10 minutes</strong></div>
      </div>
      <p>If you did not create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Charley Hull Stores. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, user_name: str, otp_code: str) -> bool:
    """Send a 6-digit password reset OTP email via Gmail SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset — Charley Hull Stores"
        msg["From"] = f"Charley Hull Stores <{SMTP_EMAIL}>"
        msg["To"] = to_email

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }}
    .container {{ max-width: 560px; margin: 40px auto; background: white; }}
    .header {{ background: #1A1A1A; padding: 32px; text-align: center; }}
    .header h1 {{ color: white; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; }}
    .header span {{ color: #E8001C; }}
    .body {{ padding: 40px 32px; }}
    .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0A0A0A; }}
    .body p {{ color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }}
    .otp-box {{ background: #f5f5f5; border: 2px solid #E8001C; text-align: center; padding: 24px; margin: 24px 0; }}
    .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0A0A0A; font-family: monospace; }}
    .otp-note {{ font-size: 12px; color: #888; margin-top: 8px; }}
    .footer {{ background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 20px 32px; text-align: center; }}
    .footer p {{ color: #888; font-size: 12px; margin: 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Charley <span>Hull</span> Stores</h1>
    </div>
    <div class="body">
      <h2>Hi {user_name},</h2>
      <p>We received a request to reset your password. Use the code below to set a new password.</p>
      <div class="otp-box">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-note">This code expires in <strong>10 minutes</strong></div>
      </div>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 Charley Hull Stores. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send password reset to {to_email}: {e}")
        return False
