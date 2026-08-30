import { useRef, useState } from 'react'
import { Settings as SettingsIcon, User, KeyRound, Camera, Trash2, Palette, Languages, Sun, Moon, MonitorSmartphone } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { PageHeader } from '../lib/ui'
import { useTheme, type ThemeMode } from '../lib/theme'
import { useI18n, LANGUAGES } from '../lib/i18n'
import { useToast } from '../lib/toast'

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024

// New feature: a dedicated Settings page so users can update their display
// name, profile picture, password, theme, and language themselves, without
// needing an admin.
export default function Settings() {
  const { profile, updateProfile, updateAvatar, changePassword } = useAuth()
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { showToast } = useToast()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarSaving, setAvatarSaving] = useState(false)

  const handleAvatarPick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      showToast('Please choose a PNG, JPEG, WEBP, or GIF image', 'error')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast('Image must be under 1.5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      setAvatarSaving(true)
      const { error } = await updateAvatar(reader.result as string)
      setAvatarSaving(false)
      if (error) showToast(error, 'error')
      else showToast('Profile picture updated', 'success')
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarRemove = async () => {
    setAvatarSaving(true)
    const { error } = await updateAvatar(null)
    setAvatarSaving(false)
    if (error) showToast(error, 'error')
    else showToast('Profile picture removed', 'info')
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setNameMsg({ type: 'err', text: 'Name cannot be empty' })
      return
    }
    setNameSaving(true)
    setNameMsg(null)
    const { error } = await updateProfile(fullName.trim())
    setNameSaving(false)
    setNameMsg(error ? { type: 'err', text: error } : { type: 'ok', text: 'Name updated' })
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: 'New passwords do not match' })
      return
    }
    const strong = newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
    if (!strong) {
      setPwMsg({ type: 'err', text: 'New password must be at least 8 characters and include a letter and a number' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    const { error } = await changePassword(currentPassword, newPassword)
    setPwSaving(false)
    if (error) {
      setPwMsg({ type: 'err', text: error })
    } else {
      setPwMsg({ type: 'ok', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account details" icon={SettingsIcon} />

      <div style={{ display: 'grid', gap: 20, maxWidth: 480 }}>
        {/* Profile picture */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Camera size={18} color="var(--primary-500)" />
            <h3>Profile Picture</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: 'var(--primary-100)', display: 'grid', placeItems: 'center',
              fontSize: 22, fontWeight: 700, color: 'var(--primary-700)',
            }}>
              {profile?.avatar
                ? <img src={profile.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (profile?.full_name?.trim()?.[0] || profile?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAvatarPick} disabled={avatarSaving}>
                {avatarSaving ? 'Saving...' : 'Upload New Photo'}
              </button>
              {profile?.avatar && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleAvatarRemove} disabled={avatarSaving} style={{ color: 'var(--error-600)' }}>
                  <Trash2 size={14} /> Remove Photo
                </button>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPEG, WEBP or GIF, under 1.5MB.</span>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Palette size={18} color="var(--primary-500)" />
            <h3>{t('appearance')}</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { mode: 'light' as ThemeMode, label: 'Light', icon: Sun },
              { mode: 'dark' as ThemeMode, label: 'Dark', icon: Moon },
              { mode: 'system' as ThemeMode, label: 'System', icon: MonitorSmartphone },
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                className={theme === mode ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setTheme(mode)}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Languages size={18} color="var(--primary-500)" />
            <h3>{t('language')}</h3>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                className={lang === l.code ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
                onClick={() => setLang(l.code)}
              >
                {l.native}
              </button>
            ))}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Applies to the sidebar navigation and landing page for now — more pages are being translated.
          </p>
        </div>

        <form onSubmit={handleNameSave} className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <User size={18} color="var(--primary-500)" />
            <h3>Profile</h3>
          </div>
          <label className="label">Full Name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
          {nameMsg && (
            <p style={{ marginTop: 10, fontSize: 13, color: nameMsg.type === 'ok' ? 'var(--success-600)' : 'var(--error-600)' }}>
              {nameMsg.text}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={nameSaving} style={{ marginTop: 14 }}>
            {nameSaving ? 'Saving...' : 'Save Name'}
          </button>
        </form>

        <form onSubmit={handlePasswordSave} className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <KeyRound size={18} color="var(--primary-500)" />
            <h3>Change Password</h3>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="label">Current Password</label>
              <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div>
              <label className="label">New Password</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters, incl. a letter & number" autoComplete="new-password" />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          {pwMsg && (
            <p style={{ marginTop: 10, fontSize: 13, color: pwMsg.type === 'ok' ? 'var(--success-600)' : 'var(--error-600)' }}>
              {pwMsg.text}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={pwSaving} style={{ marginTop: 14 }}>
            {pwSaving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
