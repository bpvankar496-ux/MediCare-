import { useState } from 'react'
import { HeartPulse, Search, TriangleAlert as AlertTriangle, ChevronRight, Sparkles, Loader2, Stethoscope } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, EmptyState } from '../lib/ui'
import { API_URL, getToken } from '../lib/db'
import type { Symptom } from '../lib/types'

interface AiCondition {
  condition: string
  specialty: string
  likelihood: 'low' | 'medium' | 'high'
  explanation: string
}

interface AiResult {
  summary: string
  possible_conditions: AiCondition[]
  urgency: 'low' | 'medium' | 'high' | 'emergency'
  recommendation: string
  disclaimer: string
}

const urgencyBadge: Record<AiResult['urgency'], string> = {
  low: 'badge-success',
  medium: 'badge-warning',
  high: 'badge-error',
  emergency: 'badge-error',
}

function AiSymptomAnalyzer() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AiResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const analyze = async () => {
    if (!text.trim()) return
    setLoading(true); setErr(null); setResult(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_URL}/api/ai/symptom-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ symptoms: text.trim() }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setErr((data && data.error) || 'Something went wrong. Please try again.'); return }
      setResult(data as AiResult)
    } catch {
      setErr('Could not reach the AI service. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginBottom: 28, border: '1px solid var(--primary-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Sparkles size={18} color="var(--primary-500)" />
        <h3>AI Symptom Analysis</h3>
        <span className="badge badge-info">Beta</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
        Describe how you're feeling in your own words — the AI will suggest possible causes and how urgently to see a doctor.
      </p>
      <textarea
        className="input"
        rows={3}
        placeholder="e.g. I've had a mild fever and sore throat for two days, plus a headache..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="btn btn-primary" onClick={analyze} disabled={loading || !text.trim()}>
          {loading ? <><Loader2 size={16} className="spin" /> Analyzing...</> : <><Sparkles size={16} /> Analyze Symptoms</>}
        </button>
      </div>

      {err && (
        <div style={{ marginTop: 14, padding: 12, background: 'var(--warning-50)', border: '1px solid var(--warning-100)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--warning-600)' }}>
          {err}
        </div>
      )}

      {result && (
        <div className="fade-in" style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className={`badge ${urgencyBadge[result.urgency]}`} style={{ textTransform: 'capitalize' }}>{result.urgency} urgency</span>
            <p style={{ fontSize: 14, color: 'var(--text)', flex: 1, minWidth: 200 }}>{result.summary}</p>
          </div>

          {result.urgency === 'emergency' && (
            <div style={{ padding: 12, background: 'var(--error-50)', border: '1px solid var(--error-100)', borderRadius: 'var(--radius-sm)', marginBottom: 14, fontSize: 13, color: 'var(--error-600)', fontWeight: 600 }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: -2 }} />
              This may be a medical emergency — please call emergency services or visit the nearest ER immediately.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 14 }}>
            {result.possible_conditions.map((c, i) => (
              <div key={i} style={{ padding: 14, background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-h)' }}>{c.condition}</span>
                  <span className={`badge ${c.likelihood === 'high' ? 'badge-error' : c.likelihood === 'medium' ? 'badge-warning' : 'badge-neutral'}`}>{c.likelihood}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{c.explanation}</p>
                <p style={{ fontSize: 12, color: 'var(--primary-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Stethoscope size={12} /> {c.specialty}
                </p>
              </div>
            ))}
          </div>

          <div style={{ padding: 12, background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--primary-700)', marginBottom: 10 }}>
            <strong>Recommendation:</strong> {result.recommendation}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}

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

      <AiSymptomAnalyzer />

      <h3 style={{ marginBottom: 14 }}>Or Browse Common Symptoms</h3>

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
