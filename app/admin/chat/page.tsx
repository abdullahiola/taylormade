'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Send, Headphones, User, RefreshCw,
  MessageSquare, Mail, Search, Circle, CheckCheck,
  Clock, Image as ImageIcon, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

import { API_URL } from '@/lib/api';

interface SessionSummary {
  email: string;
  created_at: string;
  last_customer_message: string;
  unread_count: number;
  message_count: number;
  last_message_preview: string;
  last_sender: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  mediaUrl?: string;
}

export default function AdminChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<Record<string, SessionSummary>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(true);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    if (!authLoading && user && !user.is_admin) router.push('/');
  }, [user, authLoading, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Fetch all session summaries ────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || {});
        setOnline(true);
      } else {
        setOnline(false);
      }
    } catch {
      setOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading || !user?.is_admin) return;
    fetchSessions();
    const interval = setInterval(fetchSessions, 4000);
    return () => clearInterval(interval);
  }, [fetchSessions, authLoading, user]);

  // ── Load messages for selected session ────────────────────────────────────
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/chat/history?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = (data.messages || []).map(
          (msg: { id: string; text: string; sender: string; timestamp: string; media_url?: string }) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender as 'bot' | 'user',
            timestamp: new Date(msg.timestamp),
            mediaUrl: msg.media_url ? `${API_URL}${msg.media_url}` : undefined,
          })
        );
        setMessages(msgs);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    const interval = setInterval(() => loadMessages(activeSessionId), 3000);
    return () => clearInterval(interval);
  }, [activeSessionId, loadMessages]);

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    await loadMessages(sessionId);
    // Mark as read
    fetch(`${API_URL}/api/chat/sessions/${sessionId}/read`, { method: 'POST' }).catch(() => {});
    // Optimistically clear badge
    setSummary((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], unread_count: 0 },
    }));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Send reply ─────────────────────────────────────────────────────────────
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeSessionId) return;

    setSending(true);
    const replyText = inputValue.trim();
    setInputValue('');

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      { id: `bot-opt-${Date.now()}`, text: replyText, sender: 'bot', timestamp: new Date() },
    ]);

    try {
      await fetch(`${API_URL}/api/chat/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId, message: replyText }),
      });
    } catch { /* silent */ }

    setSending(false);
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatRelative = (isoStr: string) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (authLoading || !user?.is_admin) return null;

  const filteredSessions = Object.entries(summary)
    .filter(([, s]) =>
      !search || s.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort(([, a], [, b]) =>
      new Date(b.last_customer_message || b.created_at).getTime() -
      new Date(a.last_customer_message || a.created_at).getTime()
    );

  const totalUnread = Object.values(summary).reduce((acc, s) => acc + (s.unread_count || 0), 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f172a' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-tm-red flex items-center justify-center">
              <Headphones className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-white font-sans font-black text-xs uppercase tracking-widest">Support Inbox</span>
              {totalUnread > 0 && (
                <span className="ml-2 bg-tm-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {online ? (
              <><Wifi className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-green-400 font-body">Live</span></>
            ) : (
              <><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-red-400 font-body">Offline</span></>
            )}
          </div>
          <button
            onClick={fetchSessions}
            className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>

        {/* ── Session sidebar ── */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/10" style={{ background: '#111827' }}>

          {/* Search */}
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-tm-red/50 transition-colors font-body"
              />
            </div>
          </div>

          {/* Session count */}
          <div className="px-4 py-2 border-b border-white/5">
            <span className="text-[10px] text-white/30 font-body uppercase tracking-widest">
              {filteredSessions.length} conversation{filteredSessions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-tm-red border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <MessageSquare className="w-10 h-10 text-white/10 mb-3" />
                <p className="text-xs text-white/30 font-body">No conversations yet</p>
              </div>
            ) : (
              filteredSessions.map(([id, s]) => {
                const isActive = activeSessionId === id;
                const hasUnread = (s.unread_count || 0) > 0;
                return (
                  <button
                    key={id}
                    onClick={() => selectSession(id)}
                    className={`w-full text-left px-4 py-3.5 border-b border-white/5 hover:bg-white/5 transition-all relative ${
                      isActive ? 'bg-white/8' : ''
                    }`}
                    style={isActive ? { background: 'rgba(204,0,0,0.12)', borderLeft: '2px solid #CC0000' } : {}}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          isActive ? 'bg-tm-red' : 'bg-white/10'
                        }`}>
                          {s.email.charAt(0).toUpperCase()}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-tm-red rounded-full border border-gray-900" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-xs font-sans font-bold truncate ${isActive ? 'text-white' : 'text-white/70'}`}>
                            {s.email}
                          </p>
                          <span className="text-[10px] text-white/30 font-body ml-2 flex-shrink-0">
                            {formatRelative(s.last_customer_message || s.created_at)}
                          </span>
                        </div>
                        <p className={`text-[11px] font-body truncate ${hasUnread ? 'text-white/60 font-semibold' : 'text-white/30'}`}>
                          {s.last_sender === 'bot' && '↩ '}
                          {s.last_message_preview || 'No messages'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] text-white/20 font-body">{s.message_count} msg{s.message_count !== 1 ? 's' : ''}</span>
                          {hasUnread && (
                            <span className="bg-tm-red text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              {s.unread_count} new
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col" style={{ background: '#1e293b' }}>
          {!activeSessionId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Headphones className="w-8 h-8 text-white/20" />
              </div>
              <h2 className="font-sans font-black text-white/40 uppercase tracking-widest text-sm mb-2">
                Select a Conversation
              </h2>
              <p className="text-xs text-white/20 font-body max-w-xs">
                Pick a customer conversation from the left panel to start replying.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="w-9 h-9 rounded-full bg-tm-red flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {(summary[activeSessionId]?.email || 'C').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-white/30" />
                    <p className="font-sans font-bold text-white text-sm truncate">
                      {summary[activeSessionId]?.email || 'Customer'}
                    </p>
                  </div>
                  <p className="text-[10px] text-white/30 font-body mt-0.5">
                    Session: {activeSessionId.slice(0, 28)}…
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-2 h-2 fill-green-400 text-green-400 animate-pulse" />
                  <span className="text-xs text-green-400 font-body">Active</span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">

                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-10 h-10 text-white/10 mb-2" />
                    <p className="text-xs text-white/20 font-body">No messages yet</p>
                  </div>
                )}

                {messages.map((msg, index) => {
                  const isCustomer = msg.sender === 'user';
                  const isFirstInGroup = index === 0 || messages[index - 1].sender !== msg.sender;
                  const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender !== msg.sender;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isCustomer ? 'flex-row' : 'flex-row-reverse'} items-end gap-2 ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 transition-opacity ${isLastInGroup ? 'opacity-100' : 'opacity-0'}`}>
                        {isCustomer ? (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-white/50" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-tm-red flex items-center justify-center">
                            <Headphones className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Bubble */}
                      <div className={`flex flex-col max-w-[70%] ${isCustomer ? 'items-start' : 'items-end'}`}>
                        {isFirstInGroup && (
                          <span className="text-[10px] text-white/30 font-body mb-1 px-1">
                            {isCustomer ? 'Customer' : 'You (Support)'}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 text-sm font-body leading-relaxed shadow-sm ${
                          isCustomer
                            ? 'text-white/90 rounded-2xl rounded-bl-sm'
                            : 'text-white rounded-2xl rounded-br-sm'
                        }`}
                          style={isCustomer
                            ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }
                            : { background: '#CC0000' }
                          }
                        >
                          {msg.mediaUrl && (
                            <div className="mb-2">
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="rounded-xl max-h-48 object-contain"
                                style={{ maxWidth: '240px' }}
                              />
                            </div>
                          )}
                          {!msg.mediaUrl && <p className="whitespace-pre-wrap">{msg.text}</p>}
                          {msg.mediaUrl && !msg.text.startsWith('📷') && (
                            <p className="whitespace-pre-wrap mt-1 text-xs opacity-70">{msg.text}</p>
                          )}
                        </div>
                        {isLastInGroup && (
                          <div className={`flex items-center gap-1 mt-1 px-1 ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
                            <Clock className="w-2.5 h-2.5 text-white/20" />
                            <span className="text-[10px] text-white/25 font-body">{formatTime(msg.timestamp)}</span>
                            {!isCustomer && <CheckCheck className="w-3 h-3 text-tm-red/60" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="border-t border-white/10 px-4 py-3 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.03)' }}>
                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Type your reply to the customer…"
                      className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-body text-white placeholder-white/25 focus:outline-none focus:border-tm-red/50 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || sending}
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30"
                    style={{
                      background: inputValue.trim() && !sending ? '#CC0000' : 'rgba(255,255,255,0.08)',
                      boxShadow: inputValue.trim() && !sending ? '0 0 16px rgba(204,0,0,0.4)' : 'none',
                    }}
                  >
                    <Send className="w-4 h-4 text-white" style={{ transform: 'translateX(1px)' }} />
                  </button>
                </form>
                <p className="text-[10px] text-white/15 font-body text-center mt-2">
                  Replying as Charley Stores Support · Your reply delivers instantly to the customer
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
