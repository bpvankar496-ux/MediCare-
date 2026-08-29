import { useState } from 'react'
import { Settings as SettingsIcon, User, KeyRound } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { PageHeader } from '../lib/ui'

// New feature: a dedicated Settings page so users can update their display
// name and change their password themselves, without needing an admin.
export default function Settings() {
  const { profile, updateProfile, changePassword } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

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
