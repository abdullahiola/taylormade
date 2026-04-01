'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      router.push(redirect);
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-tm-red text-tm-red text-sm px-4 py-3 font-body">
          {error}
        </div>
      )}
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
            placeholder="••••••••"
            className="input-base pr-12"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-tm-gray-mid hover:text-tm-black transition-colors"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-right mt-1.5">
          <Link href="/forgot-password" className="text-xs font-body text-tm-red hover:underline">
            Forgot password?
          </Link>
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
          <><LogIn className="w-4 h-4" /> Sign In</>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
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
          <h1 className="text-white font-sans font-black uppercase tracking-widest text-sm">Sign In</h1>
          <p className="text-gray-400 text-xs font-body mt-1">Welcome back to the shop</p>
        </div>

        <div className="px-8 py-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <div className="mt-6 pt-6 border-t border-tm-border text-center">
            <p className="text-sm font-body text-tm-gray-mid">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-tm-red font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
