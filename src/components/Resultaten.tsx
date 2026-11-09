'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Pencil, Plus, Target, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import MomentForm from '@/components/MomentForm'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/ThemeContext'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import {
  DAY_PARTS, MOMENT_TYPES, NO_SUBJECT_LABEL, PERIOD_WEEKS, addDays, dayPartInsight, dayPartOf, formatDay, formatMinutes,
  inRange, localDateStr, percentages, schoolYearOf, selectionRange, subjectInsight, subjectTotals, totalMinutes,
  trendInsight, typeInsight, weekdayInsight, weekdayTotals, weeklyBySubject,
  type DayPart, type MomentType, type Period,
} from '@/lib/studyStats'
import type { LearningMoment } from '@/lib/moments'

type ResultMoment = Pick<LearningMoment, 'learned_at' | 'duration_minutes' | 'category'> & { id?: string; moment_type?: string | null; start_time?: string | null }
type Subject = { id?: string; name: string; school_year: string | null; is_active?: boolean | null; goal_minutes?: number | null; goal_date?: string | null }

type Props = { moments: ResultMoment[]; subjects: Subject[]; isGuest?: boolean; userId?: string; loadFailed?: boolean }

const MIN_MOMENTS = 5
const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const WEEKDAY_FULL = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
const PERIODS: { value: Period; label: string }[] = [
  { value: 'periode', label: 'Deze periode' },
  { value: 'jaar', label: 'Dit jaar' },
  { value: 'alles', label: 'Alles' },
]

function demoMoments(today: string): ResultMoment[] {
  const vakken = ['Recht', 'Wiskunde', 'Economie', 'Engels']
  return Array.from({ length: 40 }, (_, i) => ({
    learned_at: addDays(today, -i * 2),
    duration_minutes: [45, 30, 60, 25, 90][i % 5],
    category: vakken[(i * 7) % 4 === 3 && i % 3 ? 0 : i % 4],
    moment_type: (['new', 'practice', 'review', 'new'] as const)[i % 4],
    start_time: ['09:30', '14:00', '20:15', '19:00', '16:30'][i % 5],
  }))
}

function Card({ title, subtitle, insight, children, action }: { title: string; subtitle?: string; insight?: string | null; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex gap-3 min-w-0">
          <span className="w-1 self-stretch rounded-full bg-indigo-600 shrink-0" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
      {insight && <p className="mt-4 text-sm text-slate-800 dark:text-slate-100 bg-indigo-50 rounded-xl px-4 py-3">{insight}</p>}
    </section>
  )
}

function Bar100({ pct, color, delay, reduced, opacity = 1 }: { pct: number; color: string; delay: number; reduced: boolean | null; opacity?: number }) {
  return (
    <div className="h-2.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color, opacity }}
        initial={{ width: reduced ? `${pct}%` : 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : delay, ease: 'easeOut' }}
      />
    </div>
  )
}

function MeterRow({ label, dot, pct, color, value, delay, reduced, opacity = 1, wide = false }: {
  label: string; dot?: string; pct: number; color: string; value: string; delay: number; reduced: boolean | null; opacity?: number; wide?: boolean
}) {
  return (
    <li className={`grid grid-cols-[minmax(0,1fr)_auto] ${wide ? 'sm:grid-cols-[minmax(0,10rem)_1fr_8.5rem]' : 'sm:grid-cols-[minmax(0,6rem)_1fr_8.5rem]'} items-center gap-x-3 gap-y-1.5 py-1.5 sm:py-0 sm:h-10`}>
      <span className="flex items-center gap-2 min-w-0 text-sm text-slate-800 dark:text-slate-100">
        {dot && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot }} aria-hidden />}
        <span className="truncate" title={label}>{label}</span>
      </span>
      <span className="sm:order-3 text-sm text-slate-700 dark:text-slate-200 tabular-nums text-right whitespace-nowrap">{value}</span>
      <div className="col-span-2 sm:col-span-1 sm:order-2"><Bar100 pct={pct} color={color} delay={delay} reduced={reduced} opacity={opacity} /></div>
    </li>
  )
}

