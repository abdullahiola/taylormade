'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/products';
import Image from 'next/image';
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
  total: number;
  status: string;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal: string;
}

export default function OrdersPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.push('/login?redirect=/orders'); return; }
    fetch(`${API_URL}/api/orders/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user, token, router]);

  if (!user) return null;

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 md:px-12 py-10">
      <h1 className="section-title mb-2">My Orders</h1>
      <p className="text-sm text-tm-gray-mid font-body mb-8">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-tm-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-tm-border">
          <ShoppingBag className="w-16 h-16 text-tm-border mb-4" />
          <h2 className="font-sans font-bold uppercase tracking-wider text-lg mb-2">No Orders Yet</h2>
          <p className="text-tm-gray-mid font-body text-sm mb-6">Start shopping to see your orders here.</p>
          <Link href="/shop" className="btn-primary">Shop Now</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="border border-tm-border">
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 cursor-pointer hover:bg-tm-gray transition-colors"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <Package className="w-5 h-5 text-tm-red flex-shrink-0" />
                  <div>
                    <p className="font-sans font-black uppercase tracking-wider text-sm">Order {order.id}</p>
                    <p className="text-xs text-tm-gray-mid font-body mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-sans font-black text-sm">{formatPrice(order.total)}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 inline-block mt-1 ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{order.status}</span>
                  </div>
                  {expanded === order.id ? <ChevronUp className="w-4 h-4 text-tm-gray-mid" /> : <ChevronDown className="w-4 h-4 text-tm-gray-mid" />}
                </div>
              </div>
              {expanded === order.id && (
                <div className="border-t border-tm-border divide-y divide-tm-border">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4">
                      <div className="relative w-16 h-16 bg-tm-gray flex-shrink-0 overflow-hidden">
                        <Image src={item.image} alt={item.name} fill className="object-cover" sizes="64px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-bold text-xs uppercase tracking-wide">{item.name}</p>
                        <p className="text-xs text-tm-gray-mid font-body">{item.category} · Qty: {item.quantity}</p>
                      </div>
                      <span className="font-sans font-black text-sm">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="p-4 bg-tm-gray text-xs text-tm-gray-mid font-body">
                    <strong className="text-tm-black font-sans">Delivery to:</strong> {order.shipping_address}, {order.shipping_city} {order.shipping_postal}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
