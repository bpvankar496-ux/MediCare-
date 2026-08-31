import { Sun, Moon, Globe } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { useI18n, LANGUAGES } from '../lib/i18n'

// New feature: a compact theme + language switcher meant to live directly in
// a top navbar (Landing page header, dashboard top bar) - not tucked away
// inside Settings, so it's visible the moment the page loads.
export function QuickSettings() {
  const { resolvedTheme, setTheme } = useTheme()
  const { lang, setLang } = useI18n()

  const cycleLang = () => {
    const idx = LANGUAGES.findIndex((l) => l.code === lang)
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length]
    setLang(next.code)
  }

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={cycleLang}
        title="Change language"
        className="btn btn-ghost btn-sm"
        style={{ fontWeight: 700, fontSize: 12, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Globe size={15} /> {currentLang.native}
      </button>
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
