#!/usr/bin/env python3
"""
create_superuser.py — Bootstrap an admin account into the TaylorMade database.

Usage (interactive):
    python create_superuser.py

Usage (non-interactive / CI):
    SUPERUSER_NAME="Admin" SUPERUSER_EMAIL="admin@example.com" \
    SUPERUSER_PASSWORD="s3cureP@ss" python create_superuser.py

The script reads env vars first; if any are missing it falls back to
interactive prompts so it works both on the VPS and locally.
"""

import os
import sys
import uuid
import getpass
from datetime import datetime

# ── Load .env if python-dotenv is available ────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not strictly required

# ── Shared app modules ─────────────────────────────────────────────────────────
from database import SessionLocal, engine, Base
from models import User
from auth import hash_password


def get_input(env_key: str, prompt: str, secret: bool = False) -> str:
    """Return env var if set, otherwise prompt the user."""
    value = os.getenv(env_key, "").strip()
    if value:
        label = "***" if secret else value
        print(f"  {prompt}: {label}  (from env)")
        return value
    if secret:
        return getpass.getpass(f"  {prompt}: ").strip()
    return input(f"  {prompt}: ").strip()


def main():
    print("\n━━━━━━━━━━━━  TaylorMade  Superuser Creator  ━━━━━━━━━━━━")

    # ── Collect credentials ────────────────────────────────────────────────────
    name     = get_input("SUPERUSER_NAME",     "Full name")
    email    = get_input("SUPERUSER_EMAIL",    "Email address").lower()
    password = get_input("SUPERUSER_PASSWORD", "Password", secret=True)

    if not name or not email or not password:
        print("\n[ERROR] Name, email, and password are all required.")
        sys.exit(1)

    if len(password) < 6:
        print("\n[ERROR] Password must be at least 6 characters.")
        sys.exit(1)

    # ── Ensure tables exist ────────────────────────────────────────────────────
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()

        if existing:
            if existing.is_admin:
                print(f"\n[INFO] '{email}' already exists and is already an admin. Nothing changed.")
                return

            # Promote existing user to admin
            existing.is_admin    = True
            existing.is_verified = True
            db.commit()
            print(f"\n✅  Existing account '{email}' has been promoted to superuser (admin).")
            return

        # Create brand-new admin user
        user = User(
            id              = str(uuid.uuid4()),
            name            = name,
            email           = email,
            hashed_password = hash_password(password),
            is_verified     = True,   # skip email OTP step
            is_admin        = True,
            created_at      = datetime.utcnow(),
        )
        db.add(user)
        db.commit()

        print(f"\n✅  Superuser created successfully!")
        print(f"   Name  : {name}")
        print(f"   Email : {email}")
        print(f"   Role  : admin  (is_admin=True, is_verified=True)")

    finally:
        db.close()

    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")


if __name__ == "__main__":
    main()
