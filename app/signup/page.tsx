'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserPlus, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Step = 'form' | 'otp';

export default function SignupPage() {
  const { signup, verifyEmail } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [otp, setOtp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Step 1: Submit signup form
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    const result = await signup(form.name, form.email, form.password);
    setLoading(false);

    if (result.success) {
      setStep('otp');
    } else {
      setError(result.error || 'Signup failed. Please try again.');
    }
  };

  // Step 2: Verify OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Please enter the 6-digit code.'); return; }

    setLoading(true);
    const result = await verifyEmail(form.email, otp);
    setLoading(false);

    if (result.success) {
      router.push('/shop');
    } else {
      setError(result.error || 'Verification failed.');
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResending(true);
    setError('');
    const result = await signup(form.name, form.email, form.password);
    setResending(false);
    if (result.success) {
      setError('');
    } else {
      setError(result.error || 'Failed to resend code.');
    }
  };

  return (
    <div className="page-enter min-h-[80vh] flex items-center justify-center px-4 py-16 bg-tm-gray">
      <div className="w-full max-w-md bg-white border border-tm-border shadow-sm">
        {/* Header */}
        <div className="bg-tm-navy px-8 py-8 text-center">
          <div className="mb-2">
            <span className="font-sans font-black text-2xl text-white uppercase tracking-tight">
              Taylor<span className="text-tm-red">Made</span>
            </span>
          </div>
          <h1 className="text-white font-sans font-black uppercase tracking-widest text-sm">
            {step === 'form' ? 'Create Account' : 'Verify Your Email'}
          </h1>
          <p className="text-gray-400 text-xs font-body mt-1">
            {step === 'form' ? 'Join Charley Stores' : `Code sent to ${form.email}`}
          </p>
        </div>

        <div className="px-8 py-8">
          {/* ── STEP 1: Signup Form ── */}
          {step === 'form' && (
            <form onSubmit={handleSignup} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-tm-red text-tm-red text-sm px-4 py-3 font-body">{error}</div>
              )}

              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="John Smith"
                  className="input-base"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="you@example.com"
                  className="input-base"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="Min. 6 characters"
                    className="input-base pr-12"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tm-gray-mid hover:text-tm-black transition-colors">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                  placeholder="Repeat your password"
                  className="input-base"
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><UserPlus className="w-4 h-4" /> Create Account</>
                }
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerify} className="space-y-5">
              {/* Icon */}
              <div className="flex flex-col items-center text-center mb-2">
                <div className="w-14 h-14 bg-tm-gray border border-tm-border flex items-center justify-center mb-3">
                  <Mail className="w-7 h-7 text-tm-red" />
                </div>
                <p className="text-sm font-body text-tm-gray-dark leading-relaxed">
                  We sent a <strong>6-digit verification code</strong> to<br />
                  <span className="text-tm-black font-bold">{form.email}</span>.
                </p>
                <p className="text-xs text-tm-gray-mid font-body mt-1">Check your inbox (and spam folder).</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-tm-red text-tm-red text-sm px-4 py-3 font-body">{error}</div>
              )}

              <div>
                <label className="block text-xs font-sans font-bold uppercase tracking-widest mb-1.5 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="000000"
                  maxLength={6}
                  className="input-base text-center text-3xl font-black tracking-[0.5em] font-sans py-4"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className={`btn-primary w-full flex items-center justify-center gap-2 ${
                  loading || otp.length < 6 ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <><CheckCircle className="w-4 h-4" /> Verify Email</>
                }
              </button>

              {/* Resend + Back */}
              <div className="flex items-center justify-between pt-2 text-xs font-body">
                <button
                  type="button"
                  onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                  className="text-tm-gray-mid hover:text-tm-black transition-colors"
                >
                  ← Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-tm-red hover:underline flex items-center gap-1 font-bold"
                >
                  {resending && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Resend code
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-6 border-t border-tm-border text-center">
            <p className="text-sm font-body text-tm-gray-mid">
              Already have an account?{' '}
              <Link href="/login" className="text-tm-red font-bold hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
