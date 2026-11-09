'use client'

import Nav from '@/components/Nav'
import SchoolYearTabs from '@/components/SchoolYearTabs'
import OnboardingWizard from '@/components/OnboardingWizard'
import Glyph from '@/components/Glyph'
import MomentForm from '@/components/MomentForm'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarClock, Check, Eye, Flame, Info, Lightbulb, Plus, Shield,
  Target, Timer, TrendingDown, TrendingUp, X,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTheme } from '@/lib/ThemeContext'
import { UNKNOWN_YEAR, getYearTabs } from '@/lib/schoolYear'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import {
  DAYS_PER_SHIELD, MAX_SHIELDS, REVIEW_STEPS, addDays, computeStreak, formatMinutes, heatmapLevel, localDateStr,
  minutesByDay, reviewQueue, sumBetween, weekComparison, weekStart, weekdayIndex,
  type MomentReview, type ReviewResult,
} from '@/lib/studyStats'

type Moment = { id?: string; title?: string; description?: string | null; duration_minutes: number | null; learned_at: string; category?: string | null }
type Subject = { name: string; goal_minutes: number | null; goal_date: string | null; recurring_type: string | null; recurring_goal_minutes: number | null; school_year: string | null; is_active?: boolean | null }
type StudySession = { activity: string; duration_seconds: number; created_at: string }
type Exam = { id: string; date: string; title: string; subject: string | null }
type Slot = { id: string; day_of_week: number; start_time: string; end_time: string; label: string }

type Props = {
  user: User
  allMoments: Moment[]
  subjects: Subject[]
  displayName: string | null
  weeklyGoal: number | null
  weeklyGoalSupported: boolean
  reviews: MomentReview[]
  reviewsSupported: boolean
  studySessions: StudySession[]
  examEvents: Exam[]
  todaySlots: Slot[]
}

const INTRO_KEY = 'knowl_dash_intro'
const SNAPSHOT_KEY = 'knowl_dash_snapshot'
const CELEBRATED_KEY = 'knowl_goal_celebrated'

const card = 'bg-white rounded-2xl border border-indigo-100 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none'
const heading = 'text-sm font-semibold text-slate-900 dark:text-slate-100'
const muted = 'text-xs text-slate-500 dark:text-slate-400'
const linkText = 'text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200'

function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function longDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000)
}

function getFreeBlocks(slots: Slot[]) {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const toStr = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const sorted = [...slots].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const blocks: { start: string; end: string; minutes: number }[] = []
  let cur = 480
  for (const s of sorted) {
    const ss = toMin(s.start_time), se = toMin(s.end_time)
    if (ss > cur + 29) blocks.push({ start: toStr(cur), end: toStr(ss), minutes: ss - cur })
    cur = Math.max(cur, se)
  }
  if (1320 > cur + 29) blocks.push({ start: toStr(cur), end: toStr(1320), minutes: 1320 - cur })
  return blocks.filter(b => b.minutes >= 30)
}

function CountUp({ value, from = 0, run, format = (v: number) => String(Math.round(v)) }: { value: number; from?: number; run: boolean; format?: (v: number) => string }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (!run) { setShown(value); return }
    const controls = animate(from, value, { duration: 0.6, ease: 'easeOut', onUpdate: setShown })
    return () => controls.stop()
  }, [value, from, run])
  return <>{format(shown)}</>
}

function SubjectDot({ color }: { color: string }) {
  return <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
}

function ShieldInfo({ shields, onDark = false }: { shields: number; onDark?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label={`${shields} van ${MAX_SHIELDS} schilden, uitleg`}
        className={`inline-flex items-center gap-1 text-xs font-medium rounded-md px-1.5 py-0.5 ${onDark ? 'text-white/90 hover:bg-white/10' : 'text-slate-600 dark:text-slate-300 hover:bg-indigo-50'}`}
      >
        <Shield className="w-3.5 h-3.5" strokeWidth={2} />
        {shields}/{MAX_SHIELDS} schilden
        <Info className="w-3 h-3 opacity-70" strokeWidth={2} />
      </button>
      {open && (
        <span role="tooltip" className="absolute right-0 top-full mt-1.5 z-30 w-60 rounded-xl bg-slate-900 text-white text-xs leading-relaxed p-3 shadow-xl text-left font-normal">
          Een schild beschermt je streak als je een dag niet studeert. Je verdient er één na elke {DAYS_PER_SHIELD} dagen op rij, en je kunt er maximaal {MAX_SHIELDS} hebben. Mis je een dag zonder schild, dan begint je streak opnieuw.
        </span>
      )}
    </span>
  )
}

function Confetti({ colors }: { colors: string[] }) {
  const pieces = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.3
    const dist = 90 + (i % 5) * 28
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist * 0.7 - 40, rotate: (i * 47) % 360, color: colors[i % colors.length], w: i % 2 ? 6 : 8 }
  }), [colors])
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-sm"
          style={{ width: p.w, height: p.w * 1.6, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 90], opacity: [1, 1, 0], rotate: p.rotate, scale: 1 }}
          transition={{ duration: 1.4, ease: 'easeOut', times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  )
}

