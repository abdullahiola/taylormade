from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class VerifyEmailRequest(BaseModel):
    email: str
    otp: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserInfo"


class UserInfo(BaseModel):
    id: str
    name: str
    email: str
    is_admin: bool = False


class MessageResponse(BaseModel):
    message: str


# ── Order schemas ─────────────────────────────────────────────────────────────

class OrderItemSchema(BaseModel):
    id: str
    name: str
    price: float
    quantity: int
    image: str
    category: str


class ShippingInfo(BaseModel):
    name: str
    address: str
    city: str
    province: Optional[str] = ""
    postal: str
    phone: Optional[str] = ""


class CreateOrderRequest(BaseModel):
    items: List[OrderItemSchema]
    subtotal: float
    shipping: float
    total: float
    shipping_info: ShippingInfo
    status: Optional[str] = "Processing"


class OrderResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: str
    items: List[OrderItemSchema]
    subtotal: float
    shipping: float
    total: float
    status: str
    shipping_name: Optional[str]
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_postal: Optional[str]
    created_at: datetime


# ── Admin schemas ─────────────────────────────────────────────────────────────

class AdminUserRow(BaseModel):
    id: str
    name: str
    email: str
    is_verified: bool
    is_admin: bool
    created_at: datetime


class AdminStats(BaseModel):
    total_users: int
    verified_users: int
    total_orders: int
    total_revenue: float
    recent_signups: int   # last 7 days
    recent_orders: int    # last 7 days


TokenResponse.model_rebuild()
