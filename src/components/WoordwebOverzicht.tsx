'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MoreHorizontal, Network, Plus, Search, Trash2 } from 'lucide-react'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import Glyph from '@/components/Glyph'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import { formatDay } from '@/lib/studyStats'

type Web = { id: string; title: string; vak: string | null; created_at: string; nodes?: unknown[] | null; edges?: unknown[] | null }

export default function WoordwebOverzicht({ webs: initialWebs }: { webs: Web[] }) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { tr } = useLanguage()
  const ww = tr.woordweb
  const noVak = ww.noVak.replace(/^[—–-]\s*/, '')
  const [webs, setWebs] = useState(initialWebs)
  const [search, setSearch] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Web | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!menuId) return
    function onDown(e: MouseEvent) { if (!(e.target as HTMLElement).closest('[data-menu]')) setMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  const colors = useMemo(() => buildSubjectColors(webs.map(w => w.vak).filter((v): v is string => !!v)), [webs])
  const term = search.trim().toLowerCase()
  const filtered = webs.filter(w => !term || w.title.toLowerCase().includes(term) || (w.vak ?? '').toLowerCase().includes(term))
  const groups: Record<string, Web[]> = {}
  for (const w of filtered) (groups[w.vak ?? noVak] ??= []).push(w)
  const groupKeys = Object.keys(groups).sort((a, b) => (a === noVak ? 1 : b === noVak ? -1 : a.localeCompare(b)))

  async function confirmDelete() {
    if (!deleting) return
    const { error: err } = await supabase.from('word_webs').delete().eq('id', deleting.id)
    if (err) { setError('Verwijderen lukte niet. Probeer het opnieuw.'); setDeleting(null); return }
    setWebs(list => list.filter(w => w.id !== deleting.id))
    setDeleting(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-4xl" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 dark:text-white">{ww.title}</h1>
              <PageInfo text="Maak een visuele kaart van begrippen die met elkaar verbonden zijn. Handig voor het samenvatten van een hoofdstuk of het begrijpen van verbanden." />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {webs.length ? `${webs.length} ${webs.length === 1 ? 'woordweb' : 'woordwebben'}` : ww.subtitle}
            </p>
          </div>
          <Link href="/woordweb/nieuw"
            className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition shrink-0">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Nieuw woordweb
          </Link>
        </header>

        {webs.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} aria-hidden />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ww.searchPlaceholder} aria-label="Zoek een woordweb"
              className="w-full border border-indigo-100 bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}

        {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

        {webs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
            <span className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Glyph name="web" className="w-6 h-6" /></span>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-3">{ww.emptyTitle}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{ww.emptyBody}</p>
            <Link href="/woordweb/nieuw" className="mt-4 inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
              <Plus className="w-4 h-4" strokeWidth={2.5} /> {ww.emptyBtn}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
            <p className="text-sm text-slate-800 dark:text-slate-100">{ww.searchNoResults} &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch('')} className="mt-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900">Zoekopdracht wissen</button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupKeys.map(key => (
              <section key={key} aria-label={key}>
                <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2">
                  {key}<span className="text-xs font-medium text-slate-500 dark:text-slate-400">{groups[key].length}</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groups[key].map(web => {
                    const color = web.vak ? colors[web.vak] ?? NO_SUBJECT_COLOR : NO_SUBJECT_COLOR
                    const count = Array.isArray(web.nodes) ? web.nodes.length : null
                    const links = Array.isArray(web.edges) ? web.edges.length : null
                    return (
                      <li key={web.id} className={`relative group rounded-xl border bg-white hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none transition ${menuId === web.id ? 'z-20' : ''}`}
                        style={{ backgroundImage: `linear-gradient(${color}10, ${color}10)`, borderColor: `${color}33` }}>
                        <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} aria-hidden />
                        <div className="flex items-start gap-3 pl-4 pr-2 py-3.5">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
                            <Network className="w-5 h-5" strokeWidth={2} />
                          </span>
                          <Link href={`/woordweb/${web.id}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-xl">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-700">{web.title}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {count !== null ? `${count} ${count === 1 ? 'begrip' : 'begrippen'}${links ? ` · ${links} ${links === 1 ? 'verbinding' : 'verbindingen'}` : ''} · ` : ''}{formatDay(web.created_at.slice(0, 10))}
                            </p>
                          </Link>
                          <div className="relative z-10 shrink-0" data-menu>
                            <button onClick={() => setMenuId(menuId === web.id ? null : web.id)} aria-label={`Acties voor ${web.title}`} aria-expanded={menuId === web.id}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5">
                              <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                            </button>
                            {menuId === web.id && (
                              <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-44 bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
                                <Link role="menuitem" href={`/woordweb/${web.id}`} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5">
                                  <ArrowRight className="w-4 h-4" strokeWidth={2} /> Openen
                                </Link>
                                <button role="menuitem" onClick={() => { setMenuId(null); setDeleting(web) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" strokeWidth={2} /> Verwijderen
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      {deleting && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-web" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 id="del-web" className="text-base font-semibold text-slate-900 dark:text-white">{ww.deleteTitle}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">&lsquo;{deleting.title}&rsquo; wordt verwijderd. Dit kun je niet ongedaan maken.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeleting(null)} autoFocus className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">{ww.cancel}</button>
              <button onClick={confirmDelete} className="text-sm font-semibold bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700">Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
