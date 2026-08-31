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

  // Page headers (title + subtitle) - shown at the top of every page via
  // <PageHeader>. Covers the most-visible text on each page even where the
  // body content underneath isn't fully translated yet.
  ph_dashboard_title: { en: 'Dashboard', gu: 'ડેશબોર્ડ', hi: 'डैशबोर्ड' },
  ph_dashboard_subtitle: { en: 'Welcome back! Here is your health overview.', gu: 'ફરી સ્વાગત છે! આ રહ્યું તમારું આરોગ્ય વિહંગાવલોકન.', hi: 'वापसी पर स्वागत है! यह रहा आपका स्वास्थ्य अवलोकन.' },
  ph_doctors_title: { en: 'Find Doctors', gu: 'ડોક્ટર શોધો', hi: 'डॉक्टर खोजें' },
  ph_doctors_subtitle: { en: 'Search and book appointments with specialists', gu: 'નિષ્ણાતો સાથે શોધો અને એપોઇન્ટમેન્ટ બુક કરો', hi: 'विशेषज्ञों को खोजें और अपॉइंटमेंट बुक करें' },
  ph_consultations_title: { en: 'Telemedicine', gu: 'ટેલિમેડિસિન', hi: 'टेलीमेडिसिन' },
  ph_consultations_subtitle: { en: 'Consult doctors via video, phone, or chat', gu: 'વિડિયો, ફોન અથવા ચેટ દ્વારા ડોક્ટરની સલાહ લો', hi: 'वीडियो, फोन या चैट के ज़रिए डॉक्टर से सलाह लें' },
  ph_pharmacy_title: { en: 'Pharmacy', gu: 'ફાર્મસી', hi: 'फार्मेसी' },
  ph_pharmacy_subtitle: { en: 'Order medicines online with home delivery', gu: 'હોમ ડિલિવરી સાથે ઓનલાઇન દવાઓ ઓર્ડર કરો', hi: 'होम डिलीवरी के साथ ऑनलाइन दवाइयाँ ऑर्डर करें' },
  ph_lab_tests_title: { en: 'Lab Tests', gu: 'લેબ ટેસ્ટ', hi: 'लैब टेस्ट' },
  ph_lab_tests_subtitle: { en: 'Book diagnostic tests with home sample collection', gu: 'હોમ સેમ્પલ કલેક્શન સાથે ડાયગ્નોસ્ટિક ટેસ્ટ બુક કરો', hi: 'होम सैंपल कलेक्शन के साथ डायग्नोस्टिक टेस्ट बुक करें' },
  ph_records_title: { en: 'Health Records', gu: 'આરોગ્ય રેકોર્ડ', hi: 'स्वास्थ्य रिकॉर्ड' },
  ph_records_subtitle: { en: 'Store and access your medical documents', gu: 'તમારા મેડિકલ દસ્તાવેજો સાચવો અને ઍક્સેસ કરો', hi: 'अपने मेडिकल दस्तावेज़ सहेजें और एक्सेस करें' },
  ph_vitals_title: { en: 'Vitals Tracker', gu: 'વાઈટલ્સ ટ્રેકર', hi: 'वाइटल्स ट्रैकर' },
  ph_vitals_subtitle: { en: 'Track blood pressure, sugar, weight, and more', gu: 'બ્લડ પ્રેશર, સુગર, વજન અને વધુ ટ્રેક કરો', hi: 'ब्लड प्रेशर, शुगर, वज़न और अधिक ट्रैक करें' },
  ph_reminders_title: { en: 'Reminders', gu: 'રિમાઇન્ડર', hi: 'रिमाइंडर' },
  ph_reminders_subtitle: { en: 'Never miss a medicine dose or appointment', gu: 'ક્યારેય દવાનો ડોઝ કે એપોઇન્ટમેન્ટ ચૂકશો નહીં', hi: 'कभी भी दवा की खुराक या अपॉइंटमेंट न चूकें' },
  ph_symptom_checker_title: { en: 'Symptom Checker', gu: 'લક્ષણ ચકાસણી', hi: 'लक्षण जांच' },
  ph_symptom_checker_subtitle: { en: 'Identify possible conditions based on your symptoms', gu: 'તમારા લક્ષણોના આધારે શક્ય સ્થિતિઓ ઓળખો', hi: 'अपने लक्षणों के आधार पर संभावित स्थितियाँ पहचानें' },
  ph_calculators_title: { en: 'Health Tools', gu: 'આરોગ્ય સાધનો', hi: 'स्वास्थ्य उपकरण' },
  ph_calculators_subtitle: { en: 'BMI, calorie, and other health calculators', gu: 'BMI, કેલરી અને અન્ય આરોગ્ય કેલ્ક્યુલેટર', hi: 'BMI, कैलोरी और अन्य स्वास्थ्य कैलकुलेटर' },
  ph_emergency_title: { en: 'Emergency', gu: 'ઇમરજન્સી', hi: 'आपातकाल' },
  ph_emergency_subtitle: { en: 'Quick access to emergency contacts and nearby hospitals', gu: 'ઇમરજન્સી સંપર્કો અને નજીકની હોસ્પિટલોની ઝડપી ઍક્સેસ', hi: 'आपातकालीन संपर्कों और नज़दीकी अस्पतालों तक त्वरित पहुँच' },
  ph_articles_title: { en: 'Health Library', gu: 'આરોગ્ય લાઇબ્રેરી', hi: 'स्वास्थ्य लाइब्रेरी' },
  ph_articles_subtitle: { en: 'Read trustworthy articles on health and wellness', gu: 'આરોગ્ય અને સુખાકારી પર વિશ્વસનીય લેખો વાંચો', hi: 'स्वास्थ्य और कल्याण पर भरोसेमंद लेख पढ़ें' },
  ph_family_title: { en: 'Family Members', gu: 'કુટુંબના સભ્યો', hi: 'परिवार के सदस्य' },
  ph_family_subtitle: { en: "Manage your family's health from one account", gu: 'એક જ ખાતામાંથી તમારા કુટુંબનું આરોગ્ય સંભાળો', hi: 'एक ही खाते से अपने परिवार का स्वास्थ्य प्रबंधित करें' },
  ph_inquiries_title: { en: 'Ask Reception', gu: 'રિસેપ્શનને પૂછો', hi: 'रिसेप्शन से पूछें' },
  ph_inquiries_subtitle: { en: 'Send a question to the front desk', gu: 'ફ્રન્ટ ડેસ્કને પ્રશ્ન મોકલો', hi: 'फ्रंट डेस्क को सवाल भेजें' },
  ph_settings_title: { en: 'Settings', gu: 'સેટિંગ્સ', hi: 'सेटिंग्स' },
  ph_settings_subtitle: { en: 'Manage your account details', gu: 'તમારા ખાતાની વિગતો સંભાળો', hi: 'अपने खाते का विवरण प्रबंधित करें' },

  // AI Symptom Analyzer (Symptom Checker page) - the AI's own reply is
  // translated server-side (see server/src/routes/ai.js); these are the
  // static labels around it.
  ai_symptom_title: { en: 'AI Symptom Analysis', gu: 'AI લક્ષણ વિશ્લેષણ', hi: 'AI लक्षण विश्लेषण' },
  ai_symptom_subtitle: {
    en: "Describe how you're feeling in your own words — the AI will suggest possible causes and how urgently to see a doctor.",
    gu: 'તમે કેવું અનુભવો છો તે તમારા પોતાના શબ્દોમાં વર્ણવો — AI શક્ય કારણો અને ડોક્ટરને કેટલી તાત્કાલિકતાથી મળવું તે સૂચવશે.',
    hi: 'आप कैसा महसूस कर रहे हैं यह अपने शब्दों में बताएं — AI संभावित कारण और डॉक्टर से कितनी जल्दी मिलना है यह सुझाएगा।',
  },
  ai_symptom_placeholder: {
    en: 'e.g. I have had a mild fever and sore throat for two days, plus a headache...',
    gu: 'દા.ત. મને બે દિવસથી હળવો તાવ અને ગળામાં દુખાવો છે, સાથે માથાનો દુખાવો પણ...',
    hi: 'उदा. मुझे दो दिन से हल्का बुखार और गले में खराश है, साथ ही सिरदर्द भी...',
  },
  ai_symptom_analyzing: { en: 'Analyzing...', gu: 'વિશ્લેષણ થઈ રહ્યું છે...', hi: 'विश्लेषण हो रहा है...' },
  ai_symptom_analyze: { en: 'Analyze Symptoms', gu: 'લક્ષણોનું વિશ્લેષણ કરો', hi: 'लक्षणों का विश्लेषण करें' },
  ai_symptom_urgency: { en: 'urgency', gu: 'તાત્કાલિકતા', hi: 'तात्कालिकता' },
  ai_symptom_emergency: {
    en: 'This may be a medical emergency — please call emergency services or visit the nearest ER immediately.',
    gu: 'આ તબીબી ઇમરજન્સી હોઈ શકે છે — કૃપા કરીને ઇમરજન્સી સેવાઓને કૉલ કરો અથવા તાત્કાલિક નજીકના ER ની મુલાકાત લો.',
    hi: 'यह मेडिकल इमरजेंसी हो सकती है — कृपया आपातकालीन सेवाओं को कॉल करें या तुरंत नज़दीकी ER जाएं।',
  },
  ai_symptom_recommendation: { en: 'Recommendation', gu: 'ભલામણ', hi: 'सिफारिश' },
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
