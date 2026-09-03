import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../lib/theme'

// Compact theme switcher meant to live directly in a top navbar (Landing
// page header, dashboard top bar) - not tucked away inside Settings, so
// it's visible the moment the page loads.
export function QuickSettings() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="btn btn-ghost btn-sm"
        style={{ padding: '6px 10px' }}
      >
        {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </div>
  )
}
