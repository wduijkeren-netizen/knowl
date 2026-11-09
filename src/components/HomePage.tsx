'use client'

import Nav from '@/components/Nav'
import SchoolYearTabs from '@/components/SchoolYearTabs'
import OnboardingWizard from '@/components/OnboardingWizard'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarClock, Check, Clock, Eye, Flame, Info, Lightbulb,
  Minus, Plus, RefreshCw, Shield, Target, Timer, TrendingDown, TrendingUp, X,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useTheme } from '@/lib/ThemeContext'
import { UNKNOWN_YEAR, getYearTabs } from '@/lib/schoolYear'
import {
  DAYS_PER_SHIELD, MAX_SHIELDS, addDays, computeStreak, formatMinutes, heatmapLevel, localDateStr,
  minutesByDay, reviewOrder, sumBetween, weekComparison, weekStart, weekdayIndex,
} from '@/lib/studyStats'

type Moment = { id?: string; title?: string; description?: string | null; duration_minutes: number | null; learned_at: string; category?: string | null }
type Subject = { name: string; goal_minutes: number | null; goal_date: string | null; recurring_type: string | null; recurring_goal_minutes: number | null; school_year: string | null }
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
  studySessions: StudySession[]
  examEvents: Exam[]
  todaySlots: Slot[]
}

const card = 'bg-white rounded-2xl border border-indigo-100 shadow-sm'
const heading = 'text-sm font-semibold text-slate-900 dark:text-slate-100'
const muted = 'text-xs text-slate-500 dark:text-slate-400'
const linkText = 'text-xs font-medium text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200'

function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function longDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function daysUntil(date: string, today: string) {
  return Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000)
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

function KpiCard({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`${card} p-4 min-h-[112px] flex flex-col`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <div className="mt-1.5 flex-1 flex flex-col">{children}</div>
    </div>
  )
}

function ShieldInfo({ shields }: { shields: number }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label={`${shields} schild${shields === 1 ? '' : 'en'}, uitleg`}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-md px-1 -mx-1 hover:bg-indigo-50 dark:hover:bg-white/5"
      >
        <Shield className="w-3.5 h-3.5" strokeWidth={2} />
        {shields}/{MAX_SHIELDS}
        <Info className="w-3 h-3 text-slate-400" strokeWidth={2} />
      </button>
      {open && (
        <span role="tooltip" className="absolute left-0 top-full mt-1.5 z-20 w-60 rounded-xl bg-slate-900 text-white text-xs leading-relaxed p-3 shadow-xl">
          Een schild beschermt je streak als je een dag niet studeert. Je verdient er één na elke {DAYS_PER_SHIELD} dagen op rij, en je kunt er maximaal {MAX_SHIELDS} hebben. Mis je een dag zonder schild, dan begint je streak opnieuw.
        </span>
      )}
    </span>
  )
}

function WeekCard({ thisWeek, goal, supported, userId, onGoalSaved }: {
  thisWeek: number; goal: number | null; supported: boolean; userId: string; onGoalSaved: (g: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
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
    onGoalSaved(minutes)
    setEditing(false)
  }

  const pct = goal ? Math.min(100, Math.round((thisWeek / goal) * 100)) : 0
  const remaining = goal ? Math.max(0, goal - thisWeek) : 0

  return (
    <KpiCard label="Deze week" icon={<Clock className="w-4 h-4" strokeWidth={2} />}>
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={e => {
            e.preventDefault()
            const h = parseFloat(hours.replace(',', '.'))
            save(Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null)
          }}
        >
          <label className="block text-xs text-slate-600 dark:text-slate-300">
            Weekdoel in uren
            <input
              type="number" min="0.5" step="0.5" value={hours} onChange={e => setHours(e.target.value)} autoFocus
              className="mt-1 w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
            />
          </label>
          <div className="flex gap-1.5">
            <button disabled={saving} className="flex-1 text-xs font-semibold bg-indigo-600 text-white rounded-lg py-1.5 hover:bg-indigo-700 disabled:opacity-50">Opslaan</button>
            {goal && <button type="button" onClick={() => save(null)} className="text-xs text-slate-600 dark:text-slate-300 px-2">Wis</button>}
            <button type="button" onClick={() => setEditing(false)} aria-label="Annuleren" className="text-slate-500 px-1"><X className="w-4 h-4" /></button>
          </div>
          {error && <p className="text-xs text-red-700 dark:text-red-300">{error}</p>}
        </form>
      ) : (
        <>
          <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{formatMinutes(thisWeek)}</p>
          {goal ? (
            <button onClick={() => setEditing(true)} className="mt-auto text-left group" aria-label="Weekdoel aanpassen">
              <div className="h-1.5 bg-indigo-50 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-600' : 'bg-indigo-600'}`} style={{ width: `${pct}%` }} />
              </div>
              <p className={`${muted} mt-1 group-hover:text-slate-700 dark:group-hover:text-slate-200`}>
                {remaining > 0 ? `Nog ${formatMinutes(remaining)} tot ${formatMinutes(goal)}` : `Weekdoel van ${formatMinutes(goal)} gehaald`}
              </p>
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className={`${linkText} mt-auto text-left inline-flex items-center gap-1`}>
              <Target className="w-3.5 h-3.5" strokeWidth={2} /> Weekdoel instellen
            </button>
          )}
        </>
      )}
    </KpiCard>
  )
}

