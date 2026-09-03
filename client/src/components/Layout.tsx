import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard, Stethoscope, Pill, FlaskConical, Video,
  FileText, BellRing, Activity, Calculator, MapPin, BookOpen,
  Users, HeartPulse, ShieldPlus, X, LogOut, HeartHandshake, Settings as SettingsIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { QuickSettings } from './QuickSettings'

const navItems: { to: string; icon: typeof LayoutDashboard; label: string }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/doctors', icon: Stethoscope, label: 'Find Doctors' },
  { to: '/consultations', icon: Video, label: 'Telemedicine' },
  { to: '/pharmacy', icon: Pill, label: 'Pharmacy' },
  { to: '/lab-tests', icon: FlaskConical, label: 'Lab Tests' },
  { to: '/records', icon: FileText, label: 'Health Records' },
  { to: '/vitals', icon: Activity, label: 'Vitals Tracker' },
  { to: '/reminders', icon: BellRing, label: 'Reminders' },
  { to: '/symptom-checker', icon: HeartPulse, label: 'Symptom Checker' },
  { to: '/calculators', icon: Calculator, label: 'Health Tools' },
  { to: '/emergency', icon: MapPin, label: 'Emergency' },
  { to: '/articles', icon: BookOpen, label: 'Health Library' },
  { to: '/family', icon: Users, label: 'Family Members' },
  { to: '/inquiries', icon: HeartHandshake, label: 'Ask Reception' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, profile, signOut } = useAuth()
  const displayName = profile?.full_name?.trim() || user?.email || 'User Account'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: 264,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          transition: 'transform 0.3s',
          zIndex: 100,
        }}
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
      >
        <Link
          to="/home"
          onClick={() => setMobileOpen(false)}
          title="Go to MediCare+ home page"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 20px', textDecoration: 'none' }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--primary-500)', display: 'grid', placeItems: 'center',
          }}>
            <ShieldPlus color="white" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>MediCare+</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Health Hub</div>
          </div>
        </Link>

        <nav style={{ flex: 1, padding: '8px 12px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                marginBottom: 2, fontSize: 14, fontWeight: 500,
                color: isActive ? 'var(--primary-700)' : 'var(--text)',
                background: isActive ? 'var(--primary-50)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--neutral-100)'
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent'
              }}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--primary-100)', display: 'grid', placeItems: 'center',
              fontSize: 14, fontWeight: 700, color: 'var(--primary-700)', flexShrink: 0,
            }}>
              {profile?.avatar
                ? <img src={profile.avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : displayName[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Free Plan</div>
            </div>
            <Link to="/settings" onClick={() => setMobileOpen(false)} title="Settings" style={{ display: 'inline-flex', background: 'none', border: 'none', padding: 6, color: 'var(--text-muted)', flexShrink: 0 }}>
              <SettingsIcon size={18} />
            </Link>
            <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', padding: 6, color: 'var(--text-muted)', flexShrink: 0 }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
        />
      )}

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Top bar - theme switcher, visible on every screen size
            right at the top, not tucked away in Settings. */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          padding: '10px 24px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 40,
        }} className="desktop-topbar">
          <QuickSettings />
        </div>

        {/* Mobile header */}
        <header className="mobile-header" style={{
          display: 'none', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: 'var(--surface)',
          borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50,
        }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', padding: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <ShieldPlus color="var(--primary-500)" size={22} />
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>MediCare+</span>
          </Link>
          <div style={{ marginLeft: 'auto', marginRight: mobileOpen ? 40 : 0 }}>
            <QuickSettings />
          </div>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', right: 16, background: 'none', border: 'none' }}>
              <X size={24} />
            </button>
          )}
        </header>

        <main style={{ padding: '28px 36px', maxWidth: 1200, margin: '0 auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
