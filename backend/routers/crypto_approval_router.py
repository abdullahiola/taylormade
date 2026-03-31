"""
Crypto approval router — handles crypto payment approval flow.
Customer submits payment, admin approves via Telegram bot.
Frontend polls for approval status.
"""
import json
import os
import httpx
from datetime import datetime
from threading import Lock
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

APPROVAL_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "crypto_approvals.json")
approval_lock = Lock()

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '')


def _load_approvals() -> dict:
    if os.path.exists(APPROVAL_FILE):
        try:
            with open(APPROVAL_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _save_approvals(approvals: dict):
    with open(APPROVAL_FILE, "w") as f:
        json.dump(approvals, f, indent=2)


def _send_with_approve_button(text: str, email: str) -> bool:
    """Send a Telegram message with an inline 'Approve' button."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        with httpx.Client(timeout=10.0) as client:
            r = client.post(url, json={
                "chat_id": TELEGRAM_CHAT_ID,
                "text": text,
                "parse_mode": "Markdown",
                "reply_markup": {
                    "inline_keyboard": [[
                        {
                            "text": "✅ Approve Payment",
                            "callback_data": f"approve_crypto:{email}"
                        }
                    ]]
                }
            })
            return r.status_code == 200
    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}")
        return False


class CryptoSubmission(BaseModel):
    email: str
    coin: str
    amount: str
    total_usd: float


@router.post("/submit")
def submit_crypto(body: CryptoSubmission):
    """Customer clicked 'I've Paid' — notify Telegram with approve button."""
    with approval_lock:
        approvals = _load_approvals()
        approvals[body.email] = {
            "approved": False,
            "coin": body.coin,
            "amount": body.amount,
            "total_usd": body.total_usd,
            "submitted_at": datetime.now().isoformat(),
        }
        _save_approvals(approvals)

    # Send Telegram notification with inline approve button
    msg = (
        f"🪙 *TaylorMade — Crypto Payment Submitted*\n"
        f"═════════════════════\n"
        f"📧 *Email:* {body.email}\n"
        f"💰 *Coin:* {body.coin}\n"
        f"📊 *Amount:* {body.amount} {body.coin}\n"
        f"💲 *USD Total:* ${body.total_usd:,.2f}\n"
        f"🕐 *Time:* {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f"═════════════════════"
    )
    _send_with_approve_button(msg, body.email)

    print(f"✓ Crypto payment submitted by: {body.email}")
    return {"ok": True}


@router.get("/status")
def check_status(email: str = ""):
    """Frontend polls this to check if payment has been approved."""
    if not email:
        return {"approved": False}

    with approval_lock:
        approvals = _load_approvals()
        approved = approvals.get(email, {}).get("approved", False)

    return {"approved": approved}


@router.post("/approve")
def approve_crypto(email: str = ""):
    """Called by Telegram bot to approve a crypto payment."""
    if not email:
        return {"error": "Email is required"}, 400

    with approval_lock:
        approvals = _load_approvals()
        if email in approvals:
            approvals[email]["approved"] = True
            approvals[email]["approved_at"] = datetime.now().isoformat()
            _save_approvals(approvals)
            print(f"✓ Crypto payment approved for: {email}")
            return {"ok": True, "message": f"Payment approved for {email}"}
        else:
            return {"error": f"No pending payment found for {email}"}, 404
