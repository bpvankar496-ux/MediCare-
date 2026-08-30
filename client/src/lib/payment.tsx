import { useState } from 'react'
import { CreditCard, Smartphone, Wallet, Loader2, ShieldCheck } from 'lucide-react'

export type PaymentMethod = 'cod' | 'upi' | 'card'

interface PaymentPanelProps {
  method: PaymentMethod
  onMethodChange: (m: PaymentMethod) => void
  onValidChange: (valid: boolean) => void
}

// NOTE: This is a SANDBOX/simulated payment flow for demo purposes only.
// No real payment gateway is called and no money moves. To accept real
// payments, integrate a gateway like Razorpay or Stripe here (their test
// mode keys work great as a drop-in replacement for this component).
export function luhnValid(num: string): boolean {
  const digits = num.replace(/\D/g, '')
  if (digits.length < 12) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10)
    if (alt) { d *= 2; if (d > 9) d -= 9 }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

function formatCardNumber(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function PaymentPanel({ method, onMethodChange, onValidChange }: PaymentPanelProps) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [upiId, setUpiId] = useState('')

  const cardValid = luhnValid(cardNumber) && /^\d{2}\/\d{2}$/.test(expiry) && /^\d{3,4}$/.test(cvv)
  const upiValid = /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)

  const checkValid = (m: PaymentMethod, cardOk = cardValid, upiOk = upiValid) => {
    if (m === 'cod') return true
    if (m === 'card') return cardOk
    return upiOk
  }

  const updateAndValidate = (m: PaymentMethod) => {
    onMethodChange(m)
    onValidChange(checkValid(m))
  }

  return (
    <div>
      <label className="label">Payment Method</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {([
          { id: 'cod' as const, label: 'Cash on Delivery', icon: Wallet },
          { id: 'upi' as const, label: 'UPI', icon: Smartphone },
          { id: 'card' as const, label: 'Card', icon: CreditCard },
        ]).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => updateAndValidate(opt.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '10px 8px', borderRadius: 'var(--radius-sm)',
              border: `1px solid ${method === opt.id ? 'var(--primary-500)' : 'var(--border)'}`,
              background: method === opt.id ? 'var(--primary-50)' : 'var(--surface)',
              color: method === opt.id ? 'var(--primary-700)' : 'var(--text)',
            }}
          >
            <opt.icon size={16} color={method === opt.id ? 'var(--primary-600)' : 'var(--text-muted)'} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>{opt.label}</span>
          </button>
        ))}
      </div>

      {method === 'card' && (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
          <div>
            <label className="label">Card Number</label>
            <input
              className="input"
              placeholder="4242 4242 4242 4242"
              value={cardNumber}
              onChange={(e) => { const v = formatCardNumber(e.target.value); setCardNumber(v); onValidChange(checkValid('card', luhnValid(v), upiValid)) }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="label">Expiry (MM/YY)</label>
              <input
                className="input"
                placeholder="12/28"
                value={expiry}
                onChange={(e) => { const v = formatExpiry(e.target.value); setExpiry(v); onValidChange(checkValid('card', luhnValid(cardNumber) && /^\d{2}\/\d{2}$/.test(v), upiValid)) }}
              />
            </div>
            <div>
              <label className="label">CVV</label>
              <input
                className="input"
                placeholder="123"
                maxLength={4}
                value={cvv}
                onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setCvv(v); onValidChange(checkValid('card', luhnValid(cardNumber) && /^\d{2}\/\d{2}$/.test(expiry) && /^\d{3,4}$/.test(v), upiValid)) }}
              />
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={13} /> Sandbox mode — try 4242 4242 4242 4242, any future expiry, any CVV.
          </p>
        </div>
      )}

      {method === 'upi' && (
        <div className="fade-in" style={{ marginBottom: 4 }}>
          <label className="label">UPI ID</label>
          <input
            className="input"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => { setUpiId(e.target.value); onValidChange(checkValid('upi', cardValid, /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(e.target.value))) }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={13} /> Sandbox mode — any valid-looking UPI ID (e.g. name@bank) works.
          </p>
        </div>
      )}
    </div>
  )
}

export function PayingButton({ paying, label, payingLabel = 'Processing payment...' }: { paying: boolean; label: string; payingLabel?: string }) {
  return paying ? <><Loader2 size={16} className="spin" /> {payingLabel}</> : <>{label}</>
}
