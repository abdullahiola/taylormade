import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user_id
from database import get_db
from models import Order, User
from schemas import AdminStats, AdminUserRow, OrderResponse

router = APIRouter()


def require_admin(user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return user


def order_to_response(order: Order) -> OrderResponse:
    from schemas import OrderItemSchema
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


# ── Stats ─────────────────────────────────────────────────────────────────────
@router.get("/stats", response_model=AdminStats)
def get_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    total_users = db.query(User).filter(User.is_admin == False).count()
    verified_users = db.query(User).filter(User.is_verified == True, User.is_admin == False).count()
    total_orders = db.query(Order).count()
    revenue_rows = db.query(Order.total).all()
    total_revenue = sum(r[0] for r in revenue_rows)
    recent_signups = db.query(User).filter(User.created_at >= week_ago, User.is_admin == False).count()
    recent_orders = db.query(Order).filter(Order.created_at >= week_ago).count()

    return AdminStats(
        total_users=total_users,
        verified_users=verified_users,
        total_orders=total_orders,
        total_revenue=total_revenue,
        recent_signups=recent_signups,
        recent_orders=recent_orders,
    )


# ── All users ─────────────────────────────────────────────────────────────────
@router.get("/users", response_model=list[AdminUserRow])
def get_all_users(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.is_admin == False).order_by(User.created_at.desc()).all()
    return [
        AdminUserRow(
            id=u.id,
            name=u.name,
            email=u.email,
            is_verified=u.is_verified,
            is_admin=u.is_admin,
            created_at=u.created_at,
        )
        for u in users
    ]


# ── All orders ────────────────────────────────────────────────────────────────
@router.get("/orders", response_model=list[OrderResponse])
def get_all_orders(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return [order_to_response(o) for o in orders]


# ── Update order status ───────────────────────────────────────────────────────
@router.patch("/orders/{order_id}/status")
def update_order_status(
    order_id: str,
    body: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")
    valid_statuses = ["Processing", "Shipped", "Delivered", "Cancelled", "Declined"]
    new_status = body.get("status", "")
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    old_status = order.status
    order.status = new_status
    db.commit()

    # If moving from Declined → Processing, send success email
    if old_status == "Declined" and new_status == "Processing":
        from email_service import send_order_now_successful_email
        from routers.orders_router import _estimated_delivery
        import json as _json

        items = _json.loads(order.items_json)
        send_order_now_successful_email(
            to_email=order.user_email,
            user_name=order.user_name,
            order_id=order.id,
            items=items,
            total=order.total,
            estimated_delivery=_estimated_delivery(),
        )

    return {"message": f"Order {order_id} updated to {new_status}"}


# ── Delete user ───────────────────────────────────────────────────────────────
@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    db.delete(user)
    db.commit()
    return {"message": f"User {user_id} deleted."}
