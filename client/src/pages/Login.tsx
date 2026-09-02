import { useEffect, useRef, useState } from 'react'
import { ShieldPlus, Mail, Lock, User as UserIcon, CircleCheck as CheckCircle, Stethoscope, UserRound, ArrowLeft } from 'lucide-react'
import { useAuth, type Role } from '../lib/auth'
import { QuickSettings } from '../components/QuickSettings'
import { useI18n } from '../lib/i18n'

// Bug fix: "Receptionist" used to be a pickable role on public signup, so
// anyone could give themselves the reception desk. Reception is now a fixed,
// admin-only account (see server/.env RECEPTION_EMAIL/RECEPTION_PASSWORD) -
// the public form only ever creates patients or doctors.
const roles: { value: Role; key: 'lg_role_patient' | 'lg_role_doctor'; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { value: 'patient', key: 'lg_role_patient', icon: UserRound },
  { value: 'doctor', key: 'lg_role_doctor', icon: Stethoscope },
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
  const { t } = useI18n()
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
    if (!email || !password) { setError(t('lg_err_email_password')); return }
    if (mode === 'signup') {
      const strong = password.length >= 8 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password)
      if (!strong) { setError(t('lg_err_password_weak')); return }
      if (!fullName.trim()) { setError(t('lg_err_full_name')); return }
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
    // Bug fix: the role picker below (Patient/Doctor) only applied to
    // email+password signup - the Google button always created a
    // 'patient' account regardless of what was selected. Now it's passed
    // through here too (only takes effect for a brand-new account; an
    // existing Google account keeps its original role).
    const result = await signInWithGoogle(credential, role)
    setSubmitting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', top: 16, right: 16 }}>
        <QuickSettings />
      </div>
      <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 32, position: 'relative' }}>
        {onBack && (
          <button
            onClick={onBack}
            className="btn btn-ghost btn-sm"
            style={{ position: 'absolute', top: 16, left: 16, padding: '6px 10px' }}
          >
            <ArrowLeft size={16} /> {t('lg_back')}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-500)', display: 'grid', placeItems: 'center' }}>
            <ShieldPlus color="white" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-h)' }}>MediCare+</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('lg_tagline')}</div>
          </div>
        </div>

        {signupDone ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="var(--success-500)" />
            </div>
            <h3 style={{ marginBottom: 8 }}>{t('lg_account_created')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              {t('lg_signed_in_ready')}
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setSignupDone(false); setMode('signin') }}>
              {t('lg_go_to_signin')}
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 4 }}>{mode === 'signin' ? t('lg_welcome_back') : t('lg_create_account')}</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
              {mode === 'signin' ? t('lg_signin_subtitle') : t('lg_signup_subtitle')}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">{t('lg_i_am_a')}</label>
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
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{t(r.key)}</span>
                    </button>
                  ))}
                </div>
                {mode === 'signin' && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {t('lg_role_hint')}
                  </p>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="label">{t('lg_full_name')}</label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" style={{ paddingLeft: 36 }} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('lg_full_name_placeholder')} autoComplete="name" />
                  </div>
                </div>
              )}

              <div>
                <label className="label">{t('lg_email')}</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 36 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="label">{t('lg_password')}</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" style={{ paddingLeft: 36 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? t('lg_password_placeholder_signup') : t('lg_password_placeholder_signin')} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
                </div>
              </div>

              {error && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{error}</p>}

              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', marginTop: 4 }}>
                {submitting ? (mode === 'signin' ? t('lg_signing_in') : t('lg_creating_account')) : (mode === 'signin' ? t('lg_sign_in') : t('lg_sign_up'))}
              </button>
            </form>

            <GoogleSignInButton onCredential={handleGoogleCredential} />

            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 20 }}>
              {mode === 'signin' ? t('lg_no_account') : t('lg_have_account')}
              <a href="#" onClick={(e) => { e.preventDefault(); setError(null); setMode(mode === 'signin' ? 'signup' : 'signin') }}>
                {mode === 'signin' ? t('lg_sign_up') : t('lg_sign_in')}
              </a>
            </p>
            {mode === 'signup' && (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                {t('lg_reception_note')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
