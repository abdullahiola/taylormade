'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User, Headphones, Paperclip, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { formatPrice } from '@/lib/products';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
  timestamp: Date;
  mediaUrl?: string;
  status?: 'sending' | 'sent';
}

interface LinkedProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}

interface SupportChatProps {
  email: string;
  userName?: string;
  linkedProduct?: LinkedProduct;
  linkedOrderId?: string;
}

import { API_URL } from '@/lib/api';

export default function SupportChat({ email, userName, linkedProduct, linkedOrderId }: SupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  useEffect(() => {
    if (!email || initialized) return;
    const initSession = async () => {
      const storedSessionId = localStorage.getItem(`tm_chat_session_${email}`);
      if (storedSessionId) {
        try {
          const res = await fetch(`${API_URL}/api/chat/history?sessionId=${storedSessionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
              setSessionId(storedSessionId);
              const restored: Message[] = data.messages.map(
                (msg: { id: string; text: string; sender: string; timestamp: string; media_url?: string }) => ({
                  id: msg.id, text: msg.text,
                  sender: msg.sender as 'bot' | 'user',
                  timestamp: new Date(msg.timestamp),
                  mediaUrl: msg.media_url ? `${API_URL}${msg.media_url}` : undefined,
                  status: 'sent',
                })
              );
              setMessages(restored);
              lastMessageIdRef.current = restored[restored.length - 1].id;
              setInitialized(true);
              inputRef.current?.focus();
              return;
            }
          }
        } catch { /* fall through */ }
      }

      try {
        const res = await fetch(`${API_URL}/api/chat/find?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.sessionId) {
            localStorage.setItem(`tm_chat_session_${email}`, data.sessionId);
            setSessionId(data.sessionId);
            const histRes = await fetch(`${API_URL}/api/chat/history?sessionId=${data.sessionId}`);
            if (histRes.ok) {
              const histData = await histRes.json();
              if (histData.messages && histData.messages.length > 0) {
                const restored: Message[] = histData.messages.map(
                  (msg: { id: string; text: string; sender: string; timestamp: string; media_url?: string }) => ({
                    id: msg.id, text: msg.text,
                    sender: msg.sender as 'bot' | 'user',
                    timestamp: new Date(msg.timestamp),
                    mediaUrl: msg.media_url ? `${API_URL}${msg.media_url}` : undefined,
                    status: 'sent',
                  })
                );
                setMessages(restored);
                lastMessageIdRef.current = restored[restored.length - 1].id;
                setInitialized(true);
                inputRef.current?.focus();
                return;
              }
            }
          }
        }
      } catch { /* fall through */ }

      const newId = `tm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`tm_chat_session_${email}`, newId);
      setSessionId(newId);
      setIsTyping(true);

      // Build welcome + optional context
      const welcomeText = linkedProduct
        ? `Hi ${userName || 'there'}! 👋 I'm interested in the **${linkedProduct.name}** (${formatPrice(linkedProduct.price)}) and would like to enquire about purchasing it.`
        : linkedOrderId
        ? `Hi ${userName || 'there'}! 👋 I have a question about my order **${linkedOrderId}**.`
        : `Hi ${userName || 'there'}! 👋 Welcome to Charley Stores Support. How can we help you today?`;

      setTimeout(() => {
        setIsTyping(false);
        const welcomeMsg: Message = {
          id: 'welcome',
          text: `Hi ${userName || 'there'}! 👋 Welcome to Charley Stores Support.${
            linkedProduct
              ? ` I can see you're interested in the **${linkedProduct.name}**. How can I help?`
              : linkedOrderId
              ? ` I can see you have a question about order **${linkedOrderId}**. How can I help?`
              : ' How can we help you today?'
          }`,
          sender: 'bot',
          timestamp: new Date(),
          status: 'sent',
        };
        setMessages([welcomeMsg]);

        // Auto-send product enquiry message from user
        if (linkedProduct) {
          setTimeout(async () => {
            const autoMsg: Message = {
              id: `user-auto-${Date.now()}`,
              text: welcomeText,
              sender: 'user',
              timestamp: new Date(),
              status: 'sending',
            };
            setMessages((prev) => [...prev, autoMsg]);
            try {
              await fetch(`${API_URL}/api/chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: newId, email, message: welcomeText }),
              });
              setMessages((prev) => prev.map((m) => m.id === autoMsg.id ? { ...m, status: 'sent' } : m));
            } catch { /* silent */ }
          }, 800);
        }
      }, 1400);

      setInitialized(true);
      inputRef.current?.focus();
    };
    initSession();
  }, [email, userName, initialized]);

  useEffect(() => {
    if (!sessionId || !initialized) return;
    const pollMessages = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/chat/messages?sessionId=${sessionId}&lastId=${lastMessageIdRef.current || ''}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            const truly_new: Message[] = [];
            for (const msg of data.messages) {
              if (!seenMessageIdsRef.current.has(msg.id)) {
                seenMessageIdsRef.current.add(msg.id);
                truly_new.push({
                  id: msg.id,
                  text: msg.text,
                  sender: 'bot' as const,
                  timestamp: new Date(msg.timestamp),
                  mediaUrl: msg.media_url,
                  status: 'sent',
                });
              }
            }
            if (truly_new.length > 0) {
              setMessages((prev) => [...prev, ...truly_new]);
              lastMessageIdRef.current = truly_new[truly_new.length - 1].id;
            }
          }
        }
      } catch { /* silent */ }
    };
    const interval = setInterval(pollMessages, 2000);
    return () => clearInterval(interval);
  }, [sessionId, initialized]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !sessionId) return;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
      status: 'sending',
    };
    setMessages((prev) => [...prev, userMsg]);
    const text = inputValue.trim();
    setInputValue('');
    inputRef.current?.focus();
    try {
      await fetch(`${API_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email, message: text }),
      });
      setMessages((prev) => prev.map((m) => m.id === userMsg.id ? { ...m, status: 'sent' } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === userMsg.id ? { ...m, status: 'sent' } : m));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    const previewUrl = URL.createObjectURL(file);
    const tempMsg: Message = {
      id: `user-upload-${Date.now()}`,
      text: `📷 ${file.name}`,
      sender: 'user',
      timestamp: new Date(),
      mediaUrl: previewUrl,
      status: 'sending',
    };
    setMessages((prev) => [...prev, tempMsg]);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);
      formData.append('email', email);
      const res = await fetch(`${API_URL}/api/chat/upload`, { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => prev.map((m) => m.id === tempMsg.id
          ? { ...m, mediaUrl: `${API_URL}${data.media_url}`, status: 'sent' } : m));
      }
    } catch { /* silent */ }
    finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const shouldShowTime = (index: number) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const curr = messages[index];
    if (prev.sender !== curr.sender) return true;
    return curr.timestamp.getTime() - prev.timestamp.getTime() > 120000;
  };

  if (!initialized) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden" style={{ minHeight: '480px' }}>
        <div className="h-full flex items-center justify-center p-16">
          <div className="flex flex-col items-center gap-4 text-gray-400">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <Headphones className="w-6 h-6 text-tm-red" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-tm-red rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-tm-red rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-tm-red rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm font-body text-gray-400">Connecting to support...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden flex flex-col" style={{ height: '580px' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3.5 px-5 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(135deg, #0a1929 0%, #1a2f4a 100%)' }}>
        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full bg-tm-red flex items-center justify-center shadow-lg">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white shadow-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-sans font-black text-white text-sm tracking-wide">Charley Stores Support</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-300 font-body">Live · Usually responds in &lt;5 min</span>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-0.5">
          <span className="text-xs text-gray-400 font-body">{userName || email.split('@')[0]}</span>
          <span className="text-[10px] text-gray-500 font-body truncate max-w-32">{email}</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ background: '#f9fafb' }}>

        {/* Linked product card */}
        {linkedProduct && (
          <div className="rounded-xl border border-red-100 bg-white shadow-sm p-3 flex items-center gap-3 mb-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
              <Image src={linkedProduct.image} alt={linkedProduct.name} fill className="object-cover" sizes="48px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-tm-red">Product Enquiry</p>
              <p className="text-xs font-sans font-black text-tm-navy truncate">{linkedProduct.name}</p>
              <p className="text-xs text-gray-400 font-body">{formatPrice(linkedProduct.price)}</p>
            </div>
            <a
              href={`/shop/${linkedProduct.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex-shrink-0 text-gray-300 hover:text-tm-red transition-colors"
              title="View product"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Date label */}
        {messages.length > 0 && (
          <div className="flex items-center justify-center py-3">
            <span className="text-[11px] text-gray-400 font-body bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">
              {formatDateLabel(messages[0].timestamp)}
            </span>
          </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.sender === 'user';
          const isFirstInGroup = index === 0 || messages[index - 1].sender !== message.sender;
          const isLastInGroup = index === messages.length - 1 || messages[index + 1]?.sender !== message.sender;
          const showTime = shouldShowTime(index);

          return (
            <div key={message.id} className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 transition-opacity ${isLastInGroup ? 'opacity-100' : 'opacity-0'}`}>
                {!isUser ? (
                  <div className="w-8 h-8 rounded-full bg-tm-red flex items-center justify-center shadow-sm">
                    <Headphones className="w-3.5 h-3.5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
                {isFirstInGroup && !isUser && (
                  <span className="text-[11px] text-gray-400 font-body ml-1 mb-1">Charley Stores Support</span>
                )}
                <div className={`px-4 py-2.5 text-sm font-body leading-relaxed shadow-sm ${
                  isUser
                    ? 'bg-tm-red text-white rounded-2xl rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-sm'
                }`}>
                  {message.mediaUrl && (
                    <div className="mb-2 -mx-1">
                      <img
                        src={message.mediaUrl}
                        alt="Uploaded"
                        className="rounded-xl max-h-52 object-contain"
                        style={{ maxWidth: '240px' }}
                      />
                    </div>
                  )}
                  {!message.mediaUrl && <p className="whitespace-pre-wrap">{message.text}</p>}
                  {message.mediaUrl && !message.text.startsWith('📷') && (
                    <p className="whitespace-pre-wrap mt-1">{message.text}</p>
                  )}
                </div>
                {isLastInGroup && showTime && (
                  <div className={`flex items-center gap-1 mt-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-gray-400 font-body px-1">{formatTime(message.timestamp)}</span>
                    {isUser && message.status === 'sending' && (
                      <span className="text-[10px] text-gray-300 font-body">Sending…</span>
                    )}
                    {isUser && message.status === 'sent' && (
                      <svg className="w-3 h-3 text-tm-red opacity-60" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 mt-3">
            <div className="w-8 h-8 rounded-full bg-tm-red flex items-center justify-center shadow-sm flex-shrink-0">
              <Headphones className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ── */}
      <div className="border-t border-gray-100 bg-white px-4 py-3">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 font-body">
            <div className="w-3 h-3 border border-tm-red border-t-transparent rounded-full animate-spin" />
            Uploading image…
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach image"
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center text-gray-400 hover:text-tm-red hover:bg-red-50 transition-all disabled:opacity-30"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message…"
              className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-body text-gray-800 placeholder-gray-400 focus:outline-none focus:border-tm-red focus:bg-white transition-all pr-10"
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all"
            style={{
              background: inputValue.trim() ? '#CC0000' : '#e5e7eb',
              boxShadow: inputValue.trim() ? '0 4px 12px rgba(204,0,0,0.3)' : 'none',
            }}
          >
            <Send className="w-3.5 h-3.5 text-white" style={{ transform: 'translateX(1px)' }} />
          </button>
        </form>

        <p className="text-center text-[10px] text-gray-300 font-body mt-2">
          Secured · {email}
        </p>
      </div>
    </div>
  );
}
