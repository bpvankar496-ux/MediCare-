import { useState } from 'react'
import { HeartPulse, Search, TriangleAlert as AlertTriangle, ChevronRight } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, EmptyState } from '../lib/ui'
import type { Symptom } from '../lib/types'

export default function SymptomChecker() {
  const { data: symptoms, loading, error } = useSupabaseQuery<Symptom>('symptoms')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Symptom | null>(null)

  const filtered = symptoms?.filter((s) =>
    !search || s.symptom.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  if (loading) return <div><PageHeader title="Symptom Checker" subtitle="Identify possible conditions based on your symptoms" icon={HeartPulse} /><LoadingState /></div>
  if (error) return <div><PageHeader title="Symptom Checker" subtitle="Identify possible conditions based on your symptoms" icon={HeartPulse} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title="Symptom Checker" subtitle="Identify possible conditions based on your symptoms" icon={HeartPulse} />

      <div className="card" style={{ padding: 16, marginBottom: 20, background: 'var(--warning-50)', border: '1px solid var(--warning-100)' }}>
        <p style={{ fontSize: 14, color: 'var(--warning-600)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> This tool is for informational purposes only and not a substitute for professional medical advice.
        </p>
      </div>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" style={{ paddingLeft: 40 }} placeholder="Search symptoms (e.g. fever, headache, cough)..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {selected ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>← Back</button>
            <h2>Possible Conditions for "{selected.symptom}"</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {selected.possible_conditions.map((c, i) => (
              <div key={i} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h4>{c.condition}</h4>
                  <span className={`badge ${c.urgency === 'high' ? 'badge-error' : c.urgency === 'medium' ? 'badge-warning' : 'badge-success'}`}>
                    {c.urgency} urgency
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>Consult a <strong>{c.specialty}</strong></p>
              </div>
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={HeartPulse} title="No symptoms found" subtitle="Try searching with a different keyword." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((s) => (
            <div key={s.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setSelected(s)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--neutral-50)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface)'}
            >
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--error-50)', display: 'grid', placeItems: 'center' }}>
                <HeartPulse size={20} color="var(--error-500)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-h)' }}>{s.symptom}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.possible_conditions.length} possible conditions · {s.body_part}</div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
