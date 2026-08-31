import {
  ShieldPlus, Stethoscope, Pill, FlaskConical, Video, Activity, HeartPulse,
  Users, BookOpen, Star, ArrowRight, CheckCircle2, Menu, X, LayoutDashboard,
} from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { QuickSettings } from '../components/QuickSettings'

const features = [
  { icon: Stethoscope, title: 'Find & Book Doctors', desc: 'Search specialists by city or specialty and book an appointment in seconds.', color: 'var(--primary-500)', bg: 'var(--primary-50)' },
  { icon: Video, title: 'Telemedicine', desc: 'Video or chat consultations with doctors from home — no waiting rooms.', color: 'var(--accent-500)', bg: 'var(--accent-50)' },
  { icon: Pill, title: 'Pharmacy Delivery', desc: 'Order medicines online with home delivery and prescription tracking.', color: 'var(--secondary-500)', bg: 'var(--secondary-50)' },
  { icon: FlaskConical, title: 'Lab Tests at Home', desc: 'Book diagnostic tests with optional home sample collection.', color: 'var(--success-500)', bg: 'var(--success-50)' },
  { icon: HeartPulse, title: 'AI Symptom Checker', desc: 'Describe how you feel and get possible conditions and next steps.', color: 'var(--error-500)', bg: 'var(--error-50)' },
  { icon: Activity, title: 'Vitals & Reminders', desc: 'Track blood pressure, sugar, and weight — never miss a medicine dose.', color: 'var(--primary-400)', bg: 'var(--primary-50)' },
  { icon: Users, title: 'Family Profiles', desc: 'Manage health records for your whole family from one account.', color: 'var(--secondary-400)', bg: 'var(--secondary-50)' },
  { icon: BookOpen, title: 'Health Library', desc: 'Read trustworthy articles on conditions, nutrition, and prevention.', color: 'var(--accent-400)', bg: 'var(--accent-50)' },
]

const stats = [
  { value: '500+', label: 'Verified Doctors' },
  { value: '50k+', label: 'Consultations' },
  { value: '20+', label: 'Cities Covered' },
  { value: '4.8/5', label: 'Average Rating' },
]

const testimonials = [
  { name: 'Priya Mehta', role: 'Patient, Mumbai', quote: 'Booked a cardiologist appointment in under a minute and got my medicines delivered the same evening.', rating: 5 },
  { name: 'Rohan Kapoor', role: 'Patient, Pune', quote: 'The symptom checker pointed me to the right specialist before my condition got worse. Genuinely useful.', rating: 5 },
  { name: 'Dr. Sneha Reddy', role: 'Psychiatrist', quote: 'The telemedicine dashboard makes it painless to manage a full day of video consultations.', rating: 4.5 },
]

interface LandingProps {
  onGetStarted: () => void
  // When true, this is being viewed by an already-authenticated user (they
  // clicked the MediCare+ logo from inside the app) - swap "Sign In / Get
  // Started" for a single "Go to Dashboard" action instead.
  loggedIn?: boolean
}

