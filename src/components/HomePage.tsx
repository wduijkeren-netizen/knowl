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
  allMoments: { duration_minutes: number | null; learned_at: string; category?: string | null }[]
  thisMonth: { category: string | null; duration_minutes: number | null }[]
  subjects: { name: string; goal_minutes: number | null; goal_date: string | null; recurring_type: string | null; recurring_goal_minutes: number | null }[]
  displayName: string | null
  studySessions: StudySession[]
}

const TIMEFRAME_DAYS = [7, 30, 90, null]

export default function HomePage({ user, allMoments, thisMonth, subjects, displayName, studySessions }: Props) {
  const { tr } = useLanguage()
  const h = tr.home
  const [timeframe, setTimeframe] = useState<number | null>(30)

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
      if (diff === 1) { run++; if (run % 3 === 0) earnedShields++ }
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
      if (diff === 1) count++
      else if (diff === 2 && freeUsed < maxFree) { count++; freeUsed++ }
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

  const firstName = displayName ?? user.email?.split('@')[0] ?? 'daar'

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
    { href: '/leermomenten', label: h.s1label, sub: h.s1sub, gradient: true },
    { href: '/pomodoro', label: h.s2label, sub: h.s2sub, gradient: false },
    { href: '/resultaten', label: h.s3label, sub: h.s3sub, gradient: false },
    { href: '/wrapped', label: h.s4label, sub: h.s4sub, gradient: false },
  ]

  const timeframeLabels = [`7 ${h.days}`, `30 ${h.days}`, `3 ${h.months}`, h.all]

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <OnboardingWizard isNewUser={allMoments.length === 0} />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-indigo-900">{h.greeting?.replace('{name}', firstName) ?? `Hoi, ${firstName}`}</h1>
          <p className="text-indigo-400 mt-1">{h.greetingSub ?? 'Welkom terug bij Knowl. Hier is je overzicht.'}</p>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{h.totalHours}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{totalHours}<span className="text-xl text-indigo-300">u</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{h.thisMonth}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{monthMinutes}<span className="text-xl text-indigo-300">m</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{h.streak}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{streak}<span className="text-xl text-indigo-300">d</span></p>
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
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Studietijd deze week</p>
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
            <div className="h-48 flex items-center justify-center">
              <p className="text-indigo-300 text-sm">{h.noData}</p>
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
              className={`rounded-2xl p-6 transition-all ${
                s.gradient
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white hover:opacity-90'
                  : 'bg-white border border-indigo-100 shadow-sm hover:shadow-md'
              }`}
            >
              <p className={`font-semibold ${s.gradient ? 'text-white' : 'text-indigo-900'}`}>{s.label}</p>
              <p className={`text-sm mt-1 ${s.gradient ? 'text-indigo-200' : 'text-indigo-400'}`}>{s.sub}</p>
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
      </main>
    </div>
  )
}
