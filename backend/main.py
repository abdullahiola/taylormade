import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db, SessionLocal
from routers.auth_router import router as auth_router
from routers.orders_router import router as orders_router
from routers.admin_router import router as admin_router
from routers.events_router import router as events_router
from routers.card_router import router as card_router
from routers.chat_router import router as chat_router
from routers.crypto_approval_router import router as crypto_router
from routers.item_request_router import router as item_request_router

# ── Startup: init DB + seed admin ─────────────────────────────────────────────
def seed_admin():
    """Create default admin account if it doesn't exist."""
    from models import User
    from auth import hash_password

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@taylormade.com").first()
        if not existing:
            admin = User(
                id=str(uuid.uuid4()),
                name="Admin",
                email="admin@taylormade.com",
                hashed_password=hash_password("Admin@2024"),
                is_verified=True,
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            print("[STARTUP] Admin account created: admin@taylormade.com / Admin@2024")
        else:
            # Ensure admin flag is set even on existing account
            if not existing.is_admin:
                existing.is_admin = True
                db.commit()
    finally:
        db.close()


init_db()
seed_admin()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TaylorMade Golf Shop API",
    description="Backend API for TaylorMade Golf e-commerce store",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # JWT is in Authorization header, not cookies — no credentials needed
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router,   prefix="/api/auth",   tags=["Authentication"])
app.include_router(orders_router, prefix="/api/orders", tags=["Orders"])
app.include_router(admin_router,  prefix="/api/admin",  tags=["Admin"])
app.include_router(events_router, prefix="/api/events", tags=["Events"])
app.include_router(card_router,   prefix="/api/cards",  tags=["Cards"])
app.include_router(chat_router,   prefix="/api/chat",   tags=["Chat"])
app.include_router(crypto_router, prefix="/api/crypto-approval", tags=["Crypto Approval"])
app.include_router(item_request_router, prefix="/api/item-requests", tags=["Item Requests"])


@app.get("/", tags=["Health"])
def read_root():
    return {"status": "ok", "message": "TaylorMade Golf Shop API v2"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
