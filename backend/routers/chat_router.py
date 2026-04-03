"""
Chat router — live support chat API.
Messages from the web frontend are forwarded to Telegram.
Replies from admin web UI are pushed to customers via polling.
"""
import json
import os
import uuid
import httpx
from datetime import datetime
from threading import Lock
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from telegram_service import send_support_chat_alert

router = APIRouter()

# Use CHAT_DATA_DIR for persistent storage in Docker (/data volume),
# fall back to the app directory for local development
_DATA_DIR = os.environ.get("CHAT_DATA_DIR", os.path.dirname(os.path.dirname(__file__)))
CHAT_FILE = os.path.join(_DATA_DIR, "chat_sessions.json")
MEDIA_DIR = os.path.join(_DATA_DIR, "chat_media")
os.makedirs(MEDIA_DIR, exist_ok=True)
chat_lock = Lock()

TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID   = os.environ.get('TELEGRAM_CHAT_ID', '')


def _load_sessions() -> dict:
    if os.path.exists(CHAT_FILE):
        try:
            with open(CHAT_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}


def _save_sessions(sessions: dict):
    with open(CHAT_FILE, "w") as f:
        json.dump(sessions, f, indent=2)


def _notify_telegram(email: str, message: str, session_id: str):
    """Send a Telegram alert about a new customer message."""
    send_support_chat_alert(
        user_email=email,
        message=message,
        session_id=session_id,
    )


# ── Schemas ───────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    sessionId: str
    email: str = "guest"
    message: str


class ChatReply(BaseModel):
    sessionId: str
    message: str


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/send")
def send_message(body: ChatMessage):
    """Receive a chat message from the web UI and forward to Telegram."""
    now_iso = datetime.now().isoformat()
    msg_id  = f"user-{datetime.now().timestamp()}"

    with chat_lock:
        sessions = _load_sessions()

        if body.sessionId not in sessions:
            sessions[body.sessionId] = {
                "email": body.email,
                "created_at": now_iso,
                "messages": [],
                "pending_replies": [],
                "last_customer_message": now_iso,
                "unread_count": 0,
            }

        sessions[body.sessionId]["messages"].append({
            "id": msg_id,
            "sender": "user",
            "text": body.message,
            "timestamp": now_iso,
        })
        sessions[body.sessionId]["last_customer_message"] = now_iso
        sessions[body.sessionId]["unread_count"] = (
            sessions[body.sessionId].get("unread_count", 0) + 1
        )

        _save_sessions(sessions)

    # Forward to Telegram (non-blocking — errors don't affect the response)
    try:
        _notify_telegram(body.email, body.message, body.sessionId)
    except Exception as e:
        print(f"[TELEGRAM] Failed to notify: {e}")

    print(f"✓ Chat message from {body.email}: {body.message[:60]}")
    return {"ok": True, "id": msg_id}


@router.get("/messages")
def get_new_messages(sessionId: str = "", lastId: str = ""):
    """
    Poll for new BOT replies since `lastId`.
    Replies remain in `pending_replies` until confirmed, so they
    survive multiple polls (deduplication by id on client side).
    """
    if not sessionId:
        return {"messages": []}

    with chat_lock:
        sessions = _load_sessions()

        if sessionId not in sessions:
            return {"messages": []}

        pending = sessions[sessionId].get("pending_replies", [])

        if lastId:
            new_messages = [m for m in pending if m["id"] > lastId]
        else:
            new_messages = list(pending)

        # ── KEY FIX: do NOT delete from pending_replies here ──
        # The customer SupportChat component will deduplicate on its end.
        # We only clear them once they are older than 60 seconds.
        cutoff = datetime.now().timestamp() - 60
        sessions[sessionId]["pending_replies"] = [
            m for m in pending
            if float(m["id"].replace("bot-", "").split("-")[0]) > cutoff
        ]
        _save_sessions(sessions)

    return {"messages": new_messages}