function GoalForm({ goal, supported, userId, onSaved, onClose }: { goal: number | null; supported: boolean; userId: string; onSaved: (g: number | null) => void; onClose: () => void }) {
  const [hours, setHours] = useState(goal ? String(Math.round((goal / 60) * 10) / 10) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(minutes: number | null) {
    setSaving(true)
    setError('')
    const { error } = await createClient().from('profiles').upsert({ id: userId, weekly_goal_minutes: minutes })
    setSaving(false)
    if (error) {
      setError(supported ? 'Opslaan lukte niet. Probeer het opnieuw.' : 'Het weekdoel is nog niet ingeschakeld in de database.')
      return
    }
    onSaved(minutes)
    onClose()
  }

  return (
    <form
      className="absolute left-0 top-full mt-2 z-30 w-64 bg-white rounded-2xl border border-indigo-100 shadow-xl p-4 text-left"
      onSubmit={e => {
        e.preventDefault()
        const h = parseFloat(hours.replace(',', '.'))
        save(Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null)
      }}
    >
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-200">
        Weekdoel in uren
        <input type="number" min="0.5" step="0.5" value={hours} onChange={e => setHours(e.target.value)} autoFocus
          className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-900" />
      </label>
      <div className="flex gap-1.5 mt-3">
        <button disabled={saving} className="flex-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg py-2 hover:bg-indigo-700 disabled:opacity-50">Opslaan</button>
        {goal && <button type="button" onClick={() => save(null)} className="text-xs text-slate-600 dark:text-slate-300 px-2">Wis</button>}
        <button type="button" onClick={onClose} aria-label="Annuleren" className="text-slate-500 px-1"><X className="w-4 h-4" /></button>
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-300 mt-2">{error}</p>}
    </form>
  )
}

function HeroCard({
  thisWeek, goal, week, streak, shields, studiedToday, atRisk, hasMoments, intro, feedback, celebrate, confettiColors,
  goalSupported, userId, onGoalSaved,
}: {
  thisWeek: number; goal: number | null; week: ReturnType<typeof weekComparison>; streak: number; shields: number
  studiedToday: boolean; atRisk: boolean; hasMoments: boolean; intro: boolean
  feedback: { streak: number; week: number } | null; celebrate: boolean; confettiColors: string[]
  goalSupported: boolean; userId: string; onGoalSaved: (g: number | null) => void
}) {
  const reduced = useReducedMotion()
  const [editing, setEditing] = useState(false)
  const pct = goal ? Math.min(1, thisWeek / goal) : 0
  const reached = !!goal && thisWeek >= goal
  const remaining = goal ? Math.max(0, goal - thisWeek) : 0
  const almost = !!goal && !reached && pct >= 0.8
  const fromWeek = feedback ? feedback.week : intro ? 0 : thisWeek
  const fromPct = goal ? Math.min(1, fromWeek / goal) : 0
  const runNumbers = !reduced && (intro || !!feedback)

  const R = 62
  const C = 2 * Math.PI * R

  let title: string
  let message: string
  if (reached) {
    title = 'Weekdoel behaald! Goed gewerkt'
    message = thisWeek > goal! ? `${formatMinutes(thisWeek - goal!)} boven je doel van ${formatMinutes(goal!)}.` : `Je hebt je doel van ${formatMinutes(goal!)} gehaald.`
  } else if (thisWeek === 0) {
    title = 'Nieuwe week, schone lei'
    message = hasMoments ? 'Log je eerste leermoment van deze week en zet de ring in beweging.' : 'Je eerste leermoment wacht op je. Log het en zie je voortgang groeien.'
  } else if (goal) {
    title = `Nog ${formatMinutes(remaining)} tot je weekdoel`
    message = almost ? 'Je bent er bijna. Eén goede sessie en je hebt het.' : `Je zit op ${Math.round(pct * 100)}% van je weekdoel.`
  } else {
    title = `${formatMinutes(thisWeek)} gestudeerd deze week`
    message = 'Stel een weekdoel in om je voortgang te volgen.'
  }

  const flameSize = streak === 0 ? 26 : Math.min(54, 30 + streak * 1.2)

  return (
    <section className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white p-5 md:p-7 shadow-lg shadow-indigo-300/40 dark:shadow-none" aria-label="Deze week">
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        {celebrate && !reduced && <Confetti colors={confettiColors} />}
      </div>

      <div className="relative grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="relative w-[148px] h-[148px] mx-auto md:mx-0" role="img" aria-label={goal ? `${formatMinutes(thisWeek)} van je weekdoel van ${formatMinutes(goal)}` : `${formatMinutes(thisWeek)} deze week`}>
          <svg viewBox="0 0 148 148" className={`w-full h-full -rotate-90 ${almost ? 'drop-shadow-[0_0_12px_rgba(253,186,116,0.55)]' : ''}`}>
            <circle cx={74} cy={74} r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={12} />
            {goal ? (
              <motion.circle
                cx={74} cy={74} r={R} fill="none" stroke={reached ? '#86efac' : almost ? '#fdba74' : '#ffffff'} strokeWidth={12} strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C * (1 - (runNumbers ? fromPct : pct)) }}
                animate={{ strokeDashoffset: C * (1 - pct) }}
                transition={{ duration: runNumbers ? 0.8 : 0, ease: 'easeOut', delay: runNumbers ? 0.1 : 0 }}
              />
            ) : null}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
            <span className="text-xl font-bold leading-tight tabular-nums whitespace-nowrap">
              <CountUp value={thisWeek} from={fromWeek} run={runNumbers} format={formatMinutes} />
            </span>
            <span className="text-xs text-white/80 mt-0.5">{goal ? `van ${formatMinutes(goal)}` : 'deze week'}</span>
          </div>
        </div>

        <div className="min-w-0 text-center md:text-left">
          <h2 className="text-xl md:text-2xl font-bold leading-snug">{title}</h2>
          <p className="text-sm text-white/85 mt-1">{message}</p>
          {week.comparable && thisWeek > 0 && (
            <p className={`text-xs mt-2 inline-flex items-center gap-1.5 ${week.diff > 0 ? 'text-emerald-200' : 'text-white/75'}`}>
              {week.diff > 0 ? <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} /> : week.diff < 0 ? <TrendingDown className="w-3.5 h-3.5" strokeWidth={2} /> : <Check className="w-3.5 h-3.5" strokeWidth={2} />}
              {week.diff === 0 ? 'Op schema ten opzichte van vorige week' : `${formatMinutes(Math.abs(week.diff))} ${week.diff > 0 ? 'meer' : 'minder'} dan vorige week op dit moment`}
            </p>
          )}
          <div className="relative mt-3">
            <button onClick={() => setEditing(e => !e)} className="text-xs font-medium text-white/90 underline underline-offset-4 decoration-white/40 hover:decoration-white inline-flex items-center gap-1">
              <Target className="w-3.5 h-3.5" strokeWidth={2} /> {goal ? 'Weekdoel aanpassen' : 'Weekdoel instellen'}
            </button>
            {editing && <GoalForm goal={goal} supported={goalSupported} userId={userId} onSaved={onGoalSaved} onClose={() => setEditing(false)} />}
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/15 p-4 text-center md:min-w-[170px]">
          <motion.div
            className="mx-auto flex items-end justify-center h-14"
            initial={false}
            animate={feedback && !reduced ? { y: [0, -14, 0], scale: [1, 1.18, 1] } : { y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
          >
            <Flame
              style={{ width: flameSize, height: flameSize }}
              strokeWidth={1.75}
              className={streak > 0 ? 'text-orange-300 fill-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.6)]' : 'text-white/50'}
            />
          </motion.div>
          <p className="text-3xl font-bold mt-1 tabular-nums">
            <CountUp value={streak} from={feedback ? feedback.streak : 0} run={runNumbers} />
          </p>
          <p className="text-xs text-white/80">{streak === 1 ? 'dag op rij' : 'dagen op rij'}</p>
          <p className={`text-xs font-medium mt-2 ${atRisk ? 'text-orange-200' : 'text-white/85'}`}>
            {atRisk ? 'Bescherm je streak vandaag' : streak === 0 ? 'Log vandaag en start je streak' : studiedToday ? 'Vandaag gelogd' : ''}
          </p>
          <div className="mt-2"><ShieldInfo shields={shields} onDark /></div>
        </div>
      </div>
    </section>
  )
}

