'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, LogOut, Mail, Menu, Moon, Search, Sun, User as UserIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { languages, type LangCode } from '@/lib/i18n/translations'
import { useTheme } from '@/lib/ThemeContext'
import SearchDialog from '@/components/SearchDialog'

type NavLink = { href: string; label: string }

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onOutside])
  return ref
}

const iconBtn = 'flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors'

export default function Nav({ loggedIn, width = 'max-w-3xl' }: { loggedIn?: boolean; width?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { lang, setLang, tr } = useLanguage()
  const { dark, toggle: toggleDark } = useTheme()
  const [isLoggedIn, setIsLoggedIn] = useState(!!loggedIn)
  const [email, setEmail] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const moreRef = useClickOutside(() => setMoreOpen(false))
  const profileRef = useClickOutside(() => setProfileOpen(false))
  const langRef = useClickOutside(() => setLangOpen(false))

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (loggedIn === undefined) setIsLoggedIn(!!data.user)
      setEmail(data.user?.email ?? '')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isLoggedIn])

  const isActive = (href: string) => pathname === href || (href !== '/home' && pathname.startsWith(href + '/'))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const mainLinks: NavLink[] = isLoggedIn
    ? [
        { href: '/home', label: tr.nav.home },
        { href: '/leermomenten', label: tr.nav.moments },
        { href: '/resultaten', label: tr.nav.results },
        { href: '/vakken', label: tr.nav.subjects },
      ]
    : [
        { href: '/leermomenten', label: tr.nav.moments },
        { href: '/resultaten', label: tr.nav.results },
        { href: '/pomodoro', label: tr.nav.timer },
      ]

  const moreGroups: { label: string; links: NavLink[] }[] = [
    { label: tr.nav.learn, links: [
      { href: '/pomodoro', label: tr.nav.timer },
      { href: '/pomodoro/groep', label: tr.nav.group ?? 'Groepsstudie' },
      { href: '/flashcards', label: tr.nav.flashcards ?? 'Flashcards' },
      { href: '/woordweb', label: tr.nav.woordweb ?? 'Woordweb' },
    ] },
    { label: tr.nav.overview, links: [
      { href: '/wrapped', label: tr.nav.monthly },
      { href: '/week', label: tr.nav.week },
      { href: '/agenda', label: tr.nav.agenda },
      { href: '/rooster', label: tr.nav.schedule },
      { href: '/notities', label: tr.nav.notities ?? 'Notities' },
    ] },
    { label: tr.nav.more, links: [
      { href: '/vrienden', label: tr.nav.friends ?? 'Vrienden' },
      { href: '/cijfers', label: tr.nav.grades ?? 'Cijferberekening' },
    ] },
  ]
  const moreActive = moreGroups.some(g => g.links.some(l => isActive(l.href)))

  const linkClass = (active: boolean) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
      active
        ? 'bg-white text-indigo-700 shadow-sm dark:text-white'
        : 'text-slate-600 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-white'
    }`

  const initial = (email[0] ?? '?').toUpperCase()
  const currentLang = languages.find(l => l.code === lang)

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-30">
      <div className={`${width} mx-auto px-4 py-2.5 flex justify-between items-center gap-3`}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href={isLoggedIn ? '/home' : '/'} className="text-lg font-bold text-indigo-700 dark:text-indigo-300 tracking-tight shrink-0">
            Knowl
          </Link>

          <nav className="hidden md:flex items-center gap-1 bg-indigo-50 rounded-xl p-1" aria-label="Hoofdmenu">
            {mainLinks.map(l => (
              <Link key={l.href} href={l.href} className={linkClass(isActive(l.href))} aria-current={isActive(l.href) ? 'page' : undefined}>
                {l.label}
              </Link>
            ))}
            {isLoggedIn && (
              <div ref={moreRef} className="relative">
                <button onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen} className={`${linkClass(moreActive)} flex items-center gap-1`}>
                  {tr.nav.more}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>
                {moreOpen && (
                  <div className="absolute left-0 top-full mt-2 z-40 bg-white rounded-2xl border border-indigo-100 shadow-xl p-2 w-[420px] grid grid-cols-3 gap-1">
                    {moreGroups.map(g => (
                      <div key={g.label}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-3 pt-2 pb-1">{g.label}</p>
                        {g.links.map(l => (
                          <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)}
                            className={`block px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-50 dark:hover:bg-white/5 ${isActive(l.href) ? 'text-indigo-700 font-semibold dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {isLoggedIn && (
            <button onClick={() => setSearchOpen(true)} className={`${iconBtn} md:w-auto md:px-2.5 md:gap-2`} aria-label="Zoeken (Ctrl of Cmd + K)" title="Zoeken (⌘K)">
              <Search className="w-4 h-4" strokeWidth={2} />
              <kbd className="hidden lg:inline text-[11px] font-medium text-slate-500 dark:text-slate-400 border border-indigo-100 rounded px-1">⌘K</kbd>
            </button>
          )}

          <button onClick={toggleDark} className={iconBtn} aria-label={dark ? 'Lichte modus' : 'Donkere modus'} title={dark ? 'Lichte modus' : 'Donkere modus'}>
            {dark ? <Sun className="w-4 h-4" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
          </button>

          {isLoggedIn ? (
            <div ref={profileRef} className="relative hidden md:block">
              <button onClick={() => setProfileOpen(o => !o)} aria-expanded={profileOpen} aria-label="Profielmenu"
                className="ml-1 w-9 h-9 rounded-full bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center hover:bg-indigo-700 transition-colors">
                {initial}
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 w-64 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2">
                  {email && <p className="px-4 pt-1 pb-2 text-xs text-slate-500 dark:text-slate-400 truncate border-b border-indigo-100 mb-1">{email}</p>}
                  <Link href="/profiel" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5">
                    <UserIcon className="w-4 h-4" strokeWidth={2} /> {tr.nav.profile}
                  </Link>
                  <div className="px-4 py-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Taal</p>
                    <div className="grid grid-cols-3 gap-1">
                      {languages.map(l => (
                        <button key={l.code} onClick={() => setLang(l.code as LangCode)}
                          className={`text-xs rounded-md px-1.5 py-1 border ${lang === l.code ? 'border-indigo-600 text-indigo-700 font-semibold dark:text-white' : 'border-indigo-100 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-white/5'}`}>
                          {l.code.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <a href="mailto:myknowl@hotmail.com?subject=Feedback Knowl" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5">
                    <Mail className="w-4 h-4" strokeWidth={2} /> {tr.nav.feedback}
                  </a>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5 border-t border-indigo-100 mt-1">
                    <LogOut className="w-4 h-4" strokeWidth={2} /> {tr.nav.logout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div ref={langRef} className="relative hidden md:block">
                <button onClick={() => setLangOpen(o => !o)} className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300 bg-indigo-50 rounded-lg px-2.5 py-1.5">
                  <span className="font-medium text-xs">{currentLang?.code.toUpperCase()}</span>
                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                {langOpen && (
                  <div className="absolute right-0 top-full mt-2 z-40 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 min-w-[170px]">
                    {languages.map(l => (
                      <button key={l.code} onClick={() => { setLang(l.code as LangCode); setLangOpen(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-indigo-50 ${lang === l.code ? 'text-indigo-700 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
                        <span>{l.label}</span>
                        {lang === l.code && <Check className="w-4 h-4 ml-auto" strokeWidth={2} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/login" className="hidden md:block text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                {tr.nav.loginBtn}
              </Link>
            </>
          )}

          <button onClick={() => setMobileOpen(o => !o)} className={`${iconBtn} md:hidden`} aria-label="Menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="w-5 h-5" strokeWidth={2} /> : <Menu className="w-5 h-5" strokeWidth={2} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-indigo-100 bg-white px-4 py-3 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-0.5">
            {mainLinks.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${isActive(l.href) ? 'bg-indigo-50 text-indigo-700 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                {l.label}
              </Link>
            ))}
          </div>
          {isLoggedIn && moreGroups.map(g => (
            <div key={g.label}>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 px-3">{g.label}</p>
              {g.links.map(l => (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2 rounded-xl text-sm ${isActive(l.href) ? 'bg-indigo-50 text-indigo-700 font-medium dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="pt-3 border-t border-indigo-100 space-y-2">
            {isLoggedIn && (
              <Link href="/profiel" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                <UserIcon className="w-4 h-4" strokeWidth={2} /> {tr.nav.profile}
              </Link>
            )}
            <div className="flex items-center justify-between gap-2 px-3">
              <select value={lang} onChange={e => setLang(e.target.value as LangCode)} aria-label="Taal"
                className="text-sm text-slate-700 bg-indigo-50 rounded-lg px-2 py-1.5 border-0 focus:outline-none">
                {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <a href="mailto:myknowl@hotmail.com?subject=Feedback Knowl" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <Mail className="w-4 h-4" strokeWidth={2} /> {tr.nav.feedback}
              </a>
            </div>
            {isLoggedIn ? (
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                <LogOut className="w-4 h-4" strokeWidth={2} /> {tr.nav.logout}
              </button>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-center text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium">
                {tr.nav.loginLink}
              </Link>
            )}
          </div>
        </div>
      )}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
