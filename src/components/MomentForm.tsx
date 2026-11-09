'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Camera, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import SubjectSelect from '@/components/SubjectSelect'
import { addDays, formatDay, localDateStr } from '@/lib/studyStats'
import type { LearningMoment } from '@/lib/moments'

export const POMODORO_UNLOGGED_KEY = 'knowl_pomodoro_unlogged'
const POMODORO_MAX_AGE_MS = 12 * 60 * 60 * 1000
const DRAFT_KEY = 'knowl_lm_draft'
const MINUTE_CHOICES = [15, 25, 45, 60, 90]

export type MomentPrefill = { nonce: number; title?: string; description?: string | null; category?: string | null; minutes?: number | null }
export type SavedInfo = { startedStreak: boolean }

const MOMENT_COLUMNS = 'id, title, description, category, learned_at, duration_minutes, photo_url, is_public, share_token, notes'

function readPomodoroMinutes() {
  try {
    const raw = localStorage.getItem(POMODORO_UNLOGGED_KEY)
    if (!raw) return null
    const { minutes, at } = JSON.parse(raw) as { minutes: number; at: number }
    return minutes > 0 && Date.now() - at < POMODORO_MAX_AGE_MS ? minutes : null
  } catch { return null }
}

/**
 * Het ene formulier voor een nieuw leermoment: altijd open op Leermomenten,
 * als venster op Home en na een pomodoro-sessie.
 */
