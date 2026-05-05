'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { languages, type LangCode } from '@/lib/i18n/translations'
import { useTheme } from '@/lib/ThemeContext'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLang, tr } = useLanguage()
  const { dark, toggle: toggleDark } = useTheme()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  const allLinks = isLoggedIn ? [
    { href: '/home', label: 'Home' },
    { href: '/leermomenten', label: tr.nav.moments },
    { href: '/resultaten', label: tr.nav.results },
    { href: '/pomodoro', label: 'Timer' },
    { href: '/vakken', label: tr.nav.subjects },
    { href: '/wrapped', label: tr.nav.monthly },
    { href: '/profiel', label: tr.nav.profile },
  ] : [
    { href: '/leermomenten', label: tr.nav.moments },
    { href: '/resultaten', label: tr.nav.results },
    { href: '/pomodoro', label: 'Timer' },
  ]

  const desktopLinks = allLinks.slice(0, 3)
  const moreLinks = allLinks.slice(3)

  const isActive = (href: string) => pathname.startsWith(href)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const currentLang = languages.find(l => l.code === lang)

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href={isLoggedIn ? '/home' : '/'} className="text-lg font-bold text-indigo-700 tracking-tight hover:text-indigo-500 transition-colors shrink-0">
            Knowl
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex gap-1 bg-indigo-50 rounded-xl p-1">
            {desktopLinks.map(link => (
              <Link key={link.href} href={link.href}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  isActive(link.href) ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'
                }`}>
                {link.label}
              </Link>
            ))}
            <div className="relative">
              <button onClick={() => setShowMoreMenu(s => !s)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${showMoreMenu ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'}`}>
                {tr.nav.more} ▾
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 z-20 min-w-[180px]">
                    {moreLinks.map(link => (
                      <Link key={link.href} href={link.href} onClick={() => setShowMoreMenu(false)}
                        className={`block px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${isActive(link.href) ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Taal — desktop only */}
          <div className="relative hidden md:block">
            <button onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors">
              <span>{currentLang?.flag}</span>
              <span className="font-medium text-xs">{currentLang?.code.toUpperCase()}</span>
              <span className="text-xs opacity-60">▾</span>
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 z-20 min-w-[170px]">
                  {languages.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code as LangCode); setShowLangMenu(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${lang === l.code ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}>
                      <span>{l.flag}</span><span>{l.label}</span>
                      {lang === l.code && <span className="ml-auto text-indigo-400">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Login/logout — desktop */}
          {isLoggedIn ? (
            <button onClick={handleLogout} className="hidden md:block text-sm text-indigo-300 hover:text-indigo-500 transition-colors">
              {tr.nav.logout}
            </button>
          ) : (
            <Link href="/login" className="hidden md:block text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Log in
            </Link>
          )}

          {/* Dark mode toggle */}
          <button onClick={toggleDark}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title={dark ? 'Licht' : 'Donker'}>
            {dark ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Hamburger — mobile */}
          <button onClick={() => setShowMobileMenu(s => !s)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
            <span className={`block w-5 h-0.5 bg-indigo-600 transition-all ${showMobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-indigo-600 transition-all ${showMobileMenu ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-indigo-600 transition-all ${showMobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-indigo-100 bg-white px-4 py-3 space-y-1">
          {allLinks.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setShowMobileMenu(false)}
              className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(link.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-indigo-50'
              }`}>
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-indigo-50 flex justify-between items-center">
            <select value={lang} onChange={e => setLang(e.target.value as LangCode)}
              className="text-sm text-indigo-500 bg-indigo-50 rounded-lg px-2 py-1.5 border-0 focus:outline-none">
              {languages.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5">
                {tr.nav.logout}
              </button>
            ) : (
              <Link href="/login" onClick={() => setShowMobileMenu(false)}
                className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium">
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
