"""Quick Resend test — run: python3 test_email.py"""
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "onboarding@resend.dev")

print(f"API Key: ...{API_KEY[-8:]}" if API_KEY else "API Key: MISSING")
print(f"From: {FROM_EMAIL}")
print("---")

r = httpx.post(
    "https://api.resend.com/emails",
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json={
        "from": f"Charley Stores <{FROM_EMAIL}>",
        "to": ["charleystores@gmail.com"],
        "subject": "✅ Test — Charley Stores Email Working!",
        "html": "<h1>It works!</h1><p>Your Resend email service is configured correctly.</p>",
    },
    timeout=15.0,
)

print(f"Status: {r.status_code}")
print(f"Response: {r.text}")
if r.status_code == 200:
    print("\n✅ Email sent! Check your Gmail inbox.")
else:
    print("\n❌ Failed — check API key and try again.")
