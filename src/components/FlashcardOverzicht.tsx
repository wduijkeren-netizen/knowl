'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Layers, Link2, ListChecks, LogOut, MoreHorizontal, PencilLine, PenLine, Plus, RotateCcw, Search, Share2, Trash2, UserPlus } from 'lucide-react'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import Glyph from '@/components/Glyph'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'

type Set = { id: string; title: string; vak: string | null; created_at: string; share_token: string; is_public: boolean; edit_token?: string }
type Props = { sets: Set[]; countMap: Record<string, number>; dueMap: Record<string, number>; memberSets: Set[] }

function getProgress(setId: string): number {
  try {
    const raw = localStorage.getItem(`knowl_fc_progress_${setId}`)
    if (!raw) return -1
    const { known, total } = JSON.parse(raw)
    return total > 0 ? Math.round((known / total) * 100) : 0
  } catch { return -1 }
}

export default function FlashcardOverzicht({ sets: initialSets, countMap, dueMap, memberSets }: Props) {
  const { tr } = useLanguage()
  const fc = tr.flashcards
  const supabase = useMemo(() => createClient(), [])
  const [sets, setSets] = useState(initialSets)
  const [sharedSets, setSharedSets] = useState(memberSets)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Set | null>(null)
  const [leaving, setLeaving] = useState<Set | null>(null)
  const [toast, setToast] = useState('')
  const noSubject = fc.noSubjectGroup.replace(/^[—–-]\s*/, '')

  useEffect(() => {
    const map: Record<string, number> = {}
    for (const s of [...initialSets, ...memberSets]) map[s.id] = getProgress(s.id)
    setProgress(map)
  }, [initialSets, memberSets])

  useEffect(() => {
    if (!menuId) return
    function onDown(e: MouseEvent) { if (!(e.target as HTMLElement).closest('[data-menu]')) setMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(id)
  }, [toast])

  const colors = useMemo(() => buildSubjectColors([...sets, ...sharedSets].map(s => s.vak).filter((v): v is string => !!v)), [sets, sharedSets])
  const term = search.trim().toLowerCase()
  const filtered = sets.filter(s => !term || s.title.toLowerCase().includes(term) || (s.vak ?? '').toLowerCase().includes(term))
  const groups: Record<string, Set[]> = {}
  for (const s of filtered) (groups[s.vak ?? noSubject] ??= []).push(s)
  const groupKeys = Object.keys(groups).sort((a, b) => (a === noSubject ? 1 : b === noSubject ? -1 : a.localeCompare(b)))
  const totalDue = sets.reduce((n, s) => n + (dueMap[s.id] ?? 0), 0)

  async function confirmDelete() {
    if (!deleting) return
    const { error } = await supabase.from('flashcard_sets').delete().eq('id', deleting.id)
    if (error) setToast('Verwijderen lukte niet.')
    else setSets(s => s.filter(x => x.id !== deleting.id))
    setDeleting(null)
  }

  async function confirmLeave() {
    if (!leaving) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('flashcard_set_members').delete().eq('set_id', leaving.id).eq('user_id', user.id)
      setSharedSets(s => s.filter(x => x.id !== leaving.id))
    }
    setLeaving(null)
  }

  async function toggleShare(set: Set) {
    const isPublic = !set.is_public
    const { data } = await supabase.from('flashcard_sets').update({ is_public: isPublic }).eq('id', set.id).select().single()
    if (!data) { setToast('Dat lukte niet. Probeer het opnieuw.'); return }
    setSets(s => s.map(x => (x.id === set.id ? { ...x, is_public: isPublic } : x)))
    if (isPublic) {
      try { await navigator.clipboard.writeText(`${window.location.origin}/flashcards/deel/${set.share_token}`) } catch {}
      setToast('Gedeeld. De link is gekopieerd.')
    } else setToast('Delen gestopt.')
  }

  async function copyInvite(set: Set) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/flashcards/lid-worden/${set.edit_token}`) } catch {}
    setToast('Uitnodigingslink gekopieerd.')
  }

  const menuItem = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5'

  function SetCard({ set, shared = false }: { set: Set; shared?: boolean }) {
    const color = set.vak ? colors[set.vak] ?? NO_SUBJECT_COLOR : NO_SUBJECT_COLOR
    const count = countMap[set.id] ?? 0
    const due = shared ? 0 : dueMap[set.id] ?? 0
    const pct = progress[set.id] ?? -1
    return (
      <li className={`relative group rounded-xl border bg-white hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none transition ${menuId === set.id ? 'z-20' : ''}`}
        style={{ backgroundImage: `linear-gradient(${color}10, ${color}10)`, borderColor: `${color}33` }}>
        <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} aria-hidden />
        <div className="flex items-start gap-3 pl-4 pr-2 pt-3.5 pb-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
            <Layers className="w-5 h-5" strokeWidth={2} />
          </span>
          <Link href={`/flashcards/${set.id}`} className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-xl">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-700">{set.title}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{count} {count === 1 ? 'kaart' : 'kaarten'}</span>
              {due > 0 && <span className="font-medium text-amber-800 dark:text-amber-300">· {due} te herhalen</span>}
              {set.is_public && !shared && <span className="text-emerald-800 dark:text-emerald-300">· gedeeld</span>}
              {shared && set.vak && <span>· {set.vak}</span>}
            </p>
          </Link>
          <div className="relative z-10 shrink-0 flex items-center gap-1" data-menu>
            {due > 0 && (
              <Link href={`/flashcards/${set.id}/herhalen`} className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold bg-amber-500 text-white rounded-lg px-2.5 py-1.5 hover:bg-amber-600">
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={2.5} /> {fc.repeat}
              </Link>
            )}
            <button onClick={() => setMenuId(menuId === set.id ? null : set.id)} aria-label={`Acties voor ${set.title}`} aria-expanded={menuId === set.id}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5">
              <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
            </button>
            {menuId === set.id && (
              <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-56 bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
                <Link role="menuitem" href={`/flashcards/${set.id}`} className={menuItem}><ArrowRight className="w-4 h-4" strokeWidth={2} /> {fc.study}</Link>
                {due > 0 && <Link role="menuitem" href={`/flashcards/${set.id}/herhalen`} className={menuItem}><RotateCcw className="w-4 h-4" strokeWidth={2} /> {fc.repeat} ({due})</Link>}
                {count >= 2 && <Link role="menuitem" href={`/flashcards/${set.id}/quiz`} className={menuItem}><ListChecks className="w-4 h-4" strokeWidth={2} /> {fc.quiz}</Link>}
                <Link role="menuitem" href={`/flashcards/${set.id}/invuloefening`} className={menuItem}><PenLine className="w-4 h-4" strokeWidth={2} /> {fc.fill}</Link>
                {!shared && (
                  <>
                    <div className="my-1 border-t border-indigo-100" role="separator" />
                    <Link role="menuitem" href={`/flashcards/${set.id}/bewerken`} className={menuItem}><PencilLine className="w-4 h-4" strokeWidth={2} /> {fc.edit}</Link>
                    <button role="menuitem" onClick={() => { setMenuId(null); toggleShare(set) }} className={menuItem}>
                      {set.is_public ? <Link2 className="w-4 h-4" strokeWidth={2} /> : <Share2 className="w-4 h-4" strokeWidth={2} />} {set.is_public ? 'Delen stoppen' : 'Delen (link kopiëren)'}
                    </button>
                    {set.edit_token && (
                      <button role="menuitem" onClick={() => { setMenuId(null); copyInvite(set) }} className={menuItem}><UserPlus className="w-4 h-4" strokeWidth={2} /> {fc.invite}</button>
                    )}
                    <div className="my-1 border-t border-indigo-100" role="separator" />
                    <button role="menuitem" onClick={() => { setMenuId(null); setDeleting(set) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" strokeWidth={2} /> Verwijderen
                    </button>
                  </>
                )}
                {shared && (
                  <>
                    <div className="my-1 border-t border-indigo-100" role="separator" />
                    <button role="menuitem" onClick={() => { setMenuId(null); setLeaving(set) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50">
                      <LogOut className="w-4 h-4" strokeWidth={2} /> {fc.leave}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {pct >= 0 && (
          <div className="pl-4 pr-4 pb-3">
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-300 mb-1"><span>{fc.progress}</span><span>{pct}%</span></div>
            <div className="h-1.5 bg-white/80 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
          </div>
        )}
      </li>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-4xl" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 dark:text-white">{fc.title}</h1>
              <PageInfo text="Maak sets met begrippen of woorden en leer ze via herhaling. Knowl vraagt je de kaartjes op het juiste moment opnieuw, zo onthoud je ze beter." />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {sets.length ? `${sets.length} ${sets.length === 1 ? 'set' : 'sets'}${totalDue ? ` · ${totalDue} ${totalDue === 1 ? 'kaart' : 'kaarten'} te herhalen` : ''}` : fc.subtitle}
            </p>
          </div>
          <Link href="/flashcards/nieuw"
            className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition shrink-0">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Nieuwe set
          </Link>
        </header>

        {sets.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} aria-hidden />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={fc.searchPlaceholder} aria-label="Zoek een set"
              className="w-full border border-indigo-100 bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        )}

        {sets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
            <span className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Glyph name="cards" className="w-6 h-6" /></span>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mt-3">{fc.emptyTitle}</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{fc.emptyBody}</p>
            <Link href="/flashcards/nieuw" className="mt-4 inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
              <Plus className="w-4 h-4" strokeWidth={2.5} /> {fc.emptyBtn}
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
            <p className="text-sm text-slate-800 dark:text-slate-100">{fc.searchNoResults} &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch('')} className="mt-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900">Zoekopdracht wissen</button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupKeys.map(key => (
              <section key={key} aria-label={key}>
                <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2 flex items-center gap-2">
                  {key}<span className="text-xs font-medium text-slate-500 dark:text-slate-400">{groups[key].length}</span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">{groups[key].map(set => <SetCard key={set.id} set={set} />)}</ul>
              </section>
            ))}
          </div>
        )}

        {sharedSets.length > 0 && (
          <section aria-label={fc.sharedWithMe}>
            <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">{fc.sharedWithMe}</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">{sharedSets.map(set => <SetCard key={set.id} set={set} shared />)}</ul>
          </section>
        )}
      </main>

      {toast && (
        <div className="fixed inset-x-0 bottom-5 flex justify-center pointer-events-none z-50" role="status">
          <span className="bg-slate-900 text-white text-sm font-medium rounded-xl px-4 py-2.5 shadow-lg">{toast}</span>
        </div>
      )}

      {(deleting || leaving) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => { setDeleting(null); setLeaving(null) }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="fc-confirm" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 id="fc-confirm" className="text-base font-semibold text-slate-900 dark:text-white">{deleting ? fc.deleteTitle : fc.leaveTitle}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              {deleting ? `‘${deleting.title}’ en alle kaarten worden verwijderd. Dit kun je niet ongedaan maken.` : fc.leaveBody}
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setDeleting(null); setLeaving(null) }} autoFocus className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">{fc.cancel}</button>
              <button onClick={deleting ? confirmDelete : confirmLeave} className="text-sm font-semibold bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700">
                {deleting ? 'Verwijderen' : fc.confirmLeave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
