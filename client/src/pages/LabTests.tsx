import { useState, useMemo } from 'react'
import { FlaskConical, Search, Plus, Minus, CircleCheck as CheckCircle, Droplet, Clock, Calendar, Hop as Home, FileDown } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal } from '../lib/ui'
import { PaymentPanel, PayingButton, type PaymentMethod } from '../lib/payment'
import { useToast } from '../lib/toast'
import { db } from '../lib/db'
import { downloadInvoicePdf } from '../lib/pdf'
import { useAuth } from '../lib/auth'
import type { LabTest, LabTestBooking } from '../lib/types'

export default function LabTests() {
  const { data: tests, loading, error } = useSupabaseQuery<LabTest>('lab_tests')
  const { data: bookings, refetch: refetchBookings } = useSupabaseQuery<LabTestBooking>('lab_test_bookings', '*', 'created_at', false)
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ patient_name: '', date: '', time_slot: '', home_collection: true, address: '' })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [paymentValid, setPaymentValid] = useState(true)
  const [paying, setPaying] = useState(false)

  const categories = useMemo(() => {
    const set = new Set(tests?.map((t) => t.category) ?? [])
    return ['all', ...Array.from(set).sort()]
  }, [tests])

  const filtered = useMemo(() => {
    if (!tests) return []
    return tests.filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      return true
    })
  }, [tests, search, categoryFilter])

  const selectedItems = Object.entries(selected).map(([id, qty]) => ({ test: tests?.find((t) => t.id === id)!, qty })).filter((i) => i.test)
  const total = selectedItems.reduce((sum, i) => sum + i.test.price * i.qty, 0)
  const totalTests = selectedItems.reduce((sum, i) => sum + i.qty, 0)

  const bookTests = async () => {
    if (!form.patient_name || !form.date || !form.time_slot || !paymentValid) return
    setPaying(true)
    if (paymentMethod !== 'cod') {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
    const { error } = await db.from('lab_test_bookings').insert({
      test_ids: selectedItems.map((i) => ({ id: i.test.id, name: i.test.name, price: i.test.price })),
      total,
      patient_name: form.patient_name,
      date: form.date,
      time_slot: form.time_slot,
      home_collection: form.home_collection,
      address: form.home_collection ? form.address : null,
      payment_method: paymentMethod,
      status: 'booked',
    })
    setPaying(false)
    if (error) { showToast(error.message, 'error'); return }
    setSelected({}); setCheckoutOpen(false); setSuccess(true)
    setForm({ patient_name: '', date: '', time_slot: '', home_collection: true, address: '' })
    setPaymentMethod('cod'); setPaymentValid(true)
    refetchBookings()
    showToast('Lab test booking confirmed!', 'success')
  }

  if (loading) return <div><PageHeader title={"Lab Tests"} subtitle={"Book diagnostic tests with home sample collection"} icon={FlaskConical} /><LoadingState /></div>
  if (error) return <div><PageHeader title={"Lab Tests"} subtitle={"Book diagnostic tests with home sample collection"} icon={FlaskConical} /><ErrorState message={error} /></div>

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="fade-in">
      <PageHeader title={"Lab Tests"} subtitle={"Book diagnostic tests with home sample collection"} icon={FlaskConical} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search lab tests..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        {totalTests > 0 && (
          <button className="btn btn-primary" onClick={() => setCheckoutOpen(true)}>
            <Calendar size={18} /> Book {totalTests} test{totalTests > 1 ? 's' : ''} - ₹{total}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map((test) => {
          const qty = selected[test.id] || 0
          return (
            <div key={test.id} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'var(--success-50)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Droplet size={20} color="var(--success-500)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 15, marginBottom: 2 }}>{test.name}</h4>
                  <span className="badge badge-neutral">{test.category}</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{test.description}</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                {test.fasting_required && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Fasting</span>}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Droplet size={12} /> {test.sample_type}</span>
                <span>Report: {test.report_time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-h)' }}>₹{test.price}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{test.mrp}</span>
              </div>
              {qty > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', padding: '4px 8px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected((p) => ({ ...p, [test.id]: Math.max(0, qty - 1) }))}><Minus size={14} /></button>
                  <span style={{ fontWeight: 600 }}>{qty} selected</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected((p) => ({ ...p, [test.id]: qty + 1 }))}><Plus size={14} /></button>
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => setSelected((p) => ({ ...p, [test.id]: 1 }))}><Plus size={16} /> Add Test</button>
              )}
            </div>
          )
        })}
      </div>

      {bookings && bookings.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 14 }}>Your Test Bookings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <FlaskConical size={20} color="var(--success-500)" />
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{b.test_ids.length} test(s) - ₹{b.total}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.date} {b.home_collection && '· Home Collection'}</div>
                </div>
                <span className="badge badge-info">{b.status}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadInvoicePdf({
                    invoiceNumber: `LAB${String(b.id).slice(-8).toUpperCase()}`,
                    date: new Date(b.created_at).toLocaleDateString(),
                    billedTo: profile?.full_name || profile?.email || b.patient_name,
                    items: b.test_ids.map((t) => ({ name: t.name, price: t.price, quantity: 1 })),
                    total: b.total,
                    paymentMethod: b.payment_method,
                    status: b.status,
                    address: b.home_collection ? b.address : null,
                  })}
                >
                  <FileDown size={14} /> Invoice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Book Lab Tests"
        footer={<><button className="btn btn-ghost" onClick={() => setCheckoutOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={bookTests} disabled={!form.patient_name || !form.date || !form.time_slot || !paymentValid || paying}>
            <PayingButton paying={paying} label={`Confirm Booking - ₹${total}`} />
          </button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: 12, background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
            {selectedItems.map((i) => <div key={i.test.id} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i.test.name} x{i.qty}</span><span>₹{i.test.price * i.qty}</span></div>)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--border)' }}><span>Total</span><span>₹{total}</span></div>
          </div>
          <div><label className="label">Patient Name *</label><input className="input" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="label">Date *</label><input className="input" type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className="label">Time Slot *</label>
              <select className="input" value={form.time_slot} onChange={(e) => setForm({ ...form, time_slot: e.target.value })}><option value="">Select</option>
                <option>06:00-07:00</option><option>07:00-08:00</option><option>08:00-09:00</option><option>09:00-10:00</option></select>
            </div>
          </div>
          <div>
            <label className="label">Sample Collection</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}><input type="radio" checked={form.home_collection} onChange={() => setForm({ ...form, home_collection: true })} /> <Home size={15} /> Home Collection</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}><input type="radio" checked={!form.home_collection} onChange={() => setForm({ ...form, home_collection: false })} /> Visit Lab</label>
            </div>
          </div>
          {form.home_collection && <div><label className="label">Address</label><textarea className="input" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Home collection address" /></div>}
          <PaymentPanel method={paymentMethod} onMethodChange={setPaymentMethod} onValidChange={setPaymentValid} />
        </div>
      </Modal>

      <Modal open={success} onClose={() => setSuccess(false)} title="Booking Confirmed!"
        footer={<button className="btn btn-primary" onClick={() => setSuccess(false)}>Done</button>}
      >
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="var(--success-500)" />
          </div>
          <p>Your lab test{totalTests > 1 ? 's' : ''} {form.home_collection ? 'with home sample collection' : ''} {form.home_collection ? 'have' : 'has'} been booked for <strong>{form.date}</strong>.</p>
        </div>
      </Modal>
    </div>
  )
}
