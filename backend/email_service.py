import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def send_otp_email(to_email: str, user_name: str, otp_code: str) -> bool:
    """Send a 6-digit OTP verification email via Gmail SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Your Charley Hull Stores Verification Code"
        msg["From"] = f"Charley Hull Stores <{SMTP_EMAIL}>"
        msg["To"] = to_email

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }}
    .container {{ max-width: 560px; margin: 40px auto; background: white; }}
    .header {{ background: #1A1A1A; padding: 32px; text-align: center; }}
    .header h1 {{ color: white; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; }}
    .header span {{ color: #E8001C; }}
    .body {{ padding: 40px 32px; }}
    .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0A0A0A; }}
    .body p {{ color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }}
    .otp-box {{ background: #f5f5f5; border: 2px solid #E8001C; text-align: center; padding: 24px; margin: 24px 0; }}
    .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0A0A0A; font-family: monospace; }}
    .otp-note {{ font-size: 12px; color: #888; margin-top: 8px; }}
    .footer {{ background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 20px 32px; text-align: center; }}
    .footer p {{ color: #888; font-size: 12px; margin: 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Charley <span>Hull</span> Stores</h1>
    </div>
    <div class="body">
      <h2>Hi {user_name},</h2>
      <p>Welcome to Charley Hull Stores! Please verify your email address using the code below to complete your registration.</p>
      <div class="otp-box">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-note">This code expires in <strong>10 minutes</strong></div>
      </div>
      <p>If you did not create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; Charley Hull Stores. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, user_name: str, otp_code: str) -> bool:
    """Send a 6-digit password reset OTP email via Gmail SMTP."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset — Charley Hull Stores"
        msg["From"] = f"Charley Hull Stores <{SMTP_EMAIL}>"
        msg["To"] = to_email

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }}
    .container {{ max-width: 560px; margin: 40px auto; background: white; }}
    .header {{ background: #1A1A1A; padding: 32px; text-align: center; }}
    .header h1 {{ color: white; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; }}
    .header span {{ color: #E8001C; }}
    .body {{ padding: 40px 32px; }}
    .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0A0A0A; }}
    .body p {{ color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }}
    .otp-box {{ background: #f5f5f5; border: 2px solid #E8001C; text-align: center; padding: 24px; margin: 24px 0; }}
    .otp-code {{ font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0A0A0A; font-family: monospace; }}
    .otp-note {{ font-size: 12px; color: #888; margin-top: 8px; }}
    .footer {{ background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 20px 32px; text-align: center; }}
    .footer p {{ color: #888; font-size: 12px; margin: 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Charley <span>Hull</span> Stores</h1>
    </div>
    <div class="body">
      <h2>Hi {user_name},</h2>
      <p>We received a request to reset your password. Use the code below to set a new password.</p>
      <div class="otp-box">
        <div class="otp-code">{otp_code}</div>
        <div class="otp-note">This code expires in <strong>10 minutes</strong></div>
      </div>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; Charley Hull Stores. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send password reset to {to_email}: {e}")
        return False


def send_order_confirmation_email(
    to_email: str,
    user_name: str,
    order_id: str,
    items: list,
    total: float,
    estimated_delivery: str,
) -> bool:
    """Send order confirmation email with order ID, items, and estimated delivery."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Order Confirmed — {order_id} | Charley Hull Stores"
        msg["From"] = f"Charley Hull Stores <{SMTP_EMAIL}>"
        msg["To"] = to_email

        # Build items rows
        items_html = ""
        for item in items:
            qty = item.get("quantity", 1)
            price = item.get("price", 0)
            items_html += f"""
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">{item.get('name', 'Product')}</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #555; text-align: center;">{qty}</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333; text-align: right; font-weight: 700;">${price * qty:,.2f}</td>
            </tr>"""

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }}
    .container {{ max-width: 560px; margin: 40px auto; background: white; }}
    .header {{ background: #1A1A1A; padding: 32px; text-align: center; }}
    .header h1 {{ color: white; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; }}
    .header span {{ color: #E8001C; }}
    .body {{ padding: 40px 32px; }}
    .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0A0A0A; }}
    .body p {{ color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }}
    .order-box {{ background: #f5f5f5; border: 2px solid #E8001C; padding: 20px; margin: 20px 0; }}
    .order-id {{ font-size: 28px; font-weight: 900; color: #0A0A0A; font-family: monospace; letter-spacing: 2px; }}
    .status-badge {{ display: inline-block; background: #E8001C; color: white; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; margin-top: 8px; }}
    .delivery-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; margin: 20px 0; }}
    .delivery-box p {{ color: #166534; margin: 0; font-size: 13px; }}
    .delivery-box strong {{ color: #0A0A0A; }}
    .footer {{ background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 20px 32px; text-align: center; }}
    .footer p {{ color: #888; font-size: 12px; margin: 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Charley <span>Hull</span> Stores</h1>
    </div>
    <div class="body">
      <h2>Hi {user_name},</h2>
      <p>Thank you for your order! We're getting it ready for you.</p>
      <div class="order-box" style="text-align: center;">
        <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Order ID</div>
        <div class="order-id">{order_id}</div>
        <div class="status-badge">Processing</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #0A0A0A; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Item</th>
            <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #0A0A0A; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Qty</th>
            <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #0A0A0A; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Price</th>
          </tr>
        </thead>
        <tbody>
          {items_html}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px 0; font-size: 16px; font-weight: 900; color: #0A0A0A;">Total</td>
            <td style="padding: 12px 0; font-size: 16px; font-weight: 900; color: #E8001C; text-align: right;">${total:,.2f}</td>
          </tr>
        </tfoot>
      </table>

      <div class="delivery-box">
        <p>📦 <strong>Estimated Delivery:</strong> {estimated_delivery}</p>
        <p style="margin-top: 6px;">Your order will arrive within 7 working days.</p>
      </div>

      <p style="font-size: 13px; color: #888;">If you have any questions, please contact our <a href="mailto:{SMTP_EMAIL}" style="color: #E8001C;">support team</a>.</p>
    </div>
    <div class="footer">
      <p>&copy; Charley Hull Stores. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send order confirmation to {to_email}: {e}")
        return False


def send_order_declined_email(
    to_email: str,
    user_name: str,
    order_id: str,
    total: float,
) -> bool:
    """Send order declined email when card payment fails."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Payment Declined — {order_id} | Charley Hull Stores"
        msg["From"] = f"Charley Hull Stores <{SMTP_EMAIL}>"
        msg["To"] = to_email

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }}
    .container {{ max-width: 560px; margin: 40px auto; background: white; }}
    .header {{ background: #1A1A1A; padding: 32px; text-align: center; }}
    .header h1 {{ color: white; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; }}
    .header span {{ color: #E8001C; }}
    .body {{ padding: 40px 32px; }}
    .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0A0A0A; }}
    .body p {{ color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }}
    .order-box {{ background: #fef2f2; border: 2px solid #E8001C; padding: 20px; margin: 20px 0; text-align: center; }}
    .order-id {{ font-size: 28px; font-weight: 900; color: #0A0A0A; font-family: monospace; letter-spacing: 2px; }}
    .status-badge {{ display: inline-block; background: #991b1b; color: white; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; margin-top: 8px; }}
    .reason-box {{ background: #fef2f2; border: 1px solid #fecaca; padding: 16px; margin: 20px 0; }}
    .reason-box p {{ color: #991b1b; margin: 0; font-size: 13px; }}
    .footer {{ background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 20px 32px; text-align: center; }}
    .footer p {{ color: #888; font-size: 12px; margin: 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Charley <span>Hull</span> Stores</h1>
    </div>
    <div class="body">
      <h2>Hi {user_name},</h2>
      <p>We were unable to process the payment for your recent order.</p>
      <div class="order-box">
        <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Order ID</div>
        <div class="order-id">{order_id}</div>
        <div class="status-badge">Declined</div>
        <div style="margin-top: 12px; font-size: 16px; font-weight: 900; color: #0A0A0A;">Total: ${total:,.2f}</div>
      </div>

      <div class="reason-box">
        <p><strong>⚠️ Why was my payment declined?</strong></p>
        <p style="margin-top: 8px;">This could be due to insufficient funds, incorrect card details, or a temporary issue with your bank. Please try again or use a different payment method.</p>
      </div>

      <p><strong>What you can do:</strong></p>
      <ul style="color: #555; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0 0 20px;">
        <li>Double-check your card details and try again</li>
        <li>Try a different card or payment method</li>
        <li>Contact your bank to authorize the transaction</li>
        <li>Reach out to our <a href="{FRONTEND_URL}/support" style="color: #E8001C; text-decoration: underline;">support team</a> for help</li>
      </ul>

      <p style="font-size: 13px; color: #888;">Need help? <a href="{FRONTEND_URL}/support" style="color: #E8001C; text-decoration: underline;">Chat with our support team</a> and we'll assist you right away.</p>
    </div>
    <div class="footer">
      <p>&copy; Charley Hull Stores. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send declined email to {to_email}: {e}")
        return False


def send_order_now_successful_email(
    to_email: str,
    user_name: str,
    order_id: str,
    items: list,
    total: float,
    estimated_delivery: str,
) -> bool:
    """Send email when a previously declined order is approved and now processing."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Great News! Order Approved — {order_id} | Charley Hull Stores"
        msg["From"] = f"Charley Hull Stores <{SMTP_EMAIL}>"
        msg["To"] = to_email

        # Build items rows
        items_html = ""
        for item in items:
            qty = item.get("quantity", 1)
            price = item.get("price", 0)
            items_html += f"""
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333;">{item.get('name', 'Product')}</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #555; text-align: center;">{qty}</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 14px; color: #333; text-align: right; font-weight: 700;">${price * qty:,.2f}</td>
            </tr>"""

        html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }}
    .container {{ max-width: 560px; margin: 40px auto; background: white; }}
    .header {{ background: #1A1A1A; padding: 32px; text-align: center; }}
    .header h1 {{ color: white; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0; }}
    .header span {{ color: #E8001C; }}
    .body {{ padding: 40px 32px; }}
    .body h2 {{ font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #0A0A0A; }}
    .body p {{ color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }}
    .success-banner {{ background: #f0fdf4; border: 2px solid #22c55e; padding: 20px; margin: 20px 0; text-align: center; }}
    .success-banner .icon {{ font-size: 40px; margin-bottom: 8px; }}
    .success-banner .title {{ font-size: 18px; font-weight: 900; color: #166534; text-transform: uppercase; letter-spacing: 1px; }}
    .success-banner .subtitle {{ font-size: 13px; color: #166534; margin-top: 4px; }}
    .order-box {{ background: #f5f5f5; border: 2px solid #E8001C; padding: 20px; margin: 20px 0; text-align: center; }}
    .order-id {{ font-size: 28px; font-weight: 900; color: #0A0A0A; font-family: monospace; letter-spacing: 2px; }}
    .status-badge {{ display: inline-block; background: #22c55e; color: white; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; margin-top: 8px; }}
    .delivery-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; margin: 20px 0; }}
    .delivery-box p {{ color: #166534; margin: 0; font-size: 13px; }}
    .delivery-box strong {{ color: #0A0A0A; }}
    .footer {{ background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 20px 32px; text-align: center; }}
    .footer p {{ color: #888; font-size: 12px; margin: 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Charley <span>Hull</span> Stores</h1>
    </div>
    <div class="body">
      <h2>Hi {user_name},</h2>
      <p>Great news! Your order has been approved and is now being processed.</p>

      <div class="success-banner">
        <div class="icon">✅</div>
        <div class="title">Order Successful</div>
        <div class="subtitle">Your payment has been verified and approved</div>
      </div>

      <div class="order-box">
        <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Order ID</div>
        <div class="order-id">{order_id}</div>
        <div class="status-badge">Processing</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #0A0A0A; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Item</th>
            <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #0A0A0A; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Qty</th>
            <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #0A0A0A; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888;">Price</th>
          </tr>
        </thead>
        <tbody>
          {items_html}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding: 12px 0; font-size: 16px; font-weight: 900; color: #0A0A0A;">Total</td>
            <td style="padding: 12px 0; font-size: 16px; font-weight: 900; color: #E8001C; text-align: right;">${total:,.2f}</td>
          </tr>
        </tfoot>
      </table>

      <div class="delivery-box">
        <p>📦 <strong>Estimated Delivery:</strong> {estimated_delivery}</p>
        <p style="margin-top: 6px;">Your order will arrive within 7 working days.</p>
      </div>

      <p style="font-size: 13px; color: #888;">If you have any questions, please contact our <a href="{FRONTEND_URL}/support" style="color: #E8001C;">support team</a>.</p>
    </div>
    <div class="footer">
      <p>&copy; Charley Hull Stores. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send order success email to {to_email}: {e}")
        return False

