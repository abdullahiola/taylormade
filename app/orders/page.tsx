'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package, ShoppingBag, ChevronDown, ChevronUp,
  MapPin, MessageCircle, Clock, CheckCircle, Truck,
  XCircle, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/products';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
}

interface Order {
  id: string;
  created_at: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal: string;
}

const STATUS_STEPS = ['Processing', 'Shipped', 'Delivered'];

function statusConfig(status: string) {
  switch (status) {
    case 'Delivered':  return { color: 'bg-green-100 text-green-700',  icon: CheckCircle, dot: 'bg-green-500',  label: 'Delivered'  };
    case 'Shipped':    return { color: 'bg-blue-100 text-blue-700',    icon: Truck,        dot: 'bg-blue-500',   label: 'Shipped'    };
    case 'Cancelled':  return { color: 'bg-red-100 text-red-700',      icon: XCircle,      dot: 'bg-red-500',    label: 'Cancelled'  };
    default:           return { color: 'bg-amber-100 text-amber-700',  icon: Clock,        dot: 'bg-amber-500',  label: 'Processing' };
  }
}

export default function OrdersPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login?redirect=/orders'); return; }
    fetch(`${API_URL}/api/orders/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, token, router, authLoading]);

  if (authLoading || !user) return null;

  return (
    <div className="page-enter min-h-screen" style={{ background: 'linear-gradient(180deg,#f9fafb 0%,#fff 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title mb-1">My Orders</h1>
          <p className="text-sm text-gray-400 font-body">
            {orders.length} order{orders.length !== 1 ? 's' : ''} placed
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-tm-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border border-dashed border-gray-200">
            <ShoppingBag className="w-14 h-14 text-gray-200 mb-4" />
            <h2 className="font-sans font-black uppercase tracking-wider text-lg mb-2 text-gray-700">No Orders Yet</h2>
            <p className="text-gray-400 font-body text-sm mb-6">Start shopping to see your orders here.</p>
            <Link href="/shop" className="btn-primary">Shop Now</Link>
          </div>
        )}

        {/* Orders list */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const isOpen = expanded === order.id;
              const sc     = statusConfig(order.status);
              const StatusIcon = sc.icon;
              const stepIndex  = STATUS_STEPS.indexOf(order.status);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* ── Collapsed row ── */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : order.id)}
                  >
                    {/* Product thumbnails stack */}
                    <div className="flex -space-x-3 flex-shrink-0">
                      {order.items.slice(0, 3).map((item, i) => (
                        <div
                          key={item.id}
                          className="relative w-12 h-12 rounded-xl border-2 border-white overflow-hidden bg-gray-100 shadow-sm"
                          style={{ zIndex: 3 - i }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-12 h-12 rounded-xl border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 shadow-sm">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>

                    {/* Order info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-sans font-black text-xs uppercase tracking-wider text-tm-navy">{order.id}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.color}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-body mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        {' · '}
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Total + chevron */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-sans font-black text-sm text-tm-navy">{formatPrice(order.total)}</span>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-300" />
                        : <ChevronDown className="w-4 h-4 text-gray-300" />
                      }
                    </div>
                  </button>

                  {/* ── Expanded detail ── */}
                  {isOpen && (
                    <div className="border-t border-gray-100">

                      {/* Status timeline (skip for Cancelled) */}
                      {order.status !== 'Cancelled' && (
                        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-0">
                            {STATUS_STEPS.map((step, i) => {
                              const done    = i <= stepIndex;
                              const current = i === stepIndex;
                              return (
                                <div key={step} className="flex items-center flex-1">
                                  <div className="flex flex-col items-center gap-1">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                      done
                                        ? 'border-tm-red bg-tm-red'
                                        : 'border-gray-200 bg-white'
                                    } ${current ? 'ring-4 ring-red-100' : ''}`}>
                                      {done
                                        ? <CheckCircle className="w-3.5 h-3.5 text-white" />
                                        : <div className="w-2 h-2 rounded-full bg-gray-200" />
                                      }
                                    </div>
                                    <span className={`text-[9px] font-sans font-bold uppercase tracking-wider whitespace-nowrap ${
                                      done ? 'text-tm-red' : 'text-gray-300'
                                    }`}>{step}</span>
                                  </div>
                                  {i < STATUS_STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < stepIndex ? 'bg-tm-red' : 'bg-gray-200'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Cancelled banner */}
                      {order.status === 'Cancelled' && (
                        <div className="mx-5 mt-4 mb-2 rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-xs text-red-600 font-body">This order was cancelled.</p>
                        </div>
                      )}

                      {/* Product cards */}
                      <div className="px-5 py-3 space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0 shadow-sm">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-sans font-black text-xs uppercase tracking-wide text-tm-navy truncate">{item.name}</p>
                              <p className="text-[11px] text-gray-400 font-body mt-0.5">{item.category} · Qty: {item.quantity}</p>
                            </div>
                            <span className="font-sans font-black text-sm text-tm-navy flex-shrink-0">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Summary + address */}
                      <div className="mx-5 mb-4 rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1.5 text-xs font-body text-gray-500">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span className="font-sans font-bold text-gray-700">{formatPrice(order.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping</span>
                          <span className="font-sans font-bold text-gray-700">
                            {order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
                          <span className="font-sans font-black uppercase tracking-wider text-tm-navy text-[11px]">Total</span>
                          <span className="font-sans font-black text-tm-navy">{formatPrice(order.total)}</span>
                        </div>
                        <div className="flex items-start gap-1.5 pt-1 border-t border-gray-200 mt-1.5">
                          <MapPin className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span>{order.shipping_name} · {order.shipping_address}, {order.shipping_city} {order.shipping_postal}</span>
                        </div>
                      </div>

                      {/* Customer service CTA */}
                      <div className="mx-5 mb-5">
                        <Link
                          href={`/support?order=${order.id}`}
                          className="flex items-center justify-between w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-tm-red hover:bg-red-50 group transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-50 group-hover:bg-tm-red flex items-center justify-center transition-colors flex-shrink-0">
                              <MessageCircle className="w-4 h-4 text-tm-red group-hover:text-white transition-colors" />
                            </div>
                            <div>
                              <p className="font-sans font-black text-xs uppercase tracking-wider text-tm-navy group-hover:text-tm-red transition-colors">
                                Need help with this order?
                              </p>
                              <p className="text-[11px] text-gray-400 font-body">Chat with our support team</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-tm-red transition-colors" />
                        </Link>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
