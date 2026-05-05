'use client'

import Nav from '@/components/Nav'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Moment = {
  title: string
  category: string | null
  learned_at: string
  duration_minutes: number | null
}

type Props = {
  thisMonth: Moment[]
  lastMonth: Moment[]
  monthName: string
  isGuest?: boolean
}

export default function MonthlyWrapped({ thisMonth, lastMonth, monthName, isGuest }: Props) {
  const { tr } = useLanguage()
  const w = tr.wrapped
  const totalMinutes = thisMonth.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const lastMonthMinutes = lastMonth.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const diffMinutes = totalMinutes - lastMonthMinutes
  const diffPercent = lastMonthMinutes > 0 ? Math.round((diffMinutes / lastMonthMinutes) * 100) : null

  const perCategory: Record<string, number> = {}
  for (const m of thisMonth) {
    const key = m.category || 'Overig'
    perCategory[key] = (perCategory[key] ?? 0) + (m.duration_minutes ?? 0)
  }
  const topVak = Object.entries(perCategory).sort((a, b) => b[1] - a[1])[0]

  const perDay: Record<string, number> = {}
  for (const m of thisMonth) {
    perDay[m.learned_at] = (perDay[m.learned_at] ?? 0) + 1
  }
  const topDay = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0]

  const dayNames: Record<number, string> = { 0: 'zondag', 1: 'maandag', 2: 'dinsdag', 3: 'woensdag', 4: 'donderdag', 5: 'vrijdag', 6: 'zaterdag' }
  const topDayName = topDay ? dayNames[new Date(topDay[0]).getDay()] : null

  const streak = (() => {
    const days = Array.from(new Set(thisMonth.map(m => m.learned_at))).sort().reverse()
    if (!days.length) return 0
    const today = new Date().toISOString().split('T')[0]
    if (days[0] !== today) return 0
    let count = 1
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000
      if (diff === 1) count++
      else break
    }
    return count
  })()

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {isGuest && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800">Je bekijkt Knowl als gast</p>
            <p className="text-sm text-amber-600 mt-0.5">Log in om je maandoverzicht te zien. <Link href="/login?signup=true" className="underline font-medium hover:text-amber-800">Maak een gratis account aan</Link></p>
          </div>
        )}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 text-white text-center">
          <p className="text-indigo-200 text-sm uppercase tracking-widest font-medium">{w.title}</p>
          <h1 className="text-4xl font-bold mt-2 capitalize">{monthName}</h1>
          <p className="text-indigo-200 mt-2 text-sm">
            {thisMonth.length === 0 ? w.noMoments : `${thisMonth.length} ${w.moments} gelogd`}
          </p>
        </div>

        {thisMonth.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center">
            <p className="text-indigo-300 text-sm">{w.addMoments}</p>
            <Link href="/leermomenten" className="text-indigo-500 text-sm mt-2 inline-block hover:underline">{w.goTo}</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.hoursLearned}</p>
                <p className="text-4xl font-bold text-indigo-700 mt-2">{totalHours}<span className="text-xl text-indigo-300">u</span></p>
                {diffPercent !== null && (
                  <p className={`text-xs mt-1 font-medium ${diffPercent >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {diffPercent >= 0 ? '+' : ''}{diffPercent}% {w.vsLastMonth}
                  </p>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.moments}</p>
                <p className="text-4xl font-bold text-indigo-700 mt-2">{thisMonth.length}</p>
                {lastMonth.length > 0 && (
                  <p className={`text-xs mt-1 font-medium ${thisMonth.length >= lastMonth.length ? 'text-emerald-500' : 'text-red-400'}`}>
                    {thisMonth.length >= lastMonth.length ? '+' : ''}{thisMonth.length - lastMonth.length} {w.vsLastMonth}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {topVak && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 col-span-1">
                  <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.topSubject}</p>
                  <p className="text-lg font-bold text-indigo-700 mt-2 leading-tight">{topVak[0]}</p>
                  <p className="text-xs text-indigo-300 mt-1">{topVak[1]} {w.min}</p>
                </div>
              )}
              {topDayName && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 col-span-1">
                  <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.busiestDay}</p>
                  <p className="text-lg font-bold text-indigo-700 mt-2 capitalize leading-tight">{topDayName}</p>
                  <p className="text-xs text-indigo-300 mt-1">{topDay[1]}{w.timesLogged}</p>
                </div>
              )}
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 col-span-1">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.streak}</p>
                <p className="text-4xl font-bold text-indigo-700 mt-2">{streak}</p>
                <p className="text-xs text-indigo-300 mt-1">{w.daysInRow}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
              <h2 className="font-semibold text-indigo-900 mb-4">{w.distribution}</h2>
              <div className="space-y-3">
                {Object.entries(perCategory).sort((a, b) => b[1] - a[1]).map(([vak, min]) => (
                  <div key={vak}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-indigo-800">{vak}</span>
                      <span className="text-indigo-400">{min} min</span>
                    </div>
                    <div className="h-2 bg-indigo-50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                        style={{ width: `${Math.round((min / totalMinutes) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
              <h2 className="font-semibold text-indigo-900 mb-4">{w.allMoments}</h2>
              <div className="space-y-2">
                {thisMonth.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-indigo-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-indigo-800">{m.title}</p>
                      {m.category && <span className="text-xs text-indigo-400">{m.category}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.duration_minutes && <span className="text-xs text-violet-400">{m.duration_minutes} min</span>}
                      <span className="text-xs text-indigo-300">{m.learned_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
