'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, BookOpen, CalendarRange, Check, MoreHorizontal, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import KnowlSelect from '@/components/KnowlSelect'
import PageInfo from '@/components/PageInfo'
import { getSchoolYearOptions } from '@/lib/schoolYear'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import { addDays, formatDay, formatMinutes, localDateStr, weekStart } from '@/lib/studyStats'
import { MAX_TERMS, currentTerm, subjectInTerm, termLabel, termsOfYear, type SchoolTerm } from '@/lib/terms'

type Subject = {
  id: string
  name: string
  goal_minutes: number | null
  goal_date: string | null
  recurring_type: string | null
  recurring_goal_minutes: number | null
  school_year: string | null
  is_active: boolean
  terms?: number[] | null
}
type MomentRow = { category: string | null; duration_minutes: number | null; learned_at: string }

type Props = { user: User | null; subjects: Subject[]; moments: MomentRow[]; terms: SchoolTerm[]; termsSupported: boolean }

const RECURRING: Record<string, string> = { daily: 'Per dag', weekly: 'Per week', monthly: 'Per maand' }
const WHOLE_YEAR = 0

function periodStart(type: string, today: string) {
  if (type === 'daily') return today
  if (type === 'weekly') return weekStart(today)
  if (type === 'monthly') return `${today.slice(0, 7)}-01`
  return null
}

