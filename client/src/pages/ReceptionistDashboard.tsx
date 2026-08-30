import { useEffect, useMemo, useState } from 'react'
import { ShieldPlus, LogOut, HeartHandshake, Link2, MessageCircle, CircleCheck as CheckCircle, UserPlus, BarChart3 } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { LoadingState, EmptyState, Modal } from '../lib/ui'
import type { Doctor } from '../lib/types'

const STATUS_COLORS: Record<string, string> = {
  open: 'var(--warning-400)',
  in_progress: 'var(--accent-400)',
  resolved: 'var(--success-400)',
}

interface ProfileRow { id: string; email: string; full_name: string; role: string }
interface Inquiry {
  id: string
  patient_name: string
  patient_email: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  reply: string | null
  created_at: string
}

const emptyDoctorForm = { profile_id: '', specialty: '', qualification: '', experience_years: '', fee: '', hospital: '', city: '', about: '' }

export default function ReceptionistDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState<'inquiries' | 'doctors' | 'analytics'>('inquiries')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [doctorProfiles, setDoctorProfiles] = useState<ProfileRow[]>([])
  const [doctorRows, setDoctorRows] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [addDoctorOpen, setAddDoctorOpen] = useState(false)
  const [doctorForm, setDoctorForm] = useState(emptyDoctorForm)
  const [addingDoctor, setAddingDoctor] = useState(false)
  const [addDoctorError, setAddDoctorError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: inq }, { data: profs }, { data: docs }] = await Promise.all([
      db.from('inquiries').select('*').order('created_at', { ascending: false }),
      db.from('profiles').select('*').eq('role', 'doctor'),
      db.from('doctors').select('*').order('name'),
    ])
    setInquiries((inq as Inquiry[]) || [])
    setDoctorProfiles((profs as ProfileRow[]) || [])
    setDoctorRows((docs as Doctor[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateInquiry = async (id: string, patch: Partial<Inquiry>) => {
    await db.from('inquiries').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const linkDoctor = async (doctorRowId: string, profileId: string) => {
    await db.from('doctors').update({ profile_id: profileId }).eq('id', doctorRowId)
    load()
  }

  const unlinkDoctor = async (doctorRowId: string) => {
    await db.from('doctors').update({ profile_id: null }).eq('id', doctorRowId)
    load()
  }

  const unlinkedDoctorProfiles = doctorProfiles.filter((p) => !doctorRows.some((dr) => dr.profile_id === p.id))

  const createDoctorEntry = async () => {
    const chosenProfile = doctorProfiles.find((p) => p.id === doctorForm.profile_id)
    if (!chosenProfile) { setAddDoctorError('Pick which doctor account this listing belongs to'); return }
    if (!doctorForm.specialty || !doctorForm.qualification) { setAddDoctorError('Specialty and qualification are required'); return }
    setAddingDoctor(true)
    setAddDoctorError(null)
    const { error } = await db.from('doctors').insert({
      name: chosenProfile.full_name,
      specialty: doctorForm.specialty,
      qualification: doctorForm.qualification,
      experience_years: Number(doctorForm.experience_years) || 0,
      fee: Number(doctorForm.fee) || 0,
      hospital: doctorForm.hospital || null,
      city: doctorForm.city || null,
      about: doctorForm.about || null,
      profile_id: chosenProfile.id,
    })
    setAddingDoctor(false)
    if (error) { setAddDoctorError(error.message); return }
    setDoctorForm(emptyDoctorForm)
    setAddDoctorOpen(false)
    load()
  }

  const statusBadge = (s: string) => s === 'open' ? 'badge-warning' : s === 'in_progress' ? 'badge-info' : 'badge-success'

  // Analytics: inquiry status breakdown + doctor count per specialty.
  const inquiryStatusData = useMemo(() => {
    const counts: Record<string, number> = { open: 0, in_progress: 0, resolved: 0 }
    inquiries.forEach((i) => { counts[i.status] = (counts[i.status] || 0) + 1 })
    return Object.entries(counts).map(([status, value]) => ({ name: status.replace('_', ' '), status, value }))
  }, [inquiries])

  const specialtyData = useMemo(() => {
    const counts: Record<string, number> = {}
    doctorRows.forEach((d) => { counts[d.specialty] = (counts[d.specialty] || 0) + 1 })
    return Object.entries(counts).map(([specialty, count]) => ({ specialty, count })).sort((a, b) => b.count - a.count)
  }, [doctorRows])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-500)', display: 'grid', placeItems: 'center' }}>
            <ShieldPlus color="white" size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>MediCare+ Reception Desk</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{profile?.full_name || profile?.email}</div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> Sign out</button>
      </header>

      <main style={{ padding: '28px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`btn btn-sm ${tab === 'inquiries' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('inquiries')}>
            <MessageCircle size={15} /> Inquiries {inquiries.filter((i) => i.status === 'open').length > 0 && `(${inquiries.filter((i) => i.status === 'open').length})`}
          </button>
          <button className={`btn btn-sm ${tab === 'doctors' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('doctors')}>
            <Link2 size={15} /> Link Doctors
          </button>
          <button className={`btn btn-sm ${tab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('analytics')}>
            <BarChart3 size={15} /> Analytics
          </button>
        </div>

        {loading ? <LoadingState /> : tab === 'inquiries' ? (
          inquiries.length === 0 ? (
            <EmptyState icon={HeartHandshake} title="No inquiries" subtitle="Patient help requests will show up here." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {inquiries.map((inq) => (
                <div key={inq.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{inq.subject}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{inq.patient_name} · {inq.patient_email}</div>
                    </div>
                    <span className={`badge ${statusBadge(inq.status)}`} style={{ textTransform: 'capitalize' }}>{inq.status.replace('_', ' ')}</span>
                  </div>
                  <p style={{ fontSize: 14, marginTop: 10 }}>{inq.message}</p>
                  {inq.reply && (
                    <div style={{ marginTop: 10, padding: 10, background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                      <strong>Reply sent:</strong> {inq.reply}
                    </div>
                  )}
                  {inq.status !== 'resolved' && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        className="input"
                        style={{ flex: '1 1 200px' }}
                        placeholder="Type a reply..."
                        value={replyDrafts[inq.id] ?? inq.reply ?? ''}
                        onChange={(e) => setReplyDrafts({ ...replyDrafts, [inq.id]: e.target.value })}
                      />
                      <button className="btn btn-secondary btn-sm" onClick={() => updateInquiry(inq.id, { reply: replyDrafts[inq.id] ?? '', status: 'in_progress' })}>Send Reply</button>
                      <button className="btn btn-primary btn-sm" onClick={() => updateInquiry(inq.id, { status: 'resolved', reply: replyDrafts[inq.id] ?? inq.reply ?? '' })}><CheckCircle size={14} /> Mark Resolved</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : tab === 'doctors' ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 560 }}>
                Link a doctor's login account to their catalog listing so their booked appointments appear on their own dashboard,
                or create a brand-new listing for a doctor who just signed up.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => { setDoctorForm(emptyDoctorForm); setAddDoctorError(null); setAddDoctorOpen(true) }} disabled={unlinkedDoctorProfiles.length === 0}>
                <UserPlus size={15} /> Add New Doctor
              </button>
            </div>
            {unlinkedDoctorProfiles.length === 0 && doctorProfiles.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>All doctor accounts are already linked to a listing.</p>
            )}
            {doctorProfiles.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>No one has signed up as a Doctor yet — once they do, they'll appear here to add.</p>
            )}
            {doctorRows.length === 0 ? (
              <EmptyState icon={Link2} title="No doctors in catalog" subtitle="Use “Add New Doctor” above once a doctor has signed up." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {doctorRows.map((d) => (
                  <div key={d.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.specialty}</div>
                    </div>
                    {d.profile_id ? (
                      <>
                        <span className="badge badge-success">Linked</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => unlinkDoctor(d.id)}>Unlink</button>
                      </>
                    ) : (
                      <select className="input" style={{ width: 'auto' }} defaultValue="" onChange={(e) => { if (e.target.value) linkDoctor(d.id, e.target.value) }}>
                        <option value="">Link to account...</option>
                        {unlinkedDoctorProfiles.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="dashboard-grid">
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginBottom: 14 }}>Inquiries by Status</h4>
              {inquiries.length === 0 ? (
                <EmptyState icon={MessageCircle} title="No data yet" subtitle="Inquiry stats will appear once patients reach out." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={inquiryStatusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {inquiryStatusData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || 'var(--neutral-300)'} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginBottom: 14 }}>Doctors by Specialty</h4>
              {specialtyData.length === 0 ? (
                <EmptyState icon={Link2} title="No doctors yet" subtitle="Add doctors to the catalog to see this breakdown." />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={specialtyData} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="specialty" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={130} />
                    <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                    <Bar dataKey="count" fill="var(--primary-500)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </main>

      <Modal
        open={addDoctorOpen}
        onClose={() => setAddDoctorOpen(false)}
        title="Add New Doctor"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddDoctorOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createDoctorEntry} disabled={addingDoctor}>{addingDoctor ? 'Adding...' : 'Add Doctor'}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">Doctor account *</label>
            <select className="input" value={doctorForm.profile_id} onChange={(e) => setDoctorForm({ ...doctorForm, profile_id: e.target.value })}>
              <option value="">Select a signed-up doctor...</option>
              {unlinkedDoctorProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Specialty *</label>
              <input className="input" value={doctorForm.specialty} onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })} placeholder="e.g. Cardiologist" />
            </div>
            <div>
              <label className="label">Qualification *</label>
              <input className="input" value={doctorForm.qualification} onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })} placeholder="e.g. MBBS, MD" />
            </div>
            <div>
              <label className="label">Experience (years)</label>
              <input className="input" type="number" value={doctorForm.experience_years} onChange={(e) => setDoctorForm({ ...doctorForm, experience_years: e.target.value })} />
            </div>
            <div>
              <label className="label">Consultation Fee</label>
              <input className="input" type="number" value={doctorForm.fee} onChange={(e) => setDoctorForm({ ...doctorForm, fee: e.target.value })} />
            </div>
            <div>
              <label className="label">Hospital</label>
              <input className="input" value={doctorForm.hospital} onChange={(e) => setDoctorForm({ ...doctorForm, hospital: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={doctorForm.city} onChange={(e) => setDoctorForm({ ...doctorForm, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">About</label>
            <textarea className="input" rows={2} value={doctorForm.about} onChange={(e) => setDoctorForm({ ...doctorForm, about: e.target.value })} />
          </div>
          {addDoctorError && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{addDoctorError}</p>}
        </div>
      </Modal>
    </div>
  )
}
