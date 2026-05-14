'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { languages, type LangCode } from '@/lib/i18n/translations'
import { useTheme } from '@/lib/ThemeContext'

type DropdownItem = { href: string; label: string; sub?: string }

function NavDropdown({ label: navLabel, items, isActive }: {
  label: string
  items: DropdownItem[]
  isActive: (href: string) => boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = items.some(i => isActive(i.href))

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
          active || open ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'
        }`}
      >
        {navLabel}
        <span className={`text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full pt-1 z-20">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 min-w-[180px]">
            {items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex flex-col px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors ${
                  isActive(item.href) ? 'text-indigo-700 font-semibold' : 'text-gray-700'
                }`}
              >
                <span>{item.label}</span>
                {item.sub && <span className="text-xs text-indigo-300 mt-0.5">{item.sub}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLang, tr } = useLanguage()
  const { dark, toggle: toggleDark } = useTheme()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isActive = (href: string) => pathname === href || (href !== '/home' && pathname.startsWith(href))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const currentLang = languages.find(l => l.code === lang)

  // Desktop: 4 groepen
  const overzichtLinks: DropdownItem[] = [
    { href: '/home', label: tr.nav.home },
    { href: '/resultaten', label: tr.nav.results },
    { href: '/vakken', label: tr.nav.subjects },
    { href: '/wrapped', label: tr.nav.monthly },
    { href: '/week', label: tr.nav.week },
    { href: '/agenda', label: tr.nav.agenda },
  ]

  const lerenLinks: DropdownItem[] = [
    { href: '/pomodoro', label: tr.nav.timer },
    { href: '/flashcards', label: tr.nav.flashcards ?? 'Flashcards' },
    { href: '/woordweb', label: tr.nav.woordweb ?? 'Woordweb' },
  ]

  const meerLinks: DropdownItem[] = [
    { href: '/cijfers', label: tr.nav.grades ?? 'Cijferberekening' },
    { href: '/profiel', label: tr.nav.profile },
  ]

  // Mobile: alle links plat
  const allMobileLinks = isLoggedIn ? [
    { href: '/leermomenten', label: tr.nav.moments, group: 'loggen' },
    { href: '/home', label: tr.nav.home, group: 'overzicht' },
    { href: '/resultaten', label: tr.nav.results, group: 'overzicht' },
    { href: '/vakken', label: tr.nav.subjects, group: 'overzicht' },
    { href: '/wrapped', label: tr.nav.monthly, group: 'overzicht' },
    { href: '/week', label: tr.nav.week, group: 'overzicht' },
    { href: '/agenda', label: tr.nav.agenda, group: 'overzicht' },
    { href: '/pomodoro', label: tr.nav.timer, group: 'leren' },
    { href: '/flashcards', label: tr.nav.flashcards ?? 'Flashcards', group: 'leren' },
    { href: '/woordweb', label: tr.nav.woordweb ?? 'Woordweb', group: 'leren' },
    { href: '/cijfers', label: tr.nav.grades ?? 'Cijferberekening', group: 'meer' },
    { href: '/profiel', label: tr.nav.profile, group: 'meer' },
  ] : [
    { href: '/leermomenten', label: tr.nav.moments, group: 'loggen' },
    { href: '/resultaten', label: tr.nav.results, group: 'overzicht' },
    { href: '/pomodoro', label: tr.nav.timer, group: 'leren' },
  ]

  const mobileGroups = [
    { key: 'loggen', label: tr.nav.moments },
    { key: 'overzicht', label: 'Overzicht' },
    { key: 'leren', label: 'Leren' },
    { key: 'meer', label: tr.nav.more },
  ]

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">

        {/* Logo + desktop nav */}
        <div className="flex items-center gap-3">
          <Link href={isLoggedIn ? '/home' : '/'} className="text-lg font-bold text-indigo-700 tracking-tight hover:text-indigo-500 transition-colors shrink-0">
            Knowl
          </Link>

          {/* Desktop nav */}
          {isLoggedIn && (
            <nav className="hidden md:flex gap-1 bg-indigo-50 rounded-xl p-1">
              <NavDropdown label="Overzicht" items={overzichtLinks} isActive={isActive} />
              {/* Leermomenten — directe link */}
              <Link href="/leermomenten"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  isActive('/leermomenten') ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'
                }`}>
                {tr.nav.moments}
              </Link>
              <NavDropdown label="Leren" items={lerenLinks} isActive={isActive} />
              <NavDropdown label={tr.nav.more} items={meerLinks} isActive={isActive} />
            </nav>
          )}

          {/* Gast desktop nav */}
          {!isLoggedIn && (
            <nav className="hidden md:flex gap-1 bg-indigo-50 rounded-xl p-1">
              <Link href="/leermomenten"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${isActive('/leermomenten') ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'}`}>
                {tr.nav.moments}
              </Link>
              <Link href="/resultaten"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${isActive('/resultaten') ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'}`}>
                {tr.nav.results}
              </Link>
              <Link href="/pomodoro"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${isActive('/pomodoro') ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400 hover:text-indigo-600'}`}>
                {tr.nav.timer}
              </Link>
            </nav>
          )}
        </div>

        {/* Rechts: taal, dark mode, logout, hamburger */}
        <div className="flex items-center gap-2">
          {/* Taal — desktop, hover */}
          <div
            className="relative hidden md:block"
            onMouseEnter={() => setShowLangMenu(true)}
            onMouseLeave={() => setShowLangMenu(false)}
          >
            <button className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors">
              <span>{currentLang?.flag}</span>
              <span className="font-medium text-xs">{currentLang?.code.toUpperCase()}</span>
              <span className="text-xs opacity-60">▾</span>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 top-full pt-1 z-20">
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 min-w-[170px]">
                  {languages.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code as LangCode); setShowLangMenu(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${lang === l.code ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}>
                      <span>{l.flag}</span><span>{l.label}</span>
                      {lang === l.code && <span className="ml-auto text-indigo-400">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Login/logout — desktop */}
          {isLoggedIn ? (
            <button onClick={handleLogout} className="hidden md:block text-sm text-indigo-300 hover:text-indigo-500 transition-colors">
              {tr.nav.logout}
            </button>
          ) : (
            <Link href="/login" className="hidden md:block text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              {tr.nav.loginBtn}
            </Link>
          )}

          {/* Feedback */}
          <a href="mailto:myknowl@hotmail.com?subject=Feedback Knowl"
            className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Stuur feedback">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </a>

          {/* Dark mode */}
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

          {/* Hamburger — mobiel */}
          <button onClick={() => setShowMobileMenu(s => !s)}
            className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
            <span className={`block w-5 h-0.5 bg-indigo-600 transition-all ${showMobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-indigo-600 transition-all ${showMobileMenu ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-indigo-600 transition-all ${showMobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobiel menu — gegroepeerd */}
      {showMobileMenu && (
        <div className="md:hidden border-t border-indigo-100 bg-white px-4 py-3 space-y-4">
          {mobileGroups.map(group => {
            const groupLinks = allMobileLinks.filter(l => l.group === group.key)
            if (groupLinks.length === 0) return null
            return (
              <div key={group.key}>
                <p className="text-xs font-semibold text-indigo-300 uppercase tracking-widest mb-1 px-1">{group.label}</p>
                <div className="space-y-0.5">
                  {groupLinks.map(link => (
                    <Link key={link.href} href={link.href} onClick={() => setShowMobileMenu(false)}
                      className={`block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive(link.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-indigo-50'
                      }`}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}

          <div className="pt-2 border-t border-indigo-50 flex justify-between items-center">
            <select value={lang} onChange={e => setLang(e.target.value as LangCode)}
              className="text-sm text-indigo-500 bg-indigo-50 rounded-lg px-2 py-1.5 border-0 focus:outline-none">
              {languages.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
            <a href="mailto:myknowl@hotmail.com?subject=Feedback Knowl"
              className="text-sm text-indigo-400 hover:text-indigo-600 px-3 py-1.5">
              {tr.nav.feedback}
            </a>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600 px-3 py-1.5">
                {tr.nav.logout}
              </button>
            ) : (
              <Link href="/login" onClick={() => setShowMobileMenu(false)}
                className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-medium">
                {tr.nav.loginLink}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
