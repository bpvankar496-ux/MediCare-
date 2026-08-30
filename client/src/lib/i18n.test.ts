import { describe, it, expect } from 'vitest'
import { translations, LANGUAGES } from './i18n'

describe('translations dictionary', () => {
  const languageCodes = LANGUAGES.map((l) => l.code)

  it('has every declared language for every key (no silent fallback needed)', () => {
    const missing: string[] = []
    for (const [key, byLang] of Object.entries(translations)) {
      for (const code of languageCodes) {
        if (!byLang[code] || !byLang[code].trim()) {
          missing.push(`${key} -> ${code}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('never has an empty English string (used as the ultimate fallback)', () => {
    for (const [key, byLang] of Object.entries(translations)) {
      expect(byLang.en, `key "${key}" is missing an English translation`).toBeTruthy()
    }
  })
})
