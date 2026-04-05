'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react';

import { API_URL as API } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong.');
      setSuccess(data.message);
      setStep('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong.');
      setSuccess(data.message);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter min-h-[80vh] flex items-center justify-center px-4 py-16 bg-tm-gray">
      <div className="w-full max-w-md bg-white border border-tm-border shadow-sm">
        {/* Header */}
        <div className="bg-tm-navy px-8 py-8 text-center">
          <div className="mb-2">
            <span className="font-sans font-black text-2xl text-white uppercase tracking-tight">
              Charley<span className="text-tm-red"> Hull</span>
            </span>
          </div>
          <h1 className="text-white font-sans font-black uppercase tracking-widest text-sm">
            {step === 'email' ? 'Reset Password' : 'Enter Reset Code'}
          </h1>
          <p className="text-gray-400 text-xs font-body mt-1">
            {step === 'email'
              ? 'Enter your email to receive a reset code'
              : `Code sent to ${email}`}
          </p>
        </div>

        <div className="px-8 py-8">
          {error && (
            <div className="bg-red-50 border border-tm-red text-tm-red text-sm px-4 py-3 font-body mb-5">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-500 text-green-700 text-sm px-4 py-3 font-body mb-5">
              {success}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="input-base"
                  autoComplete="email"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Mail className="w-4 h-4" /> Send Reset Code</>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">
                  Reset Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="– – – – – –"
                  className="input-base text-center text-2xl tracking-[0.5em] font-mono"
                  maxLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="input-base pr-12"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tm-gray-mid hover:text-tm-black transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><KeyRound className="w-4 h-4" /> Reset Password</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); setSuccess(''); }}
                className="w-full text-center text-xs font-body text-tm-gray-mid hover:text-tm-red transition-colors"
              >
                Didn&apos;t receive a code? Try again
              </button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-tm-border text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-body text-tm-gray-mid hover:text-tm-red transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
