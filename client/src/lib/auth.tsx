import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { API_URL, getToken, setToken } from './db'

export type Role = 'patient' | 'doctor' | 'receptionist'

export interface AuthUser {
  id: string
  email: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: Role
  avatar?: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: string | null }>
  signInWithGoogle: (credential: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateProfile: (fullName: string) => Promise<{ error: string | null }>
  updateAvatar: (avatarDataUrl: string | null) => Promise<{ error: string | null }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function apiRequest(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.error) || 'Request failed')
  }
  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Session expired')
      const data = await res.json()
      setUser(data.user)
      setProfile(data.profile)
    } catch {
      setToken(null)
      setUser(null)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiRequest('/api/auth/login', { email, password })
      setToken(data.token)
      setUser(data.user)
      setProfile(data.profile)
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not sign in' }
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: Role) => {
    try {
      const data = await apiRequest('/api/auth/signup', { email, password, full_name: fullName, role })
      setToken(data.token)
      setUser(data.user)
      setProfile(data.profile)
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not create account' }
    }
  }

  // New feature: "Sign in with Google". `credential` is the ID token Google
  // Identity Services hands back to the button's callback (see Login.tsx).
  const signInWithGoogle = async (credential: string) => {
    try {
      const data = await apiRequest('/api/auth/google', { credential })
      setToken(data.token)
      setUser(data.user)
      setProfile(data.profile)
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not sign in with Google' }
    }
  }

  const signOut = async () => {
    setToken(null)
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    await loadSession()
  }

  // New feature: update the signed-in user's display name.
  const updateProfile = async (fullName: string) => {
    const token = getToken()
    if (!token) return { error: 'Not signed in' }
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error((data && data.error) || 'Could not update profile')
      setProfile((prev) => (prev ? { ...prev, full_name: fullName } : prev))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not update profile' }
    }
  }

  // New feature: upload/remove a profile picture (stored as a base64 data
  // URL - see server/src/routes/auth.js for the size/type validation).
  const updateAvatar = async (avatarDataUrl: string | null) => {
    const token = getToken()
    if (!token) return { error: 'Not signed in' }
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar: avatarDataUrl }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error((data && data.error) || 'Could not update profile picture')
      setProfile((prev) => (prev ? { ...prev, avatar: avatarDataUrl } : prev))
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not update profile picture' }
    }
  }

  // New feature: let a signed-in user change their own password.
  const changePassword = async (currentPassword: string, newPassword: string) => {
    const token = getToken()
    if (!token) return { error: 'Not signed in' }
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error((data && data.error) || 'Could not change password')
      return { error: null }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Could not change password' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile, updateProfile, updateAvatar, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
