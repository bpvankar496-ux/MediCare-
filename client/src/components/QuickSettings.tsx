import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../lib/theme'

// Compact theme switcher meant to live directly in a top navbar (Landing
// page header, dashboard top bar) - not tucked away inside Settings, so
// it's visible the moment the page loads.
//
// The language switcher was removed here: the app's multi-language
// translations were incomplete/inconsistent across pages, so rather than
// ship a half-translated experience, the app is English-only for now.
// The translation dictionary and t() calls remain in the codebase
// (client/src/lib/i18n.tsx) - i18n.tsx now always resolves to English
// regardless of what's in localStorage, so nothing breaks if this is
// revisited later; this file just stops exposing the switch to users.
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
