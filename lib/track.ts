/**
 * Client-side event tracker — fires fire-and-forget Telegram alerts
 * via the Next.js /api/proxy serverless relay → VPS backend.
 */

const API = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || '/api/proxy')
  : '/api/proxy';

function post(path: string, body: object) {
  // Fire and forget — never block the UI
  fetch(`${API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {/* silent — notifications are non-critical */});
}

export function trackCartAdd(productName: string, price: number, userEmail = 'guest') {
  post('api/events/cart-add', { user_email: userEmail, product_name: productName, price });
}

export function trackCheckoutStart(total: number, itemCount: number, userEmail = 'guest') {
  post('api/events/checkout-start', { user_email: userEmail, total, item_count: itemCount });
}

export function trackOrderPlaced(total: number, paymentMethod: string, userEmail = 'guest') {
  post('api/events/order-placed', { user_email: userEmail, total, payment_method: paymentMethod });
}
