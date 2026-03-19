'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'

const loadingMessages = [
  'Unlocking your dreams...',
  'Opening the vault...',
  'Almost there...',
]

export default function SignupPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msgIndex, setMsgIndex] = useState(0)

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

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            window.location.replace('/dashboard')
          }
        }
      )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const check = async () => {
      const { data: { session } } =
        await supabase.auth.getSession()
      if (session) {
        window.location.replace('/dashboard')
      }
    }

    check()
    const interval = setInterval(check, 1000)
    return () => clearInterval(interval)
  }, [])

  function validatePassword(pw: string): string | null {
    if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
      return 'Password must be at least 8 characters and include an uppercase letter, a number, and a symbol.'
    }
    return null
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName.trim(),
          display_name: displayName.trim(),
          timezone,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    window.location.href = '/install'
  }

  async function handleGoogleAuth() {
    setError(null)
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

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="auth-heading text-2xl font-bold text-foreground">Start dreaming</h1>
        <p className="auth-subheading mt-1 text-sm text-muted-foreground">
          Create your free Somnia account
        </p>
      </div>

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

      <form onSubmit={handleSignup} noValidate aria-label="Sign up form">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="display-name"
              className="auth-label mb-1.5 block text-sm font-medium text-foreground"
            >
              Your name
            </label>
            <input
              id="display-name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="form-input"
              placeholder="Alex"
            />
          </div>

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
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              className="form-input"
              placeholder="you@example.com"
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </div>

          <div>
            <label htmlFor="password" className="auth-label mb-1.5 block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Create a password"
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </div>

          {error && (
            <p
              id="signup-error"
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {loading ? (
            <div className="auth-loading-shell" aria-live="polite" aria-busy="true">
              <svg
                width="32"
                height="32"
                viewBox="0 0 100 100"
                style={{ animation: 'moonPulse 2s ease-in-out infinite' }}
                aria-hidden="true"
              >
                <defs>
                  <radialGradient id="somnia-signup-loader" cx="32%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="rgba(240,225,255,1)" />
                    <stop offset="100%" stopColor="rgba(140,80,255,0.6)" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="url(#somnia-signup-loader)" />
                <circle cx="66" cy="44" r="35" fill="#06040f" />
              </svg>
              <span className="auth-loading-message">{loadingMessages[msgIndex]}</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading || !email || !password || !displayName}
              className="btn-primary auth-submit w-full"
              aria-busy={loading}
            >
              Create free account
            </button>
          )}
        </div>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By signing up you agree to our{' '}
        <Link href="/terms" className="auth-text-link underline hover:text-foreground">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="auth-text-link underline hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="auth-text-link font-medium text-primary hover:text-primary/80">
          Sign in
        </Link>
      </p>
    </>
  )
}