export default function MomentForm({ userId, subjects, colors, variant, prefill, initialMinutes, minutesFromPomodoro = false, onSaved, onClose, useDraft = false }: {
  userId: string
  subjects: string[]
  colors: Record<string, string>
  variant: 'inline' | 'modal'
  prefill?: MomentPrefill | null
  initialMinutes?: number | null
  minutesFromPomodoro?: boolean
  onSaved: (moment: LearningMoment, info: SavedInfo) => void
  onClose?: () => void
  useDraft?: boolean
}) {
  const reduced = useReducedMotion()
  const today = localDateStr(new Date())
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [minutes, setMinutes] = useState(initialMinutes ? String(initialMinutes) : '')
  const [fromPomodoro, setFromPomodoro] = useState(minutesFromPomodoro && !!initialMinutes)
  const [date, setDate] = useState(today)
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const savingRef = useRef(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent))
    if (!useDraft) return
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null')
      if (draft) {
        if (draft.title) setTitle(draft.title)
        if (draft.description) setDescription(draft.description)
        if (draft.category) setCategory(draft.category)
        if (draft.duration) setMinutes(draft.duration)
      }
    } catch {}
  }, [useDraft])

  useEffect(() => {
    if (!useDraft || (!title && !description && !category && !minutes)) return
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, category, duration: minutes })) } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [useDraft, title, description, category, minutes])

  useEffect(() => {
    if (initialMinutes) return
    const pomodoro = readPomodoroMinutes()
    if (pomodoro) { setMinutes(String(pomodoro)); setFromPomodoro(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!prefill) return
    setTitle(prefill.title ?? '')
    setDescription(prefill.description ?? '')
    setCategory(prefill.category ?? '')
    setMinutes(prefill.minutes ? String(prefill.minutes) : '')
    setDate(today)
    setTimeout(() => titleRef.current?.focus(), 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill?.nonce])

  useEffect(() => {
    if (variant === 'modal') setTimeout(() => titleRef.current?.focus(), 30)
  }, [variant])

  function reset() {
    setTitle(''); setDescription(''); setCategory(''); setMinutes(''); setDate(today); setPhoto(null); setFromPomodoro(false); setError('')
    if (useDraft) try { localStorage.removeItem(DRAFT_KEY) } catch {}
  }

  function close() {
    onClose?.()
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault()
    if (savingRef.current || !title.trim()) return
    savingRef.current = true
    setSaving(true)
    setError('')
    const supabase = createClient()

    let photo_url: string | null = null
    if (photo) {
      const path = `${userId}/${crypto.randomUUID()}.${photo.name.split('.').pop()}`
      const up = await supabase.storage.from('moment-photos').upload(path, photo)
      if (up.error) {
        setError('De foto kon niet worden geüpload. Probeer het opnieuw of sla op zonder foto.')
        setSaving(false); savingRef.current = false
        return
      }
      photo_url = supabase.storage.from('moment-photos').getPublicUrl(path).data.publicUrl
    }

    const m = parseInt(minutes)
    const { data, error } = await supabase
      .from('learning_moments')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        learned_at: date,
        duration_minutes: Number.isFinite(m) && m > 0 ? m : null,
        photo_url,
      })
      .select(MOMENT_COLUMNS)
      .single()

    if (error || !data) {
      setError('Opslaan lukte niet. Controleer je verbinding en probeer het opnieuw.')
      setSaving(false); savingRef.current = false
      return
    }

    let startedStreak = false
    if (date === today) {
      const { count } = await supabase.from('learning_moments').select('id', { count: 'exact', head: true }).eq('learned_at', today)
      startedStreak = count === 1
    }
    if (fromPomodoro) try { localStorage.removeItem(POMODORO_UNLOGGED_KEY) } catch {}

    reset()
    setSaving(false); savingRef.current = false
    onSaved(data as LearningMoment, { startedStreak })
    close()
  }

  const chip = (active: boolean) =>
    `text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5'}`
  const fieldLabel = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5'

  return (
      <motion.form
        ref={formRef}
        onSubmit={save}
        onKeyDown={e => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); save() }
          if (e.key === 'Escape' && !saving) close()
        }}
        initial={variant === 'modal' ? { opacity: 0, y: 8 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
        className="bg-white border border-indigo-100 rounded-2xl shadow-sm"
        aria-label="Nieuw leermoment"
      >
        <div className="p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Nieuw leermoment</h2>
            {onClose && <button type="button" onClick={close} aria-label="Sluiten" className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"><X className="w-4 h-4" /></button>}
          </div>

          <div>
            <label htmlFor="lm-title" className={fieldLabel}>Titel</label>
            <input
              id="lm-title" ref={titleRef} value={title} onChange={e => setTitle(e.target.value)} required maxLength={200}
              placeholder="bijv. Begrip van de omkering van bewijslast"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)]">
            <div>
              <span className={fieldLabel}>Vak</span>
              <SubjectSelect value={category} onChange={setCategory} options={subjects.map(n => ({ value: n, label: n }))} colors={colors} emptyLabel="Geen vak" label="Vak" />
            </div>
            <div>
              <label htmlFor="lm-minutes" className={fieldLabel}>Minuten</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {MINUTE_CHOICES.map(n => (
                  <button key={n} type="button" onClick={() => { setMinutes(String(n)); setFromPomodoro(false) }} aria-pressed={minutes === String(n)} className={chip(minutes === String(n))}>{n}</button>
                ))}
                <input id="lm-minutes" type="number" min="1" value={minutes} onChange={e => { setMinutes(e.target.value); setFromPomodoro(false) }} placeholder="min"
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              {fromPomodoro && <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1.5">Ingevuld vanuit je pomodoro-sessies. Je kunt het aanpassen.</p>}
            </div>
            <div>
              <label htmlFor="lm-date" className={fieldLabel}>Datum</label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setDate(today)} aria-pressed={date === today} className={chip(date === today)}>Vandaag</button>
                <button type="button" onClick={() => setDate(addDays(today, -1))} aria-pressed={date === addDays(today, -1)} className={chip(date === addDays(today, -1))}>Gisteren</button>
                <input id="lm-date" type="date" value={date} max={today} onChange={e => setDate(e.target.value || today)} aria-label={`Datum, nu ${formatDay(date)}`}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="lm-summary" className={fieldLabel}>Samenvatting</label>
            <textarea
              id="lm-summary" value={description} onChange={e => setDescription(e.target.value)} rows={4}
              placeholder="Leg in 2–3 zinnen uit wat je nu snapt, alsof je het aan een medestudent vertelt."
              className="w-full border border-indigo-200 bg-indigo-50/40 dark:bg-white/5 rounded-xl px-3.5 py-3 text-sm leading-relaxed resize-y placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Wat je hier schrijft, komt later terug bij &lsquo;Weet je dit nog?&rsquo;.</p>
          </div>

          {error && <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer rounded-lg px-2 py-1.5 -ml-2 hover:bg-indigo-50 dark:hover:bg-white/5" title="Foto toevoegen">
              <Camera className="w-4 h-4" strokeWidth={2} />
              <span className="max-w-[160px] truncate">{photo ? photo.name : 'Foto'}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold pl-5 pr-3 py-2.5 rounded-xl shadow-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 active:scale-[0.98] transition"
            >
              {saving ? 'Opslaan…' : 'Opslaan'}
              <kbd className="text-[11px] font-medium bg-white/20 rounded px-1.5 py-0.5">{isMac ? '⌘↵' : 'Ctrl ↵'}</kbd>
            </button>
          </div>
        </div>
      </motion.form>
  )
}
