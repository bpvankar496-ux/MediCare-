import { useState } from 'react'
import { Calculator, Heart, Activity, Droplet, Weight, Ruler } from 'lucide-react'
import { PageHeader } from '../lib/ui'

type CalcType = 'bmi' | 'bmr' | 'ideal-weight' | 'water' | 'heart-rate'

const calculators: { type: CalcType; label: string; icon: React.ComponentType<{ size?: number; color?: string }>; color: string; bg: string }[] = [
  { type: 'bmi', label: 'BMI Calculator', icon: Weight, color: 'var(--primary-500)', bg: 'var(--primary-50)' },
  { type: 'bmr', label: 'BMR Calculator', icon: Activity, color: 'var(--accent-500)', bg: 'var(--accent-50)' },
  { type: 'ideal-weight', label: 'Ideal Weight', icon: Ruler, color: 'var(--secondary-500)', bg: 'var(--secondary-50)' },
  { type: 'water', label: 'Water Intake', icon: Droplet, color: 'var(--success-500)', bg: 'var(--success-50)' },
  { type: 'heart-rate', label: 'Target Heart Rate', icon: Heart, color: 'var(--error-500)', bg: 'var(--error-50)' },
]

export default function Calculators() {
  const [active, setActive] = useState<CalcType>('bmi')
  const [form, setForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: '1.2' })

  const w = parseFloat(form.weight) || 0
  const h = parseFloat(form.height) || 0
  const age = parseInt(form.age) || 0

  const bmi = h > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : '0'
  const bmiNum = parseFloat(bmi)
  const bmiCategory = bmiNum < 18.5 ? 'Underweight' : bmiNum < 25 ? 'Normal' : bmiNum < 30 ? 'Overweight' : 'Obese'
  const bmiCatColor = bmiNum < 18.5 ? 'badge-warning' : bmiNum < 25 ? 'badge-success' : bmiNum < 30 ? 'badge-warning' : 'badge-error'

  const bmr = w > 0 && h > 0 && age > 0
    ? (form.gender === 'male'
      ? 10 * w + 6.25 * h - 5 * age + 5
      : 10 * w + 6.25 * h - 5 * age - 161).toFixed(0)
    : '0'
  const tdee = Math.round(parseFloat(bmr) * parseFloat(form.activity))

  const idealWeight = h > 0
    ? form.gender === 'male'
      ? ((h - 100) * 0.9).toFixed(1)
      : ((h - 100) * 0.85).toFixed(1)
    : '0'

  const waterIntake = w > 0 ? (w * 0.033).toFixed(1) : '0'

  const maxHR = age > 0 ? 220 - age : 0
  const targetLow = Math.round(maxHR * 0.5)
  const targetHigh = Math.round(maxHR * 0.85)

  return (
    <div className="fade-in">
      <PageHeader title={"Health Tools"} subtitle={"BMI, calorie, and other health calculators"} icon={Calculator} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {calculators.map((c) => (
          <button key={c.type} onClick={() => setActive(c.type)}
            className="card" style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              border: active === c.type ? '2px solid var(--primary-500)' : '1px solid var(--border)',
              background: active === c.type ? c.bg : 'var(--surface)',
            }}>
            <c.icon size={18} color={c.color} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{c.label}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 28, maxWidth: 560 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(active === 'bmi' || active === 'bmr' || active === 'ideal-weight') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="form-grid-2">
              <div><label className="label">Weight (kg)</label><input className="input" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 70" /></div>
              <div><label className="label">Height (cm)</label><input className="input" type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder="e.g. 175" /></div>
            </div>
          )}
          {(active === 'bmr' || active === 'heart-rate') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="form-grid-2">
              <div><label className="label">Age</label><input className="input" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="e.g. 30" /></div>
              <div><label className="label">Gender</label><select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option value="male">Male</option><option value="female">Female</option></select></div>
            </div>
          )}
          {active === 'bmr' && (
            <div><label className="label">Activity Level</label><select className="input" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })}><option value="1.2">Sedentary (little/no exercise)</option><option value="1.375">Light (1-3 days/week)</option><option value="1.55">Moderate (3-5 days/week)</option><option value="1.725">Active (6-7 days/week)</option><option value="1.9">Very Active (2x/day)</option></select></div>
          )}
          {active === 'water' && (
            <div><label className="label">Weight (kg)</label><input className="input" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 70" /></div>
          )}

          <div style={{ padding: 24, background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            {active === 'bmi' && (
              <>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Your BMI</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: 'var(--primary-600)' }}>{bmi}</div>
                <span className={`badge ${bmiCatColor}`} style={{ marginTop: 8 }}>{bmiCategory}</span>
              </>
            )}
            {active === 'bmr' && (
              <>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Basal Metabolic Rate</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary-600)' }}>{bmr} <span style={{ fontSize: 16 }}>kcal/day</span></div>
                <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text)' }}>Daily calories needed (TDEE): <strong>{tdee} kcal</strong></div>
              </>
            )}
            {active === 'ideal-weight' && (
              <>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Ideal Body Weight</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary-600)' }}>{idealWeight} <span style={{ fontSize: 16 }}>kg</span></div>
              </>
            )}
            {active === 'water' && (
              <>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Recommended Daily Water Intake</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary-600)' }}>{waterIntake} <span style={{ fontSize: 16 }}>liters</span></div>
              </>
            )}
            {active === 'heart-rate' && (
              <>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Target Heart Rate Zone</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary-600)' }}>{targetLow} - {targetHigh} <span style={{ fontSize: 16 }}>bpm</span></div>
                <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text)' }}>Max heart rate: <strong>{maxHR} bpm</strong></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
