import { useState, useMemo, useEffect } from 'react'
import { Pill, Search, ShoppingCart, Plus, Minus, Trash2, CircleCheck as CheckCircle, Package, FileDown } from 'lucide-react'
import { useSupabaseQuery, PageHeader, LoadingState, ErrorState, Modal } from '../lib/ui'
import { PaymentPanel, PayingButton, type PaymentMethod } from '../lib/payment'
import { useToast } from '../lib/toast'
import { db } from '../lib/db'
import { downloadInvoicePdf } from '../lib/pdf'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import type { Medicine, CartItem, MedicineOrder } from '../lib/types'

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  'Pain Relief': { bg: 'var(--error-50)', color: 'var(--error-500)' },
  'Antibiotic': { bg: 'var(--accent-50)', color: 'var(--accent-500)' },
  'Diabetes': { bg: 'var(--warning-50)', color: 'var(--warning-600)' },
  'Cardiac': { bg: 'var(--primary-50)', color: 'var(--primary-500)' },
  'Gastric': { bg: 'var(--secondary-50)', color: 'var(--secondary-500)' },
  'Allergy': { bg: 'var(--success-50)', color: 'var(--success-500)' },
  'Supplements': { bg: 'var(--warning-50)', color: 'var(--warning-500)' },
  'Cold and Cough': { bg: 'var(--accent-50)', color: 'var(--accent-400)' },
  'Respiratory': { bg: 'var(--primary-50)', color: 'var(--primary-400)' },
}
const defaultCategoryStyle = { bg: 'var(--neutral-100)', color: 'var(--primary-300)' }

