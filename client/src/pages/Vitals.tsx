import { useState, useMemo, useEffect } from 'react'
import { Activity, Plus, Trash2, Heart, Droplet, Gauge, Weight, Thermometer, TrendingUp } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal, EmptyState } from '../lib/ui'
import { db } from '../lib/db'
import type { Vital } from '../lib/types'

const vitalTypes = [
  { type: 'Blood Pressure', unit: 'mmHg', icon: Heart, color: 'var(--error-500)', bg: 'var(--error-50)' },
  { type: 'Heart Rate', unit: 'bpm', icon: Heart, color: 'var(--primary-500)', bg: 'var(--primary-50)' },
  { type: 'Blood Sugar', unit: 'mg/dL', icon: Droplet, color: 'var(--accent-500)', bg: 'var(--accent-50)' },
  { type: 'Weight', unit: 'kg', icon: Weight, color: 'var(--secondary-500)', bg: 'var(--secondary-50)' },
  { type: 'Temperature', unit: '°C', icon: Thermometer, color: 'var(--warning-500)', bg: 'var(--warning-50)' },
  { type: 'Oxygen Level', unit: '%', icon: Gauge, color: 'var(--success-500)', bg: 'var(--success-50)' },
]

export default function Vitals() {
  const { data: vitals, refetch, loading, error } = useSupabaseQuery<Vital>('vitals', '*', 'recorded_at', false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ type: 'Blood Pressure', value: '', unit: 'mmHg', notes: '' })
  const [chartType, setChartType] = useState('Blood Pressure')

  const grouped = useMemo(() => {
    const map: Record<string, Vital[]> = {}
    vitals?.forEach((v) => { if (!map[v.type]) map[v.type] = []; map[v.type].push(v) })
    return map
  }, [vitals])

  // Keep the chart dropdown pointed at a type that actually has data -
  // otherwise it'd default to "Blood Pressure" even when the patient has
  // only ever logged, say, Weight.
  useEffect(() => {
    if (grouped[chartType]?.length) return
    const firstWithData = vitalTypes.find((vt) => grouped[vt.type]?.length)
    if (firstWithData) setChartType(firstWithData.type)
  }, [grouped, chartType])

  // New feature: a trend chart per vital type so patients (and the doctor
  // reviewing their records) can see change over time, not just the latest
  // reading and a flat table. Blood Pressure is stored as "120/80" so it's
  // split into two lines (systolic/diastolic); every other type is a single
  // numeric line.
  const chartData = useMemo(() => {
    const rows = (grouped[chartType] || []).slice().sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    if (chartType === 'Blood Pressure') {
      return rows.map((v) => {
        const [sys, dia] = v.value.split('/').map((n) => parseFloat(n))
        return { date: new Date(v.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), systolic: isNaN(sys) ? null : sys, diastolic: isNaN(dia) ? null : dia }
      })
    }
    return rows.map((v) => ({ date: new Date(v.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: parseFloat(v.value) }))
  }, [grouped, chartType])

  const addVital = async () => {
    if (!form.value) return
    const vt = vitalTypes.find((t) => t.type === form.type)!
    const { error } = await db.from('vitals').insert({
      type: form.type, value: form.value, unit: vt.unit, notes: form.notes || null,
    })
    if (error) return
    refetch(); setModalOpen(false)
    setForm({ type: 'Blood Pressure', value: '', unit: 'mmHg', notes: '' })
  }

  const deleteVital = async (id: string) => { await db.from('vitals').delete().eq('id', id); refetch() }

  if (loading) return <div><PageHeader title={"Vitals Tracker"} subtitle={"Track blood pressure, sugar, weight, and more"} icon={Activity} /><LoadingState /></div>
  if (error) return <div><PageHeader title={"Vitals Tracker"} subtitle={"Track blood pressure, sugar, weight, and more"} icon={Activity} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title={"Vitals Tracker"} subtitle={"Track blood pressure, sugar, weight, and more"} icon={Activity} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Record Vital</button>
      </div>

      {/* Quick stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {vitalTypes.map((vt) => {
          const latest = grouped[vt.type]?.[0]
          return (
            <div key={vt.type} className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: vt.bg, display: 'grid', placeItems: 'center' }}>
                  <vt.icon size={18} color={vt.color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{vt.type}</span>
              </div>
              {latest ? (
                <>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>{latest.value} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>{latest.unit}</span></div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(latest.recorded_at).toLocaleDateString()}</div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>No data yet</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Trend chart */}
      {vitals && vitals.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><TrendingUp size={18} color="var(--primary-500)" /> Trend</h3>
            <select className="input" style={{ width: 'auto' }} value={chartType} onChange={(e) => setChartType(e.target.value)}>
              {vitalTypes.filter((vt) => grouped[vt.type]?.length).map((vt) => <option key={vt.type} value={vt.type}>{vt.type}</option>)}
            </select>
          </div>
          {chartData.length < 2 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Record at least 2 readings of this type to see a trend line.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                {chartType === 'Blood Pressure' ? (
                  <>
                    <Legend />
                    <Line type="monotone" dataKey="systolic" name="Systolic" stroke="var(--error-500)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="var(--primary-500)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </>
                ) : (
                  <Line type="monotone" dataKey="value" name={chartType} stroke="var(--primary-500)" strokeWidth={2} dot={{ r: 3 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* History */}
      {vitals && vitals.length > 0 ? (
        <div>
          <h3 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={18} color="var(--primary-500)" /> Vital History</h3>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--neutral-50)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>Value</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text)' }}>Notes</th>
                  <th style={{ padding: '12px 16px' }}></th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-h)' }}>{v.type}</td>
                    <td style={{ padding: '12px 16px' }}>{v.value} {v.unit}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{new Date(v.recorded_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{v.notes || '-'}</td>
                    <td style={{ padding: '12px 16px' }}><button className="btn btn-ghost btn-sm" onClick={() => deleteVital(v.id)} style={{ padding: 4 }}><Trash2 size={15} color="var(--error-500)" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={Activity} title="No vitals recorded" subtitle="Start tracking your blood pressure, heart rate, blood sugar, and other health metrics." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Vital Sign"
        footer={<><button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={addVital} disabled={!form.value}>Save</button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Vital Type</label>
            <select className="input" value={form.type} onChange={(e) => {
              const vt = vitalTypes.find((t) => t.type === e.target.value)!
              setForm({ ...form, type: e.target.value, unit: vt.unit })
            }}>
              {vitalTypes.map((vt) => <option key={vt.type} value={vt.type}>{vt.type}</option>)}
            </select>
          </div>
          <div><label className="label">Value *</label><input className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={`e.g. 120/80 (${form.unit})`} /></div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
        </div>
      </Modal>
    </div>
  )
}
