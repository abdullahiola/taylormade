'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, X, Headphones } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { API_URL } from '@/lib/api';

export default function SupportBubble() {
  const { user }  = useAuth();
  const router    = useRouter();
  const pathname  = usePathname();

  const [hasUnread, setHasUnread] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed]     = useState(false);

  // Hide on admin pages and on the support page itself
  const isHidden =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/support') ||
    (user?.is_admin === true);

  // Poll for unread replies (only for logged-in customers)
  useEffect(() => {
    if (!user || user.is_admin) return;

    const check = async () => {
      try {
        const findRes = await fetch(
          `${API_URL}/api/chat/find?email=${encodeURIComponent(user.email)}`
        );
        if (!findRes.ok) return;
        const { sessionId } = await findRes.json();
        if (!sessionId) return;

        const msgRes = await fetch(
          `${API_URL}/api/chat/messages?sessionId=${sessionId}&lastId=`
        );
        if (!msgRes.ok) return;
        const data = await msgRes.json();
        if (data.messages?.length > 0) {
          setHasUnread(true);
          setDismissed(false);
        }
      } catch { /* silent */ }
    };

    check();
    const interval = setInterval(check, 8000);
    return () => clearInterval(interval);
  }, [user]);

  if (isHidden) return null;

  const handleClick = () => {
    if (!user) {
      router.push('/login?redirect=/support');
    } else {
      router.push('/support');
    }
  };

  return (
    <>
      {/* Tooltip bubble */}
      {showTooltip && !dismissed && (
        <div className="fixed bottom-[88px] right-6 z-50 animate-fade-in">
          <div
            className="relative bg-white rounded-2xl px-4 py-3 max-w-[210px] shadow-xl"
            style={{ border: '1px solid rgba(0,0,0,0.08)' }}
          >
            {/* Dismiss X */}
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed(true); setShowTooltip(false); }}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm"
            >
              <X className="w-2.5 h-2.5 text-gray-500" />
            </button>

            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-tm-red flex items-center justify-center flex-shrink-0 mt-0.5">
                <Headphones className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="font-sans font-black text-xs uppercase tracking-wide text-gray-900 leading-tight">
                  {hasUnread ? '💬 New reply!' : 'Need help?'}
                </p>
                <p className="text-[11px] text-gray-500 font-body mt-0.5 leading-relaxed">
                  {hasUnread
                    ? 'Support replied to your message.'
                    : 'Chat with Charley Stores support — we\'re here!'}
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div
              className="absolute -bottom-[7px] right-[22px] w-3.5 h-3.5 bg-white rotate-45"
              style={{ border: '1px solid rgba(0,0,0,0.08)', borderTop: 'none', borderLeft: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        id="support-bubble"
        onClick={handleClick}
        onMouseEnter={() => { if (!dismissed) setShowTooltip(true); }}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Open customer support"
        className="fixed bottom-6 right-6 z-[9999] group"
      >
        {/* Ripple on unread */}
        {hasUnread && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(204,0,0,0.3)' }}
          />
        )}

        <div
          className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #e3000f 0%, #9b0000 100%)',
            boxShadow: '0 6px 24px rgba(204,0,0,0.45)',
          }}
        >
          <MessageCircle className="w-6 h-6 text-white" />

          {/* Unread dot */}
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
          )}
        </div>
      </button>
    </>
  );
}