export default function Resultaten({ moments, subjects: initialSubjects, isGuest, userId, loadFailed }: Props) {
  const reduced = useReducedMotion()
  const { dark } = useTheme()
  const today = localDateStr(new Date())
  const source = useMemo(() => (isGuest ? demoMoments(today) : moments), [isGuest, moments, today])
  const [subjects, setSubjects] = useState(initialSubjects)
  const [extra, setExtra] = useState<ResultMoment[]>([])
  const all = useMemo(() => [...extra, ...source], [extra, source])

  const years = useMemo(() => Array.from(new Set(all.map(m => schoolYearOf(m.learned_at)).filter((y): y is string => !!y))).sort((a, b) => b.localeCompare(a)), [all])
  const currentYear = schoolYearOf(today)
  const [year, setYear] = useState(() => (currentYear && years.includes(currentYear) ? currentYear : ''))
  const [period, setPeriod] = useState<Period>('alles')
  const [weeksShown, setWeeksShown] = useState<8 | 12>(8)
  const [formOpen, setFormOpen] = useState(false)
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [goalError, setGoalError] = useState('')

  const range = useMemo(() => selectionRange(year, period, today), [year, period, today])
  const selected = useMemo(() => all.filter(m => m.learned_at && inRange(m.learned_at, range)), [all, range])
  const total = totalMinutes(selected)
  const perSubject = useMemo(() => subjectTotals(selected), [selected])
  const pcts = percentages(perSubject.map(r => r.minutes))
  const namedSubjects = perSubject.filter(r => r.name !== NO_SUBJECT_LABEL).length
  const colors = useMemo(() => buildSubjectColors([
    ...subjects.map(s => s.name),
    ...all.map(m => m.category).filter((c): c is string => !!c),
  ]), [subjects, all])
  const colorOf = (name: string) => (name === NO_SUBJECT_LABEL ? NO_SUBJECT_COLOR : colors[name] ?? NO_SUBJECT_COLOR)

  const endDate = range.to && range.to < today ? range.to : today
  const firstDate = selected.length ? selected.reduce((min, m) => (m.learned_at < min ? m.learned_at : min), selected[0].learned_at) : today
  const spansMoreThan8 = selected.length > 0 && firstDate < addDays(endDate, -8 * 7)
  const weeks = useMemo(() => weeklyBySubject(selected, endDate, spansMoreThan8 ? weeksShown : 8), [selected, endDate, weeksShown, spansMoreThan8])
  const weekKeys = useMemo(() => {
    const t: Record<string, number> = {}
    for (const w of weeks) for (const [k, v] of Object.entries(w.bySubject)) t[k] = (t[k] ?? 0) + v
    return Object.keys(t).sort((a, b) => t[b] - t[a])
  }, [weeks])
  const weekData = weeks.map(w => ({ label: `wk ${w.week}`, ...w.bySubject, _w: w }))

  const weekday = weekdayTotals(selected)
  const weekdayMax = Math.max(...weekday)

  const timed = selected.filter(m => dayPartOf(m.start_time))
  const dayParts = DAY_PARTS.reduce((acc, p) => ({ ...acc, [p]: 0 }), {} as Record<DayPart, number>)
  for (const m of timed) dayParts[dayPartOf(m.start_time)!] += m.duration_minutes ?? 0
  const dayPartPcts = percentages(DAY_PARTS.map(p => dayParts[p]))

  const typed = selected.filter(m => m.moment_type && m.moment_type in MOMENT_TYPES)
  const typeTotals = (Object.keys(MOMENT_TYPES) as MomentType[]).reduce((acc, k) => ({ ...acc, [k]: 0 }), {} as Record<MomentType, number>)
  for (const m of typed) typeTotals[m.moment_type as MomentType] += m.duration_minutes ?? 0
  const untypedMinutes = totalMinutes(selected.filter(m => !m.moment_type || !(m.moment_type in MOMENT_TYPES)))
  const typeRows = [
    ...(Object.keys(MOMENT_TYPES) as MomentType[]).map(k => ({ label: MOMENT_TYPES[k], minutes: typeTotals[k], color: '#4f46e5' })),
    { label: 'Niet gecategoriseerd', minutes: untypedMinutes, color: NO_SUBJECT_COLOR },
  ]
  const typePcts = percentages(typeRows.map(r => r.minutes))

  const goalSubjects = subjects.filter(s => s.is_active !== false)
  const subjectMinutes = Object.fromEntries(perSubject.map(r => [r.name, r.minutes]))
  const firstGoal = goalSubjects.filter(s => s.goal_minutes).sort((a, b) => (subjectMinutes[b.name] ?? 0) - (subjectMinutes[a.name] ?? 0))[0]
  const goalInsight = firstGoal ? `Je hebt ${Math.round(((subjectMinutes[firstGoal.name] ?? 0) / firstGoal.goal_minutes!) * 100)}% van je persoonlijke studiedoel voor ${firstGoal.name} bereikt.` : null

  const selectionText = (() => {
    if (total === 0) {
      if (period === 'periode') return `De afgelopen ${PERIOD_WEEKS} weken${year ? ` (schooljaar ${year})` : ''} heb je nog geen studietijd geregistreerd.`
      if (period === 'jaar') return `In ${today.slice(0, 4)}${year ? ` (schooljaar ${year})` : ''} heb je nog geen studietijd geregistreerd.`
      return year ? `In ${year} heb je nog geen studietijd geregistreerd.` : 'Je hebt nog geen studietijd geregistreerd.'
    }
    const amount = `${formatMinutes(total)} verdeeld over ${namedSubjects} ${namedSubjects === 1 ? 'vak' : 'vakken'}`
    if (period === 'periode') return `De afgelopen ${PERIOD_WEEKS} weken${year ? ` (schooljaar ${year})` : ''} heb je ${amount}.`
    if (period === 'jaar') return `In ${today.slice(0, 4)}${year ? ` (schooljaar ${year})` : ''} heb je ${amount}.`
    return year ? `In ${year} heb je ${amount}.` : `In totaal heb je ${amount}.`
  })()

  async function saveGoal(subject: Subject) {
    const h = parseFloat(goalInput.replace(',', '.'))
    const minutes = Number.isFinite(h) && h > 0 ? Math.round(h * 60) : null
    setGoalError('')
    const query = createClient().from('subjects').update({ goal_minutes: minutes })
    const { error } = await (subject.id ? query.eq('id', subject.id) : query.eq('name', subject.name))
    if (error) { setGoalError('Opslaan lukte niet. Probeer het opnieuw.'); return }
    setSubjects(list => list.map(s => (s.name === subject.name ? { ...s, goal_minutes: minutes } : s)))
    setEditingGoal(null)
  }

  const axis = dark ? '#94a3b8' : '#64748b'
  const enough = selected.length >= MIN_MOMENTS
  const segment = (active: boolean) => `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${active ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}`

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn={!isGuest || undefined} width="max-w-4xl" />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 dark:text-white">Jouw resultaten</h1>
            <PageInfo text="Hier zie je waar je studietijd naartoe gaat, hoe die zich ontwikkelt en wanneer je studeert. Kies een schooljaar en periode om in te zoomen." />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{selectionText}</p>
        </header>

        {isGuest && (
          <div className="bg-white border border-indigo-200 rounded-2xl px-5 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-sm text-slate-700 dark:text-slate-200"><span className="text-xs font-bold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5 mr-2">VOORBEELD</span>Dit zijn voorbeeldresultaten. Maak een account aan voor je eigen gegevens.</p>
            <Link href="/login?signup=true" className="shrink-0 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700">Gratis account aanmaken</Link>
          </div>
        )}

        {loadFailed && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">Niet al je leermomenten konden worden geladen. Ververs de pagina om het opnieuw te proberen.</p>}

        {!isGuest && (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select value={year} onChange={e => setYear(e.target.value)} aria-label="Schooljaar"
              className="border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:w-48">
              <option value="">Alle schooljaren</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex bg-indigo-50 rounded-xl p-1 self-start" role="group" aria-label="Periode">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)} aria-pressed={period === p.value} className={segment(period === p.value)}>{p.label}</button>
              ))}
            </div>
          </div>
        )}

        <motion.div
          key={`${year}|${period}|${extra.length}`}
          initial={{ opacity: reduced ? 1 : 0.35 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          className="space-y-5"
        >
          {!enough ? (
            <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-10 text-center">
              <span className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Target className="w-6 h-6" strokeWidth={2} /></span>
              <p className="text-base font-semibold text-slate-900 dark:text-white mt-3">Je resultaten worden steeds interessanter naarmate je meer leermomenten registreert.</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Log minstens {MIN_MOMENTS} leermomenten om je studiepatronen te ontdekken.
                {selected.length > 0 ? ` In deze selectie staan er nu ${selected.length}.` : ''}
              </p>
              {userId ? (
                <button onClick={() => setFormOpen(true)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2.5 hover:bg-indigo-700">
                  <Plus className="w-4 h-4" strokeWidth={2.5} /> Leermoment toevoegen
                </button>
              ) : (
                <Link href="/leermomenten" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-4 py-2.5 hover:bg-indigo-700"><Plus className="w-4 h-4" strokeWidth={2.5} /> Leermoment toevoegen</Link>
              )}
            </section>
          ) : (
            <>
              <Card title="Tijd per vak" subtitle="Van meeste naar minste studietijd" insight={subjectInsight(perSubject)}>
                <ul className="space-y-1">
                  {perSubject.map((r, i) => (
                    <MeterRow key={r.name} wide label={r.name} dot={colorOf(r.name)} color={colorOf(r.name)} pct={Math.max(2, (r.minutes / perSubject[0].minutes) * 100)}
                      value={`${formatMinutes(r.minutes)} · ${pcts[i]}%`} delay={i * 0.04} reduced={reduced} />
                  ))}
                </ul>
              </Card>

              <Card
                title="Verdeling over tijd"
                subtitle={`Studietijd per week, opgedeeld per vak (laatste ${weeks.length} weken)`}
                insight={trendInsight(weeks)}
                action={spansMoreThan8 ? (
                  <div className="flex bg-indigo-50 rounded-lg p-0.5 shrink-0" role="group" aria-label="Aantal weken">
                    {([8, 12] as const).map(n => (
                      <button key={n} onClick={() => setWeeksShown(n)} aria-pressed={weeksShown === n}
                        className={`text-xs font-medium px-2.5 py-1 rounded-md ${weeksShown === n ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{n} weken</button>
                    ))}
                  </div>
                ) : undefined}
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weekData} margin={{ top: 16, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#2a2a45' : '#e2e8f0'} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={{ stroke: dark ? '#334155' : '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={false} width={44} allowDecimals={false}
                      label={{ value: 'minuten', angle: -90, position: 'insideLeft', offset: 8, style: { fontSize: 11, fill: axis, textAnchor: 'middle' } }} />
                    <Tooltip
                      cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.06)' }}
                      trigger="hover"
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const w = (payload[0].payload as { _w: ReturnType<typeof weeklyBySubject>[number] })._w
                        return (
                          <div className="rounded-xl border border-indigo-100 bg-white dark:bg-[#1a1a2e] shadow-lg px-3 py-2 text-xs">
                            <p className="font-semibold text-slate-900 dark:text-white">Week {w.week} · {formatDay(w.start).replace(/^\S+ /, '')} – {formatDay(w.end).replace(/^\S+ /, '')}</p>
                            <p className="text-slate-700 dark:text-slate-200 mt-0.5">Totaal {w.total > 0 ? formatMinutes(w.total) : 'geen studietijd'}</p>
                            {weekKeys.filter(k => w.bySubject[k]).map(k => (
                              <p key={k} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorOf(k) }} />{k}: {formatMinutes(w.bySubject[k])}</p>
                            ))}
                          </div>
                        )
                      }}
                    />
                    {weekKeys.map((k, i) => (
                      <Bar key={k} dataKey={k} stackId="week" fill={colorOf(k)} maxBarSize={36} radius={i === weekKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Wanneer studeer je?" subtitle="Op welke dagen en momenten je studeert in deze selectie">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Studietijd per weekdag</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Opgetelde studietijd per dag van de week</p>
                    <div className="mt-4 h-40 flex items-end gap-2" onMouseLeave={() => setActiveDay(null)}>
                      {weekday.map((min, i) => {
                        const h = weekdayMax ? Math.max(min > 0 ? 4 : 0, (min / weekdayMax) * 100) : 0
                        return (
                          <button key={i} type="button" className="relative flex-1 h-full flex flex-col justify-end items-center group focus:outline-none"
                            onMouseEnter={() => setActiveDay(i)} onFocus={() => setActiveDay(i)} onClick={() => setActiveDay(i)}
                            aria-label={`${WEEKDAY_FULL[i]}: ${min > 0 ? formatMinutes(min) : 'geen studietijd'}`}>
                            {activeDay === i && (
                              <span className="absolute z-10 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[11px] px-2 py-1 shadow-lg" style={{ bottom: `calc(${h}% + 6px)` }}>
                                {min > 0 ? formatMinutes(min) : 'Geen studietijd'}
                              </span>
                            )}
                            <motion.span
                              className="w-full max-w-[36px] rounded-t-md bg-indigo-600 group-focus-visible:ring-2 group-focus-visible:ring-indigo-300"
                              style={{ opacity: min === weekdayMax && min > 0 ? 1 : 0.6 }}
                              initial={{ height: reduced ? `${h}%` : 0 }}
                              animate={{ height: `${h}%` }}
                              transition={{ duration: reduced ? 0 : 0.5, delay: reduced ? 0 : i * 0.04, ease: 'easeOut' }}
                            />
                          </button>
                        )
                      })}
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      {WEEKDAYS.map(d => <span key={d} className="flex-1 text-center text-xs text-slate-600 dark:text-slate-300">{d}</span>)}
                    </div>
                    {weekdayInsight(weekday) && <p className="mt-4 text-sm text-slate-800 dark:text-slate-100 bg-indigo-50 rounded-xl px-4 py-3">{weekdayInsight(weekday)}</p>}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Op welk moment studeer je?</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Op basis van de begintijd van je leermomenten</p>
                    {timed.length < MIN_MOMENTS ? (
                      <p className="mt-4 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3">
                        Deze analyse verschijnt zodra je bij minstens {MIN_MOMENTS} leermomenten invult hoe laat je begon (het veld &lsquo;Begonnen om&rsquo;).
                        {timed.length > 0 ? ` Nu hebben er ${timed.length} een begintijd.` : ' Oudere leermomenten hebben geen tijdstip.'}
                      </p>
                    ) : (
                      <>
                        <ul className="mt-4 space-y-1">
                          {DAY_PARTS.map((p, i) => (
                            <MeterRow key={p} label={p} color="#4f46e5" pct={dayPartPcts[i]} opacity={dayPartPcts[i] === Math.max(...dayPartPcts) ? 1 : 0.6}
                              value={`${formatMinutes(dayParts[p])} · ${dayPartPcts[i]}%`} delay={i * 0.04} reduced={reduced} />
                          ))}
                        </ul>
                        <p className="mt-4 text-sm text-slate-800 dark:text-slate-100 bg-indigo-50 rounded-xl px-4 py-3">
                          {dayPartInsight(dayParts)} <span className="text-slate-600 dark:text-slate-300">({timed.length} van {selected.length} leermomenten hebben een begintijd.)</span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {!isGuest && (
                <Card
                  title="Studie-inzet versus verwachting"
                  subtitle="Je gestudeerde tijd in deze selectie naast je eigen streefdoel per vak. Dit zijn persoonlijke doelen, geen beoordeling."
                  insight={goalInsight}
                >
                  {goalSubjects.length === 0 ? (
                    <p className="text-sm text-slate-700 dark:text-slate-200">Maak eerst je vakken aan bij <Link href="/vakken" className="font-medium text-indigo-700 dark:text-indigo-300">Vakken</Link>, dan kun je hier per vak een streefdoel instellen.</p>
                  ) : (
                    <>
                      {!goalSubjects.some(s => s.goal_minutes) && (
                        <p className="text-sm text-slate-700 dark:text-slate-200 mb-3">Je hebt nog geen persoonlijke studiedoelen. Stel per vak in hoeveel tijd je eraan wilt besteden, dan zie je hier hoe je ervoor staat.</p>
                      )}
                      <ul className="space-y-4">
                        {goalSubjects.map(s => {
                          const done = subjectMinutes[s.name] ?? 0
                          const goal = s.goal_minutes ?? 0
                          const scale = Math.max(goal, done) || 1
                          const color = colorOf(s.name)
                          return (
                            <li key={s.name}>
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex items-center gap-2 min-w-0 text-slate-900 dark:text-white font-medium">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
                                  <span className="truncate" title={s.name}>{s.name}</span>
                                </span>
                                {editingGoal === s.name ? (
                                  <form className="flex items-center gap-1.5" onSubmit={e => { e.preventDefault(); saveGoal(s) }}>
                                    <input type="number" min="0.5" step="0.5" value={goalInput} onChange={e => setGoalInput(e.target.value)} autoFocus aria-label={`Streefdoel ${s.name} in uren`}
                                      className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm" />
                                    <span className="text-xs text-slate-600 dark:text-slate-300">uur</span>
                                    <button className="text-xs font-semibold bg-indigo-600 text-white rounded-lg px-2.5 py-1.5">Opslaan</button>
                                    <button type="button" onClick={() => setEditingGoal(null)} aria-label="Annuleren" className="p-1 text-slate-500"><X className="w-4 h-4" /></button>
                                  </form>
                                ) : (
                                  <span className="flex items-center gap-2 shrink-0">
                                    <span className="text-slate-700 dark:text-slate-200 tabular-nums">
                                      {goal ? `${formatMinutes(done)} van ${formatMinutes(goal)} · ${Math.round((done / goal) * 100)}%` : formatMinutes(done)}
                                    </span>
                                    <button onClick={() => { setEditingGoal(s.name); setGoalInput(goal ? String(Math.round((goal / 60) * 10) / 10) : ''); setGoalError('') }}
                                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 rounded-md px-1.5 py-1 hover:bg-indigo-50" aria-label={`Streefdoel voor ${s.name} ${goal ? 'aanpassen' : 'instellen'}`}>
                                      <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> {goal ? 'Aanpassen' : 'Doel instellen'}
                                    </button>
                                  </span>
                                )}
                              </div>
                              {goal > 0 ? (
                              <div className="relative mt-1.5">
                                <Bar100 pct={(done / scale) * 100} color={color} delay={0} reduced={reduced} />
                                <span className="absolute -top-1 -bottom-1 w-0.5 bg-slate-900 dark:bg-white rounded" style={{ left: `calc(${(goal / scale) * 100}% - 1px)` }} title={`Streefdoel ${formatMinutes(goal)}`} aria-hidden />
                              </div>
                              ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nog geen streefdoel</p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                      {goalError && <p className="text-sm text-red-700 mt-3">{goalError}</p>}
                    </>
                  )}
                </Card>
              )}

              <Card title="Hoe besteed je je studietijd?" subtitle="Nieuwe stof, oefenen of herhalen" insight={typed.length >= MIN_MOMENTS ? typeInsight(typeTotals) : null}>
                {typed.length < MIN_MOMENTS ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-3">
                    Kies bij een nieuw leermoment het type: Nieuwe stof, Oefenen of Herhalen. Zodra er minstens {MIN_MOMENTS} een type hebben, zie je hier de verdeling.
                    {typed.length > 0 ? ` Nu hebben er ${typed.length} een type.` : ''}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {typeRows.map((r, i) => (
                      <MeterRow key={r.label} wide label={r.label} color={r.color} pct={typePcts[i]} opacity={i < 3 ? 1 - i * 0.2 : 1}
                        value={`${formatMinutes(r.minutes)} · ${typePcts[i]}%`} delay={i * 0.04} reduced={reduced} />
                    ))}
                  </ul>
                )}
              </Card>
            </>
          )}
        </motion.div>
      </main>

      {formOpen && userId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setFormOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Nieuw leermoment" className="w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <MomentForm
              userId={userId}
              subjects={subjects.filter(s => s.is_active !== false).map(s => s.name)}
              colors={colors}
              variant="modal"
              onClose={() => setFormOpen(false)}
              onSaved={m => setExtra(list => [m, ...list])}
            />
          </div>
        </div>
      )}
    </div>
  )
}
