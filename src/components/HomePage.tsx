'use client'

import Nav from '@/components/Nav'
import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import OnboardingWizard from '@/components/OnboardingWizard'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type StudySession = { activity: string; duration_seconds: number; created_at: string }

type Props = {
  user: User
  allMoments: { id?: string; title?: string; duration_minutes: number | null; learned_at: string; category?: string | null }[]
  thisMonth: { category: string | null; duration_minutes: number | null }[]
  subjects: { name: string; goal_minutes: number | null; goal_date: string | null; recurring_type: string | null; recurring_goal_minutes: number | null }[]
  displayName: string | null
  studySessions: StudySession[]
  examEvents: { id: string; date: string; title: string; subject: string | null }[]
  todaySlots: { id: string; day_of_week: number; start_time: string; end_time: string; label: string }[]
}

function getFreeBlocks(slots: { id: string; day_of_week: number; start_time: string; end_time: string; label: string }[]) {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const toStr = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
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

const TIMEFRAME_DAYS = [7, 30, 90, null]

export default function HomePage({ user, allMoments, thisMonth, subjects, displayName, studySessions, examEvents, todaySlots }: Props) {
  const { tr } = useLanguage()
  const h = tr.home
  const r = tr.rooster
  const [timeframe, setTimeframe] = useState<number | null>(30)
  const [search, setSearch] = useState('')
  const searchResults = search.trim() ? allMoments.filter(m => (m.title ?? '').toLowerCase().includes(search.toLowerCase()) || (m.category ?? '').toLowerCase().includes(search.toLowerCase())).slice(0, 8) : []

  const totalMinutes = allMoments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const monthMinutes = thisMonth.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)

  const [usedShields, setUsedShields] = useState(0)
  useEffect(() => {
    try {
      const s = parseInt(localStorage.getItem('knowl_used_shields') ?? '0')
      setUsedShields(isNaN(s) ? 0 : s)
    } catch {}
  }, [])

  // Streak + shields calculation
  const { streak, shields } = useMemo(() => {
    const days = Array.from(new Set(allMoments.map(m => m.learned_at))).sort()
    if (!days.length) return { streak: 0, shields: 0 }

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Count shields earned: every 3 consecutive days = 1 shield
    let earnedShields = 0
    let run = 1
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) / 86400000
      if (Math.round(diff) === 1) { run++; if (run % 3 === 0) earnedShields++ }
      else run = 1
    }
    const availableShields = Math.max(0, earnedShields - usedShields)

    // Streak: consecutive days from today (or yesterday), with 1 free day per 7 exempt
    const rev = [...days].reverse()
    if (rev[0] !== today && rev[0] !== yesterday) {
      // Potentially broken — check if shields cover the gap
      if (availableShields > 0) return { streak: 1, shields: availableShields }
      return { streak: 0, shields: availableShields }
    }

    let count = 1
    let freeUsed = 0
    const maxFree = Math.floor(days.length / 7) // 1 free day per 7 days

    for (let i = 1; i < rev.length; i++) {
      const diff = (new Date(rev[i - 1]).getTime() - new Date(rev[i]).getTime()) / 86400000
      if (Math.round(diff) === 1) count++
      else if (Math.round(diff) === 2 && freeUsed < maxFree) { count++; freeUsed++ }
      else { break }
    }
    return { streak: count, shields: availableShields }
  }, [allMoments, usedShields])

  const perCategory: Record<string, number> = {}
  for (const m of thisMonth) {
    const key = m.category || 'Overig'
    perCategory[key] = (perCategory[key] ?? 0) + (m.duration_minutes ?? 0)
  }
  const topVak = Object.entries(perCategory).sort((a, b) => b[1] - a[1])[0]

  const minutesPerSubject = allMoments.reduce((acc, m) => {
    if (m.category && m.duration_minutes) acc[m.category] = (acc[m.category] ?? 0) + m.duration_minutes
    return acc
  }, {} as Record<string, number>)

  const chartData = useMemo(() => {
    const cutoff = timeframe
      ? new Date(Date.now() - timeframe * 86400000).toISOString().split('T')[0]
      : null

    const filtered = cutoff
      ? allMoments.filter(m => m.learned_at >= cutoff)
      : allMoments

    if (!filtered.length) return []

    const perDay: Record<string, number> = {}
    for (const m of filtered) {
      perDay[m.learned_at] = (perDay[m.learned_at] ?? 0) + (m.duration_minutes ?? 0)
    }

    const sorted = Object.entries(perDay).sort((a, b) => a[0].localeCompare(b[0]))
    let cumulative = 0
    return sorted.map(([date, minutes]) => {
      cumulative += minutes
      const d = new Date(date)
      const label = `${d.getDate()}/${d.getMonth() + 1}`
      return { label, cumulative }
    })
  }, [allMoments, timeframe])

  const firstName = displayName ?? user.email?.split('@')[0]?.split('+')[0] ?? 'daar'
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Goedemorgen' : hour < 18 ? 'Hoi' : 'Goedenavond'

  const studyMinutesThisWeek = Math.round(
    studySessions.reduce((s, x) => s + x.duration_seconds, 0) / 60
  )
  const activityLabels: Record<string, string> = {
    'flashcards': 'Flashcards',
    'flashcards-sr': 'Herhalen',
    'quiz': 'Quiz',
    'woordweb': 'Woordweb',
  }

  const shortcuts = [
    { href: '/leermomenten', label: h.s1label, sub: h.s1sub, gradient: true, emoji: '📝' },
    { href: '/pomodoro', label: h.s2label, sub: h.s2sub, gradient: false, emoji: '⏰' },
    { href: '/resultaten', label: h.s3label, sub: h.s3sub, gradient: false, emoji: '📊' },
    { href: '/wrapped', label: h.s4label, sub: h.s4sub, gradient: false, emoji: '📅' },
  ]

  const timeframeLabels = [`7 ${h.days}`, `30 ${h.days}`, `3 ${h.months}`, h.all]

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <OnboardingWizard isNewUser={allMoments.length === 0} />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-indigo-900">{h.greeting?.replace('{name}', firstName).replace('Hoi', timeGreeting) ?? `${timeGreeting}, ${firstName}`}</h1>
          <p className="text-indigo-400 mt-1">{h.greetingSub ?? 'Welkom terug bij Knowl. Hier is je overzicht.'}</p>
        </div>

        {/* Zoekbalk */}
        <div className="relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Zoek leermomenten..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all bg-white"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none">✕</button>}
        </div>

        {/* Zoekresultaten */}
        {search.trim() && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            {searchResults.length === 0 ? (
              <p className="text-sm text-indigo-300 text-center py-6">Geen momenten gevonden voor &ldquo;{search}&rdquo;</p>
            ) : (
              <div className="divide-y divide-indigo-50">
                {searchResults.map((m, i) => (
                  <div key={m.id ?? i} className="flex items-center justify-between px-4 py-3 gap-3 hover:bg-indigo-50/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-indigo-900 truncate">{m.title ?? '—'}</p>
                      <p className="text-xs text-indigo-400 mt-0.5">{m.learned_at}{m.category ? ` · ${m.category}` : ''}</p>
                    </div>
                    {m.duration_minutes && <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2 py-0.5 font-medium shrink-0">{m.duration_minutes} min</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Statistieken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{h.totalHours}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{totalHours}<span className="text-xl text-indigo-300">u</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{h.thisMonth}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{monthMinutes}<span className="text-xl text-indigo-300">m</span></p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-5 transition-all ${streak >= 7 ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50' : 'bg-white border-indigo-100'}`}>
            <p className={`text-xs font-medium uppercase tracking-wide ${streak >= 7 ? 'text-orange-400' : 'text-indigo-400'}`}>{h.streak}</p>
            <div className="flex items-end gap-1 mt-2">
              <p className={`text-4xl font-bold ${streak >= 7 ? 'text-orange-500' : 'text-indigo-700'}`}>{streak}</p>
              <span className={`text-xl pb-1 ${streak >= 7 ? 'text-orange-300' : 'text-indigo-300'}`}>d</span>
              {streak >= 1 && <span className="text-2xl pb-1 ml-1">{streak >= 30 ? '🔥🔥🔥' : streak >= 14 ? '🔥🔥' : '🔥'}</span>}
            </div>
            <p className={`text-xs mt-1 font-medium ${streak >= 7 ? 'text-orange-500' : 'text-indigo-400'}`}>
              {streak === 0 ? 'Begin vandaag! 💪' : streak >= 30 ? 'Legendarisch! 🏆' : streak >= 14 ? 'Je bent niet te stoppen!' : streak >= 7 ? 'Een week! Ga zo door!' : 'Goed bezig!'}
            </p>
            {shields > 0 && (
              <p className="text-xs text-amber-500 mt-1 font-medium">{'🛡️'.repeat(Math.min(shields, 5))} {h.shields}</p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{h.topSubject}</p>
            <p className="text-lg font-bold text-indigo-700 mt-2 truncate">{topVak?.[0] ?? '—'}</p>
          </div>
        </div>

        {/* Studietijd deze week */}
        {studySessions.length > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">⏱ Studietijd deze week</p>
              <span className="text-sm font-bold text-indigo-700">{studyMinutesThisWeek} min</span>
            </div>
            <div className="space-y-2">
              {Object.entries(
                studySessions.reduce((acc, s) => {
                  const key = activityLabels[s.activity] ?? s.activity
                  acc[key] = (acc[key] ?? 0) + s.duration_seconds
                  return acc
                }, {} as Record<string, number>)
              ).sort((a, b) => b[1] - a[1]).map(([label, secs]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                  <div className="flex-1 bg-indigo-50 rounded-full h-2">
                    <div className="bg-gradient-to-r from-indigo-400 to-violet-400 h-2 rounded-full"
                      style={{ width: `${Math.round((secs / studySessions.reduce((s, x) => s + x.duration_seconds, 0)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-indigo-400 w-10 text-right">{Math.round(secs / 60)}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cumulatieve grafiek */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-indigo-900">{h.cumulative}</h2>
              <p className="text-xs text-indigo-400 mt-0.5">{h.cumulativeSub}</p>
            </div>
            <div className="flex gap-1 bg-indigo-50 rounded-xl p-1">
              {TIMEFRAME_DAYS.map((days, i) => (
                <button
                  key={i}
                  onClick={() => setTimeframe(days)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    timeframe === days
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {timeframeLabels[i]}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2">
              <p className="text-4xl">📈</p>
              <p className="text-indigo-400 text-sm font-medium">{h.noData}</p>
              <p className="text-indigo-300 text-xs">Voeg je eerste leermoment toe om je grafiek te zien</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#a5b4fc' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#a5b4fc' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e0e7ff', fontSize: 12 }}
                  formatter={(v) => [`${v} min`, 'Cumulatief']}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="url(#lineGradient)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1' }}
                />
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Snelkoppelingen */}
        <div className="grid grid-cols-2 gap-4">
          {shortcuts.map(s => (
            <Link
              key={s.href}
              href={s.href}
              className={`rounded-2xl p-5 transition-all active:scale-95 ${
                s.gradient
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:opacity-90'
                  : 'bg-white border border-indigo-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <p className="text-2xl mb-2">{s.emoji}</p>
              <p className={`font-semibold text-sm ${s.gradient ? 'text-white' : 'text-indigo-900'}`}>{s.label}</p>
              <p className={`text-xs mt-0.5 ${s.gradient ? 'text-indigo-200' : 'text-indigo-400'}`}>{s.sub}</p>
            </Link>
          ))}
        </div>

        {/* Vakken doelen */}
        {subjects.filter(s => s.goal_minutes).length > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-indigo-900">{h.goalProgress}</h2>
              <Link href="/vakken" className="text-xs text-indigo-400 hover:text-indigo-600">{h.manage}</Link>
            </div>
            <div className="space-y-4">
              {subjects.filter(s => s.goal_minutes).map(subject => {
                const done = allMoments.filter(m => m.category === subject.name).reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
                const progress = Math.min(100, Math.round((done / subject.goal_minutes!) * 100))
                const days = subject.goal_date ? Math.ceil((new Date(subject.goal_date).getTime() - Date.now()) / 86400000) : null
                return (
                  <div key={subject.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-indigo-800">{subject.name}</span>
                      <div className="flex gap-2 items-center">
                        {days !== null && (
                          <span className={`text-xs ${days < 7 ? 'text-red-400' : 'text-indigo-300'}`}>{days}d</span>
                        )}
                        <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-indigo-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tentamenplanner */}
        {examEvents.length > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-indigo-900">{h.examPlanner}</h2>
            <p className="text-xs text-indigo-400 -mt-2">{h.examPlannerSub}</p>
            <div className="space-y-2">
              {examEvents.map(exam => {
                const daysLeft = Math.max(0, Math.ceil((new Date(exam.date).getTime() - Date.now()) / 86400000))
                const subject = exam.subject ? subjects.find(s => s.name === exam.subject) : undefined
                const goalMin = subject?.goal_minutes ?? 0
                const studiedMin = exam.subject ? (minutesPerSubject[exam.subject] ?? 0) : 0
                const remaining = Math.max(0, goalMin - studiedMin)
                const perDay = daysLeft > 0 && goalMin > 0 ? Math.ceil(remaining / daysLeft) : null
                const onTrack = goalMin === 0 || studiedMin >= goalMin
                const urgent = daysLeft <= 3
                return (
                  <div key={exam.id} className={`rounded-xl p-4 border ${onTrack ? 'bg-emerald-50 border-emerald-100' : urgent ? 'bg-red-50 border-red-100' : 'bg-indigo-50 border-indigo-100'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-indigo-900 truncate">{exam.title}</p>
                        <p className="text-xs text-indigo-400">{exam.subject}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-bold ${urgent ? 'text-red-600' : 'text-indigo-700'}`}>{daysLeft}</p>
                        <p className="text-xs text-indigo-300">{h.daysLeft}</p>
                      </div>
                    </div>
                    {goalMin > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-indigo-400">{studiedMin} / {goalMin} min</span>
                          {!onTrack && perDay !== null && <span className="font-semibold text-amber-600">{perDay} {h.minPerDay}</span>}
                          {onTrack && <span className="font-semibold text-emerald-600">{h.onTrack}</span>}
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(100, Math.round(studiedMin / goalMin * 100))}%` }} />
                        </div>
                      </div>
                    )}
                    {goalMin === 0 && <p className="text-xs text-indigo-300 mt-1">{h.noGoalSet}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Rooster vrije blokken */}
        {todaySlots.length > 0 && (() => {
          const freeBlocks = getFreeBlocks(todaySlots)
          if (freeBlocks.length === 0) return null
          const behindSubject = subjects
            .filter(s => s.goal_minutes && s.goal_minutes > (minutesPerSubject[s.name] ?? 0))
            .sort((a, b) => {
              const remA = (a.goal_minutes ?? 0) - (minutesPerSubject[a.name] ?? 0)
              const remB = (b.goal_minutes ?? 0) - (minutesPerSubject[b.name] ?? 0)
              return remB - remA
            })[0]
          return (
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-indigo-900">{h.freeStudyTime}</h2>
                  <p className="text-xs text-indigo-400">{h.freeStudyTimeSub}</p>
                </div>
                <a href="/rooster" className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors">{r.schedule}</a>
              </div>
              <div className="space-y-2">
                {freeBlocks.slice(0, 3).map((block, i) => (
                  <div key={i} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{block.start} – {block.end}</p>
                      <p className="text-xs text-emerald-500">{Math.round(block.minutes / 60 * 10) / 10} uur vrij</p>
                    </div>
                    {behindSubject && (
                      <div className="text-right">
                        <p className="text-xs text-emerald-600 font-medium">{r.suggestion}</p>
                        <p className="text-xs text-emerald-500 truncate max-w-[120px]">{behindSubject.name}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </main>
    </div>
  )
}
