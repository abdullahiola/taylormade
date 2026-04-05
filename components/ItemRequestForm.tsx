'use client';

import { useState } from 'react';
import { Send, CheckCircle, PackageSearch } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

export default function ItemRequestForm({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ itemName: '', email: user?.email || '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.itemName.trim()) { setError('Please describe the item you\'re looking for.'); return; }
    if (!form.email.trim()) { setError('Please enter your email address.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/item-requests/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: form.itemName.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Unable to send request. Please try again later.');
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className={`bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl ${compact ? 'p-6' : 'p-8 md:p-10'} text-center`}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="font-sans font-black uppercase tracking-wider text-lg text-gray-900 mb-2">Request Submitted!</h3>
        <p className="text-sm text-gray-500 font-body leading-relaxed">
          We&apos;ve received your request and will get back to you at <strong className="text-gray-700">{form.email}</strong> as soon as the item is available.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl ${compact ? 'p-6' : 'p-8 md:p-10'}`}>
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
      <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        {/* Header */}
        <div className={`flex items-center gap-3 ${compact ? 'mb-4' : 'mb-6'}`}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
            <PackageSearch className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-sans font-black uppercase tracking-wider text-sm">
              Can&apos;t Find What You&apos;re Looking For?
            </h3>
            <p className="text-gray-400 text-xs font-body mt-0.5">
              Request any item and we&apos;ll source it for you
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-3 py-2 rounded-lg font-body">
              {error}
            </div>
          )}

          <div>
            <input
              type="text"
              value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              placeholder="What item are you looking for?"
              className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-gray-500 text-sm font-body px-4 py-3 rounded-xl focus:outline-none focus:border-red-500/50 focus:bg-white/[0.1] transition-all"
            />
          </div>

          <div className={compact ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Your email address"
              className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-gray-500 text-sm font-body px-4 py-3 rounded-xl focus:outline-none focus:border-red-500/50 focus:bg-white/[0.1] transition-all"
            />
            {!compact && (
              <input
                type="text"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Any details? (size, color, qty...)"
                className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-gray-500 text-sm font-body px-4 py-3 rounded-xl focus:outline-none focus:border-red-500/50 focus:bg-white/[0.1] transition-all mt-3 sm:mt-0"
              />
            )}
          </div>

          {compact && (
            <input
              type="text"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Any details? (size, color, qty...)"
              className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-gray-500 text-sm font-body px-4 py-3 rounded-xl focus:outline-none focus:border-red-500/50 focus:bg-white/[0.1] transition-all"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-sans font-black uppercase tracking-wider text-sm py-3.5 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Request
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-gray-500 font-body">
            We&apos;ll email you when the item becomes available
          </p>
        </form>
      </div>
    </div>
  );
}