function SmallStat({ label, icon, value, sub }: { label: string; icon: React.ReactNode; value: React.ReactNode; sub: string }) {
  return (
    <div className={`${card} p-4 flex flex-col justify-between min-h-[104px]`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight mt-1">{value}</p>
      <p className={`${muted} mt-1`}>{sub}</p>
    </div>
  )
}

function DailyChart({ moments, today, dailyGoal, colors, intro }: { moments: Moment[]; today: string; dailyGoal: number | null; colors: Record<string, string>; intro: boolean }) {
  const [range, setRange] = useState<14 | 30>(14)
  const { dark } = useTheme()
  const axis = dark ? '#94a3b8' : '#64748b'

  const { data, keys, max } = useMemo(() => {
    const from = addDays(today, -range + 1)
    const rows: Record<string, Record<string, number | string>> = {}
    for (let i = 0; i < range; i++) {
      const date = addDays(from, i)
      rows[date] = { date, label: shortDate(date) }
    }
    const totals: Record<string, number> = {}
    for (const m of moments) {
      if (m.learned_at < from || m.learned_at > today || !m.duration_minutes) continue
      const key = m.category || 'Zonder vak'
      rows[m.learned_at][key] = ((rows[m.learned_at][key] as number) ?? 0) + m.duration_minutes
      totals[key] = (totals[key] ?? 0) + m.duration_minutes
    }
    const data = Object.values(rows)
    const dayMax = Math.max(0, ...data.map(r => Object.entries(r).reduce((s, [k, v]) => (k === 'date' || k === 'label' ? s : s + (v as number)), 0)))
    return { data, keys: Object.keys(totals).sort((a, b) => totals[b] - totals[a]), max: Math.max(dayMax, dailyGoal ?? 0) }
  }, [moments, today, range, dailyGoal])

  const activeDays = data.filter(r => Object.keys(r).length > 2).length
  const step = max > 240 ? 120 : max > 60 ? 60 : max > 30 ? 30 : 15
  const top = Math.max(step, Math.ceil(max / step) * step)
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className={heading}>Minuten per dag</h2>
          <p className={`${muted} mt-0.5`}>{activeDays === 0 ? `Nog geen studietijd in de laatste ${range} dagen` : `${activeDays} van ${range} dagen gestudeerd`}</p>
        </div>
        <div className="flex bg-indigo-50 rounded-lg p-0.5" role="group" aria-label="Periode">
          {([14, 30] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${range === r ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {r} dagen
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#2a2a45' : '#e2e8f0'} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={{ stroke: dark ? '#334155' : '#cbd5e1' }} interval={range === 14 ? 1 : 4} />
          <YAxis domain={[0, top]} ticks={ticks} tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={false} width={58} tickFormatter={v => (v === 0 ? '0' : formatMinutes(v))} />
          <Tooltip
            cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.06)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as Record<string, number | string>
              const items = keys.filter(k => row[k])
              const total = items.reduce((s, k) => s + (row[k] as number), 0)
              return (
                <div className="rounded-xl border border-indigo-100 bg-white dark:bg-[#1a1a2e] shadow-lg px-3 py-2 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">{longDate(row.date as string)}</p>
                  {items.length === 0 ? <p className="text-slate-500 dark:text-slate-400">Geen registratie</p> : (
                    <>
                      {items.map(k => (
                        <p key={k} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"><SubjectDot color={colors[k] ?? NO_SUBJECT_COLOR} /> {k}: {formatMinutes(row[k] as number)}</p>
                      ))}
                      {items.length > 1 && <p className="text-slate-900 dark:text-white font-medium mt-1">Totaal {formatMinutes(total)}</p>}
                    </>
                  )}
                </div>
              )
            }}
          />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} stackId="dag" fill={colors[k] ?? NO_SUBJECT_COLOR} maxBarSize={22}
              radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={intro} animationDuration={600} />
          ))}
          {dailyGoal ? (
            <ReferenceLine y={dailyGoal} stroke={axis} strokeDasharray="5 4" label={{ value: `Dagdoel ${formatMinutes(dailyGoal)}`, position: 'insideTopRight', fontSize: 11, fill: dark ? '#cbd5e1' : '#475569' }} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
      {keys.length > 0 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2" aria-label="Vakken">
          {keys.slice(0, 6).map(k => <li key={k} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><SubjectDot color={colors[k] ?? NO_SUBJECT_COLOR} />{k}</li>)}
          {keys.length > 6 && <li className={muted}>+{keys.length - 6}</li>}
        </ul>
      )}
    </div>
  )
}

