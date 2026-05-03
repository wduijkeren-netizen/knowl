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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('nl')

  useEffect(() => {
    const saved = localStorage.getItem('knowl-lang') as LangCode | null
    if (saved && saved in t) setLangState(saved)
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
