import { useState } from 'react'
import { HeartHandshake, Send, CircleCheck as CheckCircle } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, EmptyState } from '../lib/ui'
import { db } from '../lib/db'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

interface Inquiry {
  id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  reply: string | null
  created_at: string
}

export default function Inquiries() {
  const { t } = useI18n()
  const { user, profile } = useAuth()
  const { data: allInquiries, refetch, loading, error } = useSupabaseQuery<Inquiry & { patient_id: string }>('inquiries', '*', 'created_at', false)
  const [form, setForm] = useState({ subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const myInquiries = allInquiries?.filter((i) => i.patient_id === user?.id) ?? []

  const submit = async () => {
    if (!form.subject || !form.message) return
    setSubmitting(true)
    const { error: insertError } = await db.from('inquiries').insert({
      patient_id: user?.id,
      patient_name: profile?.full_name || 'Patient',
      patient_email: profile?.email || '',
      subject: form.subject,
      message: form.message,
      status: 'open',
    })
    setSubmitting(false)
    if (!insertError) {
      setForm({ subject: '', message: '' })
      setSuccess(true)
      refetch()
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  const statusBadge = (s: string) => s === 'open' ? 'badge-warning' : s === 'in_progress' ? 'badge-info' : 'badge-success'
  const statusLabel = (s: string) => s === 'open' ? t('iq_status_open') : s === 'in_progress' ? t('iq_status_in_progress') : t('iq_status_resolved')

  if (loading) return <div><PageHeader title={t('ph_inquiries_title')} subtitle={t('ph_inquiries_subtitle')} icon={HeartHandshake} /><LoadingState /></div>
  if (error) return <div><PageHeader title={t('ph_inquiries_title')} subtitle={t('ph_inquiries_subtitle')} icon={HeartHandshake} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title={t('ph_inquiries_title')} subtitle={t('ph_inquiries_subtitle')} icon={HeartHandshake} />

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h4 style={{ marginBottom: 14 }}>{t('iq_submit_new')}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">{t('iq_subject')}</label>
            <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t('iq_subject_placeholder')} />
          </div>
          <div>
            <label className="label">{t('iq_message')}</label>
            <textarea className="input" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t('iq_message_placeholder')} />
          </div>
          {success && <p style={{ color: 'var(--success-600)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={15} /> {t('iq_sent_success')}</p>}
          <button className="btn btn-primary" onClick={submit} disabled={submitting || !form.subject || !form.message} style={{ alignSelf: 'flex-start' }}>
            <Send size={15} /> {submitting ? t('iq_sending') : t('iq_send_inquiry')}
          </button>
        </div>
      </div>

      <h4 style={{ marginBottom: 14 }}>{t('iq_your_inquiries')}</h4>
      {myInquiries.length === 0 ? (
        <EmptyState icon={HeartHandshake} title={t('iq_empty_title')} subtitle={t('iq_empty_subtitle')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myInquiries.map((inq) => (
            <div key={inq.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong>{inq.subject}</strong>
                <span className={`badge ${statusBadge(inq.status)}`} style={{ textTransform: 'capitalize' }}>{statusLabel(inq.status)}</span>
              </div>
              <p style={{ fontSize: 14, marginTop: 8, color: 'var(--text)' }}>{inq.message}</p>
              {inq.reply && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  <strong>{t('iq_reception')}</strong> {inq.reply}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
