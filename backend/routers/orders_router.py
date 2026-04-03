import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user_id
from database import get_db
from models import Order, User
from schemas import CreateOrderRequest, OrderResponse, OrderItemSchema
from email_service import send_order_confirmation_email, send_order_declined_email

router = APIRouter()


def _estimated_delivery() -> str:
    """Calculate estimated delivery date (7 working days from now)."""
    delivery = datetime.now()
    days_added = 0
    while days_added < 7:
        delivery += timedelta(days=1)
        # Skip weekends (5 = Saturday, 6 = Sunday)
        if delivery.weekday() < 5:
            days_added += 1
    return delivery.strftime("%B %d, %Y")


def order_to_response(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        user_email=order.user_email,
        user_name=order.user_name,
        items=json.loads(order.items_json),
        subtotal=order.subtotal,
        shipping=order.shipping,
        total=order.total,
        status=order.status,
        shipping_name=order.shipping_name,
        shipping_address=order.shipping_address,
        shipping_city=order.shipping_city,
        shipping_postal=order.shipping_postal,
        created_at=order.created_at,
    )


# ── Create order ──────────────────────────────────────────────────────────────
@router.post("", response_model=OrderResponse)
def create_order(
    body: CreateOrderRequest,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    order = Order(
        id=f"TM-{uuid.uuid4().hex[:8].upper()}",
        user_id=user_id,
        user_email=user.email,
        user_name=user.name,
        items_json=json.dumps([item.model_dump() for item in body.items]),
        subtotal=body.subtotal,
        shipping=body.shipping,
        total=body.total,
        status=body.status,
        shipping_name=body.shipping_info.name,
        shipping_address=body.shipping_info.address,
        shipping_city=body.shipping_info.city,
        shipping_postal=body.shipping_info.postal,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Send order email based on status
    items_list = [item.model_dump() for item in body.items]
    if body.status == "Declined":
        send_order_declined_email(
            to_email=user.email,
            user_name=user.name,
            order_id=order.id,
            total=body.total,
        )
    else:
        send_order_confirmation_email(
            to_email=user.email,
            user_name=user.name,
            order_id=order.id,
            items=items_list,
            total=body.total,
            estimated_delivery=_estimated_delivery(),
        )

    return order_to_response(order)


# ── My orders ─────────────────────────────────────────────────────────────────
@router.get("/my", response_model=list[OrderResponse])
def get_my_orders(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    orders = (
        db.query(Order)
        .filter(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [order_to_response(o) for o in orders]

