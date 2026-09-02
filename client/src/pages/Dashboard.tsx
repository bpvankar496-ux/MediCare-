import { Link } from 'react-router-dom'
import {
  Stethoscope, Pill, FlaskConical, Video, Activity, BellRing,
  HeartPulse, Calculator, MapPin, BookOpen, Users, Calendar,
  TrendingUp, Clock, ArrowRight,
} from 'lucide-react'
import { useSupabaseQuery } from '../lib/ui'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import type { Appointment, Reminder, Vital } from '../lib/types'

export default function Dashboard() {
  const { profile } = useAuth()
  const { t } = useI18n()
  const firstName = profile?.full_name?.trim()?.split(' ')[0]
  const quickLinks = [
    { to: '/doctors', icon: Stethoscope, label: t('dash_ql_find_doctors'), color: 'var(--primary-500)', bg: 'var(--primary-50)' },
    { to: '/consultations', icon: Video, label: t('dash_ql_telemedicine'), color: 'var(--accent-500)', bg: 'var(--accent-50)' },
    { to: '/pharmacy', icon: Pill, label: t('dash_ql_pharmacy'), color: 'var(--secondary-500)', bg: 'var(--secondary-50)' },
    { to: '/lab-tests', icon: FlaskConical, label: t('dash_ql_lab_tests'), color: 'var(--success-500)', bg: 'var(--success-50)' },
    { to: '/symptom-checker', icon: HeartPulse, label: t('dash_ql_symptom_check'), color: 'var(--error-500)', bg: 'var(--error-50)' },
    { to: '/emergency', icon: MapPin, label: t('dash_ql_emergency'), color: 'var(--warning-600)', bg: 'var(--warning-50)' },
    { to: '/vitals', icon: Activity, label: t('dash_ql_vitals'), color: 'var(--primary-400)', bg: 'var(--primary-50)' },
    { to: '/reminders', icon: BellRing, label: t('dash_ql_reminders'), color: 'var(--secondary-400)', bg: 'var(--secondary-50)' },
  ]
  const { data: appointments } = useSupabaseQuery<Appointment>('appointments', '*', 'date', false)
  const { data: reminders } = useSupabaseQuery<Reminder>('reminders', '*', 'created_at', false)
  const { data: vitals } = useSupabaseQuery<Vital>('vitals', '*', 'recorded_at', false)

  const upcomingAppts = appointments?.filter((a) => a.status !== 'completed' && a.status !== 'cancelled').slice(0, 3) ?? []
  const activeReminders = reminders?.filter((r) => r.active).slice(0, 4) ?? []
  const recentVitals = vitals?.slice(0, 5) ?? []

  return (
    <div className="fade-in">
      {/* Hero */}
      <div className="card" style={{
        padding: '32px 36px', marginBottom: 24,
        background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
        border: 'none', color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{ color: 'white', fontSize: 28, marginBottom: 8 }}>{firstName ? t('dash_welcome_back', { name: firstName }) : t('dash_welcome_generic')}</h1>
          <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 20, maxWidth: 500 }}>
            {t('dash_hero_subtitle')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/doctors" className="btn" style={{ background: 'white', color: 'var(--primary-700)' }}>
              <Stethoscope size={18} /> {t('dash_book_appointment')}
            </Link>
            <Link to="/symptom-checker" className="btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              <HeartPulse size={18} /> {t('dash_check_symptoms')}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {quickLinks.map((link) => (
          <Link key={link.to} to={link.to} className="card" style={{
            padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            textDecoration: 'none', transition: 'all 0.2s', textAlign: 'center',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: link.bg, display: 'grid', placeItems: 'center' }}>
              <link.icon size={22} color={link.color} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{link.label}</span>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="dashboard-grid">
        {/* Upcoming appointments */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={18} color="var(--primary-500)" /> {t('dash_upcoming_appts')}</h3>
            <Link to="/doctors" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>{t('dash_view_all')} <ArrowRight size={14} /></Link>
          </div>
          {upcomingAppts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '16px 0' }}>{t('dash_no_appts')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingAppts.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--primary-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Clock size={20} color="var(--primary-500)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>{a.patient_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.date} at {a.time_slot}</div>
                  </div>
                  <span className={`badge ${a.status === 'confirmed' ? 'badge-success' : 'badge-info'}`} style={{ textTransform: 'capitalize' }}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active reminders */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BellRing size={18} color="var(--secondary-500)" /> {t('dash_active_reminders')}</h3>
            <Link to="/reminders" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>{t('dash_manage')} <ArrowRight size={14} /></Link>
          </div>
          {activeReminders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '16px 0' }}>{t('dash_no_reminders')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeReminders.map((r) => (
                <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--secondary-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <BellRing size={16} color="var(--secondary-500)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.time} - {r.frequency}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent vitals */}
        <div className="card" style={{ padding: 24, gridColumn: 'span 2' }} id="vitals-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={18} color="var(--success-500)" /> {t('dash_recent_vitals')}</h3>
            <Link to="/vitals" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>{t('dash_track_vitals')} <ArrowRight size={14} /></Link>
          </div>
          {recentVitals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: '16px 0' }}>{t('dash_no_vitals')}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {recentVitals.map((v) => (
                <div key={v.id} style={{ padding: 16, background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{v.type}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-h)' }}>{v.value} <span style={{ fontSize: 13, fontWeight: 400 }}>{v.unit}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }} className="dash-links-row">
        <Link to="/calculators" className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <Calculator size={20} color="var(--accent-500)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{t('dash_health_calculators')}</span>
        </Link>
        <Link to="/articles" className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <BookOpen size={20} color="var(--primary-500)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{t('dash_health_library')}</span>
        </Link>
        <Link to="/family" className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <Users size={20} color="var(--secondary-500)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{t('dash_family_members')}</span>
        </Link>
      </div>
    </div>
  )
}
