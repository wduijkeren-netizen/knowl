'use client'

import Nav from '@/components/Nav'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
]

const LOCALE_MAP: Record<string, string> = {
  nl: 'nl-NL', en: 'en-GB', es: 'es-ES', pt: 'pt-PT',
  fr: 'fr-FR', de: 'de-DE', da: 'da-DK', sv: 'sv-SE', no: 'nb-NO',
}

type Moment = {
  category: string | null
  duration_minutes: number | null
  learned_at?: string
}

type Props = {
  moments: Moment[]
  isGuest?: boolean
}

const DEMO_MOMENTS = [
  { category: 'Recht', duration_minutes: 180 },
  { category: 'Wiskunde', duration_minutes: 120 },
  { category: 'Economie', duration_minutes: 90 },
  { category: 'Nederlands', duration_minutes: 60 },
  { category: 'Engels', duration_minutes: 45 },
]

export default function Resultaten({ moments, isGuest }: Props) {
  const { lang, tr } = useLanguage()
  const r = tr.results
  const locale = LOCALE_MAP[lang] ?? 'nl-NL'

  // Dag-van-de-week data (Ma=0 … Zo=6)
  const perWeekday: number[] = Array(7).fill(0)
  for (const m of moments) {
    if (!m.learned_at) continue
    const d = new Date(m.learned_at + 'T12:00:00').getDay()
    const idx = d === 0 ? 6 : d - 1
    perWeekday[idx] += m.duration_minutes ?? 0
  }
  const weekdayData = perWeekday.map((min, i) => {
    const refDate = new Date('2024-01-01T12:00:00') // Monday
    refDate.setDate(refDate.getDate() + i)
    return { dag: refDate.toLocaleString(locale, { weekday: 'short' }), minuten: min }
  })

  const sourceMoments = isGuest && moments.length === 0 ? DEMO_MOMENTS : moments

  const perCategory = sourceMoments.reduce<Record<string, number>>((acc, m) => {
    const key = m.category || 'Overig'
    acc[key] = (acc[key] ?? 0) + (m.duration_minutes ?? 0)
    return acc
  }, {})

  const barData = Object.entries(perCategory)
    .map(([vak, minuten]) => ({ vak, minuten }))
    .sort((a, b) => b.minuten - a.minuten)

  const radarData = barData.map(({ vak, minuten }) => ({ vak, minuten }))
  const isDemo = isGuest && moments.length === 0
  const heeftData = barData.length > 0 && barData.some(d => d.minuten > 0)
  const totaalMinuten = barData.reduce((sum, d) => sum + d.minuten, 0)

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{r.title}</h1>
          <p className="text-sm text-indigo-400 mt-1">{r.subtitle}</p>
        </div>

        {isDemo && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex justify-between items-center gap-4">
            <p className="text-sm text-indigo-600">
              Dit zijn voorbeeldresultaten.{' '}
              <a href="/login?signup=true" className="font-semibold underline hover:text-indigo-800">Maak een account aan</a>{' '}
              om jouw eigen data te zien.
            </p>
          </div>
        )}

        {!heeftData ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-16 text-center">
            <p className="text-indigo-300 text-sm">{r.empty}</p>
            <a href="/leermomenten" className="mt-4 inline-block text-sm bg-indigo-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors">
              Voeg een leermoment toe →
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{r.totalMinutes}</p>
                <p className="text-4xl font-bold text-indigo-700 mt-2">{totaalMinuten}</p>
              </div>
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{r.subjectsTracked}</p>
                <p className="text-4xl font-bold text-indigo-700 mt-2">{barData.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
                <h2 className="font-semibold text-white">{r.barTitle}</h2>
                <p className="text-indigo-200 text-sm mt-0.5">{r.barSub}</p>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {barData.map((d, i) => (
                    <div key={d.vak} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-500">{d.vak}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                    <XAxis dataKey="vak" tick={{ fontSize: 12, fill: '#818cf8' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#818cf8' }} unit=" min" />
                    <Tooltip
                      formatter={(value) => [`${value}${r.minutesSuffix}`, r.time]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e0e7ff', fontSize: '13px' }}
                    />
                    <Bar dataKey="minuten" radius={[8, 8, 0, 0]}>
                      {barData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
                <h2 className="font-semibold text-white">{r.radarTitle}</h2>
                <p className="text-violet-200 text-sm mt-0.5">{r.radarSub}</p>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e0e7ff" />
                    <PolarAngleAxis dataKey="vak" tick={{ fontSize: 12, fill: '#818cf8' }} />
                    <PolarRadiusAxis tick={{ fontSize: 10, fill: '#c7d2fe' }} />
                    <Radar dataKey="minuten" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                    <Tooltip
                      formatter={(value) => [`${value}${r.minutesSuffix}`, r.time]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e0e7ff', fontSize: '13px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {/* Dag-van-de-week */}
            {perWeekday.some(m => m > 0) && (
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                  <h2 className="font-semibold text-white">{tr.wrapped.thisWeek.replace('week', 'weekdag')}</h2>
                  <p className="text-emerald-100 text-sm mt-0.5">Minuten per dag van de week</p>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weekdayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                      <XAxis dataKey="dag" tick={{ fontSize: 12, fill: '#818cf8' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#818cf8' }} unit=" min" />
                      <Tooltip
                        formatter={(v) => [`${v} min`, r.time]}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e0e7ff', fontSize: '13px' }}
                      />
                      <Bar dataKey="minuten" radius={[6, 6, 0, 0]}>
                        {weekdayData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
