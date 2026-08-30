import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Doctors from './pages/Doctors'
import Consultations from './pages/Consultations'
import Pharmacy from './pages/Pharmacy'
import LabTests from './pages/LabTests'
import Records from './pages/Records'
import Vitals from './pages/Vitals'
import Reminders from './pages/Reminders'
import SymptomChecker from './pages/SymptomChecker'
import Calculators from './pages/Calculators'
import Emergency from './pages/Emergency'
import Articles from './pages/Articles'
import Family from './pages/Family'
import Inquiries from './pages/Inquiries'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Landing from './pages/Landing'
import DoctorDashboard from './pages/DoctorDashboard'
import ReceptionistDashboard from './pages/ReceptionistDashboard'
import { useAuth } from './lib/auth'
import { LoadingState } from './lib/ui'
import { useEffect, useRef, useState } from 'react'

export default function App() {
  const { user, profile, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Bug fix: after signing out, `showLogin` used to stay `true` (it was
  // never reset), so the app dropped straight back onto the Login form
  // instead of the public Landing page every account type expects to see
  // before signing in. Reset it, but only on an actual logged-in -> logged-
  // out transition - not on first mount / while the sign-in flow itself is
  // still in progress (where `user` is briefly null too).
  const wasLoggedIn = useRef(false)
  useEffect(() => {
    if (wasLoggedIn.current && !user) {
      setShowLogin(false)
    }
    wasLoggedIn.current = !!user
  }, [user])

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><LoadingState /></div>
  }

  if (!user) {
    if (!showLogin) {
      return <Landing onGetStarted={() => setShowLogin(true)} />
    }
    return <Login onBack={() => setShowLogin(false)} />
  }

  // New feature: clicking the "MediCare+" brand/logo (sidebar or mobile
  // header) now takes a signed-in user to this route, which shows the same
  // public marketing Landing page they saw before logging in - full-screen,
  // no dashboard sidebar - with a "Go to Dashboard" button to come back.
  if (location.pathname === '/home') {
    return <Landing loggedIn onGetStarted={() => navigate('/')} />
  }

  if (profile?.role === 'doctor') {
    return <DoctorDashboard />
  }

  if (profile?.role === 'receptionist') {
    return <ReceptionistDashboard />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/consultations" element={<Consultations />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/lab-tests" element={<LabTests />} />
        <Route path="/records" element={<Records />} />
        <Route path="/vitals" element={<Vitals />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/symptom-checker" element={<SymptomChecker />} />
        <Route path="/calculators" element={<Calculators />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/family" element={<Family />} />
        <Route path="/inquiries" element={<Inquiries />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
