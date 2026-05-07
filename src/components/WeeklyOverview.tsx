'use client'

import Nav from '@/components/Nav'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Moment = {
  title: string
  category: string | null
  duration_minutes: number | null
  learned_at: string
}

type Props = {
  moments: Moment[]
  weekStart: string
}

const LOCALE_MAP: Record<string, string> = {
  nl: 'nl-NL', en: 'en-GB', es: 'es-ES', pt: 'pt-PT',
  fr: 'fr-FR', de: 'de-DE', da: 'da-DK', sv: 'sv-SE', no: 'nb-NO',
}

export default function WeeklyOverview({ moments, weekStart }: Props) {
  const { lang, tr } = useLanguage()
  const w = tr.wrapped
  const locale = LOCALE_MAP[lang] ?? 'nl-NL'

  const totalMinutes = moments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const restMinutes = totalMinutes % 60

  const perCategory: Record<string, number> = {}
  for (const m of moments) {
    const key = m.category || 'Overig'
    perCategory[key] = (perCategory[key] ?? 0) + (m.duration_minutes ?? 0)
  }
  const topVak = Object.entries(perCategory).sort((a, b) => b[1] - a[1])[0]

  // Minutes per day of week (Mon=0 … Sun=6)
  const perDay: number[] = Array(7).fill(0)
  for (const m of moments) {
    const d = new Date(m.learned_at + 'T12:00:00').getDay()
    const idx = d === 0 ? 6 : d - 1 // Mon=0
    perDay[idx] += m.duration_minutes ?? 0
  }

  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return d.toLocaleString(locale, { weekday: 'short' })
  })

  const maxDay = Math.max(...perDay, 1)
  const weekStartDate = new Date(weekStart + 'T12:00:00')
  const weekEndDate = new Date(weekStart + 'T12:00:00')
  weekEndDate.setDate(weekEndDate.getDate() + 6)

  const weekLabel = `${weekStartDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${weekEndDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 text-white text-center">
          <p className="text-indigo-200 text-sm uppercase tracking-widest font-medium">{w.weekTitle}</p>
          <h1 className="text-3xl font-bold mt-2">{weekLabel}</h1>
          <p className="text-indigo-200 mt-2 text-sm">
            {moments.length === 0 ? w.noWeekMoments : `${moments.length} ${w.moments} ${w.logged}`}
          </p>
        </div>

        {moments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center">
            <p className="text-indigo-300 text-sm">{w.noWeekMoments}</p>
            <Link href="/leermomenten" className="text-indigo-500 text-sm mt-2 inline-block hover:underline">{w.goTo}</Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 text-center">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.hoursLearned}</p>
                <p className="text-3xl font-bold text-indigo-700 mt-2">{totalHours}<span className="text-lg text-indigo-300">u {restMinutes}m</span></p>
              </div>
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 text-center">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.moments}</p>
                <p className="text-3xl font-bold text-indigo-700 mt-2">{moments.length}</p>
              </div>
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 text-center">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{w.topSubject}</p>
                <p className="text-lg font-bold text-indigo-700 mt-2 truncate">{topVak?.[0] ?? '—'}</p>
              </div>
            </div>

            {/* Dag-van-de-week grafiek */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
              <h2 className="font-semibold text-indigo-900 mb-4">{w.thisWeek}</h2>
              <div className="flex items-end gap-2 h-32">
                {perDay.map((min, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-500 to-violet-500 transition-all"
                      style={{ height: `${Math.round((min / maxDay) * 96)}px`, minHeight: min > 0 ? '4px' : '0' }} />
                    <span className="text-xs text-indigo-400">{dayLabels[i]}</span>
                    {min > 0 && <span className="text-xs font-medium text-indigo-600">{min}m</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Verdeling per vak */}
            {Object.keys(perCategory).length > 0 && (
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
                <h2 className="font-semibold text-indigo-900 mb-4">{w.distribution}</h2>
                <div className="space-y-3">
                  {Object.entries(perCategory).sort((a, b) => b[1] - a[1]).map(([vak, min]) => (
                    <div key={vak}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-indigo-800">{vak}</span>
                        <span className="text-indigo-400">{min} {w.min}</span>
                      </div>
                      <div className="h-2 bg-indigo-50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${Math.round((min / totalMinutes) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alle momenten */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
              <h2 className="font-semibold text-indigo-900 mb-4">{w.allMoments}</h2>
              <div className="space-y-2">
                {moments.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-indigo-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-indigo-800">{m.title}</p>
                      {m.category && <span className="text-xs text-indigo-400">{m.category}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.duration_minutes && <span className="text-xs text-violet-400">{m.duration_minutes} {w.min}</span>}
                      <span className="text-xs text-indigo-300">{new Date(m.learned_at + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}</span>
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
