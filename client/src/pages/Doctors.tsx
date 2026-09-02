import { useState, useMemo } from 'react'
import { Stethoscope, Search, MapPin, Clock, Award, DollarSign, Calendar, CircleCheck as CheckCircle, Star, MessageSquarePlus, X } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal, StarRating, DoctorAvatar } from '../lib/ui'
import { useToast } from '../lib/toast'
import { db } from '../lib/db'
import { useAuth } from '../lib/auth'
import type { Doctor, Appointment, Review } from '../lib/types'
import { useI18n } from '../lib/i18n'

export default function Doctors() {
  const { t } = useI18n()
  const { data: doctors, loading, error } = useSupabaseQuery<Doctor>('doctors')
  const { data: appointments, refetch: refetchAppts } = useSupabaseQuery<Appointment>('appointments', '*', 'date', false)
  const { data: reviews, refetch: refetchReviews } = useSupabaseQuery<Review>('reviews', '*', 'created_at', false)
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [reviewsDoctor, setReviewsDoctor] = useState<Doctor | null>(null)

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

  if (loading) return <div><PageHeader title={t('ph_doctors_title')} subtitle={t('ph_doctors_subtitle')} icon={Stethoscope} /><LoadingState /></div>
  if (error) return <div><PageHeader title={t('ph_doctors_title')} subtitle={t('ph_doctors_subtitle')} icon={Stethoscope} /><ErrorState message={error} /></div>

  const upcomingByDoctor = (doctorId: string) => appointments?.filter((a) => a.doctor_id === doctorId && a.status === 'upcoming') ?? []
  const reviewsByDoctor = (doctorId: string) => reviews?.filter((r) => r.doctor_id === doctorId) ?? []

  return (
    <div className="fade-in">
      <PageHeader title={t('ph_doctors_title')} subtitle={t('ph_doctors_subtitle')} icon={Stethoscope} />

      {/* Filters */}
      <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder={t('dc_search_placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto', flex: '0 0 auto' }} value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
          {specialties.map((s) => <option key={s} value={s}>{s === 'all' ? t('dc_all_specialties') : s}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', flex: '0 0 auto' }} value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          {cities.map((c) => <option key={c} value={c}>{c === 'all' ? t('dc_all_cities') : c}</option>)}
        </select>
      </div>

      <p style={{ marginBottom: 14, color: 'var(--text-muted)', fontSize: 14 }}>{filtered.length} {filtered.length !== 1 ? t('dc_doctor_plural') : t('dc_doctor_singular')} {t('dc_found')}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map((doc) => (
          <div key={doc.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <DoctorAvatar doc={doc} size={60} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ marginBottom: 2 }}>{doc.name}</h4>
                <p style={{ fontSize: 14, color: 'var(--primary-500)', fontWeight: 600, marginBottom: 4 }}>{doc.specialty}</p>
                <StarRating rating={doc.rating} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>({doc.reviews_count} {t('dc_reviews_count')})</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Award size={15} color="var(--text-muted)" /> {doc.qualification}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={15} color="var(--text-muted)" /> {doc.experience_years} {t('dc_years_experience')}</span>
              {doc.hospital && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={15} color="var(--text-muted)" /> {doc.hospital}, {doc.city}</span>}
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={15} color="var(--text-muted)" /> {t('dc_consultation_fee')} ₹{doc.fee}</span>
            </div>

            {upcomingByDoctor(doc.id).length > 0 && (
              <div style={{ padding: '8px 12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--primary-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} /> {upcomingByDoctor(doc.id).length} {upcomingByDoctor(doc.id).length > 1 ? t('dc_upcoming_appts') : t('dc_upcoming_appt')}
              </div>
            )}

            <button className="btn btn-primary" onClick={() => { setSelectedDoctor(doc); setBookingSuccess(false) }} style={{ marginTop: 'auto' }}>
              <Calendar size={16} /> {t('dc_book_appointment')}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setReviewsDoctor(doc)}>
              <Star size={14} /> {reviewsByDoctor(doc.id).length > 0 ? `${reviewsByDoctor(doc.id).length} ${reviewsByDoctor(doc.id).length > 1 ? t('dc_patient_reviews') : t('dc_patient_review')}` : t('dc_write_review')}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>{t('dc_no_match')}</p>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        doctor={selectedDoctor}
        appointments={appointments ?? []}
        onClose={() => setSelectedDoctor(null)}
        onSuccess={() => { setBookingSuccess(true); refetchAppts(); showToast(t('dc_appt_booked_toast'), 'success') }}
        success={bookingSuccess}
      />

      {/* Reviews Modal */}
      <ReviewsModal
        doctor={reviewsDoctor}
        reviews={reviewsDoctor ? reviewsByDoctor(reviewsDoctor.id) : []}
        onClose={() => setReviewsDoctor(null)}
        onSubmitted={() => { refetchReviews(); showToast(t('dc_review_posted_toast'), 'success') }}
      />
    </div>
  )
}

function ReviewsModal({ doctor, reviews, onClose, onSubmitted }: {
  doctor: Doctor | null
  reviews: Review[]
  onClose: () => void
  onSubmitted: () => void
}) {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [patientName, setPatientName] = useState(profile?.full_name || '')
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  if (!doctor) return null

  const submitReview = async () => {
    if (!patientName.trim()) { showToast(t('dc_err_enter_name'), 'error'); return }
    setSubmitting(true)
    const { error } = await db.from('reviews').insert({
      doctor_id: doctor.id,
      patient_name: patientName.trim(),
      rating,
      comment: comment.trim() || null,
    })
    setSubmitting(false)
    if (error) { showToast(error.message, 'error'); return }
    setComment(''); setRating(5); setShowForm(false)
    onSubmitted()
  }

  return (
    <Modal
      open={!!doctor}
      onClose={onClose}
      title={`${t('dc_reviews_dash')} ${doctor.name}`}
      footer={<button className="btn btn-ghost" onClick={onClose}>{t('dc_close')}</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!showForm ? (
          <button className="btn btn-secondary" onClick={() => setShowForm(true)}>
            <MessageSquarePlus size={16} /> {t('dc_write_review')}
          </button>
        ) : (
          <div className="card" style={{ padding: 16, background: 'var(--neutral-50)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{t('dc_your_review')}</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <div>
              <label className="label">{t('dc_your_rating')}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background: 'none', border: 'none', padding: 2 }}
                  >
                    <Star size={24} fill={n <= (hoverRating || rating) ? 'var(--warning-400)' : 'none'} color="var(--warning-400)" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">{t('dc_your_name')}</label>
              <input className="input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder={t('dc_your_name_placeholder')} />
            </div>
            <div>
              <label className="label">{t('dc_comment_optional')}</label>
              <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('dc_comment_placeholder')} />
            </div>
            <button className="btn btn-primary" onClick={submitReview} disabled={submitting}>{submitting ? t('dc_posting') : t('dc_post_review')}</button>
          </div>
        )}

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '12px 0' }}>{t('dc_no_reviews')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
            {reviews.map((r) => (
              <div key={r.id} style={{ padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.patient_name}</span>
                  <span style={{ display: 'flex', gap: 1 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} fill={i < r.rating ? 'var(--warning-400)' : 'none'} color="var(--warning-400)" />
                    ))}
                  </span>
                </div>
                {r.comment && <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{r.comment}</p>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function BookingModal({ doctor, appointments, onClose, onSuccess, success }: {
  doctor: Doctor | null
  appointments: Appointment[]
  onClose: () => void
  onSuccess: () => void
  success: boolean
}) {
  const { t } = useI18n()
  const [form, setForm] = useState({ patient_name: '', patient_age: '', patient_gender: 'male', date: '', time_slot: '', type: 'in-person', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!doctor) return null

  const today = new Date().toISOString().split('T')[0]

  const allSlots = Array.from(new Set([...doctor.availability, '10:00-10:30', '11:00-11:30', '16:00-16:30']))
  const bookedSlotsForDate = new Set(
    appointments
      .filter((a) => a.doctor_id === doctor.id && a.date === form.date && a.status === 'upcoming')
      .map((a) => a.time_slot),
  )
  const availableSlots = form.date ? allSlots.filter((s) => !bookedSlotsForDate.has(s)) : allSlots

  const handleSubmit = async () => {
    if (!form.patient_name || !form.date || !form.time_slot) { setErr(t('dc_err_required')); return }
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
      title={success ? t('dc_appt_booked_title') : `${t('dc_book_with')} ${doctor.name}`}
      footer={success
        ? <button className="btn btn-primary" onClick={onClose}>{t('dc_done')}</button>
        : <>
            <button className="btn btn-ghost" onClick={onClose}>{t('dc_cancel')}</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>{submitting ? t('dc_booking') : t('dc_confirm_booking')}</button>
          </>
      }
    >
      {success ? (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="var(--success-500)" />
          </div>
          <p style={{ marginBottom: 8 }}>{t('dc_appt_success')} <strong>{doctor.name}</strong> {t('dc_appt_success_2')} <strong>{form.date}</strong> {t('dc_appt_success_3')} <strong>{form.time_slot}</strong> {t('dc_appt_success_4')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
            <strong>{doctor.specialty}</strong> - {t('dc_fee_label')} ₹{doctor.fee}
          </div>
          <div>
            <label className="label">{t('dc_patient_name')}</label>
            <input className="input" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} placeholder={t('dc_patient_name_placeholder')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">{t('dc_age')}</label>
              <input className="input" type="number" value={form.patient_age} onChange={(e) => setForm({ ...form, patient_age: e.target.value })} placeholder={t('dc_age')} />
            </div>
            <div>
              <label className="label">{t('dc_gender')}</label>
              <select className="input" value={form.patient_gender} onChange={(e) => setForm({ ...form, patient_gender: e.target.value })}>
                <option value="male">{t('dc_male')}</option><option value="female">{t('dc_female')}</option><option value="other">{t('dc_other')}</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">{t('dc_date')}</label>
              <input className="input" type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, time_slot: '' })} />
            </div>
            <div>
              <label className="label">{t('dc_time_slot')}</label>
              <select className="input" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })} disabled={!form.date}>
                <option value="">{form.date ? t('dc_select_slot') : t('dc_pick_date_first')}</option>
                {availableSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
              {form.date && availableSlots.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--error-600)', marginTop: 4 }}>{t('dc_no_slots')}</p>
              )}
            </div>
          </div>
          <div>
            <label className="label">{t('dc_reason')}</label>
            <textarea className="input" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={t('dc_reason_placeholder')} />
          </div>
          {err && <p style={{ color: 'var(--error-600)', fontSize: 13 }}>{err}</p>}
        </div>
      )}
    </Modal>
  )
}
