import { useEffect, useRef, useState } from 'react'
import { ShieldPlus, Mail, Lock, User as UserIcon, CircleCheck as CheckCircle, Stethoscope, UserRound, ArrowLeft } from 'lucide-react'
import { useAuth, type Role } from '../lib/auth'

// Bug fix: "Receptionist" used to be a pickable role on public signup, so
// anyone could give themselves the reception desk. Reception is now a fixed,
// admin-only account (see server/.env RECEPTION_EMAIL/RECEPTION_PASSWORD) -
// the public form only ever creates patients or doctors.
const roles: { value: Role; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { value: 'patient', label: 'Patient', icon: UserRound },
  { value: 'doctor', label: 'Doctor', icon: Stethoscope },
]

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || ''

// Renders Google's own "Sign in with Google" button via Google Identity
// Services (loaded on demand - no extra npm dependency). Silently renders
// nothing if VITE_GOOGLE_CLIENT_ID isn't configured, so the rest of the
// login form still works without it.
function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    let cancelled = false

    function render() {
      if (cancelled || !divRef.current) return
      const w = window as unknown as { google?: any }
      if (!w.google) return
      w.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => onCredential(resp.credential),
      })
      w.google.accounts.id.renderButton(divRef.current, { theme: 'outline', size: 'large', width: 340 })
    }

    const existing = document.getElementById('google-identity-script')
    if (existing) {
      render()
      return
    }
    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = render
    document.head.appendChild(script)
    return () => { cancelled = true }
  }, [onCredential])

  if (!GOOGLE_CLIENT_ID) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div ref={divRef} />
    </div>
  )
}

export default function Login({ onBack }: { onBack?: () => void }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('patient')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter both email and password'); return }
    if (mode === 'signup') {
      const strong = password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
      if (!strong) { setError('Password must be at least 8 characters and include a letter and a number'); return }
      if (!fullName.trim()) { setError('Please enter your full name'); return }
    }
    setSubmitting(true)
    setError(null)
    const result = mode === 'signin' ? await signIn(email, password) : await signUp(email, password, fullName.trim(), role)
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    if (mode === 'signup') setSignupDone(true)
  }

  const handleGoogleCredential = async (credential: string) => {
    setSubmitting(true)
    setError(null)
    const result = await signInWithGoogle(credential)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg)' }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 32, position: 'relative' }}>
        {onBack && (
          <button
            onClick={onBack}
            className="btn btn-ghost btn-sm"
            style={{ position: 'absolute', top: 16, left: 16, padding: '6px 10px' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-500)', display: 'grid', placeItems: 'center' }}>
            <ShieldPlus color="white" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-h)' }}>MediCare+</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Health Hub</div>
          </div>
        </div>

        {signupDone ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="var(--success-500)" />
            </div>
            <h3 style={{ marginBottom: 8 }}>Account created</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              You're signed in and ready to go.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setSignupDone(false); setMode('signin') }}>
              Go to sign in
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              {mode === 'signin' ? 'Sign in to access your health dashboard' : 'Sign up to get started'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <div>
                  <label className="label">I am a...</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {roles.map((r) => (
                      <button
                        type="button"
                        key={r.value}
                        onClick={() => setRole(r.value)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          padding: '12px 8px', borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${role === r.value ? 'var(--primary-500)' : 'var(--border)'}`,
                          background: role === r.value ? 'var(--primary-50)' : 'var(--surface)',
                          color: role === r.value ? 'var(--primary-700)' : 'var(--text)',
                        }}
                      >
                        <r.icon size={18} color={role === r.value ? 'var(--primary-600)' : 'var(--text-muted)'} />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" style={{ paddingLeft: 36 }} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 36 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 36 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters, incl. a letter & number' : 'Your password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
                </div>
              </div>

              {error && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{error}</p>}

              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', marginTop: 4 }}>
                {submitting ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>

            <GoogleSignInButton onCredential={handleGoogleCredential} />

            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 20 }}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <a href="#" onClick={(e) => { e.preventDefault(); setError(null); setMode(mode === 'signin' ? 'signup' : 'signin') }}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </a>
            </p>
            {mode === 'signup' && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Reception desk accounts are set up by the clinic admin and aren't available here.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
