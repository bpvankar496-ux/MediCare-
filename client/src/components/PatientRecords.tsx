import { useEffect, useState } from 'react'
import { Users, FileText, Plus, ChevronLeft } from 'lucide-react'
import { db } from '../lib/db'
import { EmptyState, Modal, LoadingState } from '../lib/ui'
import type { HealthRecord } from '../lib/types'

export interface DoctorPatient {
  id: string
  name: string
}

const recordTypes = ['prescription', 'report', 'discharge', 'scan', 'document']

const emptyForm = { title: '', type: 'prescription', date: new Date().toISOString().slice(0, 10), notes: '' }

// New feature: previously a doctor had no way at all to see or add to a
// patient's health records - Health Records was a purely patient-only
// feature. Now a doctor can look up their own patients (derived from their
// appointments/consultations - never anyone else's, enforced server-side in
// collections.js) and add records for them, e.g. a prescription after a
// consultation. The patient still sees these in their own Records page,
// clearly marked as added by their doctor (see Records.tsx).
export function PatientRecords({ patients }: { patients: DoctorPatient[] }) {
  const [selected, setSelected] = useState<DoctorPatient | null>(null)
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecords = async (patientId: string) => {
    setLoading(true)
    const { data } = await db.from('health_records').select('*').eq('user_id', patientId).order('date', { ascending: false })
    setRecords((data as HealthRecord[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    if (selected) loadRecords(selected.id)
  }, [selected])

  const addRecord = async () => {
    if (!selected || !form.title || !form.date) return
    setSaving(true)
    setError(null)
    const { error: err } = await db.from('health_records').insert({
      user_id: selected.id, title: form.title, type: form.type, date: form.date, notes: form.notes || null,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm(emptyForm)
    loadRecords(selected.id)
  }

  if (patients.length === 0) {
    return <EmptyState icon={Users} title="No patients yet" subtitle="Patients you've had an appointment or consultation with will appear here." />
  }

  if (!selected) {
    return (
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          Your patients, based on their appointments and consultations with you. Select one to view or add to their health records.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {patients.map((p) => (
            <button
              key={p.id}
              className="card"
              onClick={() => setSelected(p)}
              style={{ padding: 16, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: '1px solid var(--border)' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Users size={16} color="var(--primary-500)" />
              </div>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}><ChevronLeft size={16} /> All patients</button>
        <button className="btn btn-primary btn-sm" onClick={() => { setForm(emptyForm); setError(null); setModalOpen(true) }}>
          <Plus size={15} /> Add Record for {selected.name}
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : records.length === 0 ? (
        <EmptyState icon={FileText} title={`No records for ${selected.name} yet`} subtitle="Add a prescription, lab report, or note - it'll show up in their Records page too." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {records.map((rec) => (
            <div key={rec.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                <h4 style={{ fontSize: 14 }}>{rec.title}</h4>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{rec.type.replace('_', ' ')}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rec.date}</p>
              {rec.notes && <p style={{ fontSize: 13, marginTop: 6 }}>{rec.notes}</p>}
              {rec.added_by_role === 'doctor' && (
                <p style={{ fontSize: 11, color: 'var(--primary-600)', marginTop: 8 }}>Added by you</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Add Record for ${selected.name}`}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={addRecord} disabled={saving || !form.title || !form.date}>{saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <p style={{ fontSize: 13, color: 'var(--error-500)' }}>{error}</p>}
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Prescription - Amoxicillin" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {recordTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date *</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes for the patient" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