function DailyChart({ byDay, today, dailyGoal }: { byDay: Record<string, number>; today: string; dailyGoal: number | null }) {
  const [range, setRange] = useState<14 | 30>(14)
  const { dark } = useTheme()
  const axis = dark ? '#94a3b8' : '#64748b'
  const data = useMemo(() => Array.from({ length: range }, (_, i) => {
    const date = addDays(today, i - range + 1)
    return { date, label: shortDate(date), minutes: byDay[date] ?? 0 }
  }), [byDay, today, range])
  const activeDays = data.filter(d => d.minutes > 0).length
  const max = Math.max(...data.map(d => d.minutes), dailyGoal ?? 0, 30)
  const step = max > 240 ? 120 : max > 90 ? 60 : 30
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className={heading}>Minuten per dag</h2>
          <p className={`${muted} mt-0.5`}>{activeDays} van {range} dagen gestudeerd</p>
        </div>
        <div className="flex bg-indigo-50 rounded-lg p-0.5" role="group" aria-label="Periode">
          {([14, 30] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} aria-pressed={range === r}
              className={`text-xs font-medium px-2.5 py-1 rounded-md ${range === r ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              {r} dagen
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#2a2a45' : '#e2e8f0'} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={{ stroke: dark ? '#334155' : '#cbd5e1' }} interval={range === 14 ? 1 : 4} />
          <YAxis domain={[0, top]} ticks={ticks} tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={false} width={58} tickFormatter={v => (v === 0 ? '0' : formatMinutes(v))} />
          <Tooltip
            cursor={{ fill: 'rgba(99,102,241,0.06)' }}
            contentStyle={{ borderRadius: 12, border: '1px solid #e0e7ff', fontSize: 12 }}
            labelFormatter={(_, payload) => (payload?.[0] ? longDate(payload[0].payload.date) : '')}
            formatter={v => [Number(v) > 0 ? formatMinutes(Number(v)) : 'Geen registratie', 'Studietijd']}
          />
          <Bar dataKey="minutes" fill={dark ? '#818cf8' : '#4f46e5'} radius={[4, 4, 0, 0]} maxBarSize={22} background={{ fill: dark ? '#22223a' : '#f1f5f9', radius: 4 }} isAnimationActive={false} />
          {dailyGoal ? (
            <ReferenceLine y={dailyGoal} stroke={axis} strokeDasharray="5 4" label={{ value: `Dagdoel ${formatMinutes(dailyGoal)}`, position: 'insideTopRight', fontSize: 11, fill: dark ? '#cbd5e1' : '#475569' }} />
          ) : null}
        </BarChart>
      </ResponsiveContainer>
      {!dailyGoal && <p className={`${muted} mt-2`}>Stel een weekdoel in om je dagdoel als lijn te zien.</p>}
    </div>
  )
}

function SubjectBars({ moments, today }: { moments: Moment[]; today: string }) {
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
              className={`text-xs font-medium px-2.5 py-1 rounded-md ${range === r ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
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
                <span className="text-slate-800 dark:text-slate-100 min-w-0 truncate" title={name}>
                  {name}
                  {i === 0 && rows.length > 1 && <span className="ml-2 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 rounded px-1.5 py-0.5 align-middle">Topvak</span>}
                </span>
                <span className="text-slate-600 dark:text-slate-300 tabular-nums shrink-0">{formatMinutes(minutes)}</span>
              </div>
              <div className="h-2 bg-indigo-50 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.max(2, Math.round((minutes / max) * 100))}%` }} />
              </div>
            </li>
          ))}
          {rows.length > visible.length && <li className={muted}>+ {rows.length - visible.length} andere vakken · <Link href="/resultaten" className={linkText}>alle resultaten</Link></li>}
        </ul>
      )}
    </div>
  )
}

