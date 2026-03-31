#!/usr/bin/env python3
"""
Telegram Bot for TaylorMade Support Chat

Handles:
- Live chat replies to customers on the support page
- Crypto payment approvals via inline buttons
- Session management

Just type normally to reply to the latest chat session.
"""

import os
import sys
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load env from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend', '.env'))

try:
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
except ImportError:
    print("❌ Please install python-telegram-bot:")
    print("   pip install python-telegram-bot")
    sys.exit(1)

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID', '')
API_URL = os.getenv('API_URL', 'http://localhost:8000')

# Track the active session
active_session_id = None
active_session_email = None

if not TELEGRAM_BOT_TOKEN:
    print("❌ TELEGRAM_BOT_TOKEN not set in backend/.env")
    sys.exit(1)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🏌️ TaylorMade Support Bot\n\n"
        "Commands:\n"
        "• /sessions - List active chat sessions\n"
        "• /join <session_id> - Join a session\n"
        "• /leave - Leave active session\n"
        "• /approve_crypto <email> - Approve crypto payment\n"
        "• /help - Show this help\n\n"
        "💡 Just type normally to reply to the latest chat session!"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await start(update, context)


async def sessions(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global active_session_id
    try:
        response = requests.get(f"{API_URL}/api/chat/sessions", timeout=5)
        if response.ok:
            data = response.json()
            all_sessions = data.get('sessions', {})

            if not all_sessions:
                await update.message.reply_text("📭 No active chat sessions")
                return

            message = "📋 Active Chat Sessions\n\n"
            for session_id, session_data in all_sessions.items():
                email = session_data.get('email', 'Unknown')
                created = session_data.get('created_at', '')[:16]
                msg_count = len(session_data.get('messages', []))
                is_active = " ⬅️ ACTIVE" if session_id == active_session_id else ""

                short_id = session_id[:30]
                message += f"• {short_id}...{is_active}\n"
                message += f"  📧 {email}\n"
                message += f"  💬 {msg_count} messages\n"
                message += f"  ⏰ {created}\n\n"

            message += "Use /join <session_id> to switch sessions"
            await update.message.reply_text(message)
        else:
            await update.message.reply_text(f"❌ Failed: {response.status_code}")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")


async def join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global active_session_id, active_session_email

    if len(context.args) < 1:
        await update.message.reply_text("❌ Usage: /join <session_id>")
        return

    partial_id = context.args[0]

    try:
        response = requests.get(f"{API_URL}/api/chat/sessions", timeout=5)
        if response.ok:
            all_sessions = response.json().get('sessions', {})
            matched = None
            for sid in all_sessions:
                if sid.startswith(partial_id):
                    matched = sid
                    break

            if matched:
                active_session_id = matched
                active_session_email = all_sessions[matched].get('email', 'Unknown')
                await update.message.reply_text(
                    f"✅ Joined session!\n📧 {active_session_email}\n💬 Just type to reply."
                )
            else:
                await update.message.reply_text(f"❌ No session found matching: {partial_id}")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")


async def leave(update: Update, context: ContextTypes.DEFAULT_TYPE):
    global active_session_id, active_session_email
    if active_session_id:
        await update.message.reply_text(f"👋 Left session for {active_session_email}")
        active_session_id = None
        active_session_email = None
    else:
        await update.message.reply_text("ℹ️ You're not in any session")


async def approve_crypto_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /approve_crypto <email> command"""
    if len(context.args) < 1:
        await update.message.reply_text("❌ Usage: /approve_crypto <email>")
        return

    email = context.args[0]
    try:
        response = requests.post(f"{API_URL}/api/crypto-approval/approve", params={'email': email}, timeout=5)
        if response.ok:
            await update.message.reply_text(f"✅ Crypto payment approved for {email}!\nThe customer's page will update automatically.")
        else:
            await update.message.reply_text(f"❌ Failed to approve")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")


async def handle_approve_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline button press for crypto approval"""
    query = update.callback_query
    await query.answer()

    data = query.data or ''
    if not data.startswith('approve_crypto:'):
        return

    email = data[len('approve_crypto:'):]

    try:
        response = requests.post(f"{API_URL}/api/crypto-approval/approve", params={'email': email}, timeout=5)
        if response.ok:
            original_text = query.message.text or ''
            await query.edit_message_text(
                text=f"{original_text}\n\n✅ Payment APPROVED for {email}!",
                parse_mode='Markdown'
            )
        else:
            await query.edit_message_text(
                text=f"{query.message.text}\n\n❌ Approval failed",
                parse_mode='Markdown'
            )
    except Exception as e:
        await query.edit_message_text(
            text=f"{query.message.text}\n\n❌ Error: {str(e)}",
            parse_mode='Markdown'
        )


async def handle_plain_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle any plain text — send to active chat session"""
    global active_session_id, active_session_email

    message_text = update.message.text
    if not message_text:
        return

    # Auto-join latest session if not in one
    if not active_session_id:
        try:
            response = requests.get(f"{API_URL}/api/chat/sessions", timeout=5)
            if response.ok:
                all_sessions = response.json().get('sessions', {})
                if all_sessions:
                    latest_id = list(all_sessions.keys())[-1]
                    active_session_id = latest_id
                    active_session_email = all_sessions[latest_id].get('email', 'Unknown')
                    await update.message.reply_text(f"🔗 Auto-joined latest session ({active_session_email})")
                else:
                    await update.message.reply_text("❌ No active sessions yet.")
                    return
        except Exception as e:
            await update.message.reply_text(f"❌ Error: {str(e)}")
            return

    # Send reply to the chat session
    try:
        response = requests.post(
            f"{API_URL}/api/chat/reply",
            json={'sessionId': active_session_id, 'message': message_text},
            timeout=5
        )

        if response.ok:
            await update.message.reply_text(f"➡️ {active_session_email}: Sent!")
        else:
            resp_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
            error = resp_data.get('error', f'HTTP {response.status_code}')
            if 'not found' in str(error).lower():
                active_session_id = None
                active_session_email = None
                await update.message.reply_text("❌ Session expired. Send again to auto-join latest.")
            else:
                await update.message.reply_text(f"❌ Failed: {error}")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")


def main():
    print("🏌️ Starting TaylorMade Support Telegram Bot...")
    print(f"📡 API URL: {API_URL}")

    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Commands
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("sessions", sessions))
    application.add_handler(CommandHandler("join", join))
    application.add_handler(CommandHandler("leave", leave))
    application.add_handler(CommandHandler("approve_crypto", approve_crypto_cmd))

    # Inline button callbacks (crypto approval)
    application.add_handler(CallbackQueryHandler(handle_approve_callback))

    # Plain text → reply to active session
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_plain_message))

    print("✅ Bot is running! Press Ctrl+C to stop.")
    print("💬 Type to reply to chat sessions")
    print("💰 Crypto approvals come as clickable buttons")

    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
