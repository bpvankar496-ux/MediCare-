import { createContext, useContext, useEffect, useState } from 'react'

export type Lang = 'en' | 'gu' | 'hi'

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
]

// Translation dictionary. Scoped intentionally to the strings that appear
// everywhere in the app (navigation, header, auth, common actions) plus the
// landing page headline, since those are what every visitor sees first.
// Individual pages still render their own English copy for now - add more
// keys here and wrap the matching JSX in t('key') to extend coverage.
// Exported (only) so it can be unit-tested for completeness - see
// i18n.test.ts. Not part of the public hook API; use useI18n().t() instead.
export const translations: Record<string, Record<Lang, string>> = {
  // Sidebar navigation
  nav_dashboard: { en: 'Dashboard', gu: 'ડેશબોર્ડ', hi: 'डैशबोर्ड' },
  nav_doctors: { en: 'Find Doctors', gu: 'ડોક્ટર શોધો', hi: 'डॉक्टर खोजें' },
  nav_consultations: { en: 'Telemedicine', gu: 'ટેલિમેડિસિન', hi: 'टेलीमेडिसिन' },
  nav_pharmacy: { en: 'Pharmacy', gu: 'ફાર્મસી', hi: 'फार्मेसी' },
  nav_lab_tests: { en: 'Lab Tests', gu: 'લેબ ટેસ્ટ', hi: 'लैब टेस्ट' },
  nav_records: { en: 'Health Records', gu: 'આરોગ્ય રેકોર્ડ', hi: 'स्वास्थ्य रिकॉर्ड' },
  nav_vitals: { en: 'Vitals Tracker', gu: 'વાઈટલ્સ ટ્રેકર', hi: 'वाइटल्स ट्रैकर' },
  nav_reminders: { en: 'Reminders', gu: 'રિમાઇન્ડર', hi: 'रिमाइंडर' },
  nav_symptom_checker: { en: 'Symptom Checker', gu: 'લક્ષણ ચકાસણી', hi: 'लक्षण जांच' },
  nav_calculators: { en: 'Health Tools', gu: 'આરોગ્ય સાધનો', hi: 'स्वास्थ्य उपकरण' },
  nav_emergency: { en: 'Emergency', gu: 'ઇમરજન્સી', hi: 'आपातकाल' },
  nav_articles: { en: 'Health Library', gu: 'આરોગ્ય લાઇબ્રેરી', hi: 'स्वास्थ्य लाइब्रेरी' },
  nav_family: { en: 'Family Members', gu: 'કુટુંબના સભ્યો', hi: 'परिवार के सदस्य' },
  nav_inquiries: { en: 'Ask Reception', gu: 'રિસેપ્શનને પૂછો', hi: 'रिसेप्शन से पूछें' },
  nav_settings: { en: 'Settings', gu: 'સેટિંગ્સ', hi: 'सेटिंग्स' },
  nav_sign_out: { en: 'Sign out', gu: 'સાઇન આઉટ', hi: 'साइन आउट' },

  // Common actions
  save: { en: 'Save', gu: 'સાચવો', hi: 'सहेजें' },
  cancel: { en: 'Cancel', gu: 'રદ કરો', hi: 'रद्द करें' },
  close: { en: 'Close', gu: 'બંધ કરો', hi: 'बंद करें' },
  loading: { en: 'Loading...', gu: 'લોડ થઈ રહ્યું છે...', hi: 'लोड हो रहा है...' },
  language: { en: 'Language', gu: 'ભાષા', hi: 'भाषा' },
  appearance: { en: 'Appearance', gu: 'દેખાવ', hi: 'दिखावट' },

  // Landing page
  landing_badge: { en: 'Trusted healthcare platform', gu: 'વિશ્વસનીય આરોગ્ય પ્લેટફોર્મ', hi: 'विश्वसनीय हेल्थकेयर प्लेटफ़ॉर्म' },
  landing_title_1: { en: 'Your Health,', gu: 'તમારું આરોગ્ય,', hi: 'आपकी सेहत,' },
  landing_title_2: { en: 'One Click', gu: 'એક ક્લિક', hi: 'एक क्लिक' },
  landing_title_3: { en: 'Away', gu: 'દૂર', hi: 'दूर' },
  landing_subtitle: {
    en: 'Book doctors, order medicines, run lab tests, and get instant telemedicine consultations — MediCare+ brings your entire healthcare journey into one simple, secure app.',
    gu: 'ડોક્ટર બુક કરો, દવાઓ ઓર્ડર કરો, લેબ ટેસ્ટ કરાવો, અને તાત્કાલિક ટેલિમેડિસિન કન્સલ્ટેશન મેળવો — MediCare+ તમારી સંપૂર્ણ આરોગ્ય યાત્રાને એક સરળ, સુરક્ષિત એપમાં લાવે છે.',
    hi: 'डॉक्टर बुक करें, दवाइयाँ ऑर्डर करें, लैब टेस्ट कराएं, और तुरंत टेलीमेडिसिन परामर्श पाएं — MediCare+ आपकी पूरी स्वास्थ्य यात्रा को एक सरल, सुरक्षित ऐप में लाता है।',
  },
  landing_get_started: { en: 'Get Started Free', gu: 'મફતમાં શરૂ કરો', hi: 'मुफ़्त में शुरू करें' },
  landing_sign_in: { en: 'Sign In', gu: 'સાઇન ઇન', hi: 'साइन इन' },
  landing_see_features: { en: 'See Features', gu: 'સુવિધાઓ જુઓ', hi: 'सुविधाएं देखें' },
  landing_go_to_dashboard: { en: 'Go to Dashboard', gu: 'ડેશબોર્ડ પર જાઓ', hi: 'डैशबोर्ड पर जाएं' },
}

export type TranslationKey = keyof typeof translations
const dict = translations

interface I18nContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)
const STORAGE_KEY = 'medicare_lang'

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    return saved === 'gu' || saved === 'hi' || saved === 'en' ? saved : 'en'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = (l: Lang) => setLangState(l)
  const t = (key: TranslationKey): string => dict[key]?.[lang] ?? dict[key]?.en ?? String(key)

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}