function RecentMoments({ moments }: { moments: Moment[] }) {
  const recent = moments.slice(0, 5)
  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={heading}>Recente leermomenten</h2>
        <Link href="/leermomenten" className={`${linkText} inline-flex items-center gap-1`}>Alle leermomenten <ArrowRight className="w-3.5 h-3.5" /></Link>
      </div>
      {recent.length === 0 ? (
        <p className={`${muted} py-6 text-center`}>Je hebt nog geen leermomenten gelogd.</p>
      ) : (
        <ul className="divide-y divide-indigo-50">
          {recent.map((m, i) => (
            <li key={m.id ?? i} className="py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{m.title ?? 'Zonder titel'}</p>
                <p className={`${muted} mt-0.5 truncate`}>{longDate(m.learned_at)}{m.category ? ` · ${m.category}` : ''}</p>
              </div>
              {m.duration_minutes ? <span className="text-xs text-slate-700 dark:text-slate-200 tabular-nums shrink-0 mt-0.5">{formatMinutes(m.duration_minutes)}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReviewCard({ moments, today }: { moments: Moment[]; today: string }) {
  const queue = useMemo(() => reviewOrder(moments, today), [moments, today])
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const current = queue[index % Math.max(queue.length, 1)]

  return (
    <div className={`${card} p-5 flex flex-col`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className={`${heading} inline-flex items-center gap-2`}><Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-300" strokeWidth={2} /> Weet je dit nog?</h2>
        {queue.length > 1 && <span className={muted}>{(index % queue.length) + 1} / {queue.length}</span>}
      </div>
      {!current ? (
        <p className={`${muted} py-6 text-center`}>Leermomenten met een samenvatting komen hier terug zodra ze minstens een dag oud zijn, zodat je ze uit je hoofd kunt ophalen.</p>
      ) : (
        <>
          <p className={muted}>
            {current.category ? `${current.category} · ` : ''}{shortDate(current.learned_at)} ({daysUntil(today, current.learned_at) === 0 ? 'vandaag' : `${-daysUntil(current.learned_at, today)} dagen geleden`})
          </p>
          <p className="text-base font-semibold text-slate-900 dark:text-white mt-1">{current.title}</p>
          {revealed ? (
            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-indigo-50 rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-line">{current.description}</p>
          ) : (
            <p className={`${muted} mt-3`}>Probeer eerst zelf te bedenken wat je hierover hebt geleerd. Kijk daarna wat je opschreef.</p>
          )}
          <div className="flex gap-2 mt-auto pt-4">
            {!revealed && (
              <button onClick={() => setRevealed(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl py-2 hover:bg-indigo-700">
                <Eye className="w-4 h-4" strokeWidth={2} /> Toon wat ik opschreef
              </button>
            )}
            {queue.length > 1 && (
              <button onClick={() => { setIndex(i => i + 1); setRevealed(false) }}
                className={`${revealed ? 'flex-1' : ''} inline-flex items-center justify-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-indigo-100 rounded-xl px-3 py-2 hover:bg-indigo-50 dark:hover:bg-white/5`}>
                <RefreshCw className="w-4 h-4" strokeWidth={2} /> Ander leermoment
              </button>
            )}
          </div>
        </>
      )}
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
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className={heading}>Studiekalender</h2>
          <p className={`${muted} mt-0.5`}>Laatste {WEEKS} weken · {studied} dagen met studietijd</p>
        </div>
      </div>
      <div className="relative inline-block max-w-full overflow-x-auto" onMouseLeave={() => setHover(null)}>
        <div className="flex gap-[3px] pl-7 mb-1 h-3">
          {columns.map((col, w) => {
            const first = new Date(`${col[0]}T12:00:00`)
            const month = first.getMonth()
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

export default function HomePage({ user, allMoments, subjects, displayName, weeklyGoal, weeklyGoalSupported, studySessions, examEvents, todaySlots }: Props) {
  const { tr } = useLanguage()
  const h = tr.home
  const sj = tr.subjects
  const [today, setToday] = useState(() => localDateStr(new Date()))
  useEffect(() => setToday(localDateStr(new Date())), [])
  const [goal, setGoal] = useState<number | null>(weeklyGoal)

  const byDay = useMemo(() => minutesByDay(allMoments), [allMoments])
  const { streak, shields, studiedToday, atRisk } = useMemo(() => computeStreak(allMoments.map(m => m.learned_at), today), [allMoments, today])
  const week = useMemo(() => weekComparison(byDay, today), [byDay, today])
  const todayMinutes = byDay[today] ?? 0
  const monthStart = `${today.slice(0, 7)}-01`
  const monthMinutes = sumBetween(byDay, monthStart, today)
  const monthMoments = allMoments.filter(m => m.learned_at >= monthStart && m.learned_at <= today).length
  const timed = allMoments.filter(m => (m.duration_minutes ?? 0) > 0)
  const avgSession = timed.length ? timed.reduce((s, m) => s + (m.duration_minutes ?? 0), 0) / timed.length : 0
  const dailyGoal = goal ? Math.round(goal / 7) : null

  const minutesPerSubject = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const m of allMoments) if (m.category && m.duration_minutes) acc[m.category] = (acc[m.category] ?? 0) + m.duration_minutes
    return acc
  }, [allMoments])
  const minutesThisWeekPerSubject = useMemo(() => {
    const acc: Record<string, number> = {}
    const from = weekStart(today)
    for (const m of allMoments) if (m.category && m.learned_at >= from && m.learned_at <= today) acc[m.category] = (acc[m.category] ?? 0) + (m.duration_minutes ?? 0)
    return acc
  }, [allMoments, today])

  const goalSubjects = useMemo(() => subjects.filter(s => s.goal_minutes || s.recurring_goal_minutes), [subjects])
  const goalYearTabs = useMemo(() => getYearTabs(goalSubjects.map(s => s.school_year)), [goalSubjects])
  const [goalActiveYear, setGoalActiveYear] = useState(() => goalYearTabs[0] ?? UNKNOWN_YEAR)
  useEffect(() => {
    if (goalYearTabs.length > 0 && !goalYearTabs.includes(goalActiveYear)) setGoalActiveYear(goalYearTabs[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalYearTabs])
  const goalSubjectsInYear = goalSubjects.filter(s => (s.school_year ?? UNKNOWN_YEAR) === goalActiveYear)

  const [burnoutDismissed, setBurnoutDismissed] = useState(false)
  const burnoutWarning = useMemo(() => {
    const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, -i))
    if (!last14.every(d => (byDay[d] ?? 0) > 0)) return false
    return last14.reduce((s, d) => s + byDay[d], 0) / 14 > 180
  }, [byDay, today])

  const suggestion = useMemo(() => {
    const urgent = examEvents.find(exam => {
      const left = daysUntil(exam.date, today)
      if (left > 7 || left < 0 || !exam.subject) return false
      const subj = subjects.find(s => s.name === exam.subject)
      return !!subj?.goal_minutes && (minutesPerSubject[exam.subject] ?? 0) < subj.goal_minutes
    })
    if (urgent) {
      const left = Math.max(1, daysUntil(urgent.date, today))
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
    ? `Je hebt vandaag ${todayMinutes > 0 ? formatMinutes(todayMinutes) : 'al iets'} gelogd.${goal && week.thisWeek < goal ? ` Nog ${formatMinutes(goal - week.thisWeek)} tot je weekdoel.` : ''}`
    : streak > 0
      ? `Je hebt vandaag nog niets gelogd. Log een leermoment om je streak van ${streak} ${streak === 1 ? 'dag' : 'dagen'} te behouden.`
      : allMoments.length === 0
        ? 'Log je eerste leermoment om je voortgang te zien.'
        : 'Je hebt vandaag nog niets gelogd. Log een leermoment om een nieuwe streak te beginnen.'

  const freeBlocks = getFreeBlocks(todaySlots)
  const behindSubject = subjects
    .filter(s => s.goal_minutes && s.goal_minutes > (minutesPerSubject[s.name] ?? 0))
    .sort((a, b) => ((b.goal_minutes ?? 0) - (minutesPerSubject[b.name] ?? 0)) - ((a.goal_minutes ?? 0) - (minutesPerSubject[a.name] ?? 0)))[0]
  const practiceSeconds = studySessions.reduce((s, x) => s + x.duration_seconds, 0)
  const activityLabels: Record<string, string> = { 'flashcards': 'Flashcards', 'flashcards-sr': 'Herhalen', 'quiz': 'Quiz', 'woordweb': 'Woordweb' }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-5xl" />
      <OnboardingWizard isNewUser={allMoments.length === 0} />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
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

        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Hoi{firstName ? `, ${firstName}` : ''}</h1>
            <p className={`mt-1 text-sm ${atRisk ? 'text-amber-800 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'}`}>{statusText}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/leermomenten" className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm">
              <Plus className="w-4 h-4" strokeWidth={2.5} /> Leermoment loggen
            </Link>
            <Link href="/pomodoro" className="inline-flex items-center gap-1.5 bg-white text-slate-800 dark:text-slate-100 text-sm font-semibold px-4 py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-50">
              <Timer className="w-4 h-4" strokeWidth={2} /> Pomodoro
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Kerncijfers">
          <WeekCard thisWeek={week.thisWeek} goal={goal} supported={weeklyGoalSupported} userId={user.id} onGoalSaved={setGoal} />

          <KpiCard label="Streak" icon={<Flame className="w-4 h-4" strokeWidth={2} />}>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{streak} <span className="text-base font-semibold text-slate-600 dark:text-slate-300">{streak === 1 ? 'dag' : 'dagen'}</span></p>
            <div className="mt-auto space-y-1">
              {atRisk ? (
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} /> Vandaag nog niet gelogd</p>
              ) : studiedToday ? (
                <p className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2} /> Vandaag gelogd</p>
              ) : null}
              <div><ShieldInfo shields={shields} /></div>
            </div>
          </KpiCard>

          <KpiCard label="Deze maand" icon={<CalendarClock className="w-4 h-4" strokeWidth={2} />}>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{formatMinutes(monthMinutes)}</p>
            <p className={`${muted} mt-auto`}>{monthMoments} leermoment{monthMoments === 1 ? '' : 'en'}</p>
          </KpiCard>

          <KpiCard label="Gemiddelde sessie" icon={<BookOpen className="w-4 h-4" strokeWidth={2} />}>
            <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{timed.length ? formatMinutes(avgSession) : '–'}</p>
            <p className={`${muted} mt-auto`}>{timed.length ? `Over ${timed.length} sessie${timed.length === 1 ? '' : 's'} met tijd` : 'Nog geen sessies met tijd'}</p>
          </KpiCard>
        </section>

        {week.comparable && (
          <p className="text-sm text-slate-600 dark:text-slate-300 inline-flex items-center gap-2 -mt-2">
            {week.diff > 0 ? <TrendingUp className="w-4 h-4" strokeWidth={2} /> : week.diff < 0 ? <TrendingDown className="w-4 h-4" strokeWidth={2} /> : <Minus className="w-4 h-4" strokeWidth={2} />}
            {week.diff === 0
              ? 'Evenveel als vorige week op dit moment'
              : `${formatMinutes(Math.abs(week.diff))} ${week.diff > 0 ? 'meer' : 'minder'} dan vorige week op dit moment`}
            <span className="text-slate-500 dark:text-slate-400">({formatMinutes(week.thisWeek)} tegen {formatMinutes(week.lastWeek)})</span>
          </p>
        )}

        {suggestion && (
          <div className={`${card} p-4 flex items-center gap-3 ${suggestion.urgent ? 'border-amber-200' : ''}`}>
            <Target className={`w-5 h-5 shrink-0 ${suggestion.urgent ? 'text-amber-700' : 'text-indigo-600 dark:text-indigo-300'}`} strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 dark:text-white">Studeer vandaag <strong>{formatMinutes(suggestion.minutes)}</strong> {suggestion.subject}</p>
              <p className={`text-xs mt-0.5 ${suggestion.urgent ? 'text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>{suggestion.reason}</p>
            </div>
          </div>
        )}

        <section className="grid lg:grid-cols-2 gap-4">
          <DailyChart byDay={byDay} today={today} dailyGoal={dailyGoal} />
          <SubjectBars moments={allMoments} today={today} />
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <RecentMoments moments={allMoments} />
          <ReviewCard moments={allMoments} today={today} />
        </section>

        <section className="grid lg:grid-cols-2 gap-4 items-start">
          <Heatmap byDay={byDay} today={today} />

          {examEvents.length > 0 && (
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={heading}>Komende tentamens</h2>
                <Link href="/agenda" className={linkText}>Agenda</Link>
              </div>
              <ul className="space-y-3">
                {examEvents.map(exam => {
                  const left = Math.max(0, daysUntil(exam.date, today))
                  const subj = exam.subject ? subjects.find(s => s.name === exam.subject) : undefined
                  const goalMin = subj?.goal_minutes ?? 0
                  const done = exam.subject ? (minutesPerSubject[exam.subject] ?? 0) : 0
                  const onTrack = goalMin > 0 && done >= goalMin
                  const perDay = goalMin > 0 && !onTrack && left > 0 ? Math.ceil((goalMin - done) / left) : null
                  const warn = left <= 7 && goalMin > 0 && !onTrack
                  return (
                    <li key={exam.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{exam.title}</p>
                          <p className={muted}>{longDate(exam.date)}{exam.subject ? ` · ${exam.subject}` : ''}</p>
                        </div>
                        <span className={`text-xs font-semibold shrink-0 ${warn ? 'text-amber-800 dark:text-amber-300' : 'text-slate-700 dark:text-slate-200'}`}>
                          {left === 0 ? 'Vandaag' : `over ${left} dag${left === 1 ? '' : 'en'}`}
                        </span>
                      </div>
                      {goalMin > 0 ? (
                        <>
                          <div className="h-1.5 bg-indigo-50 rounded-full overflow-hidden mt-1.5">
                            <div className={`h-full rounded-full ${onTrack ? 'bg-emerald-600' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, Math.round((done / goalMin) * 100))}%` }} />
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
                  const left = subject.goal_date ? daysUntil(subject.goal_date, today) : null
                  return (
                    <li key={subject.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate" title={subject.name}>{subject.name}</span>
                        {left !== null && <span className={`text-xs ${left >= 0 && left < 7 ? 'text-amber-800 dark:text-amber-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>{left >= 0 ? `nog ${left} dagen` : 'datum voorbij'}</span>}
                      </div>
                      {subject.goal_minutes ? (
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300">Totaal</span><span className="text-slate-700 dark:text-slate-200 tabular-nums">{formatMinutes(done)} / {formatMinutes(subject.goal_minutes)}</span></div>
                          <div className="h-1.5 bg-indigo-50 rounded-full overflow-hidden"><div className={`h-full rounded-full ${done >= subject.goal_minutes ? 'bg-emerald-600' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, Math.round((done / subject.goal_minutes) * 100))}%` }} /></div>
                        </div>
                      ) : null}
                      {subject.recurring_goal_minutes && subject.recurring_type === 'weekly' ? (
                        <div>
                          <div className="flex justify-between text-xs mb-1"><span className="text-slate-600 dark:text-slate-300">Deze week</span><span className="text-slate-700 dark:text-slate-200 tabular-nums">{formatMinutes(weekDone)} / {formatMinutes(subject.recurring_goal_minutes)}</span></div>
                          <div className="h-1.5 bg-indigo-50 rounded-full overflow-hidden"><div className={`h-full rounded-full ${weekDone >= subject.recurring_goal_minutes ? 'bg-emerald-600' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, Math.round((weekDone / subject.recurring_goal_minutes) * 100))}%` }} /></div>
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
                    <div className="flex-1 bg-indigo-50 rounded-full h-1.5"><div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.round((secs / practiceSeconds) * 100)}%` }} /></div>
                    <span className="text-xs text-slate-600 dark:text-slate-300 w-16 text-right tabular-nums">{formatMinutes(secs / 60)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
