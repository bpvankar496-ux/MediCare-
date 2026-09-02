import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldPlus, LogOut, HeartHandshake, Link2, MessageCircle, CircleCheck as CheckCircle, UserPlus, BarChart3, Trash2, Settings as SettingsIcon } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useAuth } from '../lib/auth'
import { db } from '../lib/db'
import { LoadingState, EmptyState, Modal } from '../lib/ui'
import Settings from './Settings'
import { QuickSettings } from '../components/QuickSettings'
import { useI18n } from '../lib/i18n'
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
  const { t } = useI18n()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'inquiries' | 'doctors' | 'analytics' | 'settings'>('inquiries')
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

  // New feature: reception previously had no way to remove a doctor listing
  // once added (only link/unlink). This deletes the catalog entry itself -
  // the doctor's login account is untouched, so they can be re-added later.
  const deleteDoctor = async (doctorRowId: string, name: string) => {
    if (!window.confirm(`${t('rd_remove_confirm_1')} ${name} ${t('rd_remove_confirm_2')}`)) return
    await db.from('doctors').delete().eq('id', doctorRowId)
    load()
  }

  const unlinkedDoctorProfiles = doctorProfiles.filter((p) => !doctorRows.some((dr) => dr.profile_id === p.id))

  const createDoctorEntry = async () => {
    const chosenProfile = doctorProfiles.find((p) => p.id === doctorForm.profile_id)
    if (!chosenProfile) { setAddDoctorError(t('rd_err_pick_profile')); return }
    if (!doctorForm.specialty || !doctorForm.qualification) { setAddDoctorError(t('rd_err_specialty_qual')); return }
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
  const statusLabel = (s: string) => s === 'open' ? t('rd_status_open') : s === 'in_progress' ? t('rd_status_in_progress') : t('rd_status_resolved')

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
        <div
          role="button"
          onClick={() => navigate('/home')}
          title="Go to MediCare+ home page"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-500)', display: 'grid', placeItems: 'center' }}>
            <ShieldPlus color="white" size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>{t('rd_portal_title')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{profile?.full_name || profile?.email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <QuickSettings />
          <button className="btn btn-ghost btn-sm" onClick={signOut}><LogOut size={16} /> {t('rd_sign_out')}</button>
        </div>
      </header>

      <main style={{ padding: '28px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`btn btn-sm ${tab === 'inquiries' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('inquiries')}>
            <MessageCircle size={15} /> {t('rd_inquiries')} {inquiries.filter((i) => i.status === 'open').length > 0 && `(${inquiries.filter((i) => i.status === 'open').length})`}
          </button>
          <button className={`btn btn-sm ${tab === 'doctors' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('doctors')}>
            <Link2 size={15} /> {t('rd_link_doctors')}
          </button>
          <button className={`btn btn-sm ${tab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('analytics')}>
            <BarChart3 size={15} /> {t('rd_analytics')}
          </button>
          <button className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('settings')}>
            <SettingsIcon size={15} /> {t('rd_settings')}
          </button>
        </div>

        {tab === 'settings' ? (
          <Settings />
        ) : loading ? <LoadingState /> : tab === 'inquiries' ? (
          inquiries.length === 0 ? (
            <EmptyState icon={HeartHandshake} title={t('rd_no_inquiries')} subtitle={t('rd_no_inquiries_sub')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {inquiries.map((inq) => (
                <div key={inq.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{inq.subject}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{inq.patient_name} · {inq.patient_email}</div>
                    </div>
                    <span className={`badge ${statusBadge(inq.status)}`} style={{ textTransform: 'capitalize' }}>{statusLabel(inq.status)}</span>
                  </div>
                  <p style={{ fontSize: 14, marginTop: 10 }}>{inq.message}</p>
                  {inq.reply && (
                    <div style={{ marginTop: 10, padding: 10, background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                      <strong>{t('rd_reply_sent')}</strong> {inq.reply}
                    </div>
                  )}
                  {inq.status !== 'resolved' && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        className="input"
                        style={{ flex: '1 1 200px' }}
                        placeholder={t('rd_reply_placeholder')}
                        value={replyDrafts[inq.id] ?? inq.reply ?? ''}
                        onChange={(e) => setReplyDrafts({ ...replyDrafts, [inq.id]: e.target.value })}
                      />
                      <button className="btn btn-secondary btn-sm" onClick={() => updateInquiry(inq.id, { reply: replyDrafts[inq.id] ?? '', status: 'in_progress' })}>{t('rd_send_reply')}</button>
                      <button className="btn btn-primary btn-sm" onClick={() => updateInquiry(inq.id, { status: 'resolved', reply: replyDrafts[inq.id] ?? inq.reply ?? '' })}><CheckCircle size={14} /> {t('rd_mark_resolved')}</button>
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
                {t('rd_link_doctors_intro')}
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => { setDoctorForm(emptyDoctorForm); setAddDoctorError(null); setAddDoctorOpen(true) }} disabled={unlinkedDoctorProfiles.length === 0}>
                <UserPlus size={15} /> {t('rd_add_new_doctor')}
              </button>
            </div>
            {unlinkedDoctorProfiles.length === 0 && doctorProfiles.length > 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{t('rd_all_linked')}</p>
            )}
            {doctorProfiles.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{t('rd_none_signed_up')}</p>
            )}
            {doctorRows.length === 0 ? (
              <EmptyState icon={Link2} title={t('rd_no_doctors_catalog')} subtitle={t('rd_no_doctors_catalog_sub')} />
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
                        <span className="badge badge-success">{t('rd_linked')}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => unlinkDoctor(d.id)}>{t('rd_unlink')}</button>
                      </>
                    ) : (
                      <select className="input" style={{ width: 'auto' }} defaultValue="" onChange={(e) => { if (e.target.value) linkDoctor(d.id, e.target.value) }}>
                        <option value="">{t('rd_link_to_account')}</option>
                        {unlinkedDoctorProfiles.map((p) => (
                          <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                        ))}
                      </select>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteDoctor(d.id, d.name)} title={t('rd_remove_catalog')} style={{ padding: 6 }}>
                      <Trash2 size={16} color="var(--error-500)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="dashboard-grid">
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ marginBottom: 14 }}>{t('rd_inquiries_by_status')}</h4>
              {inquiries.length === 0 ? (
                <EmptyState icon={MessageCircle} title={t('rd_no_data_yet')} subtitle={t('rd_inquiry_stats_sub')} />
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
              <h4 style={{ marginBottom: 14 }}>{t('rd_doctors_by_specialty')}</h4>
              {specialtyData.length === 0 ? (
                <EmptyState icon={Link2} title={t('rd_no_doctors_yet')} subtitle={t('rd_no_doctors_yet_sub')} />
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
        title={t('rd_add_new_doctor')}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddDoctorOpen(false)}>{t('rd_cancel')}</button>
            <button className="btn btn-primary" onClick={createDoctorEntry} disabled={addingDoctor}>{addingDoctor ? t('rd_adding') : t('rd_add_doctor')}</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">{t('rd_doctor_account_req')}</label>
            <select className="input" value={doctorForm.profile_id} onChange={(e) => setDoctorForm({ ...doctorForm, profile_id: e.target.value })}>
              <option value="">{t('rd_select_signed_up')}</option>
              {unlinkedDoctorProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">{t('rd_specialty_req')}</label>
              <input className="input" value={doctorForm.specialty} onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })} placeholder={t('rd_specialty_placeholder')} />
            </div>
            <div>
              <label className="label">{t('rd_qualification_req')}</label>
              <input className="input" value={doctorForm.qualification} onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })} placeholder={t('rd_qualification_placeholder')} />
            </div>
            <div>
              <label className="label">{t('rd_experience')}</label>
              <input className="input" type="number" value={doctorForm.experience_years} onChange={(e) => setDoctorForm({ ...doctorForm, experience_years: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('rd_fee')}</label>
              <input className="input" type="number" value={doctorForm.fee} onChange={(e) => setDoctorForm({ ...doctorForm, fee: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('rd_hospital')}</label>
              <input className="input" value={doctorForm.hospital} onChange={(e) => setDoctorForm({ ...doctorForm, hospital: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('rd_city')}</label>
              <input className="input" value={doctorForm.city} onChange={(e) => setDoctorForm({ ...doctorForm, city: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t('rd_about')}</label>
            <textarea className="input" rows={2} value={doctorForm.about} onChange={(e) => setDoctorForm({ ...doctorForm, about: e.target.value })} />
          </div>
          {addDoctorError && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{addDoctorError}</p>}
        </div>
      </Modal>
    </div>
  )
}
