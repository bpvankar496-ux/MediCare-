import { useState, useMemo } from 'react'
import { Stethoscope, Search, MapPin, Clock, Award, DollarSign, Calendar, CircleCheck as CheckCircle } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal, StarRating } from '../lib/ui'
import { db } from '../lib/db'
import type { Doctor, Appointment } from '../lib/types'

export default function Doctors() {
  const { data: doctors, loading, error } = useSupabaseQuery<Doctor>('doctors')
  const { data: appointments, refetch: refetchAppts } = useSupabaseQuery<Appointment>('appointments', '*', 'date', false)
  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const specialties = useMemo(() => {
    const set = new Set(doctors?.map((d) => d.specialty) ?? [])
    return ['all', ...Array.from(set).sort()]
  }, [doctors])

  const cities = useMemo(() => {
    const set = new Set(doctors?.map((d) => d.city).filter(Boolean) as string[] ?? [])
    return ['all', ...Array.from(set).sort()]
  }, [doctors])

  const filtered = useMemo(() => {
    if (!doctors) return []
    return doctors.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.specialty.toLowerCase().includes(search.toLowerCase())) return false
      if (specialtyFilter !== 'all' && d.specialty !== specialtyFilter) return false
      if (cityFilter !== 'all' && d.city !== cityFilter) return false
      return true
    })
  }, [doctors, search, specialtyFilter, cityFilter])

  if (loading) return <div><PageHeader title="Find Doctors" subtitle="Search and book appointments with specialists" icon={Stethoscope} /><LoadingState /></div>
  if (error) return <div><PageHeader title="Find Doctors" subtitle="Search and book appointments with specialists" icon={Stethoscope} /><ErrorState message={error} /></div>

  const upcomingByDoctor = (doctorId: string) => appointments?.filter((a) => a.doctor_id === doctorId && a.status === 'upcoming') ?? []

  return (
    <div className="fade-in">
      <PageHeader title="Find Doctors" subtitle="Search and book appointments with specialists" icon={Stethoscope} />

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search by doctor name or specialty..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto', flex: '0 0 auto' }} value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
          {specialties.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Specialties' : s}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', flex: '0 0 auto' }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          {cities.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Cities' : c}</option>)}
        </select>
      </div>

      <p style={{ marginBottom: 14, color: 'var(--text-muted)', fontSize: 14 }}>{filtered.length} doctor{filtered.length !== 1 ? 's' : ''} found</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map((doc) => (
          <div key={doc.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: 'var(--primary-50)', display: 'grid', placeItems: 'center',
                fontSize: 22, fontWeight: 700, color: 'var(--primary-600)',
              }}>{doc.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ marginBottom: 2 }}>{doc.name}</h4>
                <p style={{ fontSize: 14, color: 'var(--primary-500)', fontWeight: 600, marginBottom: 4 }}>{doc.specialty}</p>
                <StarRating rating={doc.rating} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({doc.reviews_count} reviews)</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Award size={15} color="var(--text-muted)" /> {doc.qualification}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={15} color="var(--text-muted)" /> {doc.experience_years} years experience</span>
              {doc.hospital && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={15} color="var(--text-muted)" /> {doc.hospital}, {doc.city}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={15} color="var(--text-muted)" /> Consultation fee: ₹{doc.fee}</span>
            </div>

            {upcomingByDoctor(doc.id).length > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} /> {upcomingByDoctor(doc.id).length} upcoming appointment{upcomingByDoctor(doc.id).length > 1 ? 's' : ''}
              </div>
            )}

            <button className="btn btn-primary" onClick={() => { setSelectedDoctor(doc); setBookingSuccess(false) }} style={{ marginTop: 'auto' }}>
              <Calendar size={16} /> Book Appointment
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No doctors match your search. Try different filters.</p>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        doctor={selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        onSuccess={() => { setBookingSuccess(true); refetchAppts() }}
        success={bookingSuccess}
      />
    </div>
  )
}

function BookingModal({ doctor, onClose, onSuccess, success }: {
  doctor: Doctor | null
  onClose: () => void
  onSuccess: () => void
  success: boolean
}) {
  const [form, setForm] = useState({ patient_name: '', patient_age: '', patient_gender: 'male', date: '', time_slot: '', type: 'in-person', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!doctor) return null

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async () => {
    if (!form.patient_name || !form.date || !form.time_slot) { setErr('Please fill in patient name, date, and time slot'); return }
    setSubmitting(true); setErr(null)
    const { error } = await db.from('appointments').insert({
      doctor_id: doctor.id,
      patient_name: form.patient_name,
      patient_age: form.patient_age ? parseInt(form.patient_age) : null,
      patient_gender: form.patient_gender,
      date: form.date,
      time_slot: form.time_slot,
      type: form.type,
      reason: form.reason || null,
      status: 'upcoming',
    })
    setSubmitting(false)
    if (error) { setErr(error.message); return }
    onSuccess()
  }

  return (
    <Modal
      open={!!doctor}
      onClose={onClose}
      title={success ? 'Appointment Booked!' : `Book with ${doctor.name}`}
      footer={success
        ? <button className="btn btn-primary" onClick={onClose}>Done</button>
        : <>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Booking...' : 'Confirm Booking'}</button>
          </>
      }
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="var(--success-500)" />
          </div>
          <p style={{ marginBottom: 8 }}>Your appointment with <strong>{doctor.name}</strong> on <strong>{form.date}</strong> at <strong>{form.time_slot}</strong> has been booked.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
            <strong>{doctor.specialty}</strong> - Fee: ₹{doctor.fee}
          </div>
          <div>
            <label className="label">Patient Name *</label>
            <input className="input" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder="Enter patient name" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Age</label>
              <input className="input" type="number" value={form.patient_age} onChange={(e) => setForm({ ...form, patient_age: e.target.value })} placeholder="Age" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.patient_gender} onChange={(e) => setForm({ ...form, patient_gender: e.target.value })}>
                <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Time Slot *</label>
              <select className="input" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })}>
                <option value="">Select slot</option>
                {doctor.availability.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                <option value="10:00-10:30">10:00-10:30</option>
                <option value="11:00-11:30">11:00-11:30</option>
                <option value="16:00-16:30">16:00-16:30</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Reason for Visit</label>
            <textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Brief description of symptoms or reason" />
          </div>
          {err && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{err}</p>}
        </div>
      )}
    </Modal>
  )
}
