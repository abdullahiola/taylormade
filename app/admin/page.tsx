'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, ShoppingBag, TrendingUp, Package,
  CheckCircle, Clock, Trash2, ChevronDown, ChevronUp,
  BarChart3, LogOut, RefreshCw, AlertTriangle, MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/products';
import Image from 'next/image';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Tab = 'dashboard' | 'users' | 'orders';

interface Stats {
  total_users: number;
  verified_users: number;
  total_orders: number;
  total_revenue: number;
  recent_signups: number;
  recent_orders: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
}

interface AdminOrder {
  id: string;
  user_name: string;
  user_email: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  shipping_address: string;
  shipping_city: string;
  shipping_postal: string;
  created_at: string;
}

const ORDER_STATUSES = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];

function StatCard({ icon: Icon, label, value, sub, color = 'red' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border border-tm-border p-6 flex items-start gap-4">
      <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 ${
        color === 'red' ? 'bg-red-50' : color === 'green' ? 'bg-green-50' : color === 'blue' ? 'bg-blue-50' : 'bg-amber-50'
      }`}>
        <Icon className={`w-6 h-6 ${
          color === 'red' ? 'text-tm-red' : color === 'green' ? 'text-green-600' : color === 'blue' ? 'text-blue-600' : 'text-amber-500'
        }`} />
      </div>
      <div>
        <p className="text-xs font-sans font-bold uppercase tracking-widest text-tm-gray-mid">{label}</p>
        <p className="font-sans font-black text-2xl mt-0.5">{value}</p>
        {sub && <p className="text-xs text-tm-gray-mid mt-0.5 font-body">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, token, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers }),
        fetch(`${API_URL}/api/admin/users`, { headers }),
        fetch(`${API_URL}/api/admin/orders`, { headers }),
      ]);
      if (statsRes.status === 403 || usersRes.status === 403) {
        router.push('/');
        return;
      }
      setStats(await statsRes.json());
      setUsers(await usersRes.json());
      setOrders(await ordersRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!user.is_admin) { router.push('/'); return; }
    fetchData();
  }, [user, fetchData, router, authLoading]);

  if (authLoading || !user?.is_admin) return null;
  const deleteUser = async (userId: string) => {
    await fetch(`${API_URL}/api/admin/users/${userId}`, { method: 'DELETE', headers });
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setDeleteConfirm(null);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setStatusUpdating(orderId);
    await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    setStatusUpdating(null);
  };



  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: `Users (${users.length})`, icon: Users },
    { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
  ];

  return (
    <div className="page-enter min-h-screen bg-tm-gray">
      {/* Admin top bar */}
      <div className="bg-tm-navy border-b border-white/10 px-6 md:px-10 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-sans font-black uppercase tracking-widest text-xs">Admin Panel</span>
          <span className="text-white/30 text-xs">|</span>
          <span className="text-white/60 text-xs font-body">{user.email}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs font-sans font-bold uppercase tracking-wider">
            <Package className="w-4 h-4" /> Orders
          </Link>
          <Link href="/admin/chat" className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs font-sans font-bold uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" /> Chat
          </Link>
          <button onClick={fetchData} className="text-white/60 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-xs font-sans font-bold uppercase tracking-wider"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-sans font-black uppercase text-3xl tracking-wider">
            Charley<span className="text-tm-red"> Hull</span> Admin
          </h1>
          <p className="text-sm text-tm-gray-mid font-body mt-1">Manage your store from one place</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-tm-border p-1 mb-8 w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider transition-colors ${
                tab === id ? 'bg-tm-navy text-white' : 'text-tm-gray-mid hover:text-tm-black'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-tm-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── DASHBOARD ── */}
            {tab === 'dashboard' && stats && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <StatCard icon={Users} label="Total Users" value={stats.total_users}
                    sub={`${stats.recent_signups} new this week`} />
                  <StatCard icon={CheckCircle} label="Verified Users" value={stats.verified_users}
                    sub={`${stats.total_users - stats.verified_users} pending verification`} color="green" />
                  <StatCard icon={ShoppingBag} label="Total Orders" value={stats.total_orders}
                    sub={`${stats.recent_orders} placed this week`} color="blue" />
                  <StatCard icon={TrendingUp} label="Total Revenue" value={formatPrice(stats.total_revenue)}
                    sub="All-time gross revenue" color="green" />
                  <StatCard icon={Clock} label="Pending Orders"
                    value={orders.filter(o => o.status === 'Processing').length}
                    sub="Awaiting processing" color="amber" />
                  <StatCard icon={Package} label="Delivered"
                    value={orders.filter(o => o.status === 'Delivered').length}
                    sub="Successfully delivered" color="green" />
                </div>

                {/* Recent orders preview */}
                {orders.length > 0 && (
                  <div className="bg-white border border-tm-border">
                    <div className="px-6 py-4 border-b border-tm-border flex items-center justify-between">
                      <h2 className="font-sans font-black uppercase tracking-widest text-sm">Recent Orders</h2>
                      <button onClick={() => setTab('orders')} className="text-xs text-tm-red font-bold font-sans uppercase tracking-wider hover:underline">
                        View All →
                      </button>
                    </div>
                    <div className="divide-y divide-tm-border">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="px-6 py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-sans font-bold text-xs uppercase tracking-wide">{order.id}</p>
                            <p className="text-xs text-tm-gray-mid font-body">{order.user_name} · {order.user_email}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-sans font-black text-sm">{formatPrice(order.total)}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 ${
                              order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                              order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                              order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>{order.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── USERS ── */}
            {tab === 'users' && (
              <div className="bg-white border border-tm-border">
                <div className="px-6 py-4 border-b border-tm-border">
                  <h2 className="font-sans font-black uppercase tracking-widest text-sm">All Users ({users.length})</h2>
                </div>
                {users.length === 0 ? (
                  <div className="py-16 text-center text-tm-gray-mid font-body">No users yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-tm-border bg-tm-gray">
                          <th className="text-left px-6 py-3 text-xs font-sans font-black uppercase tracking-widest text-tm-gray-mid">Name</th>
                          <th className="text-left px-6 py-3 text-xs font-sans font-black uppercase tracking-widest text-tm-gray-mid">Email</th>
                          <th className="text-left px-6 py-3 text-xs font-sans font-black uppercase tracking-widest text-tm-gray-mid">Status</th>
                          <th className="text-left px-6 py-3 text-xs font-sans font-black uppercase tracking-widest text-tm-gray-mid">Joined</th>
                          <th className="text-left px-6 py-3 text-xs font-sans font-black uppercase tracking-widest text-tm-gray-mid">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-tm-border">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-tm-gray/50 transition-colors">
                            <td className="px-6 py-4 font-sans font-bold text-xs uppercase tracking-wide">{u.name}</td>
                            <td className="px-6 py-4 text-xs font-body text-tm-gray-dark">{u.email}</td>
                            <td className="px-6 py-4">
                              {u.is_verified ? (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5">
                                  <CheckCircle className="w-3 h-3" /> Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5">
                                  <Clock className="w-3 h-3" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs text-tm-gray-mid font-body">
                              {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                              {deleteConfirm === u.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-tm-red font-body flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Sure?
                                  </span>
                                  <button onClick={() => deleteUser(u.id)} className="text-xs bg-tm-red text-white px-2 py-1 font-bold font-sans hover:bg-tm-red-dark">Yes</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="text-xs border border-tm-border px-2 py-1 font-bold font-sans hover:bg-tm-gray">No</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(u.id)}
                                  className="text-tm-gray-mid hover:text-tm-red transition-colors flex items-center gap-1 text-xs font-body">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ORDERS ── */}
            {tab === 'orders' && (
              <div className="space-y-3">
                {orders.length === 0 ? (
                  <div className="bg-white border border-tm-border py-16 text-center text-tm-gray-mid font-body">No orders yet.</div>
                ) : orders.map((order) => (
                  <div key={order.id} className="bg-white border border-tm-border">
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-tm-gray/50 transition-colors"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <Package className="w-5 h-5 text-tm-red flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-sans font-black text-xs uppercase tracking-wider">{order.id}</p>
                          <p className="text-xs text-tm-gray-mid font-body mt-0.5 truncate">
                            {order.user_name} · {order.user_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="font-sans font-black text-sm">{formatPrice(order.total)}</span>
                        {/* Status dropdown */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                            disabled={statusUpdating === order.id}
                            className={`text-xs font-bold border px-2 py-1 focus:outline-none cursor-pointer ${
                              order.status === 'Delivered' ? 'border-green-300 text-green-700 bg-green-50' :
                              order.status === 'Shipped' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                              order.status === 'Cancelled' ? 'border-red-300 text-red-700 bg-red-50' :
                              'border-amber-300 text-amber-700 bg-amber-50'
                            }`}
                          >
                            {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <span className="text-xs text-tm-gray-mid font-body">
                          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-tm-gray-mid" /> : <ChevronDown className="w-4 h-4 text-tm-gray-mid" />}
                      </div>
                    </div>
                    {expandedOrder === order.id && (
                      <div className="border-t border-tm-border divide-y divide-tm-border">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                            <div className="relative w-12 h-12 bg-tm-gray flex-shrink-0 overflow-hidden">
                              <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-sans font-bold text-xs uppercase tracking-wide truncate">{item.name}</p>
                              <p className="text-xs text-tm-gray-mid font-body">{item.category} · Qty: {item.quantity}</p>
                            </div>
                            <span className="font-sans font-black text-xs">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="px-5 py-3 bg-tm-gray flex items-center justify-between text-xs font-body text-tm-gray-mid">
                          <span>📦 {order.shipping_address}, {order.shipping_city} {order.shipping_postal}</span>
                          <span className="font-sans font-black text-tm-black">Total: {formatPrice(order.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
