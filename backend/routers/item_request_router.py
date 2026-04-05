from fastapi import APIRouter, Request
from pydantic import BaseModel
from telegram_service import _send, _now, _get_location

router = APIRouter()


class ItemRequest(BaseModel):
    item_name: str
    email: str
    message: str = ""


@router.post("/submit")
async def submit_item_request(payload: ItemRequest, request: Request):
    """Customer requests an item that isn't in the store."""
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "")
    location = _get_location(ip)

    msg = (
        f"📦 *Charley Stores — Item Request*\n"
        f"─────────────────────\n"
        f"📧 *Customer:* {payload.email}\n"
        f"🏷️ *Item Requested:* {payload.item_name}\n"
    )
    if payload.message:
        msg += f"💬 *Details:* {payload.message}\n"
    msg += (
        f"{location}\n"
        f"🕐 *Time:* {_now()}\n"
        f"─────────────────────"
    )

    _send(msg)
    return {"status": "ok", "message": "Request submitted successfully"}
