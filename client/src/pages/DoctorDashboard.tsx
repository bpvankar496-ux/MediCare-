import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldPlus, LogOut, Calendar, Clock, Video as VideoIcon, Phone, MessageSquare, Stethoscope, PhoneIncoming, TrendingUp, Settings as SettingsIcon, BookOpen, Plus, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { VideoCall } from '../lib/VideoCall'
import { ChatOnly } from '../lib/ChatOnly'
import { LoadingState, EmptyState, Modal, DoctorAvatar } from '../lib/ui'
import Settings from './Settings'
import { useIncomingCallInvites, sendCallInvite, useNotificationPermission } from '../lib/callInvites'
import { QuickSettings } from '../components/QuickSettings'
import type { Appointment, Consultation, Doctor, Article } from '../lib/types'

const emptyArticleForm = { title: '', category: '', excerpt: '', content: '', read_time: '' }
const emptyEndCallForm = { prescription: '', follow_up: false }

export default function DoctorDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'overview' | 'library' | 'settings'>('overview')
  const [linkedDoctor, setLinkedDoctor] = useState<Doctor | null | undefined>(undefined)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCall, setActiveCall] = useState<Consultation | null>(null)
  const [endCallTarget, setEndCallTarget] = useState<Consultation | null>(null)
  const [endCallForm, setEndCallForm] = useState(emptyEndCallForm)
  const [endingCall, setEndingCall] = useState(false)
  const [articleModalOpen, setArticleModalOpen] = useState(false)
  const [articleForm, setArticleForm] = useState(emptyArticleForm)
  const [savingArticle, setSavingArticle] = useState(false)
  const [articleError, setArticleError] = useState<string | null>(null)
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

  const reloadConsultations = async () => {
    const { data: cons } = await db.from('consultations').select('*').order('created_at', { ascending: false })
    const allConsultations = (cons as Consultation[]) || []
    const byName = allConsultations.filter((c) => c.doctor_name.trim().toLowerCase() === (profile?.full_name || '').trim().toLowerCase())
    setConsultations(byName.length > 0 ? byName : allConsultations)
  }

  const reloadArticles = async () => {
    const { data: arts } = await db.from('articles').select('*').order('published_at', { ascending: false })
    setArticles((arts as Article[]) || [])
  }

  // New feature: previously a doctor had no way to end a telemedicine
  // consultation, so it stayed "scheduled" forever and either side could
  // rejoin the same call any number of times. This marks it "completed"
  // with the doctor's advice/prescription attached, which also makes the
  // "Join Now" button disappear for both the doctor and the patient.
  const submitEndCall = async () => {
    if (!endCallTarget) return
    setEndingCall(true)
    await db.from('consultations').update({
      status: 'completed',
      prescription: endCallForm.prescription.trim() || null,
      follow_up: endCallForm.follow_up,
    }).eq('id', endCallTarget.id)
    setEndingCall(false)
    setEndCallTarget(null)
    setEndCallForm(emptyEndCallForm)
    setActiveCall(null)
    reloadConsultations()
  }

  const addArticle = async () => {
    if (!articleForm.title.trim() || !articleForm.category.trim() || !articleForm.excerpt.trim() || !articleForm.content.trim()) {
      setArticleError('Title, category, excerpt, and content are required')
      return
    }
    setSavingArticle(true)
    setArticleError(null)
    const { error } = await db.from('articles').insert({
      title: articleForm.title.trim(),
      category: articleForm.category.trim(),
      excerpt: articleForm.excerpt.trim(),
      content: articleForm.content.trim(),
      read_time: articleForm.read_time.trim() || null,
      author: myName,
    })
    setSavingArticle(false)
    if (error) { setArticleError(error.message); return }
    setArticleForm(emptyArticleForm)
    setArticleModalOpen(false)
    reloadArticles()
  }

  const deleteArticle = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}" from the Health Library? This cannot be undone.`)) return
    await db.from('articles').delete().eq('id', id)
    reloadArticles()
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

      const { data: arts } = await db.from('articles').select('*').order('published_at', { ascending: false })
      if (!cancelled) setArticles((arts as Article[]) || [])

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
        <div
          role="button"
          onClick={() => navigate('/home')}
          title="Go to MediCare+ home page"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'none', border: 'none' }}
        >
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QuickSettings />
          <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> Sign out</button>
        </div>
      </header>

      <main style={{ padding: '28px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button className={`btn btn-sm ${tab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('overview')}>
            <Calendar size={15} /> Overview
          </button>
          <button className={`btn btn-sm ${tab === 'library' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('library')}>
            <BookOpen size={15} /> Health Library
          </button>
          <button className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('settings')}>
            <SettingsIcon size={15} /> Settings
          </button>
        </div>

        {tab === 'settings' ? (
          <Settings />
        ) : tab === 'library' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 560 }}>
                Articles you publish here appear in every patient's Health Library.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => { setArticleForm(emptyArticleForm); setArticleError(null); setArticleModalOpen(true) }}>
                <Plus size={15} /> Add Article
              </button>
            </div>
            {articles.length === 0 ? (
              <EmptyState icon={BookOpen} title="No articles yet" subtitle="Publish your first Health Library article for patients to read." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {articles.map((a) => (
                  <div key={a.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.category} {a.author ? `· ${a.author}` : ''}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteArticle(a.id, a.title)} style={{ padding: 6 }}>
                      <Trash2 size={16} color="var(--error-500)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
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
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => joinNow(c)}>Join Now</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEndCallTarget(c); setEndCallForm(emptyEndCallForm) }}>End & Add Advice</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
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

      <Modal
        open={!!endCallTarget}
        onClose={() => setEndCallTarget(null)}
        title={`End consultation with ${endCallTarget?.patient_name ?? ''}`}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEndCallTarget(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={submitEndCall} disabled={endingCall}>{endingCall ? 'Saving...' : 'Mark Completed'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Once marked completed, this consultation moves to Past Consultations and can no longer be re-joined by either side.
          </p>
          <div>
            <label className="label">Prescription / Advice</label>
            <textarea className="input" rows={4} value={endCallForm.prescription} onChange={(e) => setEndCallForm({ ...endCallForm, prescription: e.target.value })} placeholder="Medicines, dosage, and advice for the patient" />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={endCallForm.follow_up} onChange={(e) => setEndCallForm({ ...endCallForm, follow_up: e.target.checked })} />
            Recommend a follow-up visit
          </label>
        </div>
      </Modal>

      <Modal
        open={articleModalOpen}
        onClose={() => setArticleModalOpen(false)}
        title="Add Health Library Article"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setArticleModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={addArticle} disabled={savingArticle}>{savingArticle ? 'Publishing...' : 'Publish'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="label">Title *</label><input className="input" value={articleForm.title} onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">Category *</label><input className="input" value={articleForm.category} onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value })} placeholder="e.g. Nutrition" /></div>
            <div><label className="label">Read time</label><input className="input" value={articleForm.read_time} onChange={(e) => setArticleForm({ ...articleForm, read_time: e.target.value })} placeholder="e.g. 4 min" /></div>
          </div>
          <div><label className="label">Excerpt *</label><textarea className="input" rows={2} value={articleForm.excerpt} onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })} /></div>
          <div><label className="label">Content *</label><textarea className="input" rows={6} value={articleForm.content} onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })} /></div>
          {articleError && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{articleError}</p>}
        </div>
      </Modal>
    </div>
  )
}
