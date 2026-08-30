import { useEffect, useState } from 'react'

export function useSupabaseQuery<T>(
  table: string,
  select = '*',
  orderBy?: string,
  ascending = true,
): { data: T[] | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchFlag, setRefetchFlag] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    import('./db').then(async ({ db }) => {
      let query = db.from(table).select(select)
      if (orderBy) query = query.order(orderBy, { ascending })
      const { data, error } = await query
      if (cancelled) return
      if (error) setError(error.message)
      else setData(data as T[])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [table, select, orderBy, ascending, refetchFlag])

  return { data, loading, error, refetch: () => setRefetchFlag((f) => f + 1) }
}

export function PageHeader({ title, subtitle, icon: Icon }: {
  title: string
  subtitle?: string
  icon?: React.ComponentType<{ size?: number; color?: string }>
}) {
  return (
    <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
      {Icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)',
          background: 'var(--primary-50)', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon size={24} color="var(--primary-500)" />
        </div>
      )}
      <div>
        <h1 style={{ marginBottom: 4 }}>{title}</h1>
        {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{subtitle}</p>}
      </div>
    </div>
  )
}

export function LoadingState() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: 80, color: 'var(--text-muted)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--error-600)' }}>
      <p style={{ fontWeight: 600 }}>{message}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  subtitle?: string
}) {
  return (
    <div className="card" style={{ padding: 48, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--neutral-100)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
        <Icon size={28} color="var(--text-muted)" />
      </div>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{subtitle}</p>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20 }} className="fade-in">
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div className="card" style={{ position: 'relative', maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, color: 'var(--text-muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
        {footer && <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>{footer}</div>}
      </div>
    </div>
  )
}

// Shows a doctor's real photo when available (image_url), falling back to a
// nice initials avatar if there's no photo or the image fails to load.
export function DoctorAvatar({ doc, size = 60 }: { doc: { name: string; image_url?: string | null }; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initials = doc.name.split(' ').map((w) => w[0]).slice(0, 2).join('')

  if (doc.image_url && !failed) {
    return (
      <img
        src={doc.image_url}
        alt={doc.name}
        onError={() => setFailed(true)}
        style={{
          width: size, height: size, borderRadius: 'var(--radius-md)', flexShrink: 0,
          objectFit: 'cover', border: '1px solid var(--border)',
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 'var(--radius-md)', flexShrink: 0,
      background: 'var(--primary-50)', display: 'grid', placeItems: 'center',
      fontSize: size * 0.37, fontWeight: 700, color: 'var(--primary-600)',
    }}>{initials}</div>
  )
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--warning-400)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{rating.toFixed(1)}</span>
    </span>
  )
}
