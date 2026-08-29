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
}

interface AuthContextValue {
  user: AuthUser | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string, role: Role) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
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

  const signOut = async () => {
    setToken(null)
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    await loadSession()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
