from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, Text, ForeignKey
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    user_email = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    items_json = Column(Text, nullable=False)      # JSON string of cart items
    subtotal = Column(Float, nullable=False)
    shipping = Column(Float, nullable=False, default=0)
    total = Column(Float, nullable=False)
    status = Column(String, default="Processing")  # Processing / Shipped / Delivered
    shipping_name = Column(String, nullable=True)
    shipping_address = Column(String, nullable=True)
    shipping_city = Column(String, nullable=True)
    shipping_postal = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
