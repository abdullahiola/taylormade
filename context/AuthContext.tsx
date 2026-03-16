'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface User {
  id: string;
  name: string;
  email: string;
  is_admin?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('tm_token');
    const storedUser = localStorage.getItem('tm_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const signup = async (name: string, email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.detail || 'Signup failed.' };
      return { success: true };
    } catch (e) {
      return { success: false, error: `Network error: ${e instanceof Error ? e.message : String(e)}` };
    }
  };

  const verifyEmail = async (email: string, otp: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.detail || 'Verification failed.' };

      // Save session
      localStorage.setItem('tm_token', data.access_token);
      localStorage.setItem('tm_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return { success: true };
    } catch (e) {
      return { success: false, error: `Network error: ${e instanceof Error ? e.message : String(e)}` };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.detail || 'Login failed.' };

      // Save session
      localStorage.setItem('tm_token', data.access_token);
      localStorage.setItem('tm_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
      return { success: true };
    } catch (e) {
      return { success: false, error: `Network error: ${e instanceof Error ? e.message : String(e)}` };
    }
  };

  const logout = () => {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, verifyEmail, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
