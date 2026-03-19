'use client'

import { Suspense, useEffect, useState } from 'react'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

const loadingMessages = [
  'Unlocking your dreams...',
  'Opening the vault...',
  'Almost there...',
]

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const alreadyConfirmed = searchParams.get('message') === 'already_confirmed'
  const accountCreated = searchParams.get('message') === 'account_created'

  const [mode, setMode] = useState<'password' | 'magic-link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const [missingAccountError, setMissingAccountError] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!loading) {
      setMsgIndex(0)
      return
    }

    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % loadingMessages.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [loading])

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMissingAccountError(false)
    setLoading(true)

    const timeout = setTimeout(() => {
      setLoading(false)
      setError('Taking too long. Please try again.')
    }, 10000)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    clearTimeout(timeout)

    if (error) {
      setLoading(false)
      setError('Invalid email or password.')
      return
    }

    void data
    router.push('/dashboard')
    router.refresh()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMissingAccountError(false)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://www.somniavault.me/auth/callback?next=/dashboard',
      },
    })

    if (error) {
      const normalisedError = error.message.toLowerCase()
      if (normalisedError.includes('not found') || normalisedError.includes('no user')) {
        setMissingAccountError(true)
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    setMagicLinkSent(true)
    setLoading(false)
  }

  async function handleGoogleAuth() {
    setError(null)
    setMissingAccountError(false)
    setLoading(true)

    const isNativeApp =
      window.navigator.userAgent.includes('capacitor') ||
      (window as typeof window & { Capacitor?: unknown }).Capacitor !== undefined

    const redirectTo = isNativeApp
      ? 'me.somniavault.app://login-callback'
      : `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="text-center" role="status" aria-live="polite">
        <div className="mb-4 text-4xl">✉️</div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">Check your email</h2>
        <p className="text-muted-foreground">
          We sent a login link to <strong className="text-foreground">{email}</strong>.
          <br />
          Click the link in the email to sign in.
        </p>
        <button
          onClick={() => setMagicLinkSent(false)}
          className="btn-ghost mt-6 text-sm"
        >
          ← Back to login
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="auth-heading text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="auth-subheading mt-1 text-sm text-muted-foreground">Sign in to your Somnia account</p>
      </div>

      {alreadyConfirmed && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
        >
          Your account is already confirmed. Sign in below.
        </p>
      )}

      {accountCreated && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground"
        >
          Account created! You can sign in now.
        </p>
      )}

      <button
        type="button"
        onClick={handleGoogleAuth}
        disabled={loading}
        className="auth-submit w-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
        aria-label="Continue with Google"
      >
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Mode toggle */}
      <div className="auth-toggle mb-6 flex rounded-lg border border-surface-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`auth-toggle-button flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mode === 'password'
              ? 'auth-toggle-active bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={mode === 'password'}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode('magic-link')}
          className={`auth-toggle-button flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            mode === 'magic-link'
              ? 'auth-toggle-active bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-pressed={mode === 'magic-link'}
        >
          Magic link
        </button>
      </div>

      <form
        onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}
        noValidate
        aria-label={mode === 'password' ? 'Password login form' : 'Magic link login form'}
      >
        <div className="space-y-4">
          {mode === 'magic-link' && (
            <p className="text-sm text-muted-foreground">
              Returning user? Sign in without a password
            </p>
          )}

          <div>
            <label htmlFor="email" className="auth-label mb-1.5 block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
              aria-describedby={missingAccountError ? 'login-missing-account' : error ? 'login-error' : undefined}
            />
            {missingAccountError && (
              <p id="login-missing-account" role="alert" className="mt-2 text-sm text-destructive">
                No account found with that email. Sign up first to get started.{' '}
                <Link href="/signup" className="font-medium underline hover:no-underline">
                  Sign up
                </Link>
              </p>
            )}
          </div>

          {mode === 'password' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="auth-label block text-sm font-medium text-foreground">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setMode('magic-link')}
                  className="auth-alt-link text-xs text-primary hover:text-primary/80"
                >
                  Use magic link instead
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                aria-describedby={error ? 'login-error' : undefined}
              />
            </div>
          )}

          {error && (
            <p
              id="login-error"
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {mode === 'password' && loading ? (
            <div className="auth-loading-shell" aria-live="polite" aria-busy="true">
              <svg
                width="32"
                height="32"
                viewBox="0 0 100 100"
                style={{ animation: 'moonPulse 2s ease-in-out infinite' }}
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="somnia-login-loader" cx="32%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="rgba(240,225,255,1)" />
                    <stop offset="100%" stopColor="rgba(140,80,255,0.6)" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="url(#somnia-login-loader)" />
                <circle cx="66" cy="44" r="35" fill="#06040f" />
              </svg>
              <span className="auth-loading-message">{loadingMessages[msgIndex]}</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary auth-submit w-full"
              aria-busy={loading}
            >
              {mode === 'password' ? 'Sign in' : loading ? 'Sending link...' : 'Send magic link'}
            </button>
          )}

          {mode === 'magic-link' && (
            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll only send a link to registered emails.
            </p>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="auth-text-link font-medium text-primary hover:text-primary/80">
          Sign up free
        </Link>
      </p>
    </>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  )
}