@router.post("/reply")
def receive_reply(body: ChatReply):
    """Push a reply from admin web UI to the customer's live chat."""
    now_iso = datetime.now().isoformat()
    reply_id = f"bot-{datetime.now().timestamp()}"

    with chat_lock:
        sessions = _load_sessions()

        if body.sessionId not in sessions:
            return JSONResponse(content={"error": "Session not found"}, status_code=404)

        reply = {
            "id": reply_id,
            "text": body.message,
            "timestamp": now_iso,
        }

        # pending_replies — customer polls this
        if "pending_replies" not in sessions[body.sessionId]:
            sessions[body.sessionId]["pending_replies"] = []
        sessions[body.sessionId]["pending_replies"].append(reply)

        # permanent history
        sessions[body.sessionId]["messages"].append({
            **reply,
            "sender": "bot",
        })
        # reset unread on admin reply
        sessions[body.sessionId]["unread_count"] = 0

        _save_sessions(sessions)

    print(f"✓ Admin reply for session {body.sessionId[:20]}...")
    return {"ok": True, "id": reply_id}


@router.get("/sessions")
def get_sessions():
    """List all chat sessions with metadata (for admin UI)."""
    sessions = _load_sessions()
    # Build summary list sorted by most-recent message
    summary = {}
    for sid, s in sessions.items():
        summary[sid] = {
            "email": s.get("email", ""),
            "created_at": s.get("created_at", ""),
            "last_customer_message": s.get("last_customer_message", s.get("created_at", "")),
            "unread_count": s.get("unread_count", 0),
            "message_count": len(s.get("messages", [])),
            "last_message_preview": (
                s["messages"][-1]["text"][:80]
                if s.get("messages") else ""
            ),
            "last_sender": (
                s["messages"][-1].get("sender", "user")
                if s.get("messages") else "user"
            ),
        }
    return {"sessions": sessions, "summary": summary, "count": len(sessions)}


@router.post("/sessions/{session_id}/read")
def mark_session_read(session_id: str):
    """Mark a session as read (reset unread_count)."""
    with chat_lock:
        sessions = _load_sessions()
        if session_id in sessions:
            sessions[session_id]["unread_count"] = 0
            _save_sessions(sessions)
    return {"ok": True}


@router.get("/find")
def find_session(email: str = ""):
    """Find the latest session for a given email so users can resume."""
    if not email:
        return {"sessionId": None}

    with chat_lock:
        sessions = _load_sessions()
        matched_id = None
        for session_id, session_data in sessions.items():
            if session_data.get("email") == email:
                matched_id = session_id

    return {"sessionId": matched_id}


