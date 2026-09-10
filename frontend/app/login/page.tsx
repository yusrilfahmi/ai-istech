'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/chat');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 items-center justify-center px-4"
      style={{ background: 'var(--background)' }}
    >
      <div
        className="w-full max-w-md animate-fade-in"
        style={{
          background: 'var(--sidebar-bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '40px 32px',
        }}
      >
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
            ISE Chatbot
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Sign in to your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm animate-fade-in"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                // @ts-expect-error -- CSS custom property for focus ring
                '--tw-ring-color': 'var(--accent)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none focus:ring-2"
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: '#fff',
            }}
            onMouseOver={(e) => !loading && ((e.target as HTMLElement).style.background = 'var(--accent-hover)')}
            onMouseOut={(e) => ((e.target as HTMLElement).style.background = 'var(--accent)')}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
            Demo credentials: <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--background)' }}>admin@chatbot.com</code> / <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'var(--background)' }}>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
