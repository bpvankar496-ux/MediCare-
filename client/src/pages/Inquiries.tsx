import { useState } from 'react'
import { HeartHandshake, Send, CircleCheck as CheckCircle } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, EmptyState } from '../lib/ui'
import { db } from '../lib/db'
import { useAuth } from '../lib/auth'

interface Inquiry {
  id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  reply: string | null
  created_at: string
}

export default function Inquiries() {
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

  if (loading) return <div><PageHeader title="Ask Reception" subtitle="Get help from our front desk team" icon={HeartHandshake} /><LoadingState /></div>
  if (error) return <div><PageHeader title="Ask Reception" subtitle="Get help from our front desk team" icon={HeartHandshake} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title="Ask Reception" subtitle="Raise a query and our reception desk will help you out" icon={HeartHandshake} />

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <h4 style={{ marginBottom: 14 }}>Submit a new inquiry</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">Subject *</label>
            <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Need help rescheduling my appointment" />
          </div>
          <div>
            <label className="label">Message *</label>
            <textarea className="input" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe what you need help with" />
          </div>
          {success && <p style={{ color: 'var(--success-600)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={15} /> Your inquiry has been sent to reception.</p>}
          <button className="btn btn-primary" onClick={submit} disabled={submitting || !form.subject || !form.message} style={{ alignSelf: 'flex-start' }}>
            <Send size={15} /> {submitting ? 'Sending...' : 'Send Inquiry'}
          </button>
        </div>
      </div>

      <h4 style={{ marginBottom: 14 }}>Your inquiries</h4>
      {myInquiries.length === 0 ? (
        <EmptyState icon={HeartHandshake} title="No inquiries yet" subtitle="Anything you ask reception will show up here along with their reply." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myInquiries.map((inq) => (
            <div key={inq.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <strong>{inq.subject}</strong>
                <span className={`badge ${statusBadge(inq.status)}`} style={{ textTransform: 'capitalize' }}>{inq.status.replace('_', ' ')}</span>
              </div>
              <p style={{ fontSize: 14, marginTop: 8, color: 'var(--text)' }}>{inq.message}</p>
              {inq.reply && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                  <strong>Reception:</strong> {inq.reply}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