export default function Landing({ onGetStarted, loggedIn = false }: LandingProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { t } = useI18n()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-500)', display: 'grid', placeItems: 'center' }}>
              <ShieldPlus color="white" size={20} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>MediCare+</span>
          </div>

          <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#features" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>Features</a>
            <a href="#testimonials" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>Testimonials</a>
            <QuickSettings />
            {loggedIn ? (
              <button className="btn btn-primary" onClick={onGetStarted}><LayoutDashboard size={16} /> {t('landing_go_to_dashboard')}</button>
            ) : (
              <>
                <button className="btn btn-ghost btn-sm" onClick={onGetStarted}>{t('landing_sign_in')}</button>
                <button className="btn btn-primary" onClick={onGetStarted}>{t('landing_get_started')}</button>
              </>
            )}
          </nav>

          <button
            className="btn btn-ghost btn-sm"
            style={{ display: 'none' }}
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileNavOpen && (
          <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="#features" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>Features</a>
            <a href="#testimonials" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>Testimonials</a>
            <div style={{ margin: '4px 0' }}><QuickSettings /></div>
            {loggedIn ? (
              <button className="btn btn-primary" onClick={onGetStarted}>{t('landing_go_to_dashboard')}</button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={onGetStarted}>{t('landing_sign_in')}</button>
                <button className="btn btn-primary" onClick={onGetStarted}>{t('landing_get_started')}</button>
              </>
            )}
          </div>
        )}
      </header>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px 48px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 48, alignItems: 'center' }} className="dashboard-grid">
        <div className="fade-in">
          <span className="badge badge-info" style={{ marginBottom: 20 }}>
            <HeartPulse size={13} /> {t('landing_badge')}
          </span>
          <h1 style={{ fontSize: 46, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1 }}>
            {t('landing_title_1')} <span style={{ color: 'var(--primary-500)' }}>{t('landing_title_2')}</span> {t('landing_title_3')}
          </h1>
          <p style={{ fontSize: 17, color: 'var(--text-muted)', maxWidth: 480, marginBottom: 28, lineHeight: 1.6 }}>
            {t('landing_subtitle')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            {loggedIn ? (
              <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
                <LayoutDashboard size={18} /> {t('landing_go_to_dashboard')} <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={onGetStarted}>
                <Stethoscope size={18} /> {t('landing_get_started')} <ArrowRight size={16} />
              </button>
            )}
            <a href="#features" className="btn btn-secondary btn-lg">{t('landing_see_features')}</a>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['No credit card needed', 'Free for patients', 'Setup in 2 minutes'].map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                <CheckCircle2 size={15} color="var(--success-500)" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Hero illustration card */}
        <div className="card fade-in" style={{
          padding: 28, position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))', border: 'none',
        }}>
          <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', left: -40, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16, backdropFilter: 'blur(4px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', display: 'grid', placeItems: 'center', fontWeight: 700, color: 'var(--primary-600)' }}>AS</div>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>Dr. Aanya Sharma</div>
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Cardiologist · Mumbai</div>
                </div>
                <span className="badge badge-success" style={{ marginLeft: 'auto' }}>Available</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Today, 4:00 PM · Video Consultation</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16 }}>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Today's Vitals</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>120/80</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Blood Pressure</div>
                </div>
                <div>
                  <div style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>72 bpm</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>Heart Rate</div>
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={22} color="var(--success-400)" />
              <span style={{ color: 'white', fontSize: 13 }}>Medicine order delivered — 20 mins ago</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, textAlign: 'center' }} className="dash-links-row">
          {stats.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary-600)' }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 30, marginBottom: 10 }}>Everything your health needs, in one app</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>From booking a doctor to tracking your vitals — MediCare+ has you covered.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} className="doctors-grid">
          {features.map((f) => (
            <div key={f.title} className="card" style={{ padding: 22, transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: f.bg, display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                <f.icon size={22} color={f.color} />
              </div>
              <h4 style={{ marginBottom: 6 }}>{f.title}</h4>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, marginBottom: 10 }}>Loved by patients and doctors</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Here's what people are saying about MediCare+.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="doctors-grid">
            {testimonials.map((t) => (
              <div key={t.name} className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} fill={i < Math.round(t.rating) ? 'var(--warning-400)' : 'none'} color="var(--warning-400)" />
                  ))}
                </div>
                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 18 }}>&ldquo;{t.quote}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-50)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: 'var(--primary-600)' }}>
                    {t.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-h)' }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px' }}>
        <div className="card" style={{
          padding: '48px 40px', textAlign: 'center', border: 'none',
          background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
        }}>
          <h2 style={{ color: 'white', fontSize: 28, marginBottom: 10 }}>
            {loggedIn ? 'Ready to jump back in?' : 'Ready to take control of your health?'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 24 }}>
            {loggedIn ? 'Your dashboard is right where you left it.' : 'Join thousands of patients and doctors already using MediCare+.'}
          </p>
          <button className="btn btn-lg" style={{ background: 'white', color: 'var(--primary-700)' }} onClick={onGetStarted}>
            {loggedIn ? t('landing_go_to_dashboard') : 'Create Your Free Account'} <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        © {new Date().getFullYear()} MediCare+. Built for demonstration purposes — not a substitute for professional medical advice.
      </footer>
    </div>
  )
}
