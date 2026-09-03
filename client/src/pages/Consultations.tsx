import { useState } from 'react'
import { Video, CircleCheck as CheckCircle, Video as VideoIcon, Phone, MessageSquare, Clock, Calendar, PhoneIncoming, FileDown } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, Modal, EmptyState } from '../lib/ui'
import { db } from '../lib/db'
import { VideoCall } from '../lib/VideoCall'
import { ChatOnly } from '../lib/ChatOnly'
import { useAuth } from '../lib/auth'
import { useIncomingCallInvites, sendCallInvite, useNotificationPermission } from '../lib/callInvites'
import { downloadPrescriptionPdf } from '../lib/pdf'
import type { Consultation, Doctor } from '../lib/types'

export default function Consultations() {
  const { profile } = useAuth()
  const myName = profile?.full_name || profile?.email || 'Guest'
  const { data: consultations, refetch } = useSupabaseQuery<Consultation>('consultations', '*', 'created_at', false)
  const { data: doctors } = useSupabaseQuery<Doctor>('doctors')
  const [modalOpen, setModalOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ doctor_name: '', patient_name: '', date: '', time_slot: '', mode: 'video', symptoms: '' })
  const [err, setErr] = useState<string | null>(null)
  const [activeCall, setActiveCall] = useState<Consultation | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const scheduledIds = (consultations || []).filter((c) => c.status === 'scheduled').map((c) => c.id)
  const { incoming, dismiss } = useIncomingCallInvites(scheduledIds, myName)
  const { permission, request } = useNotificationPermission()

  const joinNow = (c: Consultation) => {
    sendCallInvite(c.id, myName)
    setActiveCall(c)
    dismiss()
  }

  const bookConsultation = async () => {
    if (!form.doctor_name || !form.patient_name || !form.date || !form.time_slot) { setErr('Please fill all required fields'); return }
    setErr(null)
    const { error } = await db.from('consultations').insert({
      doctor_name: form.doctor_name, patient_name: form.patient_name,
      date: form.date, time_slot: form.time_slot, mode: form.mode,
      symptoms: form.symptoms || null, status: 'scheduled',
    })
    if (error) { setErr(error.message); return }
    setSuccess(true); refetch()
    setForm({ doctor_name: '', patient_name: '', date: '', time_slot: '', mode: 'video', symptoms: '' })
  }

  const modeIcon = (mode: string) => mode === 'video' ? <VideoIcon size={16} /> : mode === 'phone' ? <Phone size={16} /> : <MessageSquare size={16} />

  if (!consultations) return <div><PageHeader title={"Telemedicine"} subtitle={"Consult doctors via video, phone, or chat"} icon={Video} /><LoadingState /></div>

  const scheduled = consultations.filter((c) => c.status === 'scheduled')
  const completed = consultations.filter((c) => c.status === 'completed')

  return (
    <div className="fade-in">
      <PageHeader title={"Telemedicine"} subtitle={"Consult doctors via video, phone, or chat"} icon={Video} />

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
            const c = consultations?.find((x) => x.id === incoming.consultationId)
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }} className="tele-grid">
        <div className="card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => { setForm({ ...form, mode: 'video' }); setModalOpen(true) }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--accent-50)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><VideoIcon size={24} color="var(--accent-500)" /></div>
          <h4>Video Consultation</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Face-to-face video call</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => { setForm({ ...form, mode: 'phone' }); setModalOpen(true) }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><Phone size={24} color="var(--success-500)" /></div>
          <h4>Phone Consultation</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Voice call with doctor</p>
        </div>
        <div className="card" style={{ padding: 20, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => { setForm({ ...form, mode: 'chat' }); setModalOpen(true) }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--secondary-50)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}><MessageSquare size={24} color="var(--secondary-500)" /></div>
          <h4>Chat Consultation</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Text-based consultation</p>
        </div>
      </div>

      {scheduled.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 14 }}>Scheduled Consultations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {scheduled.map((c) => (
              <div key={c.id} className="card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent-50)', display: 'grid', placeItems: 'center' }}>{modeIcon(c.mode)}</div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.doctor_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 12, marginTop: 2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {c.date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {c.time_slot}</span>
                  </div>
                </div>
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{c.mode}</span>
                <button className="btn btn-primary btn-sm" onClick={() => joinNow(c)}>Join Now</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 14 }}>Past Consultations</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {completed.map((c) => (
              <div key={c.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{c.doctor_name}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>{c.date} at {c.time_slot}</span>
                  </div>
                  <span className="badge badge-success">Completed</span>
                </div>
                {c.prescription && (
                  <div style={{ marginTop: 10, padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div><strong>Prescription:</strong> {c.prescription}</div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0 }}
                        onClick={() => downloadPrescriptionPdf({
                          doctorName: c.doctor_name,
                          patientName: c.patient_name,
                          date: c.date,
                          timeSlot: c.time_slot,
                          symptoms: c.symptoms,
                          prescription: c.prescription!,
                          followUp: c.follow_up,
                        })}
                      >
                        <FileDown size={14} /> PDF
                      </button>
                    </div>
                  </div>
                )}
                {c.follow_up && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--warning-600)' }}><CheckCircle size={14} style={{ display: 'inline', marginRight: 4 }} />Follow-up recommended</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {scheduled.length === 0 && completed.length === 0 && (
        <EmptyState icon={Video} title="No consultations yet" subtitle="Book a video, phone, or chat consultation with a doctor." />
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setSuccess(false); setErr(null) }}
        title={success ? 'Consultation Scheduled!' : 'Book Telemedicine Consultation'}
        footer={success ? <button className="btn btn-primary" onClick={() => { setModalOpen(false); setSuccess(false) }}>Done</button>
          : <><button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={bookConsultation}>Schedule Consultation</button></>}
      >
        {success ? (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={28} color="var(--success-500)" />
            </div>
            <p>Your <strong>{form.mode}</strong> consultation has been scheduled for <strong>{form.date}</strong> at <strong>{form.time_slot}</strong>.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label">Select Doctor *</label>
              <select className="input" value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}>
                <option value="">Choose a doctor</option>
                {doctors?.map((d) => <option key={d.id} value={d.name}>{d.name} - {d.specialty}</option>)}
              </select>
            </div>
            <div><label className="label">Patient Name *</label><input className="input" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="label">Date *</label><input className="input" type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label className="label">Time *</label><select className="input" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })}><option value="">Select</option><option>10:00-10:30</option><option>11:00-11:30</option><option>14:00-14:30</option><option>16:00-16:30</option></select></div>
            </div>
            <div><label className="label">Consultation Mode</label><select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}><option value="video">Video Call</option><option value="phone">Phone Call</option><option value="chat">Chat</option></select></div>
            <div><label className="label">Symptoms / Reason</label><textarea className="input" rows={2} value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} placeholder="Describe your symptoms" /></div>
            {err && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{err}</p>}
          </div>
        )}
      </Modal>

      {/* Real video/audio call */}
      {activeCall && activeCall.mode !== 'chat' && (
        <VideoCall
          roomId={activeCall.id}
          displayName={myName}
          withVideo={activeCall.mode === 'video'}
          onLeave={() => setActiveCall(null)}
        />
      )}
      {activeCall && activeCall.mode === 'chat' && (
        <Modal open={true} onClose={() => setActiveCall(null)} title={`Chat with ${activeCall.doctor_name}`}
          footer={<button className="btn btn-ghost" onClick={() => setActiveCall(null)}>Close</button>}
        >
          <ChatOnly roomId={activeCall.id} displayName={myName} />
        </Modal>
      )}
    </div>
  )
}

