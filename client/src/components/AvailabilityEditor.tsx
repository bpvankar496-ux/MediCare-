import { useState } from 'react'
import { Plus, Trash2, Clock } from 'lucide-react'
import { db } from '../lib/db'
import type { Doctor } from '../lib/types'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface AvailabilityEditorProps {
  doctor: Doctor
  onUpdated: (availability: string[]) => void
}

// New feature: previously a doctor's weekly availability was only ever set
// once by reception when the catalog listing was created (see seed.js /
// ReceptionistDashboard "Add New Doctor") - there was no way for a doctor to
// change their own hours afterwards. This lets a doctor add/remove slots
// from their own dashboard; each slot is stored as "Day HH:MM-HH:MM" (same
// format the booking flow in Doctors.tsx already expects).
export function AvailabilityEditor({ doctor, onUpdated }: AvailabilityEditorProps) {
  const [day, setDay] = useState('Mon')
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('14:00')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slots = doctor.availability || []

  const addSlot = async () => {
    setError(null)
    if (start >= end) { setError('Start time must be before end time'); return }
    const label = `${day} ${start}-${end}`
    if (slots.includes(label)) { setError('That slot already exists'); return }
    const next = [...slots, label]
    setSaving(true)
    const { error: err } = await db.from('doctors').update({ availability: next }).eq('id', doctor.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onUpdated(next)
  }

  const removeSlot = async (label: string) => {
    const next = slots.filter((s) => s !== label)
    setSaving(true)
    const { error: err } = await db.from('doctors').update({ availability: next }).eq('id', doctor.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    onUpdated(next)
  }

  // Group existing slots by day for a cleaner weekly view.
  const byDay: Record<string, string[]> = {}
  slots.forEach((s) => {
    const [d, ...rest] = s.split(' ')
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(rest.join(' '))
  })

  return (
    <div>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, maxWidth: 560 }}>
        Add the days and time ranges you're available for appointments. Patients only see and can book within these hours.
      </p>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label className="label">Day</label>
            <select className="input" value={day} onChange={(e) => setDay(e.target.value)} style={{ width: 110 }}>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Start</label>
            <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ width: 120 }} />
          </div>
          <div>
            <label className="label">End</label>
            <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ width: 120 }} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addSlot} disabled={saving}>
            <Plus size={15} /> Add Slot
          </button>
        </div>
        {error && <p style={{ color: 'var(--error-600)', fontSize: 13, marginTop: 10 }}>{error}</p>}
      </div>

      {slots.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No availability set yet - add a slot above so patients can book with you.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {DAYS.filter((d) => byDay[d]?.length).map((d) => (
            <div key={d} className="card" style={{ padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--primary-500)" /> {d}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {byDay[d].map((range) => {
                  const label = `${d} ${range}`
                  return (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text)' }}>
                      <span>{range}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeSlot(label)} style={{ padding: 4 }} disabled={saving} title="Remove slot">
                        <Trash2 size={13} color="var(--error-500)" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
