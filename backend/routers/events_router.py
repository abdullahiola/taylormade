"""
Events router — receives activity signals from the frontend
and fires Telegram notifications (cart adds, checkout starts, orders).
All endpoints are intentionally unauthenticated so guest activity is captured too.
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from telegram_service import send_cart_alert, send_checkout_alert, send_order_alert

router = APIRouter()


def _get_ip(request: Request) -> str:
    ip = request.headers.get("X-Forwarded-For", "")
    if not ip and request.client:
        ip = request.client.host
    return ip.split(",")[0].strip() if ip else ""


# ── Schemas ────────────────────────────────────────────────────────────────────
class CartEvent(BaseModel):
    user_email: str = "guest"
    product_name: str
    price: float


class CheckoutEvent(BaseModel):
    user_email: str = "guest"
    total: float
    item_count: int


class OrderEvent(BaseModel):
    user_email: str = "guest"
    total: float
    payment_method: str = "card"


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/cart-add")
def cart_add(body: CartEvent, request: Request):
    send_cart_alert(
        user_email=body.user_email,
        product_name=body.product_name,
        price=body.price,
        ip=_get_ip(request),
    )
    return {"ok": True}


@router.post("/checkout-start")
def checkout_start(body: CheckoutEvent, request: Request):
    send_checkout_alert(
        user_email=body.user_email,
        total=body.total,
        item_count=body.item_count,
        ip=_get_ip(request),
    )
    return {"ok": True}


@router.post("/order-placed")
def order_placed(body: OrderEvent, request: Request):
    send_order_alert(
        user_email=body.user_email,
        total=body.total,
        payment_method=body.payment_method,
        ip=_get_ip(request),
    )
    return {"ok": True}
