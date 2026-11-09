'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Copy, Download, Link2, MoreHorizontal, Pencil, Search, Star, Trash2, X } from 'lucide-react'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import Glyph from '@/components/Glyph'
import SubjectSelect from '@/components/SubjectSelect'
import MomentForm, { type MomentPrefill, type SavedInfo } from '@/components/MomentForm'
import { createClient } from '@/lib/supabase/client'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import { formatDay, formatMinutes, groupLabel, localDateStr, schoolYearOf, schoolYearRange } from '@/lib/studyStats'
import {
  NO_SUBJECT, OTHER_YEAR, fetchAllMoments, fetchMomentsPage, type LearningMoment, type MomentFilters,
} from '@/lib/moments'

type Subject = { id: string; name: string; school_year: string | null; is_active: boolean }
type StatRow = { id: string; category: string | null; duration_minutes: number | null; learned_at: string }

type Props = {
  user: User
  subjects: Subject[]
  statRows: StatRow[]
  initialPage: { moments: LearningMoment[]; total: number; failed: boolean }
  initialSearch: string
  initialMinutes: number | null
  spacedMoment: LearningMoment | null
}

const RATINGS_KEY = 'knowl_ratings'

function getRatings(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}') } catch { return {} }
}
function saveRating(id: string, stars: number) {
  const r = getRatings()
  r[id] = stars
  try { localStorage.setItem(RATINGS_KEY, JSON.stringify(r)) } catch {}
}

function csvCell(v: string | number | null | undefined) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