export default function Pharmacy() {
  const { t } = useI18n()
  const { data: medicines, loading, error } = useSupabaseQuery<Medicine>('medicines')
  const { data: orders, refetch: refetchOrders } = useSupabaseQuery<MedicineOrder>('medicine_orders', '*', 'created_at', false)
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')
  const [paymentValid, setPaymentValid] = useState(true)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    try { const saved = localStorage.getItem('pharmacy_cart'); if (saved) setCart(JSON.parse(saved)) } catch { /* ignore */ }
  }, [])
  useEffect(() => { try { localStorage.setItem('pharmacy_cart', JSON.stringify(cart)) } catch { /* ignore */ } }, [cart])

  const categories = useMemo(() => {
    const set = new Set(medicines?.map((m) => m.category) ?? [])
    return ['all', ...Array.from(set).sort()]
  }, [medicines])

  const filtered = useMemo(() => {
    if (!medicines) return []
    return medicines.filter((m) => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.brand.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false
      return true
    })
  }, [medicines, search, categoryFilter])

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const addToCart = (med: Medicine) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === med.id)
      if (existing) return prev.map((i) => i.id === med.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: med.id, name: med.name, brand: med.brand, price: med.price, quantity: 1 }]
    })
    showToast(`${med.name} added to cart`, 'info')
  }
  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  }
  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id))

  const placeOrder = async () => {
    if (!address.trim() || !paymentValid) return
    setPaying(true)
    // Simulated payment processing delay for card/UPI (sandbox mode — see lib/payment.tsx).
    if (paymentMethod !== 'cod') {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
    const orderNum = `MED${Date.now().toString().slice(-8)}`
    const { error } = await db.from('medicine_orders').insert({
      order_number: orderNum,
      items: cart,
      total: cartTotal,
      delivery_address: address,
      status: 'placed',
      payment_method: paymentMethod,
    })
    setPaying(false)
    if (error) { showToast(error.message, 'error'); return }
    setCart([]); setCheckoutOpen(false); setCartOpen(false)
    setOrderSuccess(orderNum); setAddress(''); setPaymentMethod('cod'); setPaymentValid(true)
    refetchOrders()
    showToast(`Order ${orderNum} placed successfully!`, 'success')
  }

  if (loading) return <div><PageHeader title={t('ph_pharmacy_title')} subtitle={t('ph_pharmacy_subtitle')} icon={Pill} /><LoadingState /></div>
  if (error) return <div><PageHeader title={t('ph_pharmacy_title')} subtitle={t('ph_pharmacy_subtitle')} icon={Pill} /><ErrorState message={error} /></div>

  return (
    <div className="fade-in">
      <PageHeader title={t('ph_pharmacy_title')} subtitle={t('ph_pharmacy_subtitle')} icon={Pill} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder="Search medicines..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setCartOpen(true)} style={{ position: 'relative' }}>
          <ShoppingCart size={18} /> Cart
          {cartCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--error-500)', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: '50%', width: 20, height: 20, display: 'grid', placeItems: 'center' }}>{cartCount}</span>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {filtered.map((med) => {
          const inCart = cart.find((i) => i.id === med.id)
          const style = CATEGORY_STYLE[med.category] || defaultCategoryStyle
          return (
            <div key={med.id} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ height: 80, borderRadius: 'var(--radius-sm)', background: style.bg, display: 'grid', placeItems: 'center' }}>
                <Pill size={32} color={style.color} />
              </div>
              <div>
                <h4 style={{ fontSize: 15, marginBottom: 2 }}>{med.name}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{med.brand} - {med.pack_size}</p>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text)', flex: 1, lineHeight: 1.4 }}>{med.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>₹{med.price}</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{med.mrp}</span>
                <span className="badge badge-success" style={{ marginLeft: 'auto' }}>{Math.round((1 - med.price / med.mrp) * 100)}% off</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className="badge badge-neutral">{med.category}</span>
                {med.prescription_required && <span className="badge badge-warning">Rx Required</span>}
                {med.in_stock ? <span className="badge badge-success">In Stock</span> : <span className="badge badge-error">Out of Stock</span>}
              </div>
              {inCart ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', padding: '4px 8px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateQty(med.id, -1)}><Minus size={14} /></button>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{inCart.quantity}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => updateQty(med.id, 1)}><Plus size={14} /></button>
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => addToCart(med)} disabled={!med.in_stock}>
                  <Plus size={16} /> Add to Cart
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent Orders */}
      {orders && orders.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 14 }}>Recent Orders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Package size={20} color="var(--primary-500)" />
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{o.order_number}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString()}</div>
                </div>
                <span style={{ fontWeight: 700 }}>₹{o.total}</span>
                <span className="badge badge-info">{o.status}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadInvoicePdf({
                    invoiceNumber: o.order_number,
                    date: new Date(o.created_at).toLocaleDateString(),
                    billedTo: profile?.full_name || profile?.email || 'Customer',
                    items: o.items.map((i) => ({ name: i.name, brand: i.brand, quantity: i.quantity, price: i.price })),
                    total: o.total,
                    paymentMethod: o.payment_method,
                    status: o.status,
                    address: o.delivery_address,
                  })}
                >
                  <FileDown size={14} /> Invoice
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }} className="fade-in">
          <div onClick={() => setCartOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div className="card" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 380, maxWidth: '90vw', borderRadius: 0, display: 'flex', flexDirection: 'column', padding: 0, animation: 'slideIn 0.3s ease' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Shopping Cart ({cartCount})</h3>
              <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {cart.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Your cart is empty</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {cart.map((item) => (
                    <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.brand} - ₹{item.price}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.id, -1)}><Minus size={12} /></button>
                        <span style={{ fontWeight: 600, fontSize: 13, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => updateQty(item.id, 1)}><Plus size={12} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => removeFromCart(item.id)}><Trash2 size={14} color="var(--error-500)" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div style={{ padding: 24, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-600)' }}>₹{cartTotal}</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>Proceed to Checkout</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Checkout"
        footer={<><button className="btn btn-ghost" onClick={() => setCheckoutOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={placeOrder} disabled={!address.trim() || !paymentValid || paying}>
            <PayingButton paying={paying} label={`Place Order - ₹${cartTotal}`} />
          </button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Delivery Address *</label>
            <textarea className="input" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter full delivery address" />
          </div>
          <PaymentPanel method={paymentMethod} onMethodChange={setPaymentMethod} onValidChange={setPaymentValid} />
          <div style={{ padding: 16, background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Items</span><span>{cartCount}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Delivery</span><span>Free</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, paddingTop: 8, borderTop: '1px solid var(--border)' }}><span>Total</span><span>₹{cartTotal}</span></div>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal open={!!orderSuccess} onClose={() => setOrderSuccess(null)} title="Order Placed!"
        footer={<button className="btn btn-primary" onClick={() => setOrderSuccess(null)}>Done</button>}
      >
        <div style={{ textAlign: 'center', padding: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--success-50)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={28} color="var(--success-500)" />
          </div>
          <p>Your order <strong>{orderSuccess}</strong> has been placed successfully. You'll receive updates on delivery.</p>
        </div>
      </Modal>
    </div>
  )
}
