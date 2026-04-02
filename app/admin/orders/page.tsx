'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Package, ChevronDown, ArrowLeft, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/products';

import { API_URL as API } from '@/lib/api';

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
  user_id: string;
  user_email: string;
  user_name: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

const STATUS_COLORS: Record<string, string> = {
  Processing: 'bg-amber-100 text-amber-800 border-amber-200',
  Shipped: 'bg-blue-100 text-blue-800 border-blue-200',
  Delivered: 'bg-green-100 text-green-800 border-green-200',
  Cancelled: 'bg-red-100 text-red-800 border-red-200',
};

export default function AdminOrdersPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.is_admin) fetchOrders();
  }, [token, user]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.user_name.toLowerCase().includes(search.toLowerCase()) ||
      o.user_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading || !user?.is_admin) return null;

  return (
    <div className="page-enter min-h-screen bg-tm-gray">
      <div className="max-w-6xl mx-auto px-4 md:px-12 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-sm font-body text-gray-400 hover:text-tm-black transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </Link>
            <h1 className="section-title">Manage Orders</h1>
            <p className="text-sm text-gray-500 font-body mt-1">
              {orders.length} total order{orders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['all', ...STATUS_OPTIONS].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 text-xs font-sans font-bold uppercase tracking-widest border transition-colors ${
                  statusFilter === s
                    ? 'bg-tm-navy text-white border-tm-navy'
                    : 'bg-white text-tm-navy border-tm-border hover:border-tm-navy'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-tm-navy border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-tm-border p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-sans font-bold text-sm uppercase tracking-widest text-gray-400">
              No orders found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-tm-border shadow-sm"
              >
                {/* Order header (always visible) */}
                <div
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    setExpandedOrder(
                      expandedOrder === order.id ? null : order.id
                    )
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-sans font-black text-sm uppercase tracking-wide">
                        {order.id}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-widest border ${
                          STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-body">
                      {order.user_name} · {order.user_email}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-sans font-black text-base text-tm-red">
                      {formatPrice(order.total)}
                    </span>
                    <span className="text-xs text-gray-400 font-body">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedOrder === order.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded details */}
                {expandedOrder === order.id && (
                  <div className="border-t border-tm-border px-5 py-5 space-y-4 animate-fade-in">
                    {/* Items */}
                    <div>
                      <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Items
                      </h3>
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-sm font-body"
                          >
                            <span className="w-6 h-6 bg-tm-gray flex items-center justify-center text-xs font-bold text-gray-500">
                              {item.quantity}×
                            </span>
                            <span className="flex-1 truncate">{item.name}</span>
                            <span className="text-tm-red font-sans font-bold">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping info */}
                    {order.shipping_name && (
                      <div>
                        <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-gray-400 mb-2">
                          Shipping To
                        </h3>
                        <p className="text-sm font-body text-gray-600">
                          {order.shipping_name}
                          <br />
                          {order.shipping_address}
                          <br />
                          {order.shipping_city} {order.shipping_postal}
                        </p>
                      </div>
                    )}

                    {/* Status update */}
                    <div>
                      <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-gray-400 mb-2">
                        Update Status
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        {STATUS_OPTIONS.map((s) => (
                          <button
                            key={s}
                            onClick={() => updateStatus(order.id, s)}
                            disabled={
                              updating === order.id || order.status === s
                            }
                            className={`px-3 py-1.5 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                              order.status === s
                                ? STATUS_COLORS[s]
                                : 'bg-white text-gray-500 border-gray-200 hover:border-tm-navy hover:text-tm-navy'
                            } ${
                              updating === order.id
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                          >
                            {updating === order.id && order.status !== s
                              ? '...'
                              : s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
