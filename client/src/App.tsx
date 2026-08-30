import { Routes, Route } from 'react-router-dom'
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
import { useState } from 'react'

export default function App() {
  const { user, profile, loading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><LoadingState /></div>
  }

  if (!user) {
    if (!showLogin) {
      return <Landing onGetStarted={() => setShowLogin(true)} />
    }
    return <Login onBack={() => setShowLogin(false)} />
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
