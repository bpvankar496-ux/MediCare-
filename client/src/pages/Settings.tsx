import { useRef, useState } from 'react'
import { Settings as SettingsIcon, User, KeyRound, Camera, Trash2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { PageHeader } from '../lib/ui'
import { useToast } from '../lib/toast'
import { useI18n } from '../lib/i18n'

const MAX_AVATAR_BYTES = 1.5 * 1024 * 1024

// New feature: a dedicated Settings page so users can update their display
// name, profile picture, and password. Theme/language moved to the top
// navbar switcher (client/src/lib/ThemeLanguageSwitcher.tsx) since those
// get reached for far more often than an account setting.
export default function Settings() {
  const { t } = useI18n()
  const { profile, updateProfile, updateAvatar, changePassword } = useAuth()
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
      showToast(t('st_image_type_error'), 'error')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      showToast(t('st_image_size_error'), 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      setAvatarSaving(true)
      const { error } = await updateAvatar(reader.result as string)
      setAvatarSaving(false)
      if (error) showToast(error, 'error')
      else showToast(t('st_avatar_updated'), 'success')
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarRemove = async () => {
    setAvatarSaving(true)
    const { error } = await updateAvatar(null)
    setAvatarSaving(false)
    if (error) showToast(error, 'error')
    else showToast(t('st_avatar_removed'), 'info')
  }

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      setNameMsg({ type: 'err', text: t('st_name_empty') })
      return
    }
    setNameSaving(true)
    setNameMsg(null)
    const { error } = await updateProfile(fullName.trim())
    setNameSaving(false)
    setNameMsg(error ? { type: 'err', text: error } : { type: 'ok', text: t('st_name_updated') })
  }

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: t('st_passwords_mismatch') })
      return
    }
    const strong = newPassword.length >= 8 && /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
    if (!strong) {
      setPwMsg({ type: 'err', text: t('st_password_weak') })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    const { error } = await changePassword(currentPassword, newPassword)
    setPwSaving(false)
    if (error) {
      setPwMsg({ type: 'err', text: error })
    } else {
      setPwMsg({ type: 'ok', text: t('st_password_changed') })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div>
      <PageHeader title={t('ph_settings_title')} subtitle={t('ph_settings_subtitle')} icon={SettingsIcon} />

      <div style={{ display: 'grid', gap: 20, maxWidth: 480 }}>
        {/* Profile picture */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Camera size={18} color="var(--primary-500)" />
            <h3>{t('st_profile_picture')}</h3>
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
                {avatarSaving ? t('st_saving') : t('st_upload_photo')}
              </button>
              {profile?.avatar && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleAvatarRemove} disabled={avatarSaving} style={{ color: 'var(--error-600)' }}>
                  <Trash2 size={14} /> {t('st_remove_photo')}
                </button>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('st_photo_hint')}</span>
            </div>
          </div>
        </div>

        {/* Appearance and Language now live in the top navbar (the switcher
            next to your profile/logout, always visible) instead of being
            buried here - see client/src/lib/ThemeLanguageSwitcher.tsx. */}

        <form onSubmit={handleNameSave} className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <User size={18} color="var(--primary-500)" />
            <h3>{t('st_profile')}</h3>
          </div>
          <label className="label">{t('st_full_name')}</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('st_full_name_placeholder')} />
          {nameMsg && (
            <p style={{ marginTop: 10, fontSize: 13, color: nameMsg.type === 'ok' ? 'var(--success-600)' : 'var(--error-600)' }}>
              {nameMsg.text}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={nameSaving} style={{ marginTop: 14 }}>
            {nameSaving ? t('st_saving') : t('st_save_name')}
          </button>
        </form>

        <form onSubmit={handlePasswordSave} className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <KeyRound size={18} color="var(--primary-500)" />
            <h3>{t('st_change_password')}</h3>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="label">{t('st_current_password')}</label>
              <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div>
              <label className="label">{t('st_new_password')}</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder={t('st_new_password_hint')} autoComplete="new-password" />
            </div>
            <div>
              <label className="label">{t('st_confirm_password')}</label>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          {pwMsg && (
            <p style={{ marginTop: 10, fontSize: 13, color: pwMsg.type === 'ok' ? 'var(--success-600)' : 'var(--error-600)' }}>
              {pwMsg.text}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={pwSaving} style={{ marginTop: 14 }}>
            {pwSaving ? t('st_updating') : t('st_update_password')}
          </button>
        </form>
      </div>
    </div>
  )
}
