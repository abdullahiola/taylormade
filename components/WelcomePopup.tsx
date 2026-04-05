'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, Car } from 'lucide-react';

export default function WelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('cs_welcome_seen')) return;
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('cs_welcome_seen', '1');
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="relative bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ animation: 'popupSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Top gradient banner */}
        <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-8 pt-10 pb-8 text-center overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          {/* Icon */}
          <div className="relative inline-flex mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-white font-sans font-black uppercase tracking-[0.1em] text-xl mb-2">
            Welcome to Charley Stores
          </h2>
          <p className="text-gray-400 text-sm font-body leading-relaxed">
            The official home of premium golf equipment
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-7">
          {/* Perk 1 */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-yellow-500/15 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-sans font-black uppercase tracking-wider text-gray-800 mb-1">
                Personally Signed by Charley Hull
              </h3>
              <p className="text-xs text-gray-500 font-body leading-relaxed">
                Every item you purchase will be personally signed by Charley Hull herself — making each piece a genuine collector&apos;s item.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 mb-5" />

          {/* Perk 2 */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-green-500/15 flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-sans font-black uppercase tracking-wider text-gray-800 mb-1">
                Exclusive One-on-One Session
              </h3>
              <p className="text-xs text-gray-500 font-body leading-relaxed">
                Golf car purchasers will be given a chance to have a one-on-one session with Charley Hull — a once-in-a-lifetime experience!
              </p>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={dismiss}
            className="block w-full text-center bg-gradient-to-r from-red-600 to-red-500 text-white font-sans font-black uppercase tracking-wider text-sm py-3.5 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-red-500/20"
          >
            Start Shopping
          </button>

          <p className="text-center text-[10px] text-gray-400 font-body mt-4">
            Free shipping on your first purchase · 30-day returns
          </p>
        </div>
      </div>
    </div>
  );
}
