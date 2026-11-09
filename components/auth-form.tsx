'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Gift, LoaderCircle, Lock, Mail, UserRound } from 'lucide-react'

type AuthMode = 'login' | 'signup'

type AuthFormProps = {
  mode: AuthMode
}

type AuthUser = {
  role: 'user' | 'planner' | 'admin'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'planner' | 'user'>('planner')
  const [eventName, setEventName] = useState("Maya's Kitchen Party")
  const [eventDate, setEventDate] = useState('2026-11-28')
  const [invitedBy, setInvitedBy] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSignup = mode === 'signup'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (isSignup && name.trim().length < 2) {
      setError('Please enter your full name.')
      return
    }
    if (isSignup && role === 'planner' && !eventName.trim()) {
      setError('Please enter your event name.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(isSignup ? '/api/auth/signup' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isSignup ? { name: name.trim(), email: email.trim(), password, role, eventName: eventName.trim(), eventDate, invitedBy: invitedBy.trim() } : { email: email.trim(), password }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string; user?: AuthUser }
      if (!response.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setIsSubmitting(false)
        return
      }
      const target = data.user?.role === 'admin' ? '/admin' : '/dashboard'
      window.location.href = target
    } catch {
      setError('Could not reach the server. Please try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <Link className="auth-brand" href="/">
        <span className="auth-brand-mark"><Gift aria-hidden="true" /></span>
        <span className="auth-brand-text"><strong>Impahla app</strong><small>PARTY REGISTRY</small></span>
      </Link>

      <div className="auth-card">
        <p className="auth-eyebrow">{isSignup ? 'BEGIN YOUR REGISTRY' : 'WELCOME BACK'}</p>
        <h1>{isSignup ? 'Create your account' : 'Sign in to Impahla app'}</h1>
        <p className="auth-intro">
          {isSignup
            ? 'Keep every promise and every gift in one calm, private place.'
            : 'Your contributions and event records are waiting for you.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isSignup && (
            <>
              <label className="form-field">
                <span>Account Type</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className={`secondary-button ${role === 'planner' ? 'is-selected' : ''}`}
                    onClick={() => setRole('planner')}
                    style={{ justifyContent: 'flex-start', padding: '10px 12px', height: 'auto', textAlign: 'left', borderColor: role === 'planner' ? '#800020' : undefined, background: role === 'planner' ? '#FDFBF7' : undefined }}
                  >
                    <span>
                      <strong style={{ display: 'block', color: '#111827' }}>Event Planner</strong>
                      <small style={{ color: '#374151', display: 'block', fontSize: '10px' }}>Groom, Bride & Planner</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`secondary-button ${role === 'user' ? 'is-selected' : ''}`}
                    onClick={() => setRole('user')}
                    style={{ justifyContent: 'flex-start', padding: '10px 12px', height: 'auto', textAlign: 'left', borderColor: role === 'user' ? '#800020' : undefined, background: role === 'user' ? '#FDFBF7' : undefined }}
                  >
                    <span>
                      <strong style={{ display: 'block', color: '#111827' }}>Contributor</strong>
                      <small style={{ color: '#374151', display: 'block', fontSize: '10px' }}>Guest gifting</small>
                    </span>
                  </button>
                </div>
              </label>

              {role === 'planner' && (
                <div className="form-grid">
                  <label className="form-field">
                    <span>Event Name</span>
                    <input
                      value={eventName}
                      onChange={(event) => setEventName(event.target.value)}
                      placeholder="e.g. Maya's Kitchen Party"
                      maxLength={120}
                      required
                    />
                  </label>
                  <label className="form-field">
                    <span>Event Date</span>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(event) => setEventDate(event.target.value)}
                      required
                    />
                  </label>
                </div>
              )}

              {role === 'user' && (
                <label className="form-field">
                  <span>Event Planner / Couple Email <span className="optional-label">Optional invitation</span></span>
                  <input
                    type="email"
                    value={invitedBy}
                    onChange={(event) => setInvitedBy(event.target.value)}
                    placeholder="planner@example.com"
                  />
                </label>
              )}

              <label className="form-field">
                <span>Full name</span>
                <span className="auth-input-wrap">
                  <UserRound aria-hidden="true" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Chanda Phiri"
                    autoComplete="name"
                    maxLength={120}
                    required
                  />
                </span>
              </label>
            </>
          )}

          <label className="form-field">
            <span>Email address</span>
            <span className="auth-input-wrap">
              <Mail aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </span>
          </label>

          <label className="form-field">
            <span>Password</span>
            <span className="auth-input-wrap">
              <Lock aria-hidden="true" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={8}
                required
              />
            </span>
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="primary-button auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="button-spinner" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
            {isSubmitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? 'Already have an account? ' : 'New to Impahla app? '}
          <Link href={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create one'}</Link>
        </p>
      </div>

      <Link className="auth-back" href="/">← Back to home</Link>
    </div>
  )
}
