'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { subscribeToPush } from '@/lib/push-notifications'
import { createClient } from '@/lib/supabase/client'

declare global {
  interface Navigator {
    standalone?: boolean
    MSStream?: unknown
  }
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function getPostInstallPath() {
  const onboardingComplete = localStorage.getItem('onboarding_done') === 'true'
  return onboardingComplete ? '/dashboard' : '/onboarding'
}

export default function InstallPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [message, setMessage] = useState<string | null>(null)
  const [installedReady, setInstalledReady] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !navigator.MSStream
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent)

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
    let mounted = true

    const timer = window.setInterval(() => {
      setCountdown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)

    const handler = (event: Event) => {
      event.preventDefault()
      console.log('[Install] Prompt captured')
      if (!mounted) return
      setPrompt(event as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace('/login?redirectedFrom=%2Finstall')
        return
      }

      if (isStandalone()) {
        router.push(getPostInstallPath())
      }

      if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        const existingSub = await reg.pushManager.getSubscription()
        setNotificationsEnabled(Boolean(existingSub))
      }
    })()

    return () => {
      mounted = false
      window.clearInterval(timer)
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [router, supabase])

  const handleInstall = async () => {
    if (!prompt) return

    prompt.prompt()
    const { outcome } = await prompt.userChoice
    console.log('[Install] Outcome:', outcome)

    if (outcome === 'accepted') {
      localStorage.setItem('somnia_installed', 'true')
      setMessage('Great. Next, enable notifications, then open from your home screen to continue.')
    }
  }

  const handleEnableNotifications = async () => {
    setNotificationError(null)
    const result = await subscribeToPush()
    if (result.success) {
      setNotificationsEnabled(true)
      return
    }

    setNotificationsEnabled(false)
    setNotificationError(result.error || 'Notifications are required for reliable morning/evening windows. Please allow notifications.')
  }

  const handleIOSContinue = () => {
    if (countdown > 0) return

    if (!notificationsEnabled) {
      setMessage('Enable notifications first, then continue from your home screen.')
      return
    }

    if (isStandalone()) {
      localStorage.setItem('somnia_installed', 'true')
      router.push(getPostInstallPath())
      return
    }

    setMessage('Please open Somnia from your home screen icon to continue.')
  }

  return (
    <main className="page-enter" style={{ minHeight: '100vh', background: '#06040f', color: '#efe8ff', display: 'grid', placeItems: 'center', padding: 24 }}>
      <section style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <svg width="56" height="56" viewBox="0 0 100 100" style={{ margin: '0 auto 24px', filter: 'drop-shadow(0 0 20px rgba(180,130,255,0.6))' }}>
          <defs>
            <radialGradient id="install-moon" cx="32%" cy="30%" r="65%">
              <stop offset="0%" stopColor="rgba(240,225,255,1)" />
              <stop offset="100%" stopColor="rgba(140,80,255,0.6)" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="42" fill="url(#install-moon)" />
          <circle cx="66" cy="44" r="35" fill="#06040f" />
        </svg>

        {installedReady ? (
          <div>
            <h1 style={{ fontFamily: "'Cormorant', Georgia, serif", fontStyle: 'italic', fontSize: 'clamp(42px,8vw,58px)', lineHeight: 1.08, marginBottom: 12 }}>
              You're all set.
            </h1>
            <p style={{ color: '#b8a4d7', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 20 }}>
              Now open Somnia from your home screen to continue.
            </p>
            <div style={{ fontSize: 32, opacity: 0.7, marginBottom: 8, animation: 'moonPulse 1.6s ease-in-out infinite' }}>↓</div>
            <p style={{ color: '#9f8abb', fontSize: 13 }}>
              Find the Somnia icon on your home screen and tap it.
            </p>
          </div>
        ) : (
          <>
            <p style={{ letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a995ca', fontSize: 11, marginBottom: 14 }}>Required</p>
            <h1 style={{ fontFamily: "'Cormorant', Georgia, serif", fontStyle: 'italic', fontSize: 'clamp(42px,8vw,58px)', lineHeight: 1.08, marginBottom: 12 }}>
              Add Somnia to your
              <br />
              home screen.
            </h1>
            <p style={{ color: '#b8a4d7', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 24 }}>
              Your morning and evening notifications only work reliably when Somnia is installed on your home screen.
            </p>

            <section style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, background: '#100a22', padding: 16, marginBottom: 14 }}>
              <p style={{ letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a995ca', fontSize: 11, marginBottom: 10 }}>Step 1 - Add to Home Screen</p>

              {isAndroid ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, background: '#100a22', padding: 16 }}>
                <button className="btn-gold" style={{ width: '100%', justifyContent: 'center', opacity: canInstall ? 1 : 0.65 }} disabled={!canInstall} onClick={() => void handleInstall()}>
                  Add to Home Screen
                </button>
                {!canInstall ? (
                  <p style={{ color: '#9f8abb', marginTop: 12, fontSize: 13 }}>Waiting for install prompt from Chrome...</p>
                ) : null}
              </div>
              ) : null}

              {isIOS ? (
              <div style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, background: '#100a22', padding: 16, textAlign: 'left' }}>
                <p style={{ color: '#d6c9eb', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 14 }}>
                  Open Somnia from your home screen to continue setup. This takes less than 30 seconds.
                </p>

                <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 10, alignItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e9defa" strokeWidth="1.8"><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><rect x="4" y="11" width="16" height="9" rx="2" /></svg>
                    <p>Tap the Share button at the bottom of Safari</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 10, alignItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e9defa" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 8v8M8 12h8" /></svg>
                    <p>Tap Add to Home Screen</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 10, alignItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e9defa" strokeWidth="1.8"><path d="M5 12l4 4L19 6" /></svg>
                    <p>Tap Add</p>
                  </div>
                </div>
              </div>
            ) : null}
            </section>

            <section style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, background: '#100a22', padding: 16, marginBottom: 14, textAlign: 'left' }}>
              <p style={{ letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a995ca', fontSize: 11, marginBottom: 10 }}>Step 2 - Enable Notifications</p>
              <p style={{ color: '#d6c9eb', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 12 }}>
                Enable notifications so Somnia can wake you at the right moment.
              </p>
              <button className="btn-gold" style={{ width: '100%', justifyContent: 'center' }} onClick={() => void handleEnableNotifications()}>
                {notificationsEnabled ? 'Notifications Enabled' : 'Enable Notifications'}
              </button>
              {notificationError ? <p style={{ color: '#ffb9ca', marginTop: 10 }}>{notificationError}</p> : null}
            </section>

            <section style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, background: '#100a22', padding: 16, textAlign: 'left' }}>
              <p style={{ letterSpacing: '0.16em', textTransform: 'uppercase', color: '#a995ca', fontSize: 11, marginBottom: 10 }}>Step 3 - Open from Home Screen</p>
              <p style={{ color: '#d6c9eb', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 12 }}>
                Open from home screen to continue.
              </p>
              <button className="btn-ghost-gold" style={{ width: '100%', justifyContent: 'center', opacity: countdown > 0 ? 0.45 : 1 }} disabled={countdown > 0} onClick={handleIOSContinue}>
                {countdown > 0 ? `I've added it - continue (${countdown})` : "I've added it - continue ->"}
              </button>
              {message ? <p style={{ color: '#ffb9ca', marginTop: 10 }}>{message}</p> : null}
            </section>
          </>
        )}
      </section>
    </main>
  )
}
