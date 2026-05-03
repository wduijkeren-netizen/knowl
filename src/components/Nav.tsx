'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { languages, type LangCode } from '@/lib/i18n/translations'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLang, tr } = useLanguage()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  const mainLinks = [
    { href: '/leermomenten', label: tr.nav.moments },
    { href: '/resultaten', label: tr.nav.results },
    { href: '/pomodoro', label: 'Timer' },
  ]

  const moreLinks = [
    { href: '/vakken', label: tr.nav.subjects },
    { href: '/wrapped', label: 'Maandoverzicht' },
  ]

  const isActive = (href: string) => pathname.startsWith(href)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const currentLang = languages.find(l => l.code === lang)

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-indigo-700 tracking-tight hover:text-indigo-500 transition-colors">
            Knowl
          </Link>
          <nav className="flex gap-1 bg-indigo-50 rounded-xl p-1">
            {mainLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                  isActive(link.href) ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'
                }`}>
                {link.label}
              </Link>
            ))}
            <div className="relative">
              <button onClick={() => setShowMoreMenu(s => !s)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                  moreLinks.some(l => isActive(l.href)) ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'
                }`}>
                Meer ▾
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 z-20 min-w-[160px]">
                    {moreLinks.map(link => (
                      <Link key={link.href} href={link.href} onClick={() => setShowMoreMenu(false)}
                        className="block px-4 py-2 text-sm text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-3 py-1.5 transition-colors">
              <span>{currentLang?.flag}</span>
              <span className="font-medium">{currentLang?.code.toUpperCase()}</span>
              <span className="text-xs opacity-60">▾</span>
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 z-20 min-w-[180px]">
                  {languages.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code as LangCode); setShowLangMenu(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${lang === l.code ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}>
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                      {lang === l.code && <span className="ml-auto text-indigo-400">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {isLoggedIn ? (
            <button onClick={handleLogout} className="text-sm text-indigo-300 hover:text-indigo-500 transition-colors">
              {tr.nav.logout}
            </button>
          ) : (
            <Link href="/login" className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Inloggen
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