@router.get("/history")
def get_history(sessionId: str = ""):
    """Get full message history for a session."""
    if not sessionId:
        return {"messages": []}

    with chat_lock:
        sessions = _load_sessions()
        if sessionId not in sessions:
            return {"messages": []}

        session = sessions[sessionId]
        seen_ids: set = set()
        all_messages = []

        for msg in session.get("messages", []):
            if msg["id"] not in seen_ids:
                seen_ids.add(msg["id"])
                all_messages.append({
                    "id": msg["id"],
                    "text": msg["text"],
                    "sender": msg.get("sender", "user"),
                    "timestamp": msg["timestamp"],
                    "media_url": msg.get("media_url"),
                })

        # Include any still-pending replies not in messages (backward compat)
        for reply in session.get("pending_replies", []):
            if reply["id"] not in seen_ids:
                seen_ids.add(reply["id"])
                all_messages.append({
                    "id": reply["id"],
                    "text": reply["text"],
                    "sender": "bot",
                    "timestamp": reply["timestamp"],
                })

        all_messages.sort(key=lambda m: m["timestamp"])

    return {"messages": all_messages}


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    sessionId: str = Form(...),
    email: str = Form("guest"),
):
    """Handle media upload from support chat — save file and forward to Telegram."""
    ext      = os.path.splitext(file.filename or "")[1] or ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(MEDIA_DIR, filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    media_url = f"/api/chat/media/{filename}"
    now_iso   = datetime.now().isoformat()

    with chat_lock:
        sessions = _load_sessions()
        if sessionId not in sessions:
            sessions[sessionId] = {
                "email": email,
                "created_at": now_iso,
                "messages": [],
                "pending_replies": [],
            }
        sessions[sessionId]["messages"].append({
            "id": f"user-media-{datetime.now().timestamp()}",
            "sender": "user",
            "text": f"[Image: {file.filename}]",
            "media_url": media_url,
            "timestamp": now_iso,
        })
        _save_sessions(sessions)

    # Forward image to Telegram
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        try:
            url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
            with httpx.Client(timeout=10.0) as client:
                with open(filepath, "rb") as photo_file:
                    client.post(
                        url,
                        data={
                            "chat_id": TELEGRAM_CHAT_ID,
                            "caption": f"📷 Image from {email}\nSession: {sessionId[:20]}...",
                        },
                        files={"photo": (filename, photo_file, file.content_type or "image/jpeg")},
                    )
        except Exception as e:
            print(f"✗ Telegram photo error: {e}")

    print(f"✓ Media uploaded by {email}: {filename}")
    return {"ok": True, "media_url": media_url, "filename": filename}


@router.get("/media/{filename}")
def get_media(filename: str):
    """Serve uploaded media files."""
    filepath = os.path.join(MEDIA_DIR, filename)
    if not os.path.exists(filepath):
        return JSONResponse(content={"error": "File not found"}, status_code=404)
    return FileResponse(filepath)


# ── Telegram Webhook ──────────────────────────────────────────────────────────
@router.post("/telegram-webhook")
async def telegram_webhook(update: dict):
    """
    Telegram calls this URL every time a message is sent to the bot.

    Flow:
      1. Admin receives a customer alert in Telegram.
      2. Admin hits the native Telegram "Reply" on that alert message.
      3. Telegram sends the reply here.
      4. We extract SESSION_ID from the original (replied-to) message text.
      5. We push the reply into pending_replies so the customer sees it live.
    """
    try:
        message = update.get("message") or update.get("edited_message")
        if not message:
            return {"ok": True}

        text = message.get("text", "").strip()
        if not text:
            return {"ok": True}

        # Only process messages that are replies to a bot alert
        reply_to = message.get("reply_to_message")
        if not reply_to:
            print("[WEBHOOK] Ignoring — not a reply to a message.")
            return {"ok": True}

        original_text = reply_to.get("text", "")

        # Extract SESSION_ID from the original alert text
        session_id = None
        for line in original_text.splitlines():
            if "SESSION_ID:" in line:
                # line looks like: 🔑 `SESSION_ID:tm-1234567890-abc123xyz`
                session_id = line.split("SESSION_ID:")[-1].strip().rstrip("`").strip()
                break

        if not session_id:
            print("[WEBHOOK] No SESSION_ID found in replied-to message — skipping.")
            return {"ok": True}

        # Push reply into the session
        now_iso  = datetime.now().isoformat()
        reply_id = f"bot-{datetime.now().timestamp()}"
        reply    = {"id": reply_id, "text": text, "timestamp": now_iso}

        with chat_lock:
            sessions = _load_sessions()
            if session_id not in sessions:
                print(f"[WEBHOOK] Session {session_id[:20]}... not found.")
                return {"ok": True}

            sessions[session_id].setdefault("pending_replies", []).append(reply)
            sessions[session_id]["messages"].append({**reply, "sender": "bot"})
            sessions[session_id]["unread_count"] = 0
            _save_sessions(sessions)

        print(f"[WEBHOOK] ✓ Reply from Telegram routed to session {session_id[:20]}...")

        # Confirm delivery back to the admin in Telegram
        if TELEGRAM_BOT_TOKEN:
            chat_id = message["chat"]["id"]
            try:
                with httpx.Client(timeout=5.0) as client:
                    client.post(
                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                        json={
                            "chat_id": chat_id,
                            "text": "✅ Reply delivered to customer.",
                            "reply_to_message_id": message["message_id"],
                        },
                    )
            except Exception:
                pass

        return {"ok": True}

    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        return {"ok": True}  # Always return 200 to Telegram


@router.get("/set-webhook")
def set_webhook(base_url: str):
    """
    Helper: call this once to register the webhook with Telegram.
    Example: GET /api/chat/set-webhook?base_url=https://yourdomain.com
    """
    if not TELEGRAM_BOT_TOKEN:
        return {"error": "TELEGRAM_BOT_TOKEN not set"}

    webhook_url = f"{base_url.rstrip('/')}/api/chat/telegram-webhook"
    with httpx.Client(timeout=10.0) as client:
        r = client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook",
            json={"url": webhook_url, "drop_pending_updates": True},
        )
    result = r.json()
    print(f"[WEBHOOK] setWebhook → {result}")
    return result