export default function VakkenBeheer({ user, subjects: initialSubjects, moments, terms: initialTerms, termsSupported }: Props) {
  const supabase = useMemo(() => createClient(), [])
  const today = localDateStr(new Date())
  const [subjects, setSubjects] = useState(initialSubjects)
  const [terms, setTerms] = useState(initialTerms)
  const now = currentTerm(terms, today)
  const [viewYear, setViewYear] = useState(now.year)
  const [viewTerm, setViewTerm] = useState<number>(termsSupported ? now.term : WHOLE_YEAR)

  const [name, setName] = useState('')
  const [newTerms, setNewTerms] = useState<number[]>(termsSupported ? [now.term] : [])
  const [newYear, setNewYear] = useState(now.year)
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState('')

  const [menuId, setMenuId] = useState<string | null>(null)
  const [panel, setPanel] = useState<{ id: string; kind: 'goal' | 'terms' } | null>(null)
  const [goalForm, setGoalForm] = useState({ minutes: '', date: '', recurringType: '', recurringMinutes: '' })
  const [termForm, setTermForm] = useState<{ year: string; terms: number[] }>({ year: now.year, terms: [] })
  const [deleting, setDeleting] = useState<Subject | null>(null)
  const [switchOpen, setSwitchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [startEdit, setStartEdit] = useState<string | null>(null)
  const [startError, setStartError] = useState('')

  useEffect(() => {
    if (!menuId) return
    function onDown(e: MouseEvent) { if (!(e.target as HTMLElement).closest('[data-menu]')) setMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  const colors = useMemo(() => buildSubjectColors([...subjects.map(s => s.name), ...moments.map(m => m.category).filter((c): c is string => !!c)]), [subjects, moments])
  const stats = useMemo(() => {
    const out: Record<string, { count: number; minutes: number }> = {}
    for (const m of moments) {
      if (!m.category) continue
      out[m.category] ??= { count: 0, minutes: 0 }
      out[m.category].count++
      out[m.category].minutes += m.duration_minutes ?? 0
    }
    return out
  }, [moments])
  function periodMinutes(subject: Subject) {
    const start = subject.recurring_type ? periodStart(subject.recurring_type, today) : null
    if (!start) return 0
    return moments.filter(m => m.category === subject.name && m.learned_at >= start).reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  }

  const years = useMemo(() => {
    const set = new Set<string>([now.year, ...subjects.map(s => s.school_year).filter((y): y is string => !!y)])
    return Array.from(set).sort((a, b) => b.localeCompare(a))
  }, [subjects, now.year])
  const yearTerms = termsOfYear(terms, viewYear)
  const startedTerms = viewYear === now.year ? yearTerms.filter(t => t.starts_on <= today) : yearTerms
  const visible = subjects
    .filter(s => (viewTerm === WHOLE_YEAR ? (!s.school_year || s.school_year === viewYear) : subjectInTerm(s, viewYear, viewTerm)))
    .filter(s => !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()))
  const yearChoices = getSchoolYearOptions().map(y => ({ value: y, label: y }))
  const currentStart = termsOfYear(terms, now.year).find(t => t.term === now.term)?.starts_on
  const previousStart = termsOfYear(terms, now.year).find(t => t.term === now.term - 1)?.starts_on

  async function saveStart(e: React.FormEvent) {
    e.preventDefault()
    if (!startEdit || !user) return
    if ((previousStart && startEdit <= previousStart) || startEdit > today) {
      setStartError(`Kies een datum na ${previousStart ? formatDay(previousStart) : 'het vorige trimester'} en uiterlijk vandaag.`)
      return
    }
    const row = { school_year: now.year, term: now.term, starts_on: startEdit }
    const { error } = await supabase.from('school_terms').upsert({ ...row, user_id: user.id }, { onConflict: 'user_id,school_year,term' })
    if (error) { setStartError('Opslaan lukte niet. Probeer het opnieuw.'); return }
    setTerms(list => [...list.filter(t => !(t.school_year === row.school_year && t.term === row.term)), row])
    setStartEdit(null)
    setStartError('')
  }

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setAdding(true)
    setNotice('')
    const base = { id: crypto.randomUUID(), name: name.trim(), user_id: user.id, school_year: newYear }
    let { data, error } = await supabase.from('subjects').insert(termsSupported ? { ...base, terms: newTerms.length ? newTerms : null } : base).select().single()
    if (error && /terms/.test(error.message)) ({ data, error } = await supabase.from('subjects').insert(base).select().single())
    setAdding(false)
    if (error || !data) { setNotice('Toevoegen lukte niet. Bestaat dit vak misschien al?'); return }
    setSubjects(list => [...list, data].sort((a, b) => a.name.localeCompare(b.name)))
    setName('')
  }

  async function update(id: string, values: Partial<Subject>) {
    const { data, error } = await supabase.from('subjects').update(values).eq('id', id).select().single()
    if (error || !data) { setNotice('Opslaan lukte niet. Probeer het opnieuw.'); return false }
    setSubjects(list => list.map(s => (s.id === id ? data : s)))
    return true
  }

  function openGoal(s: Subject) {
    setMenuId(null)
    setPanel({ id: s.id, kind: 'goal' })
    setGoalForm({ minutes: s.goal_minutes ? String(s.goal_minutes) : '', date: s.goal_date ?? '', recurringType: s.recurring_type ?? '', recurringMinutes: s.recurring_goal_minutes ? String(s.recurring_goal_minutes) : '' })
  }

  function openTerms(s: Subject) {
    setMenuId(null)
    setPanel({ id: s.id, kind: 'terms' })
    setTermForm({ year: s.school_year ?? now.year, terms: s.terms ?? [] })
  }

  async function confirmDelete() {
    if (!deleting) return
    const { error } = await supabase.from('subjects').delete().eq('id', deleting.id)
    if (error) { setNotice('Verwijderen lukte niet.'); return }
    setSubjects(list => list.filter(s => s.id !== deleting.id))
    setDeleting(null)
  }

  const chip = (active: boolean) => `text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5'}`
  const segment = (active: boolean) => `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${active ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`
  const menuItem = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5'

  function TermChips({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
    return (
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hoort bij">
        <button type="button" onClick={() => onChange([])} aria-pressed={value.length === 0} className={chip(value.length === 0)}>Heel jaar</button>
        {Array.from({ length: MAX_TERMS }, (_, i) => i + 1).map(t => (
          <button key={t} type="button" aria-pressed={value.includes(t)} className={chip(value.includes(t))}
            onClick={() => onChange(value.includes(t) ? value.filter(x => x !== t) : [...value, t].sort())}>Trimester {t}</button>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn={!!user || undefined} width="max-w-4xl" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 dark:text-white">Vakken</h1>
            <PageInfo text="Beheer je vakken per schooljaar en trimester. Een vak kan het hele jaar lopen of bij één of meer trimesters horen. Stel per vak een doel in." />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {termsSupported ? `Je zit nu in trimester ${now.term} van ${now.year}.` : `Schooljaar ${now.year}.`}
          </p>
        </header>

        {!user && (
          <div className="bg-white border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Je bekijkt Knowl als gast</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">Log in om vakken aan te maken. <Link href="/login?signup=true" className="font-medium text-indigo-700 underline">Maak een gratis account aan</Link></p>
          </div>
        )}

        {user && !termsSupported && (
          <p className="text-sm text-slate-700 dark:text-slate-200 bg-white border border-indigo-100 rounded-xl px-4 py-3">Trimesters zijn nog niet ingeschakeld in de database. Je vakken werken gewoon per schooljaar.</p>
        )}

        {user && (
          <form onSubmit={addSubject} className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center"><BookOpen className="w-4 h-4 text-white" strokeWidth={2} /></span>
              <div>
                <h2 className="text-base font-semibold text-white">Nieuw vak</h2>
                <p className="text-sm text-white/85">Voor het hele jaar of voor één of meer trimesters</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                <input value={name} onChange={e => setName(e.target.value)} placeholder="bijv. Bedrijfseconomie" aria-label="Naam van het vak" maxLength={80}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <KnowlSelect value={newYear} onChange={setNewYear} label="Schooljaar" options={yearChoices} />
              </div>
              {termsSupported && (
                <div>
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Hoort bij</span>
                  <TermChips value={newTerms} onChange={setNewTerms} />
                </div>
              )}
              {notice && <p className="text-sm text-red-700 dark:text-red-300">{notice}</p>}
              <div className="flex justify-end">
                <button disabled={adding || !name.trim()} className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  <Plus className="w-4 h-4" strokeWidth={2.5} /> {adding ? 'Toevoegen…' : 'Vak toevoegen'}
                </button>
              </div>
            </div>
          </form>
        )}

        <section aria-label="Je vakken" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <KnowlSelect value={viewYear} onChange={setViewYear} label="Toon schooljaar" size="sm" className="sm:w-44" options={years.map(y => ({ value: y, label: y }))} />
            <div className="flex bg-indigo-50 rounded-xl p-1 self-start overflow-x-auto max-w-full" role="group" aria-label="Toon trimester">
              {termsSupported && startedTerms.map(t => (
                <button key={t.term} onClick={() => setViewTerm(t.term)} aria-pressed={viewTerm === t.term} className={segment(viewTerm === t.term)}>
                  Trimester {t.term}{viewYear === now.year && t.term === now.term ? ' (nu)' : ''}
                </button>
              ))}
              <button onClick={() => setViewTerm(WHOLE_YEAR)} aria-pressed={viewTerm === WHOLE_YEAR} className={segment(viewTerm === WHOLE_YEAR)}>Alle vakken</button>
            </div>
            {subjects.length > 6 && (
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek een vak" aria-label="Zoek een vak"
                className="sm:ml-auto border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            )}
          </div>

          {visible.length === 0 ? (
            <div className="bg-white border border-dashed border-indigo-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-800 dark:text-slate-100">{subjects.length === 0 ? 'Je hebt nog geen vakken. Voeg hierboven je eerste vak toe.' : 'Geen vakken in deze selectie.'}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {visible.map(s => {
                const color = colors[s.name] ?? NO_SUBJECT_COLOR
                const st = stats[s.name] ?? { count: 0, minutes: 0 }
                const progress = s.goal_minutes ? Math.min(100, Math.round((st.minutes / s.goal_minutes) * 100)) : null
                const daysLeft = s.goal_date ? Math.round((new Date(`${s.goal_date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000) : null
                const periodDone = periodMinutes(s)
                const recurringPct = s.recurring_goal_minutes ? Math.min(100, Math.round((periodDone / s.recurring_goal_minutes) * 100)) : null
                const active = s.is_active !== false
                return (
                  <li key={s.id} className={`relative bg-white rounded-xl border hover:shadow-sm transition-shadow ${menuId === s.id ? 'z-20' : ''}`}
                    style={{ backgroundImage: `linear-gradient(${color}10, ${color}10)`, borderColor: `${color}33` }}>
                    <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} aria-hidden />
                    <div className="pl-4 pr-2 py-3 flex items-start gap-3">
                      <Link href={`/vakken/${encodeURIComponent(s.name)}`} className={`min-w-0 flex-1 group ${active ? '' : 'opacity-60'}`}>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-700">{s.name}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          {termsSupported && <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">{termLabel(s)}</span>}
                          <span>{st.count} leermoment{st.count === 1 ? '' : 'en'}</span>
                          <span>· {formatMinutes(st.minutes)}</span>
                          {s.school_year && viewTerm === WHOLE_YEAR && <span>· {s.school_year}</span>}
                        </p>
                      </Link>
                      {user && (
                        <>
                          <button onClick={() => update(s.id, { is_active: !active })} role="switch" aria-checked={active} aria-label={`${s.name} ${active ? 'actief' : 'niet actief'}`}
                            className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-lg px-2 py-1.5 hover:bg-white/60 shrink-0">
                            <span className={`relative w-8 h-[18px] rounded-full transition-colors ${active ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${active ? 'left-4' : 'left-0.5'}`} />
                            </span>
                            <span className="hidden sm:inline">{active ? 'Actief' : 'Niet actief'}</span>
                          </button>
                          <div className="relative shrink-0" data-menu>
                            <button onClick={() => setMenuId(menuId === s.id ? null : s.id)} aria-label={`Acties voor ${s.name}`} aria-expanded={menuId === s.id}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white/60"><MoreHorizontal className="w-4 h-4" strokeWidth={2} /></button>
                            {menuId === s.id && (
                              <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-56 bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
                                <button role="menuitem" onClick={() => openGoal(s)} className={menuItem}><Target className="w-4 h-4" strokeWidth={2} /> Doel instellen</button>
                                <button role="menuitem" onClick={() => openTerms(s)} className={menuItem}><Pencil className="w-4 h-4" strokeWidth={2} /> Schooljaar en trimester</button>
                                <div className="my-1 border-t border-indigo-100" role="separator" />
                                <button role="menuitem" onClick={() => { setMenuId(null); setDeleting(s) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50"><Trash2 className="w-4 h-4" strokeWidth={2} /> Verwijderen</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {(progress !== null || recurringPct !== null) && panel?.id !== s.id && (
                      <div className="pl-4 pr-4 pb-3 space-y-2">
                        {progress !== null && (
                          <div>
                            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-200 mb-1">
                              <span>Doel: {formatMinutes(st.minutes)} van {formatMinutes(s.goal_minutes!)}</span>
                              <span className={daysLeft !== null && daysLeft >= 0 && daysLeft < 7 ? 'text-orange-800 dark:text-orange-300 font-medium' : ''}>
                                {daysLeft !== null ? (daysLeft > 0 ? `nog ${daysLeft} dagen · ` : daysLeft === 0 ? 'vandaag · ' : 'verlopen · ') : ''}{progress}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-white/80 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? '#059669' : color }} /></div>
                          </div>
                        )}
                        {recurringPct !== null && s.recurring_type && (
                          <div>
                            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-200 mb-1">
                              <span>{RECURRING[s.recurring_type]}: {formatMinutes(periodDone)} van {formatMinutes(s.recurring_goal_minutes!)}</span>
                              <span>{recurringPct}%</span>
                            </div>
                            <div className="h-1.5 bg-white/80 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full opacity-70" style={{ width: `${recurringPct}%`, backgroundColor: color }} /></div>
                          </div>
                        )}
                      </div>
                    )}

                    {panel?.id === s.id && panel.kind === 'goal' && (
                      <form className="mx-4 mb-4 p-4 bg-white rounded-xl border border-indigo-100 space-y-3"
                        onSubmit={async e => {
                          e.preventDefault()
                          const ok = await update(s.id, {
                            goal_minutes: goalForm.minutes ? parseInt(goalForm.minutes) : null,
                            goal_date: goalForm.date || null,
                            recurring_type: goalForm.recurringType || null,
                            recurring_goal_minutes: goalForm.recurringMinutes ? parseInt(goalForm.recurringMinutes) : null,
                          })
                          if (ok) setPanel(null)
                        }}>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Doel in minuten
                            <input type="number" min="1" value={goalForm.minutes} onChange={e => setGoalForm({ ...goalForm, minutes: e.target.value })} placeholder="bijv. 1200"
                              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal placeholder:text-slate-500" />
                          </label>
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Deadline
                            <input type="date" value={goalForm.date} onChange={e => setGoalForm({ ...goalForm, date: e.target.value })}
                              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal" />
                          </label>
                          <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Terugkerend doel
                            <KnowlSelect className="mt-1" size="sm" label="Terugkerend doel" value={goalForm.recurringType} onChange={v => setGoalForm({ ...goalForm, recurringType: v })}
                              options={[{ value: '', label: 'Geen' }, ...Object.entries(RECURRING).map(([k, v]) => ({ value: k, label: v }))]} />
                          </div>
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-200">Minuten per keer
                            <input type="number" min="1" value={goalForm.recurringMinutes} onChange={e => setGoalForm({ ...goalForm, recurringMinutes: e.target.value })} placeholder="bijv. 60"
                              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal placeholder:text-slate-500" />
                          </label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setPanel(null)} className="text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
                          <button className="text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700">Opslaan</button>
                        </div>
                      </form>
                    )}

                    {panel?.id === s.id && panel.kind === 'terms' && (
                      <form className="mx-4 mb-4 p-4 bg-white rounded-xl border border-indigo-100 space-y-3"
                        onSubmit={async e => {
                          e.preventDefault()
                          const values: Partial<Subject> = { school_year: termForm.year }
                          if (termsSupported) values.terms = termForm.terms.length ? termForm.terms : null
                          if (await update(s.id, values)) setPanel(null)
                        }}>
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-200">Schooljaar
                          <KnowlSelect className="mt-1 w-44" size="sm" label="Schooljaar" value={termForm.year} onChange={v => setTermForm({ ...termForm, year: v })} options={yearChoices} />
                        </div>
                        {termsSupported && (
                          <div>
                            <span className="block text-xs font-medium text-slate-700 dark:text-slate-200 mb-1.5">Hoort bij</span>
                            <TermChips value={termForm.terms} onChange={v => setTermForm({ ...termForm, terms: v })} />
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setPanel(null)} className="text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
                          <button className="text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700">Opslaan</button>
                        </div>
                      </form>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
        {user && termsSupported && (
          <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0"><CalendarRange className="w-5 h-5" strokeWidth={2} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-slate-900 dark:text-white">Trimester {now.term} · {now.year}</p>
              {startEdit !== null ? (
                <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={saveStart}>
                  <label className="text-sm text-slate-700 dark:text-slate-200" htmlFor="term-start">Trimester {now.term} begon op</label>
                  <input id="term-start" type="date" value={startEdit} min={previousStart ? addDays(previousStart, 1) : undefined} max={today}
                    onChange={e => setStartEdit(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <button className="text-sm font-semibold bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700">Opslaan</button>
                  <button type="button" onClick={() => { setStartEdit(null); setStartError('') }} className="text-sm text-slate-700 dark:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-indigo-50">Annuleren</button>
                  {startError && <p className="w-full text-sm text-red-700 dark:text-red-300">{startError}</p>}
                </form>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {currentStart ? `Gestart op ${formatDay(currentStart)}. ` : ''}
                  {now.term > 1 && currentStart && (
                    <button onClick={() => setStartEdit(currentStart)} className="font-medium text-indigo-700 dark:text-indigo-300 underline underline-offset-2 hover:text-indigo-900">Startdatum wijzigen</button>
                  )}
                  {now.term > 1 ? ' · ' : ''}Leermomenten vanaf de startdatum tellen mee voor dit trimester. Is het voorbij? Ga door naar het volgende.
                </p>
              )}
            </div>
            {now.term < MAX_TERMS ? (
              <button onClick={() => setSwitchOpen(true)} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2.5 hover:bg-indigo-700 shrink-0">
                Naar trimester {now.term + 1} <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
            ) : (
              <span className="text-sm text-slate-600 dark:text-slate-300 shrink-0">Laatste trimester van dit jaar</span>
            )}
          </section>
        )}
      </main>

      {deleting && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 id="del-title" className="text-base font-semibold text-slate-900 dark:text-white">Vak verwijderen?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">&lsquo;{deleting.name}&rsquo; wordt verwijderd. Je leermomenten blijven bewaard, maar staan daarna zonder dit vak.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeleting(null)} autoFocus className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
              <button onClick={confirmDelete} className="text-sm font-semibold bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700">Verwijderen</button>
            </div>
          </div>
        </div>
      )}

      {switchOpen && user && (
        <TermSwitch
          year={now.year}
          next={now.term + 1}
          minDate={currentStart ? addDays(currentStart, 1) : today}
          today={today}
          subjects={subjects.filter(s => subjectInTerm(s, now.year, now.term) && s.is_active !== false)}
          colors={colors}
          userId={user.id}
          onClose={() => setSwitchOpen(false)}
          onDone={(term, updated, created) => {
            setTerms(list => [...list.filter(t => !(t.school_year === term.school_year && t.term === term.term)), term])
            setSubjects(list => [...list.map(s => updated.find(u => u.id === s.id) ?? s), ...created].sort((a, b) => a.name.localeCompare(b.name)))
            setViewYear(term.school_year)
            setViewTerm(term.term)
            setSwitchOpen(false)
          }}
        />
      )}
    </div>
  )
}

function TermSwitch({ year, next, minDate, today, subjects, colors, userId, onClose, onDone }: {
  year: string; next: number; minDate: string; today: string; subjects: Subject[]; colors: Record<string, string>; userId: string
  onClose: () => void; onDone: (term: SchoolTerm, updated: Subject[], created: Subject[]) => void
}) {
  const supabase = useMemo(() => createClient(), [])
  const termSubjects = subjects.filter(s => s.terms && s.terms.length > 0)
  const yearSubjects = subjects.filter(s => !s.terms || s.terms.length === 0)
  const [startsOn, setStartsOn] = useState(today < minDate ? minDate : today)
  const [carry, setCarry] = useState<Set<string>>(new Set(termSubjects.map(s => s.id)))
  const [newName, setNewName] = useState('')
  const [newOnes, setNewOnes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function start() {
    setBusy(true)
    setError('')
    const term = { school_year: year, term: next, starts_on: startsOn }
    const { error: termError } = await supabase.from('school_terms').upsert({ ...term, user_id: userId }, { onConflict: 'user_id,school_year,term' })
    if (termError) { setBusy(false); setError('Het nieuwe trimester kon niet worden opgeslagen. Probeer het opnieuw.'); return }
    const updated: Subject[] = []
    for (const s of termSubjects.filter(s => carry.has(s.id))) {
      const { data } = await supabase.from('subjects').update({ terms: Array.from(new Set([...(s.terms ?? []), next])).sort() }).eq('id', s.id).select().single()
      if (data) updated.push(data)
    }
    const created: Subject[] = []
    for (const n of newOnes) {
      const { data } = await supabase.from('subjects').insert({ id: crypto.randomUUID(), name: n, user_id: userId, school_year: year, terms: [next] }).select().single()
      if (data) created.push(data)
    }
    setBusy(false)
    onDone(term, updated, created)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="switch-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-start gap-3">
          <div className="flex-1">
            <h2 id="switch-title" className="text-base font-semibold text-white">Naar trimester {next}</h2>
            <p className="text-sm text-white/85">Kies welke vakken meegaan en voeg nieuwe vakken toe.</p>
          </div>
          <button onClick={onClose} aria-label="Sluiten" className="p-1.5 rounded-lg text-white/90 hover:bg-white/10"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">Trimester {next} begint op
            <input type="date" value={startsOn} min={minDate} onChange={e => setStartsOn(e.target.value || startsOn)}
              className="mt-1 block border border-gray-200 rounded-lg px-3 py-2 text-sm font-normal" />
          </label>

          {termSubjects.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">Trimestervakken die meegaan</p>
              <ul className="space-y-1.5">
                {termSubjects.map(s => (
                  <li key={s.id}>
                    <label className="flex items-center gap-3 rounded-xl border border-indigo-100 px-3 py-2 cursor-pointer hover:bg-indigo-50">
                      <input type="checkbox" checked={carry.has(s.id)} className="w-4 h-4 accent-indigo-600"
                        onChange={() => setCarry(c => { const n = new Set(c); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n })} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[s.name] ?? NO_SUBJECT_COLOR }} aria-hidden />
                      <span className="text-sm text-slate-900 dark:text-white">{s.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {yearSubjects.length > 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <Check className="inline w-4 h-4 -mt-0.5 mr-1 text-emerald-700" strokeWidth={2.5} />
              Jaarvakken lopen vanzelf door: {yearSubjects.map(s => s.name).join(', ')}.
            </p>
          )}

          <div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">Nieuwe vakken voor trimester {next}</p>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const n = newName.trim(); if (n && !newOnes.includes(n)) setNewOnes([...newOnes, n]); setNewName('') }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Naam van het vak" aria-label="Nieuw vak"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-xl px-3 hover:bg-indigo-50">Toevoegen</button>
            </form>
            {newOnes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {newOnes.map(n => (
                  <span key={n} className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 dark:text-slate-100 bg-indigo-50 rounded-full pl-2.5 pr-1 py-1">
                    {n}<button onClick={() => setNewOnes(newOnes.filter(x => x !== n))} aria-label={`${n} weghalen`} className="p-0.5 rounded-full hover:bg-indigo-100"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
            <button onClick={start} disabled={busy} className="text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 disabled:opacity-60">
              {busy ? 'Bezig…' : `Start trimester ${next}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
