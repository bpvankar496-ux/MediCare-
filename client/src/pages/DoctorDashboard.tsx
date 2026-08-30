import { useEffect, useMemo, useState } from 'react'
import { ShieldPlus, LogOut, Calendar, Clock, Video as VideoIcon, Phone, MessageSquare, Stethoscope, PhoneIncoming, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { VideoCall } from '../lib/VideoCall'
import { ChatOnly } from '../lib/ChatOnly'
import { LoadingState, EmptyState, Modal, DoctorAvatar } from '../lib/ui'
import { useIncomingCallInvites, sendCallInvite, useNotificationPermission } from '../lib/callInvites'
import type { Appointment, Consultation, Doctor } from '../lib/types'

export default function DoctorDashboard() {
  const { profile, signOut } = useAuth()
  const [linkedDoctor, setLinkedDoctor] = useState<Doctor | null | undefined>(undefined)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCall, setActiveCall] = useState<Consultation | null>(null)
  const myName = profile?.full_name || profile?.email || 'Doctor'
  const scheduledIds = consultations.filter((c) => c.status === 'scheduled').map((c) => c.id)
  const { incoming, dismiss } = useIncomingCallInvites(scheduledIds, myName)
  const { permission, request } = useNotificationPermission()

  const joinNow = (c: Consultation) => {
    sendCallInvite(c.id, myName)
    setActiveCall(c)
    dismiss()
  }

  const updateApptStatus = async (id: string, status: string) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    await db.from('appointments').update({ status }).eq('id', id)
  }

  useEffect(() => {
    if (!profile) return
    let cancelled = false

    async function load() {
      const { data: doctorRow } = await db.from('doctors').select('*').eq('profile_id', profile!.id).maybeSingle()
      if (cancelled) return
      setLinkedDoctor(doctorRow as Doctor | null)

      if (doctorRow) {
        const { data: appts } = await db.from('appointments').select('*').eq('doctor_id', doctorRow.id).order('date', { ascending: false })
        if (!cancelled) setAppointments((appts as Appointment[]) || [])
      }

      // Telemedicine consultations aren't linked to a doctor account by ID (only by the
      // doctor's display name at booking time), and that name can drift from the doctor's
      // profile name. To make sure a doctor always sees (and can Join Now) every consultation
      // booked under them, match loosely: exact name match OR show if no exact match exists.
      const { data: cons } = await db.from('consultations').select('*').order('created_at', { ascending: false })
      const allConsultations = (cons as Consultation[]) || []
      const byName = allConsultations.filter((c) => c.doctor_name.trim().toLowerCase() === (profile!.full_name || '').trim().toLowerCase())
      if (!cancelled) setConsultations(byName.length > 0 ? byName : allConsultations)

      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [profile])

  const modeIcon = (mode: string) => mode === 'video' ? <VideoIcon size={16} /> : mode === 'phone' ? <Phone size={16} /> : <MessageSquare size={16} />

  // Last-7-days appointment volume, used by the analytics bar chart below.
  const weeklyData = useMemo(() => {
    const days: { label: string; date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().split('T')[0]
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: iso, count: 0 })
    }
    appointments.forEach((a) => {
      const day = days.find((d) => d.date === a.date)
      if (day) day.count += 1
    })
    return days
  }, [appointments])

  const completedCount = appointments.filter((a) => a.status === 'completed').length
  const upcomingCount = appointments.filter((a) => a.status === 'upcoming' || a.status === 'confirmed').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {linkedDoctor ? (
            <DoctorAvatar doc={linkedDoctor} size={36} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-500)', display: 'grid', placeItems: 'center' }}>
              <ShieldPlus color="white" size={20} />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>MediCare+ Doctor Portal</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{profile?.full_name || profile?.email}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> Sign out</button>
      </header>

      <main style={{ padding: '28px 24px', maxWidth: 1000, margin: '0 auto' }}>
        {incoming && (
          <div className="card fade-in" style={{ padding: 16, marginBottom: 20, background: 'var(--success-50)', border: '1px solid var(--success-100)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--success-500)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <PhoneIncoming size={18} color="white" />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{incoming.fromName} is calling you now</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Join the consultation to connect.</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => {
              const c = consultations.find((x) => x.id === incoming.consultationId)
              if (c) joinNow(c)
            }}>Join Now</button>
            <button className="btn btn-ghost btn-sm" onClick={dismiss}>Dismiss</button>
          </div>
        )}
        {permission !== 'granted' && (
          <button className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }} onClick={request}>
            Enable call notifications
          </button>
        )}
        {loading ? <LoadingState /> : (
          <>
            {linkedDoctor === null && (
              <div className="card" style={{ padding: 18, marginBottom: 20, background: 'var(--warning-50)', border: '1px solid var(--warning-100)' }}>
                <p style={{ fontSize: 14, color: 'var(--warning-600)' }}>
                  <Stethoscope size={15} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
                  Your account isn't linked to a doctor listing yet, so patient-booked appointments won't show here.
                  Ask reception to link your account (Receptionist Portal → Link Doctors) using your email: <strong>{profile?.email}</strong>.
                  Telemedicine consultations booked under your name will still appear below.
                </p>
              </div>
            )}

            {/* Analytics overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }} className="dash-links-row">
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Appointments</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>{appointments.length}</div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Upcoming</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-600)' }}>{upcomingCount}</div>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Completed</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success-600)' }}>{completedCount}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 20, marginBottom: 28 }}>
              <h4 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={17} color="var(--primary-500)" /> Appointments — Last 7 Days
              </h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                  <Bar dataKey="count" name="Appointments" fill="var(--primary-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <h3 style={{ marginBottom: 14 }}><Calendar size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }} color="var(--primary-500)" />Appointments</h3>
            {appointments.length === 0 ? (
              <EmptyState icon={Calendar} title="No appointments" subtitle="Booked appointments linked to your doctor profile will appear here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {appointments.map((a) => (
                  <div key={a.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 600 }}>{a.patient_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 10, marginTop: 2 }}>
                        <span><Clock size={12} style={{ display: 'inline', marginRight: 3 }} />{a.date} at {a.time_slot}</span>
                        <span style={{ textTransform: 'capitalize' }}>{a.type}</span>
                      </div>
                      {a.reason && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{a.reason}</div>}
                    </div>
                    <span className={`badge ${a.status === 'upcoming' ? 'badge-info' : a.status === 'confirmed' ? 'badge-success' : a.status === 'completed' ? 'badge-neutral' : 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>{a.status}</span>
                    {a.status === 'upcoming' && (
                      <button className="btn btn-primary btn-sm" onClick={() => updateApptStatus(a.id, 'confirmed')}>Confirm</button>
                    )}
                    {a.status === 'confirmed' && (
                      <button className="btn btn-secondary btn-sm" onClick={() => updateApptStatus(a.id, 'completed')}>Mark Done</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ marginBottom: 14 }}><VideoIcon size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: -3 }} color="var(--accent-500)" />Telemedicine Consultations</h3>
            {consultations.length === 0 ? (
              <EmptyState icon={VideoIcon} title="No consultations" subtitle="Consultations patients book under your name will appear here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {consultations.map((c) => (
                  <div key={c.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-50)', display: 'grid', placeItems: 'center' }}>{modeIcon(c.mode)}</div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 600 }}>{c.patient_name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.date} at {c.time_slot}</div>
                    </div>
                    <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{c.mode}</span>
                    {c.status === 'scheduled' && (
                      <button className="btn btn-primary btn-sm" onClick={() => joinNow(c)}>Join Now</button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {activeCall && activeCall.mode !== 'chat' && (
        <VideoCall
          roomId={activeCall.id}
          displayName={myName}
          withVideo={activeCall.mode !== 'phone'}
          onLeave={() => setActiveCall(null)}
        />
      )}
      {activeCall && activeCall.mode === 'chat' && (
        <Modal open={true} onClose={() => setActiveCall(null)} title={`Chat with ${activeCall.patient_name}`}
          footer={<button className="btn btn-ghost" onClick={() => setActiveCall(null)}>Close</button>}
        >
          <ChatOnly roomId={activeCall.id} displayName={myName} />
        </Modal>
      )}
    </div>
  )
}
