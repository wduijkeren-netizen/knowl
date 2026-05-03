'use client'

import Nav from '@/components/Nav'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type Props = {
  user: User
  allMoments: { duration_minutes: number | null; learned_at: string }[]
  thisMonth: { category: string | null; duration_minutes: number | null }[]
  subjects: { name: string; goal_minutes: number | null; goal_date: string | null; recurring_type: string | null; recurring_goal_minutes: number | null }[]
  displayName: string | null
}

const TIMEFRAMES = [
  { label: '7 dagen', days: 7 },
  { label: '30 dagen', days: 30 },
  { label: '3 maanden', days: 90 },
  { label: 'Alles', days: null },
]

export default function HomePage({ user, allMoments, thisMonth, subjects, displayName }: Props) {
  const [timeframe, setTimeframe] = useState<number | null>(30)

  const totalMinutes = allMoments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const monthMinutes = thisMonth.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)

  const streak = (() => {
    const days = Array.from(new Set(allMoments.map(m => m.learned_at))).sort().reverse()
    if (!days.length) return 0
    let count = 1
    const today = new Date().toISOString().split('T')[0]
    if (days[0] !== today) return 0
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000
      if (diff === 1) count++
      else break
    }
    return count
  })()

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

  const shortcuts = [
    { href: '/leermomenten', label: 'Leermoment toevoegen', sub: 'Log wat je vandaag hebt geleerd', gradient: true },
    { href: '/pomodoro', label: 'Pomodoro starten', sub: 'Focus in blokken van 25 minuten', gradient: false },
    { href: '/resultaten', label: 'Resultaten bekijken', sub: 'Grafieken per vak', gradient: false },
    { href: '/wrapped', label: 'Maandoverzicht', sub: 'Jouw maandwrap', gradient: false },
  ]

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Hoi, {firstName}</h1>
          <p className="text-indigo-400 mt-1">Welkom terug bij Knowl. Hier is je overzicht.</p>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Totaal uren</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{totalHours}<span className="text-xl text-indigo-300">u</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Deze maand</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{monthMinutes}<span className="text-xl text-indigo-300">m</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Streak</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{streak}<span className="text-xl text-indigo-300">d</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Topvak</p>
            <p className="text-lg font-bold text-indigo-700 mt-2 truncate">{topVak?.[0] ?? '—'}</p>
          </div>
        </div>

        {/* Cumulatieve grafiek */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-indigo-900">Cumulatief geleerd</h2>
              <p className="text-xs text-indigo-400 mt-0.5">Totaal minuten in de loop van de tijd</p>
            </div>
            <div className="flex gap-1 bg-indigo-50 rounded-xl p-1">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf.label}
                  onClick={() => setTimeframe(tf.days)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    timeframe === tf.days
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-indigo-300 text-sm">Nog geen data in dit tijdframe</p>
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
              <h2 className="font-semibold text-indigo-900">Voortgang doelen</h2>
              <Link href="/vakken" className="text-xs text-indigo-400 hover:text-indigo-600">Beheren →</Link>
            </div>
            <div className="space-y-4">
              {subjects.filter(s => s.goal_minutes).map(subject => {
                const done = thisMonth.filter(m => m.category === subject.name).reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
                const progress = Math.min(100, Math.round((done / subject.goal_minutes!) * 100))
                const days = subject.goal_date ? Math.ceil((new Date(subject.goal_date).getTime() - Date.now()) / 86400000) : null
                return (
                  <div key={subject.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-indigo-800">{subject.name}</span>
                      <div className="flex gap-2 items-center">
                        {days !== null && (
                          <span className={`text-xs ${days < 7 ? 'text-red-400' : 'text-indigo-300'}`}>nog {days}d</span>
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
