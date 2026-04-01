'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { ArrowLeft, Mail, MessageCircle, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import SupportChat from '@/components/SupportChat';
import Link from 'next/link';
import Image from 'next/image';
import { products, formatPrice } from '@/lib/products';

function SupportPageInner() {
  const { user, isLoading: authLoading } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const productId    = searchParams.get('product');
  const orderId      = searchParams.get('order');
  const linkedProduct = productId ? products.find((p) => p.id === productId) : null;

  useEffect(() => {
    if (!authLoading && !user) router.push(`/login?redirect=/support${productId ? `?product=${productId}` : orderId ? `?order=${orderId}` : ''}`);
  }, [user, router, authLoading, productId, orderId]);

  if (authLoading || !user) return null;

  return (
    <div className="page-enter min-h-screen" style={{ background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-12 py-10">

        {/* Back */}
        <Link
          href={linkedProduct ? `/shop/${linkedProduct.id}` : orderId ? '/orders' : '/shop'}
          className="inline-flex items-center gap-1.5 text-sm font-body text-gray-400 hover:text-tm-black transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {linkedProduct ? `Back to ${linkedProduct.name}` : orderId ? 'Back to My Orders' : 'Back to Shop'}
        </Link>

        {/* Hero header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-red-50 text-tm-red text-xs font-sans font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live Support Available
          </div>
          <h1 className="section-title mb-3">Customer Support</h1>
          <p className="text-gray-500 font-body text-base max-w-lg leading-relaxed">
            Our team is ready to assist. Chat with us live or use the contact details below — we&apos;re here to help.
          </p>
        </div>

        {/* ── Order enquiry banner ── */}
        {orderId && !linkedProduct && (
          <div className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-white border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xl">📦</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-blue-600 mb-0.5">Order Enquiry</p>
              <p className="font-sans font-black text-sm uppercase tracking-wide text-tm-navy">{orderId}</p>
              <p className="text-xs text-gray-500 font-body">Asking about a specific order</p>
            </div>
          </div>
        )}

        {/* ── Product enquiry banner ── */}
        {linkedProduct && (
          <div className="mb-8 rounded-2xl border border-red-100 bg-red-50/60 p-4 flex items-center gap-4 shadow-sm">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0 shadow-sm">
              <Image src={linkedProduct.image} alt={linkedProduct.name} fill className="object-cover" sizes="64px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-sans font-bold uppercase tracking-widest text-tm-red mb-0.5">Product Enquiry</p>
              <p className="font-sans font-black text-sm uppercase tracking-wide text-tm-navy truncate">{linkedProduct.name}</p>
              <p className="text-xs text-gray-500 font-body">{linkedProduct.category} · {formatPrice(linkedProduct.price)}</p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
              <span className="font-sans font-black text-xl text-tm-red">{formatPrice(linkedProduct.price)}</span>
              <span className="text-[10px] text-gray-400 font-body">Ask about availability &amp; purchase</span>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: Zap,           label: 'Avg. Response',   value: '< 5 min' },
            { icon: Shield,        label: 'Satisfaction Rate', value: '98%' },
            { icon: MessageCircle, label: 'Chats Today',      value: '24/7' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-tm-red" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-body">{label}</p>
                <p className="text-sm font-sans font-black text-tm-navy">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Chat — takes 2/3 */}
          <div className="lg:col-span-2">
            <SupportChat
              email={user.email}
              userName={user.name}
              linkedProduct={linkedProduct ? {
                id:       linkedProduct.id,
                name:     linkedProduct.name,
                price:    linkedProduct.price,
                image:    linkedProduct.image,
                category: linkedProduct.category,
              } : undefined}
              linkedOrderId={orderId || undefined}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Contact Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50"
                style={{ background: 'linear-gradient(135deg, #0a1929 0%, #1a2f4a 100%)' }}>
                <h2 className="font-sans font-black text-white text-xs uppercase tracking-widest">Contact Information</h2>
                <p className="text-xs text-gray-400 font-body mt-0.5">Reach us directly</p>
              </div>
              <div className="p-5 space-y-4">
                {[
                  { icon: Mail,  label: 'Email',   value: 'admin@charleyhullstores.com',        href: 'mailto:admin@charleyhullstores.com' },
                ].map(({ icon: Icon, label, value, href }) => (
                  <div key={label} className="flex items-start gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-50 group-hover:border-red-100 transition-all">
                      <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-tm-red transition-colors" />
                    </div>
                    <div>
                      <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-gray-400">{label}</p>
                      {href ? (
                        <a href={href} className="text-sm font-body text-tm-navy hover:text-tm-red transition-colors mt-0.5 block whitespace-pre-line">{value}</a>
                      ) : (
                        <p className="text-sm font-body text-gray-600 mt-0.5 whitespace-pre-line">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h3 className="font-sans font-black text-tm-navy text-xs uppercase tracking-widest">Common Issues</h3>
                <p className="text-xs text-gray-400 font-body mt-0.5">Quick help topics</p>
              </div>
              <ul className="p-3 space-y-1">
                {[
                  'Payment declined or failed',
                  'Order tracking & delivery',
                  'Returns & exchanges',
                  'Product warranty claims',
                  'Account & billing',
                ].map((item) => (
                  <li key={item}>
                    <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-body text-gray-600 hover:bg-red-50 hover:text-tm-red transition-all flex items-center gap-2 group">
                      <span className="text-gray-200 group-hover:text-tm-red transition-colors text-base leading-none">›</span>
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <SupportPageInner />
    </Suspense>
  );
}
