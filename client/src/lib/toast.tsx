import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, React.ComponentType<{ size?: number; color?: string }>> = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
}

const COLORS: Record<ToastType, { bg: string; fg: string }> = {
  success: { bg: 'var(--success-500)', fg: 'white' },
  error: { bg: 'var(--error-500)', fg: 'white' },
  info: { bg: 'var(--primary-500)', fg: 'white' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed', top: 20, right: 20, zIndex: 2000,
          display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360, width: 'calc(100vw - 40px)',
        }}
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          const c = COLORS[t.type]
          return (
            <div
              key={t.id}
              className="fade-in"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: c.bg, color: c.fg, padding: '14px 16px',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              }}
            >
              <Icon size={18} color={c.fg} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                style={{ background: 'none', border: 'none', padding: 0, color: c.fg, opacity: 0.8, flexShrink: 0 }}
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