function downloadCsv(moments: LearningMoment[], ratings: Record<string, number>) {
  const header = ['Datum', 'Titel', 'Vak', 'Minuten', 'Beoordeling (1-5)', 'Samenvatting', 'Notities']
  const rows = moments.map(m => [m.learned_at, m.title, m.category, m.duration_minutes, ratings[m.id], m.description, m.notes].map(csvCell))
  const csv = [header.map(csvCell), ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `knowl-leermomenten-${localDateStr(new Date())}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function matches(m: LearningMoment, f: MomentFilters) {
  const term = f.search.trim().toLowerCase()
  if (term && ![m.title, m.description, m.category].some(v => (v ?? '').toLowerCase().includes(term))) return false
  if (f.subject === NO_SUBJECT ? m.category : f.subject && m.category !== f.subject) return false
  if (f.year === OTHER_YEAR) return !m.learned_at
  if (f.year) {
    const [from, to] = schoolYearRange(f.year)
    if (m.learned_at < from || m.learned_at > to) return false
  }
  return true
}

function SubjectPill({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 rounded-full px-2 py-0.5 border max-w-[160px]"
      style={{ backgroundColor: `${color}14`, borderColor: `${color}40` }} title={name}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
      <span className="truncate">{name}</span>
    </span>
  )
}

export default function Dashboard({ user, subjects, statRows: initialStats, initialPage, initialSearch, initialMinutes, spacedMoment }: Props) {
  const reduced = useReducedMotion()
  const supabase = useMemo(() => createClient(), [])
  const today = localDateStr(new Date())

  const [stats, setStats] = useState(initialStats)
  const [moments, setMoments] = useState(initialPage.moments)
  const [total, setTotal] = useState(initialPage.total)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(initialPage.failed)
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [filters, setFilters] = useState<MomentFilters>({ search: initialSearch, subject: '', year: '' })
  const firstLoad = useRef(true)
  const requestId = useRef(0)

  const [prefill, setPrefill] = useState<MomentPrefill | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [filterMenu, setFilterMenu] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<LearningMoment>>({})
  const [editError, setEditError] = useState('')
  const [deleting, setDeleting] = useState<LearningMoment | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ text: string; streak?: boolean; rateId?: string; rated?: boolean } | null>(null)
  const [exporting, setExporting] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [showSpaced, setShowSpaced] = useState(false)
  const spacedKey = spacedMoment ? `knowl_spaced_dismissed_${spacedMoment.id}` : null

  useEffect(() => { setRatings(getRatings()) }, [])
  useEffect(() => {
    if (!spacedKey) return
    try { if (!localStorage.getItem(spacedKey)) setShowSpaced(true) } catch {}
  }, [spacedKey])

  useEffect(() => {
    const t = setTimeout(() => setFilters(f => (f.search === searchInput ? f : { ...f, search: searchInput })), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!menuId && !filterMenu) return
    function onDown(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest('[data-menu]')) { setMenuId(null); setFilterMenu(false) }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId, filterMenu])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.rateId && !toast.rated ? 9000 : 3500)
    return () => clearTimeout(t)
  }, [toast])

  const load = useCallback(async (f: MomentFilters) => {
    const id = ++requestId.current
    setLoading(true)
    setLoadError(false)
    const res = await fetchMomentsPage(supabase, f, 0)
    if (id !== requestId.current) return
    setLoading(false)
    if (res.error) { setLoadError(true); return }
    setMoments(res.moments)
    setTotal(res.total)
  }, [supabase])

  useEffect(() => {
    if (firstLoad.current) { firstLoad.current = false; return }
    load(filters)
  }, [filters, load])

  async function loadMore() {
    setLoadingMore(true)
    const res = await fetchMomentsPage(supabase, filters, moments.length)
    setLoadingMore(false)
    if (res.error) { setToast({ text: 'Meer leermomenten laden lukte niet. Probeer het opnieuw.' }); return }
    setMoments(list => [...list, ...res.moments.filter(m => !list.some(x => x.id === m.id))])
    setTotal(res.total)
  }

  const colors = useMemo(() => buildSubjectColors([
    ...subjects.map(s => s.name),
    ...stats.map(s => s.category).filter((c): c is string => !!c),
  ]), [subjects, stats])
  const activeSubjects = useMemo(() => subjects.filter(s => s.is_active !== false).map(s => s.name), [subjects])
  const subjectOptions = useMemo(() => {
    const names = Array.from(new Set([...subjects.map(s => s.name), ...stats.map(s => s.category).filter((c): c is string => !!c)]))
      .sort((a, b) => a.localeCompare(b))
    const opts = names.map(n => ({ value: n, label: n }))
    if (stats.some(s => !s.category)) opts.push({ value: NO_SUBJECT, label: 'Zonder vak', color: NO_SUBJECT_COLOR } as { value: string; label: string; color?: string })
    return opts
  }, [subjects, stats])
  const yearOptions = useMemo(() => {
    const years = Array.from(new Set(stats.map(s => schoolYearOf(s.learned_at ?? '')).filter((y): y is string => !!y))).sort((a, b) => b.localeCompare(a))
    return { years, hasOther: stats.some(s => !schoolYearOf(s.learned_at ?? '')) }
  }, [stats])

  const totalMinutes = stats.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const filtersActive = !!(filters.search.trim() || filters.subject || filters.year)

  function onSaved(m: LearningMoment, info: SavedInfo) {
    setStats(s => [{ id: m.id, category: m.category, duration_minutes: m.duration_minutes, learned_at: m.learned_at }, ...s])
    if (matches(m, filters)) {
      setMoments(list => [m, ...list].sort((a, b) => b.learned_at.localeCompare(a.learned_at)))
      setTotal(t => t + 1)
      setNewIds(ids => new Set(ids).add(m.id))
    }
    setToast({ text: info.startedStreak ? 'Streak gestart' : 'Leermoment opgeslagen', streak: info.startedStreak, rateId: m.id })
  }

  function rate(id: string, stars: number) {
    saveRating(id, stars)
    setRatings(getRatings())
    setToast(t => (t ? { ...t, rated: true } : t))
  }

  function startEdit(m: LearningMoment) {
    setMenuId(null)
    setExpandedId(m.id)
    setEditingId(m.id)
    setEditError('')
    setEditData({ title: m.title, description: m.description ?? '', category: m.category ?? '', learned_at: m.learned_at, duration_minutes: m.duration_minutes, notes: m.notes ?? '' })
  }

  async function saveEdit(id: string) {
    if (!editData.title?.trim()) return
    const { data, error } = await supabase
      .from('learning_moments')
      .update({
        title: editData.title.trim(),
        description: editData.description || null,
        category: editData.category || null,
        learned_at: editData.learned_at,
        duration_minutes: editData.duration_minutes || null,
        notes: editData.notes || null,
      })
      .eq('id', id)
      .select()
      .single()
    if (error || !data) { setEditError('Opslaan lukte niet. Probeer het opnieuw.'); return }
    setMoments(list => list.map(m => (m.id === id ? data : m)))
    setStats(s => s.map(r => (r.id === id ? { id, category: data.category, duration_minutes: data.duration_minutes, learned_at: data.learned_at } : r)))
    setEditingId(null)
    setToast({ text: 'Wijzigingen opgeslagen' })
  }

  function duplicate(m: LearningMoment) {
    setMenuId(null)
    setPrefill({ nonce: Date.now(), title: m.title, description: m.description, category: m.category, minutes: m.duration_minutes })
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }

  async function share(m: LearningMoment, stop = false) {
    setMenuId(null)
    const isPublic = stop ? false : true
    let current = m
    if (m.is_public !== isPublic) {
      const { data, error } = await supabase.from('learning_moments').update({ is_public: isPublic }).eq('id', m.id).select().single()
      if (error || !data) { setToast({ text: 'Delen lukte niet. Probeer het opnieuw.' }); return }
      current = data
      setMoments(list => list.map(x => (x.id === m.id ? data : x)))
    }
    if (stop) { setToast({ text: 'Dit leermoment wordt niet meer gedeeld' }); return }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/deel/${current.share_token}`)
      setToast({ text: 'Deellink gekopieerd' })
    } catch {
      setToast({ text: `Deellink: ${window.location.origin}/deel/${current.share_token}` })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    const { error } = await supabase.from('learning_moments').delete().eq('id', deleting.id)
    setDeleteBusy(false)
    if (error) { setToast({ text: 'Verwijderen lukte niet. Probeer het opnieuw.' }); return }
    setMoments(list => list.filter(m => m.id !== deleting.id))
    setStats(s => s.filter(r => r.id !== deleting.id))
    setTotal(t => Math.max(0, t - 1))
    setDeleting(null)
    setToast({ text: 'Leermoment verwijderd' })
  }

  async function exportCsv() {
    setFilterMenu(false)
    setExporting(true)
    const { moments: all, error } = await fetchAllMoments(supabase, filters)
    setExporting(false)
    if (error) { setToast({ text: 'Downloaden lukte niet. Probeer het opnieuw.' }); return }
    downloadCsv(all, getRatings())
  }

  const menuItem = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5'

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-4xl" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 dark:text-white">Leermomenten</h1>
            <PageInfo text="Hier log je wat je hebt geleerd en vind je alles terug. Zoek, filter op vak of schooljaar en download je leermomenten als CSV." />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {stats.length} leermoment{stats.length === 1 ? '' : 'en'} · {formatMinutes(totalMinutes)} in totaal
          </p>
        </header>

        {showSpaced && spacedMoment && (
          <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Glyph name="bulb" className="w-5 h-5 text-amber-700 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Weet je het nog? Je leerde dit op {formatDay(spacedMoment.learned_at)}</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{spacedMoment.title}</p>
              {spacedMoment.description && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{spacedMoment.description}</p>}
            </div>
            <button onClick={() => { setShowSpaced(false); if (spacedKey) try { localStorage.setItem(spacedKey, '1') } catch {} }}
              aria-label="Verbergen" className="text-slate-500 hover:text-slate-800 p-1"><X className="w-4 h-4" /></button>
          </div>
        )}

        <MomentForm
          userId={user.id}
          subjects={activeSubjects}
          colors={colors}
          variant="inline"
          prefill={prefill}
          initialMinutes={initialMinutes}
          onSaved={onSaved}
          useDraft
        />

        <section aria-label="Filters" className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto sm:flex-[2] min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={2} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Zoek in titels en samenvattingen"
              aria-label="Zoek in leermomenten"
              className="w-full border border-gray-200 bg-white rounded-xl pl-9 pr-8 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} aria-label="Zoekterm wissen" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
          <SubjectSelect
            className="flex-1 min-w-[140px]"
            value={filters.subject}
            onChange={v => setFilters(f => ({ ...f, subject: v }))}
            options={subjectOptions}
            colors={colors}
            emptyLabel="Alle vakken"
            label="Filter op vak"
          />
          <select
            value={filters.year}
            onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
            aria-label="Filter op schooljaar"
            className="flex-1 min-w-[140px] border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Alle schooljaren</option>
            {yearOptions.years.map(y => <option key={y} value={y}>{y}</option>)}
            {yearOptions.hasOther && <option value={OTHER_YEAR}>Overig</option>}
          </select>
          <div className="relative" data-menu>
            <button onClick={() => setFilterMenu(o => !o)} aria-label="Meer opties" aria-expanded={filterMenu}
              className="w-10 h-10 flex items-center justify-center border border-gray-200 bg-white rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50">
              <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
            </button>
            {filterMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 w-64 bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
                <button onClick={exportCsv} disabled={exporting} className={menuItem}>
                  <Download className="w-4 h-4" strokeWidth={2} />
                  {exporting ? 'Bezig met downloaden…' : filtersActive ? 'Gefilterde lijst downloaden (CSV)' : 'Downloaden als CSV'}
                </button>
              </div>
            )}
          </div>
        </section>

        {filtersActive && !loading && !loadError && (
          <p className="text-xs text-slate-600 dark:text-slate-300 -mt-2">
            {total} van {stats.length} leermomenten
            <button onClick={() => { setSearchInput(''); setFilters({ search: '', subject: '', year: '' }) }} className="ml-2 font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300">Filters wissen</button>
          </p>
        )}

        <section aria-label="Alle leermomenten" aria-busy={loading}>
          {loadError ? (
            <div className="bg-white border border-red-100 rounded-2xl p-6 text-center">
              <p className="text-sm text-slate-800 dark:text-slate-100">De leermomenten konden niet worden geladen.</p>
              <button onClick={() => load(filters)} className="mt-3 text-sm font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300">Opnieuw proberen</button>
            </div>
          ) : loading && moments.length === 0 ? (
            <ul className="space-y-2" aria-label="Laden">
              {[0, 1, 2, 3].map(i => <li key={i} className="h-[72px] rounded-xl bg-white border border-indigo-100 animate-pulse" />)}
            </ul>
          ) : stats.length === 0 ? (
            <div className="bg-white border border-indigo-100 rounded-2xl p-10 text-center">
              <span className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Glyph name="pen" className="w-6 h-6" /></span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white mt-3">Je eerste leermoment wacht op je</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">Schrijf na het studeren op wat je deed. Het kost een halve minuut.</p>
              <button onClick={() => setPrefill({ nonce: Date.now() })} className="mt-4 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700">Leermoment toevoegen</button>
            </div>
          ) : moments.length === 0 ? (
            <div className="bg-white border border-dashed border-indigo-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-800 dark:text-slate-100">Geen leermomenten gevonden met deze filters.</p>
              <button onClick={() => { setSearchInput(''); setFilters({ search: '', subject: '', year: '' }) }} className="mt-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300">Filters wissen</button>
            </div>
          ) : (
            <ul className={`space-y-2 transition-opacity ${loading ? 'opacity-60' : ''}`}>
              {moments.map((m, i) => {
                const label = groupLabel(m.learned_at, today)
                const showHeader = i === 0 || groupLabel(moments[i - 1].learned_at, today) !== label
                const color = m.category ? colors[m.category] ?? NO_SUBJECT_COLOR : NO_SUBJECT_COLOR
                const open = expandedId === m.id
                const editing = editingId === m.id
                return (
                  <Fragment key={m.id}>
                    {showHeader && <li className="pt-3 first:pt-0 pb-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</li>}
                    <motion.li
                      initial={newIds.has(m.id) && !reduced ? { opacity: 0, y: -8 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="relative bg-white rounded-xl border border-indigo-100 hover:border-indigo-200 hover:shadow-sm transition-[border-color,box-shadow]"
                    >
                      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} aria-hidden />
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={() => { if (!editing) setExpandedId(open ? null : m.id) }}
                        onKeyDown={e => { if (!editing && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setExpandedId(open ? null : m.id) } }}
                        className="pl-4 pr-2 py-3 flex items-start gap-3 cursor-pointer rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {m.title}
                            {ratings[m.id] ? (
                              <span className="inline-flex ml-2 align-middle text-amber-500" aria-label={`${ratings[m.id]} van 5 sterren`}>
                                {Array.from({ length: ratings[m.id] }, (_, k) => <Star key={k} className="w-3 h-3 fill-current" strokeWidth={0} />)}
                              </span>
                            ) : null}
                          </p>
                          {!open && <p className="text-sm text-slate-600 dark:text-slate-300 truncate mt-0.5">{m.description || <span className="italic text-slate-500">Nog geen samenvatting</span>}</p>}
                          <p className="sm:hidden mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            {m.category && <SubjectPill name={m.category} color={color} />}
                            <span>{formatDay(m.learned_at)}</span>
                            {m.duration_minutes ? <span>· {formatMinutes(m.duration_minutes)}</span> : null}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-3 shrink-0 pt-0.5">
                          {m.category && <SubjectPill name={m.category} color={color} />}
                          <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums w-[72px] text-right">{m.duration_minutes ? formatMinutes(m.duration_minutes) : '—'}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 w-[68px] text-right">{formatDay(m.learned_at)}</span>
                        </div>
                        <div className="relative shrink-0" data-menu onClick={e => e.stopPropagation()}>
                          <button onClick={() => setMenuId(menuId === m.id ? null : m.id)} aria-label={`Acties voor ${m.title}`} aria-expanded={menuId === m.id}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-white/5">
                            <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                          </button>
                          {menuId === m.id && (
                            <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-52 bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
                              <button role="menuitem" onClick={() => startEdit(m)} className={menuItem}><Pencil className="w-4 h-4" strokeWidth={2} /> Wijzigen</button>
                              <button role="menuitem" onClick={() => duplicate(m)} className={menuItem}><Copy className="w-4 h-4" strokeWidth={2} /> Dupliceren</button>
                              <button role="menuitem" onClick={() => share(m)} className={menuItem}><Link2 className="w-4 h-4" strokeWidth={2} /> {m.is_public ? 'Deellink kopiëren' : 'Delen'}</button>
                              {m.is_public && <button role="menuitem" onClick={() => share(m, true)} className={menuItem}><X className="w-4 h-4" strokeWidth={2} /> Delen stoppen</button>}
                              <div className="my-1 border-t border-indigo-100" role="separator" />
                              <button role="menuitem" onClick={() => { setMenuId(null); setDeleting(m) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" strokeWidth={2} /> Verwijderen
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: reduced ? 0 : 0.2 }} className="overflow-hidden"
                          >
                            <div className="pl-4 pr-4 pb-4 space-y-3">
                              {editing ? (
                                <div className="space-y-3" onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveEdit(m.id) }}>
                                  <input value={editData.title ?? ''} onChange={e => setEditData({ ...editData, title: e.target.value })} aria-label="Titel"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                  <textarea value={editData.description ?? ''} onChange={e => setEditData({ ...editData, description: e.target.value })} rows={3} aria-label="Samenvatting"
                                    placeholder="Leg in 2–3 zinnen uit wat je nu snapt."
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-y placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <SubjectSelect value={editData.category ?? ''} onChange={v => setEditData({ ...editData, category: v })}
                                      options={Array.from(new Set([...activeSubjects, ...(m.category ? [m.category] : [])])).map(n => ({ value: n, label: n }))}
                                      colors={colors} emptyLabel="Geen vak" label="Vak" />
                                    <input type="number" min="1" value={editData.duration_minutes ?? ''} aria-label="Minuten" placeholder="Minuten"
                                      onChange={e => { const v = parseInt(e.target.value); setEditData({ ...editData, duration_minutes: v > 0 ? v : null }) }}
                                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <input type="date" value={editData.learned_at ?? ''} max={today} aria-label="Datum"
                                      onChange={e => setEditData({ ...editData, learned_at: e.target.value })}
                                      className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                  </div>
                                  <textarea value={editData.notes ?? ''} onChange={e => setEditData({ ...editData, notes: e.target.value })} rows={2} aria-label="Notities"
                                    placeholder="Extra notities"
                                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-y placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                  {editError && <p className="text-sm text-red-700">{editError}</p>}
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingId(null)} className="text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
                                    <button onClick={() => saveEdit(m.id)} disabled={!editData.title?.trim()} className="text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 disabled:opacity-50">Opslaan</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="hidden sm:block text-xs text-slate-600 dark:text-slate-300">{formatDay(m.learned_at)}{m.duration_minutes ? ` · ${formatMinutes(m.duration_minutes)}` : ''}{m.category ? ` · ${m.category}` : ''}</p>
                                  {m.description ? (
                                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">{m.description}</p>
                                  ) : (
                                    <p className="text-sm text-slate-500 italic">Nog geen samenvatting. <button onClick={() => startEdit(m)} className="not-italic font-medium text-indigo-700 dark:text-indigo-300">Voeg er een toe</button></p>
                                  )}
                                  {m.notes && <div className="text-sm text-slate-700 dark:text-slate-200 bg-indigo-50 rounded-xl p-3 whitespace-pre-wrap"><span className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Notities</span>{m.notes}</div>}
                                  {m.photo_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.photo_url} alt={`Foto bij ${m.title}`} className="w-full max-h-72 object-contain rounded-xl bg-slate-50" />
                                  )}
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  </Fragment>
                )
              })}
            </ul>
          )}

          {!loadError && moments.length > 0 && moments.length < total && (
            <div className="flex flex-col items-center gap-1 pt-4">
              <button onClick={loadMore} disabled={loadingMore}
                className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-white border border-indigo-200 rounded-xl px-5 py-2.5 hover:bg-indigo-50 disabled:opacity-60">
                {loadingMore ? 'Laden…' : 'Meer laden'}
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-400">{moments.length} van {total} getoond</span>
            </div>
          )}
        </section>
      </main>

      {deleting && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => !deleteBusy && setDeleting(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 id="delete-title" className="text-base font-semibold text-slate-900 dark:text-white">Leermoment verwijderen?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">&lsquo;{deleting.title}&rsquo; wordt definitief verwijderd. Dit kun je niet ongedaan maken.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeleting(null)} disabled={deleteBusy} autoFocus className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
              <button onClick={confirmDelete} disabled={deleteBusy} className="text-sm font-semibold bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700 disabled:opacity-60">
                {deleteBusy ? 'Verwijderen…' : 'Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pointer-events-none">
          <motion.div
            role="status"
            initial={{ opacity: 0, y: reduced ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 16 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl border border-indigo-100 shadow-xl p-3.5"
          >
            <div className="flex items-center gap-3">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${toast.streak ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-700'}`}>
                {toast.streak ? <Glyph name="flame" className="w-5 h-5" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
              </span>
              <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{toast.text}</p>
              <button onClick={() => setToast(null)} aria-label="Sluiten" className="text-slate-500 hover:text-slate-800 p-1"><X className="w-4 h-4" /></button>
            </div>
            {toast.rateId && (
              toast.rated ? (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 pl-11">Bedankt, je beoordeling is bewaard.</p>
              ) : (
                <div className="flex items-center gap-2 mt-2 pl-11">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Hoe goed begreep je het?</span>
                  <div className="flex" role="group" aria-label="Beoordeling">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => rate(toast.rateId!, s)} aria-label={`${s} van 5`} className="p-0.5 text-amber-500 hover:scale-110 transition-transform">
                        <Star className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