function SubjectBars({ moments, today, colors, intro }: { moments: Moment[]; today: string; colors: Record<string, string>; intro: boolean }) {
  const [range, setRange] = useState<30 | 90>(30)
  const rows = useMemo(() => {
    const from = addDays(today, -range + 1)
    const per: Record<string, number> = {}
    for (const m of moments) {
      if (m.learned_at < from || m.learned_at > today || !m.duration_minutes) continue
      const key = m.category || 'Zonder vak'
      per[key] = (per[key] ?? 0) + m.duration_minutes
    }
    return Object.entries(per).sort((a, b) => b[1] - a[1])
  }, [moments, today, range])
  const max = rows[0]?.[1] ?? 0
  const visible = rows.slice(0, 8)

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className={heading}>Studietijd per vak</h2>
          <p className={`${muted} mt-0.5`}>Laatste {range} dagen</p>
        </div>
        <div className="flex bg-indigo-50 rounded-lg p-0.5" role="group" aria-label="Periode">
          {([30, 90] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
              className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${range === r ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {r} dagen
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className={`${muted} py-10 text-center`}>Nog geen leermomenten met minuten in deze periode.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map(([name, minutes], i) => (
            <li key={name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 min-w-0 text-slate-800 dark:text-slate-100">
                  <SubjectDot color={colors[name] ?? NO_SUBJECT_COLOR} />
                  <span className="truncate" title={name}>{name}</span>
                  {i === 0 && rows.length > 1 && <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 rounded px-1.5 py-0.5 shrink-0">Topvak</span>}
                </span>
                <span className="text-slate-600 dark:text-slate-300 tabular-nums shrink-0">{formatMinutes(minutes)}</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: colors[name] ?? NO_SUBJECT_COLOR }}
                  initial={{ width: intro ? 0 : `${Math.max(2, (minutes / max) * 100)}%` }}
                  animate={{ width: `${Math.max(2, (minutes / max) * 100)}%` }}
                  transition={{ duration: intro ? 0.5 : 0.3, delay: intro ? i * 0.04 : 0, ease: 'easeOut' }}
                />
              </div>
            </li>
          ))}
          {rows.length > visible.length && <li className={muted}>+ {rows.length - visible.length} andere vakken · <Link href="/resultaten" className={linkText}>alle resultaten</Link></li>}
        </ul>
      )}
    </div>
  )
}

