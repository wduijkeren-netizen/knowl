'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import t, { type LangCode } from './translations'

type Tr = typeof t.nl

type LanguageContextType = {
  lang: LangCode
  setLang: (lang: LangCode) => void
  tr: Tr
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'nl',
  setLang: () => {},
  tr: t.nl,
})

const BROWSER_LANG_MAP: Record<string, LangCode> = {
  nl: 'nl', en: 'en', de: 'de', fr: 'fr', es: 'es',
  pt: 'pt', da: 'da', sv: 'sv', nb: 'no', no: 'no',
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('nl')

  useEffect(() => {
    const saved = localStorage.getItem('knowl-lang') as LangCode | null
    if (saved && saved in t) {
      setLangState(saved)
      return
    }
    // Auto-detect browser language on first visit
    const browserLang = navigator.language?.split('-')[0]?.toLowerCase()
    const detected = browserLang ? BROWSER_LANG_MAP[browserLang] : undefined
    if (detected) setLangState(detected)
  }, [])

  function setLang(newLang: LangCode) {
    setLangState(newLang)
    localStorage.setItem('knowl-lang', newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: (t as unknown as Record<string, Tr>)[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
