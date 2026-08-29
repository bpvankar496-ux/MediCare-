import { useState, useMemo } from 'react'
import { MapPin, Search, Phone, Clock, Star, Ambulance } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState } from '../lib/ui'
import type { Hospital } from '../lib/types'

export default function Emergency() {
  const { data: hospitals, loading, error } = useSupabaseQuery<Hospital>('hospitals')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [emergencyOnly, setEmergencyOnly] = useState(false)

  const types = ['all', 'hospital', 'emergency', 'clinic']

  const filtered = useMemo(() => {
    if (!hospitals) return []
    return hospitals.filter((h) => {
      if (search && !h.name.toLowerCase().includes(search.toLowerCase()) && !(h.city?.toLowerCase().includes(search.toLowerCase()))) return false
      if (typeFilter !== 'all' && h.type !== typeFilter) return false
      if (emergencyOnly && !h.emergency) return false
      return true
    })
  }, [hospitals, search, typeFilter, emergencyOnly])

  if (loading) return <div><PageHeader title="Emergency & Hospitals" subtitle="Find nearby hospitals, emergency rooms, and clinics" icon={MapPin} /><LoadingState /></div>
  if (error) return <div><PageHeader title="Emergency & Hospitals" subtitle="Find nearby hospitals, emergency rooms, and clinics" icon={MapPin} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title="Emergency & Hospitals" subtitle="Find nearby hospitals, emergency rooms, and clinics" icon={MapPin} />

      <div className="card" style={{ padding: 20, marginBottom: 20, background: 'var(--error-50)', border: '1px solid var(--error-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'var(--error-500)', display: 'grid', placeItems: 'center' }}>
            <Ambulance size={24} color="white" />
          </div>
          <div>
            <h3 style={{ color: 'var(--error-600)' }}>Emergency Hotline</h3>
            <p style={{ fontSize: 14, color: 'var(--error-600)' }}>Call 108 for ambulance. Call 112 for general emergency.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search by name or city..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          {types.map((t) => <option key={t} value={t}>{t === 'all' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          <input type="checkbox" checked={emergencyOnly} onChange={(e) => setEmergencyOnly(e.target.checked)} /> Emergency Only
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }} className="hospitals-grid">
        {filtered.map((h) => (
          <div key={h.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ marginBottom: 4 }}>{h.name}</h4>
                <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>{h.type}</span>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Star size={14} fill="var(--warning-400)" color="var(--warning-400)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{h.rating.toFixed(1)}</span>
              </span>
            </div>
            {h.address && <p style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: 6 }}><MapPin size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} /> {h.address}, {h.city}</p>}
            {h.phone && <p style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} color="var(--text-muted)" /> {h.phone}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {h.emergency && <span className="badge badge-error">Emergency</span>}
              {h.open_24x7 && <span className="badge badge-success"><Clock size={11} /> 24x7</span>}
            </div>
            {h.services.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {h.services.slice(0, 4).map((s) => <span key={s} className="badge badge-neutral">{s}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