function RecentMoments({ moments, colors }: { moments: Moment[]; colors: Record<string, string> }) {
  const recent = moments.slice(0, 5)
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={heading}>Recente leermomenten</h2>
        {recent.length > 0 && <Link href="/leermomenten" className={`${linkText} inline-flex items-center gap-1`}>Alle leermomenten <ArrowRight className="w-3.5 h-3.5" /></Link>}
      </div>
      {recent.length === 0 ? (
        <div className="py-6 flex flex-col items-center text-center">
          <span className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Glyph name="pen" className="w-6 h-6" /></span>
          <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">Je eerste leermoment wacht op je</p>
          <p className={`${muted} mt-1`}>Schrijf na het studeren op wat je deed. Het kost een halve minuut.</p>
          <Link href="/leermomenten" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> Leermoment loggen
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-indigo-50">
          {recent.map((m, i) => (
            <li key={m.id ?? i} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex gap-2.5">
                <span className="mt-1.5"><SubjectDot color={m.category ? colors[m.category] ?? NO_SUBJECT_COLOR : NO_SUBJECT_COLOR} /></span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{m.title ?? 'Zonder titel'}</p>
                  <p className={`${muted} mt-0.5 truncate`}>{longDate(m.learned_at)}{m.category ? ` · ${m.category}` : ''}</p>
                </div>
              </div>
              {m.duration_minutes ? <span className="text-xs text-slate-700 dark:text-slate-200 tabular-nums shrink-0 mt-0.5">{formatMinutes(m.duration_minutes)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReviewCard({ moments, initialReviews, supported, activeSubjects, today, colors }: {
  moments: Moment[]; initialReviews: MomentReview[]; supported: boolean; activeSubjects: Set<string>; today: string; colors: Record<string, string>
}) {
  const reduced = useReducedMotion()
  const [reviews, setReviews] = useState(initialReviews)
  const [flipped, setFlipped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const { due, nextDue } = useMemo(() => reviewQueue(moments, reviews, activeSubjects, today), [moments, reviews, activeSubjects, today])
  const current = due[0]

  async function answer(result: ReviewResult) {
    if (!current?.moment.id) return
    setSaving(true)
    setNotice('')
    const entry = { moment_id: current.moment.id, result, reviewed_at: new Date().toISOString() }
    if (supported) {
      const { error } = await createClient().from('moment_reviews').insert({ moment_id: entry.moment_id, result })
      if (error) setNotice('Je antwoord kon niet worden opgeslagen. Het telt alleen voor deze sessie.')
    } else {
      setNotice('Antwoorden worden nog niet bewaard: de herhaalfunctie is nog niet ingeschakeld in de database.')
    }
    setSaving(false)
    setFlipped(false)
    setTimeout(() => setReviews(r => [...r, entry]), reduced ? 0 : 200)
  }

  const stepLabel = (step: number) => `Herhaling na ${REVIEW_STEPS[step]} ${REVIEW_STEPS[step] === 1 ? 'dag' : 'dagen'}`

  return (
    <div className={`${card} p-5 flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`${heading} inline-flex items-center gap-2`}><Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-300" strokeWidth={2} /> Weet je dit nog?</h2>
        {due.length > 0 && <span className={muted}>{due.length} te herhalen</span>}
      </div>

      {!current ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <span className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Glyph name="bulb" className="w-6 h-6" /></span>
          <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">{nextDue ? 'Alles herhaald voor vandaag' : 'Nog niets om te herhalen'}</p>
          <p className={`${muted} mt-1 max-w-xs`}>
            {nextDue
              ? `Je volgende herhaling staat op ${longDate(nextDue)}.`
              : 'Leermomenten met een notitie uit je actieve vakken komen hier 1, 7 en 30 dagen later terug.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 [perspective:1000px] min-h-[200px]">
          <motion.div
            key={current.moment.id}
            className="relative w-full h-full min-h-[200px] [transform-style:preserve-3d]"
            initial={{ opacity: 0, rotateY: 0 }}
            animate={{ opacity: 1, rotateY: flipped ? 180 : 0 }}
            transition={{ rotateY: { duration: reduced ? 0 : 0.4, ease: 'easeInOut' }, opacity: { duration: 0.2 } }}
          >
            <div className="absolute inset-0 flex flex-col rounded-xl border border-indigo-100 bg-indigo-50/60 dark:bg-white/5 p-4 [backface-visibility:hidden]" aria-hidden={flipped}>
              <p className={`${muted} flex items-center gap-1.5`}>
                {current.moment.category && <SubjectDot color={colors[current.moment.category] ?? NO_SUBJECT_COLOR} />}
                {current.moment.category} · {shortDate(current.moment.learned_at)} · {stepLabel(current.step)}
              </p>
              <p className="text-base font-semibold text-slate-900 dark:text-white mt-2">{current.moment.title}</p>
              <p className={`${muted} mt-2`}>Haal eerst zelf op wat je hierover weet. Draai dan de kaart om.</p>
              <button onClick={() => setFlipped(true)} disabled={flipped}
                className="mt-auto inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl py-2.5 hover:bg-indigo-700 active:scale-[0.98] transition">
                <Eye className="w-4 h-4" strokeWidth={2} /> Toon mijn notitie
              </button>
            </div>
            <div className="absolute inset-0 flex flex-col rounded-xl border border-indigo-200 bg-white dark:bg-[#1a1a2e] p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]" aria-hidden={!flipped}>
              <p className={muted}>Jouw notitie bij “{current.moment.title}”</p>
              <p className="mt-2 text-sm text-slate-800 dark:text-slate-100 leading-relaxed overflow-y-auto max-h-28 whitespace-pre-line">{current.moment.description}</p>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                <button onClick={() => answer('forgotten')} disabled={saving || !flipped}
                  className="text-sm font-semibold text-slate-800 dark:text-slate-100 border border-indigo-200 rounded-xl py-2.5 hover:bg-indigo-50 dark:hover:bg-white/5 active:scale-[0.98] transition">
                  Vergeten
                </button>
                <button onClick={() => answer('remembered')} disabled={saving || !flipped}
                  className="text-sm font-semibold bg-indigo-600 text-white rounded-xl py-2.5 hover:bg-indigo-700 active:scale-[0.98] transition">
                  Wist ik nog
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {notice && <p className="text-xs text-amber-800 dark:text-amber-300 mt-3">{notice}</p>}
    </div>
  )
}


const LEVEL_CLASS = [
  'bg-slate-100 dark:bg-white/5',
  'bg-indigo-200 dark:bg-indigo-900',
  'bg-indigo-400 dark:bg-indigo-700',
  'bg-indigo-600 dark:bg-indigo-500',
  'bg-indigo-800 dark:bg-indigo-300',
]
const LEVEL_LABEL = ['Geen registratie', 'Minder dan 30 min', '30–59 min', '1–2 uur', '2 uur of meer']
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
const WEEKS = 16

function Heatmap({ byDay, today }: { byDay: Record<string, number>; today: string }) {
  const [hover, setHover] = useState<{ date: string; minutes: number; x: number; y: number } | null>(null)
  const start = addDays(weekStart(today), -(WEEKS - 1) * 7)
  const columns = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)))
  const studied = columns.flat().filter(d => d <= today && (byDay[d] ?? 0) > 0).length

  return (
    <div className={`${card} p-5`}>
      <div className="mb-3">
        <h2 className={heading}>Studiekalender</h2>
        <p className={`${muted} mt-0.5`}>Laatste {WEEKS} weken · {studied} dagen met studietijd</p>
      </div>
      <div className="relative inline-block max-w-full overflow-x-auto" onMouseLeave={() => setHover(null)}>
        <div className="flex gap-[3px] pl-7 mb-1 h-3">
          {columns.map((col, w) => {
            const month = new Date(`${col[0]}T12:00:00`).getMonth()
            const show = w === 0
              ? new Date(`${columns[2][0]}T12:00:00`).getMonth() === month
              : new Date(`${columns[w - 1][0]}T12:00:00`).getMonth() !== month
            return <span key={w} className="w-[13px] text-[10px] leading-3 text-slate-500 dark:text-slate-400 overflow-visible whitespace-nowrap">{show ? MONTHS[month] : ''}</span>
          })}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] w-6 mr-1">
            {['Ma', '', 'Wo', '', 'Vr', '', ''].map((l, i) => (
              <span key={i} className="h-[13px] text-[10px] leading-[13px] text-slate-500 dark:text-slate-400">{l}</span>
            ))}
          </div>
          {columns.map((col, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {col.map(date => {
                if (date > today) return <span key={date} className="w-[13px] h-[13px]" />
                const minutes = byDay[date] ?? 0
                return (
                  <span
                    key={date}
                    aria-label={`${longDate(date)}: ${minutes > 0 ? formatMinutes(minutes) : 'geen registratie'}`}
                    onMouseEnter={e => {
                      const parent = (e.currentTarget.closest('.relative') as HTMLElement).getBoundingClientRect()
                      const r = e.currentTarget.getBoundingClientRect()
                      setHover({ date, minutes, x: r.left - parent.left + 6, y: r.top - parent.top })
                    }}
                    className={`w-[13px] h-[13px] rounded-[3px] ${LEVEL_CLASS[heatmapLevel(minutes)]} ${date === today ? 'ring-1 ring-slate-500' : ''}`}
                  />
                )
              })}
            </div>
          ))}
        </div>
        {hover && (
          <span role="tooltip" className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full -mt-1 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[11px] px-2 py-1 shadow-lg"
            style={{ left: hover.x, top: hover.y - 4 }}>
            {longDate(hover.date)} · {hover.minutes > 0 ? formatMinutes(hover.minutes) : 'geen registratie'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <span className={muted}>Minder</span>
        {LEVEL_CLASS.map((c, i) => <span key={i} title={LEVEL_LABEL[i]} className={`w-[13px] h-[13px] rounded-[3px] ${c}`} />)}
        <span className={muted}>Meer</span>
      </div>
    </div>
  )
}

export default function HomePage({ user, allMoments: initialMoments, subjects, displayName, weeklyGoal, weeklyGoalSupported, reviews, reviewsSupported, studySessions, examEvents, todaySlots }: Props) {
  const { tr } = useLanguage()
  const h = tr.home
  const sj = tr.subjects
  const reduced = useReducedMotion()
  const [moments, setMoments] = useState<Moment[]>(initialMoments)
  const [quickOpen, setQuickOpen] = useState(false)
  const [today, setToday] = useState(() => localDateStr(new Date()))
  const [goal, setGoal] = useState<number | null>(weeklyGoal)
  const [intro, setIntro] = useState(false)
  const [feedback, setFeedback] = useState<{ streak: number; week: number } | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [burnoutDismissed, setBurnoutDismissed] = useState(false)

  const byDay = useMemo(() => minutesByDay(moments), [moments])
  const { streak, shields, studiedToday, atRisk } = useMemo(() => computeStreak(moments.map(m => m.learned_at), today), [moments, today])
  const week = useMemo(() => weekComparison(byDay, today), [byDay, today])
  const weekKey = weekStart(today)
  const todayMinutes = byDay[today] ?? 0
  const monthStart = `${today.slice(0, 7)}-01`
  const monthMinutes = sumBetween(byDay, monthStart, today)
  const monthMoments = moments.filter(m => m.learned_at >= monthStart && m.learned_at <= today).length
  const timed = moments.filter(m => (m.duration_minutes ?? 0) > 0)
  const avgSession = timed.length ? timed.reduce((s, m) => s + (m.duration_minutes ?? 0), 0) / timed.length : 0
  const dailyGoal = goal ? Math.round(goal / 7) : null
  const goalReached = !!goal && week.thisWeek >= goal

  const colors = useMemo(() => buildSubjectColors([
    ...subjects.map(s => s.name),
    ...moments.map(m => m.category).filter((c): c is string => !!c),
  ]), [subjects, moments])
  const activeSubjects = useMemo(() => new Set(subjects.filter(s => s.is_active !== false).map(s => s.name)), [subjects])
  const weekColors = useMemo(() => {
    const names = Array.from(new Set(moments.filter(m => m.learned_at >= weekKey && m.category).map(m => m.category as string)))
    const list = names.map(n => colors[n]).filter(Boolean)
    return list.length ? list : ['#7c3aed', '#fb923c', '#0d9488', '#db2777']
  }, [moments, weekKey, colors])

  useEffect(() => {
    const now = localDateStr(new Date())
    setToday(now)
    try {
      const raw = localStorage.getItem(SNAPSHOT_KEY)
      const prev = raw ? JSON.parse(raw) as { count: number; streak: number; week: number; weekKey: string } : null
      if (prev && prev.count < moments.length) {
        setFeedback({ streak: prev.streak, week: prev.weekKey === weekStart(now) ? prev.week : 0 })
      } else if (!reduced && !sessionStorage.getItem(INTRO_KEY)) {
        setIntro(true)
      }
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ count: moments.length, streak, week: week.thisWeek, weekKey }))
    } catch {}
  }, [moments.length, streak, week.thisWeek, weekKey])

  useEffect(() => {
    if (!goalReached) return
    try {
      if (localStorage.getItem(CELEBRATED_KEY) === weekKey) return
      localStorage.setItem(CELEBRATED_KEY, weekKey)
    } catch { return }
    setCelebrate(true)
  }, [goalReached, weekKey])

  useEffect(() => {
    if (!celebrate) return
    const id = setTimeout(() => setCelebrate(false), 1800)
    return () => clearTimeout(id)
  }, [celebrate])

  useEffect(() => {
    if (!feedback) return
    const id = setTimeout(() => setFeedback(null), 4500)
    return () => clearTimeout(id)
  }, [feedback])

  const minutesPerSubject = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const m of moments) if (m.category && m.duration_minutes) acc[m.category] = (acc[m.category] ?? 0) + m.duration_minutes
    return acc
  }, [moments])
  const minutesThisWeekPerSubject = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const m of moments) if (m.category && m.learned_at >= weekKey && m.learned_at <= today) acc[m.category] = (acc[m.category] ?? 0) + (m.duration_minutes ?? 0)
    return acc
  }, [moments, weekKey, today])

  const goalSubjects = useMemo(() => subjects.filter(s => s.goal_minutes || s.recurring_goal_minutes), [subjects])
  const goalYearTabs = useMemo(() => getYearTabs(goalSubjects.map(s => s.school_year)), [goalSubjects])
  const [goalActiveYear, setGoalActiveYear] = useState(() => goalYearTabs[0] ?? UNKNOWN_YEAR)
  useEffect(() => {
    if (goalYearTabs.length > 0 && !goalYearTabs.includes(goalActiveYear)) setGoalActiveYear(goalYearTabs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalYearTabs])
  const goalSubjectsInYear = goalSubjects.filter(s => (s.school_year ?? UNKNOWN_YEAR) === goalActiveYear)

  const burnoutWarning = useMemo(() => {
    const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, -i))
    if (!last14.every(d => (byDay[d] ?? 0) > 0)) return false
    return last14.reduce((s, d) => s + byDay[d], 0) / 14 > 180
  }, [byDay, today])

  const suggestion = useMemo(() => {
    const urgent = examEvents.find(exam => {
      const left = daysBetween(today, exam.date)
      if (left > 7 || left < 0 || !exam.subject) return false
      const subj = subjects.find(s => s.name === exam.subject)
      return !!subj?.goal_minutes && (minutesPerSubject[exam.subject] ?? 0) < subj.goal_minutes
    })
    if (urgent) {
      const left = Math.max(1, daysBetween(today, urgent.date))
      const subj = subjects.find(s => s.name === urgent.subject)!
      const remaining = Math.max(0, (subj.goal_minutes ?? 0) - (minutesPerSubject[urgent.subject!] ?? 0))
      return { subject: urgent.subject!, minutes: Math.ceil(remaining / left), reason: `${urgent.title} over ${left} dag${left === 1 ? '' : 'en'}`, urgent: true }
    }
    const behind = subjects
      .filter(s => s.recurring_type === 'weekly' && (s.recurring_goal_minutes ?? 0) > (minutesThisWeekPerSubject[s.name] ?? 0))
      .sort((a, b) => ((b.recurring_goal_minutes ?? 0) - (minutesThisWeekPerSubject[b.name] ?? 0)) - ((a.recurring_goal_minutes ?? 0) - (minutesThisWeekPerSubject[a.name] ?? 0)))[0]
    if (behind) {
      const left = 7 - weekdayIndex(today)
      const remaining = (behind.recurring_goal_minutes ?? 0) - (minutesThisWeekPerSubject[behind.name] ?? 0)
      return { subject: behind.name, minutes: Math.ceil(remaining / left), reason: `Weekdoel voor dit vak: nog ${formatMinutes(remaining)}`, urgent: false }
    }
    return null
  }, [examEvents, subjects, minutesPerSubject, minutesThisWeekPerSubject, today])

  const firstName = displayName ?? user.email?.split('@')[0]?.split('+')[0] ?? ''
  const statusText = studiedToday
    ? `Je hebt vandaag ${todayMinutes > 0 ? formatMinutes(todayMinutes) : 'al iets'} gelogd.`
    : streak > 0
      ? `Je hebt vandaag nog niets gelogd. Log een leermoment om je streak van ${streak} ${streak === 1 ? 'dag' : 'dagen'} te behouden.`
      : moments.length === 0
        ? 'Welkom bij Knowl. Log je eerste leermoment om je voortgang te zien.'
        : 'Log vandaag je eerste leermoment en start je streak.'

  const freeBlocks = getFreeBlocks(todaySlots)
  const behindSubject = subjects
    .filter(s => s.goal_minutes && s.goal_minutes > (minutesPerSubject[s.name] ?? 0))
    .sort((a, b) => ((b.goal_minutes ?? 0) - (minutesPerSubject[b.name] ?? 0)) - ((a.goal_minutes ?? 0) - (minutesPerSubject[a.name] ?? 0)))[0]
  const practiceSeconds = studySessions.reduce((s, x) => s + x.duration_seconds, 0)
  const activityLabels: Record<string, string> = { 'flashcards': 'Flashcards', 'flashcards-sr': 'Herhalen', 'quiz': 'Quiz', 'woordweb': 'Woordweb' }
  const fade = (i: number) => (intro ? { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: 0.05 * i } } : {})

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-5xl" />
      <OnboardingWizard isNewUser={moments.length === 0} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-5">
        {burnoutWarning && !burnoutDismissed && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Neem ook rust</p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">Je hebt 14 dagen op rij gemiddeld meer dan 3 uur per dag gestudeerd. Een rustdag helpt je brein om het te onthouden.</p>
            </div>
            <button onClick={() => setBurnoutDismissed(true)} aria-label="Sluiten" className="text-amber-700"><X className="w-4 h-4" /></button>
          </div>
        )}

        <motion.section {...fade(0)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 dark:text-white">Hoi{firstName ? `, ${firstName}` : ''}</h1>
            <p className={`mt-1 text-sm ${atRisk ? 'text-orange-800 dark:text-orange-300' : 'text-slate-600 dark:text-slate-300'}`}>{statusText}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setQuickOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] transition">
              <Plus className="w-4 h-4" strokeWidth={2.5} /> Leermoment loggen
            </button>
            <Link href="/pomodoro" className="inline-flex items-center gap-1.5 bg-white text-slate-800 dark:text-slate-100 text-sm font-semibold px-4 py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-50 active:scale-[0.98] transition">
              <Timer className="w-4 h-4" strokeWidth={2} /> Pomodoro
            </Link>
          </div>
        </motion.section>

        <motion.div {...fade(1)} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
          <HeroCard
            thisWeek={week.thisWeek} goal={goal} week={week} streak={streak} shields={shields} studiedToday={studiedToday} atRisk={atRisk}
            hasMoments={moments.length > 0} intro={intro} feedback={feedback} celebrate={celebrate} confettiColors={weekColors}
            goalSupported={weeklyGoalSupported} userId={user.id} onGoalSaved={setGoal}
          />
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            <SmallStat
              label="Deze maand" icon={<CalendarClock className="w-4 h-4" strokeWidth={2} />}
              value={monthMinutes > 0 ? <CountUp value={monthMinutes} run={intro} format={formatMinutes} /> : 'Nog niets'}
              sub={monthMoments > 0 ? `${monthMoments} leermoment${monthMoments === 1 ? '' : 'en'}` : 'Deze maand begint bij je eerste leermoment'}
            />
            <SmallStat
              label="Gemiddelde sessie" icon={<BookOpen className="w-4 h-4" strokeWidth={2} />}
              value={timed.length ? <CountUp value={avgSession} run={intro} format={formatMinutes} /> : '–'}
              sub={timed.length ? `Over ${timed.length} sessie${timed.length === 1 ? '' : 's'} met tijd` : 'Vul minuten in bij een leermoment'}
            />
          </div>
        </motion.div>

        {suggestion && (
          <motion.div {...fade(2)} className={`${card} p-4 flex items-center gap-3 ${suggestion.urgent ? 'border-orange-200' : ''}`}>
            <Target className={`w-5 h-5 shrink-0 ${suggestion.urgent ? 'text-orange-700' : 'text-indigo-600 dark:text-indigo-300'}`} strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                Studeer vandaag <strong>{formatMinutes(suggestion.minutes)}</strong>
                <span className="inline-flex items-center gap-1"><SubjectDot color={colors[suggestion.subject] ?? NO_SUBJECT_COLOR} />{suggestion.subject}</span>
              </p>
              <p className={`text-xs mt-0.5 ${suggestion.urgent ? 'text-orange-800 dark:text-orange-300' : 'text-slate-500 dark:text-slate-400'}`}>{suggestion.reason}</p>
            </div>
          </motion.div>
        )}

        <motion.section {...fade(3)} className="grid lg:grid-cols-2 gap-4">
          <DailyChart moments={moments} today={today} dailyGoal={dailyGoal} colors={colors} intro={intro} />
          <SubjectBars moments={moments} today={today} colors={colors} intro={intro} />
        </motion.section>

        <motion.section {...fade(4)} className="grid lg:grid-cols-2 gap-4">
          <RecentMoments moments={moments} colors={colors} />
          <ReviewCard moments={moments} initialReviews={reviews} supported={reviewsSupported} activeSubjects={activeSubjects} today={today} colors={colors} />
        </motion.section>

        <motion.section {...fade(5)} className="grid lg:grid-cols-2 gap-4 items-start">
          <Heatmap byDay={byDay} today={today} />

          {examEvents.length > 0 && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={heading}>Komende tentamens</h2>
                <Link href="/agenda" className={linkText}>Agenda</Link>
              </div>
              <ul className="space-y-3">
                {examEvents.map(exam => {
                  const left = Math.max(0, daysBetween(today, exam.date))
                  const subj = exam.subject ? subjects.find(s => s.name === exam.subject) : undefined
                  const goalMin = subj?.goal_minutes ?? 0
                  const done = exam.subject ? (minutesPerSubject[exam.subject] ?? 0) : 0
                  const onTrack = goalMin > 0 && done >= goalMin
                  const perDay = goalMin > 0 && !onTrack && left > 0 ? Math.ceil((goalMin - done) / left) : null
                  const warn = left <= 7 && goalMin > 0 && !onTrack
                  const color = exam.subject ? colors[exam.subject] ?? NO_SUBJECT_COLOR : NO_SUBJECT_COLOR
                  return (
                    <li key={exam.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{exam.title}</p>
                          <p className={`${muted} flex items-center gap-1.5`}>{exam.subject && <SubjectDot color={color} />}{longDate(exam.date)}{exam.subject ? ` · ${exam.subject}` : ''}</p>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${warn ? 'text-orange-800 dark:text-orange-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {left === 0 ? 'Vandaag' : `over ${left} dag${left === 1 ? '' : 'en'}`}
                        </span>
                      </div>
                      {goalMin > 0 ? (
                        <>
                          <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-1.5">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((done / goalMin) * 100))}%`, backgroundColor: color }} />
                          </div>
                          <p className={`${muted} mt-1`}>{formatMinutes(done)} van {formatMinutes(goalMin)}{onTrack ? ' · op schema' : perDay ? ` · nog ${formatMinutes(perDay)} per dag` : ''}</p>
                        </>
                      ) : (
                        <p className={`${muted} mt-1`}>{h.noGoalSet}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {goalSubjects.length > 0 && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={heading}>{h.goalProgress}</h2>
                <Link href="/vakken" className={linkText}>Vakken beheren</Link>
              </div>
              <SchoolYearTabs years={goalYearTabs} active={goalActiveYear} onChange={setGoalActiveYear} unknownLabel={sj.unknownYear} />
              {goalSubjectsInYear.length === 0 && <p className={`${muted} text-center py-4`}>Geen doelen in dit schooljaar.</p>}
              <ul className="space-y-4">
                {goalSubjectsInYear.map(subject => {
                  const done = minutesPerSubject[subject.name] ?? 0
                  const weekDone = minutesThisWeekPerSubject[subject.name] ?? 0
                  const left = subject.goal_date ? daysBetween(today, subject.goal_date) : null
                  const color = colors[subject.name] ?? NO_SUBJECT_COLOR
                  return (
                    <li key={subject.name} className="space-y-2">
                      <div className="flex justify-between text-sm gap-3">
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate flex items-center gap-2" title={subject.name}><SubjectDot color={color} />{subject.name}</span>
                        {left !== null && <span className={`text-xs shrink-0 ${left >= 0 && left < 7 ? 'text-orange-800 dark:text-orange-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>{left >= 0 ? `nog ${left} dagen` : 'datum voorbij'}</span>}
                      </div>
                      {subject.goal_minutes ? (
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300">Totaal</span><span className="text-slate-700 dark:text-slate-200 tabular-nums">{formatMinutes(done)} / {formatMinutes(subject.goal_minutes)}</span></div>
                          <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((done / subject.goal_minutes) * 100))}%`, backgroundColor: color }} /></div>
                        </div>
                      ) : null}
                      {subject.recurring_goal_minutes && subject.recurring_type === 'weekly' ? (
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300">Deze week</span><span className="text-slate-700 dark:text-slate-200 tabular-nums">{formatMinutes(weekDone)} / {formatMinutes(subject.recurring_goal_minutes)}</span></div>
                          <div className="h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full opacity-70" style={{ width: `${Math.min(100, Math.round((weekDone / subject.recurring_goal_minutes) * 100))}%`, backgroundColor: color }} /></div>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {freeBlocks.length > 0 && todaySlots.length > 0 && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className={heading}>{h.freeStudyTime}</h2>
                  <p className={`${muted} mt-0.5`}>{h.freeStudyTimeSub}</p>
                </div>
                <Link href="/rooster" className={linkText}>Rooster</Link>
              </div>
              <ul className="space-y-2">
                {freeBlocks.slice(0, 3).map((b, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl border border-indigo-100 px-3 py-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{b.start} – {b.end}</span>
                    <span className={muted}>{formatMinutes(b.minutes)} vrij{behindSubject ? ` · ${behindSubject.name}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {studySessions.length > 0 && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={heading}>Oefentijd afgelopen 7 dagen</h2>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatMinutes(practiceSeconds / 60)}</span>
              </div>
              <ul className="space-y-2">
                {Object.entries(studySessions.reduce((acc, s) => {
                  const key = activityLabels[s.activity] ?? s.activity
                  acc[key] = (acc[key] ?? 0) + s.duration_seconds
                  return acc
                }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).map(([label, secs]) => (
                  <li key={label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-700 dark:text-slate-200 w-20 shrink-0">{label}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full h-1.5"><div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.round((secs / practiceSeconds) * 100)}%` }} /></div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 w-16 text-right tabular-nums">{formatMinutes(secs / 60)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.section>
      </main>

      {quickOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setQuickOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Nieuw leermoment" className="w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <MomentForm
              userId={user.id}
              subjects={subjects.filter(s => s.is_active !== false).map(s => s.name).sort((a, b) => a.localeCompare(b))}
              colors={colors}
              variant="modal"
              onClose={() => setQuickOpen(false)}
              onSaved={m => {
                setFeedback({ streak, week: week.thisWeek })
                setMoments(list => [m, ...list].sort((a, b) => b.learned_at.localeCompare(a.learned_at)))
              }}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {feedback && (
          <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 pointer-events-none">
          <motion.div
            role="status"
            initial={{ opacity: 0, y: reduced ? 0 : 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : 24 }} transition={{ duration: reduced ? 0 : 0.25 }}
            className="pointer-events-auto flex items-center gap-3 bg-white rounded-2xl border border-indigo-100 shadow-xl pl-3 pr-4 py-2.5"
          >
            <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><Glyph name="check" className="w-5 h-5" strokeWidth={2.2} /></span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Leermoment opgeslagen</p>
              <p className={muted}>{streak > feedback.streak ? `Je streak staat nu op ${streak} ${streak === 1 ? 'dag' : 'dagen'}.` : `Deze week: ${formatMinutes(week.thisWeek)}${goal ? ` van ${formatMinutes(goal)}` : ''}.`}</p>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
