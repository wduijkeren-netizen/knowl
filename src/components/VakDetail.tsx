'use client'

import Nav from '@/components/Nav'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Moment = {
  id: string
  title: string
  description: string | null
  learned_at: string
  duration_minutes: number | null
}

type Props = {
  vakNaam: string
  moments: Moment[]
  goalMinutes: number | null
  goalDate: string | null
}

export default function VakDetail({ vakNaam, moments, goalMinutes, goalDate }: Props) {
  const { tr } = useLanguage()
  const d = tr.detail
  const totalMinuten = moments.reduce((sum, m) => sum + (m.duration_minutes ?? 0), 0)
  const progress = goalMinutes ? Math.min(100, Math.round((totalMinuten / goalMinutes) * 100)) : null
  const daysLeft = goalDate ? Math.ceil((new Date(goalDate).getTime() - Date.now()) / 86400000) : null

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <Link href="/vakken" className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">
          {d.back}
        </Link>

        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold">{vakNaam}</h1>
          <div className="flex gap-6 mt-3">
            <div>
              <p className="text-indigo-200 text-xs uppercase tracking-wide">{d.momentsCount}</p>
              <p className="text-3xl font-bold mt-0.5">{moments.length}</p>
            </div>
            <div>
              <p className="text-indigo-200 text-xs uppercase tracking-wide">{d.minutesSpent}</p>
              <p className="text-3xl font-bold mt-0.5">{totalMinuten}</p>
            </div>
            {goalMinutes && (
              <div>
                <p className="text-indigo-200 text-xs uppercase tracking-wide">Doel</p>
                <p className="text-3xl font-bold mt-0.5">{goalMinutes} min</p>
              </div>
            )}
          </div>

          {progress !== null && (
            <div className="mt-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-indigo-200 text-sm">{totalMinuten} / {goalMinutes} minuten</span>
                <div className="flex items-center gap-3">
                  {daysLeft !== null && (
                    <span className={`text-sm font-medium ${daysLeft < 7 ? 'text-red-300' : daysLeft < 14 ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {daysLeft > 0 ? `nog ${daysLeft} dagen` : daysLeft === 0 ? 'vandaag deadline!' : 'deadline verlopen'}
                    </span>
                  )}
                  <span className="text-white font-bold text-lg">{progress}%</span>
                </div>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-400' : 'bg-white'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {moments.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center">
            <p className="text-indigo-300 text-sm">{d.empty} {vakNaam}.</p>
            <Link href="/" className="text-indigo-500 text-sm mt-2 inline-block hover:underline">
              {d.addLink}
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {moments.map((moment) => (
            <div key={moment.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm p-6">
              <div className="flex justify-between items-start gap-4">
                <h3 className="font-semibold text-indigo-900 text-base">{moment.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  {moment.duration_minutes && (
                    <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2.5 py-1 font-medium">
                      {moment.duration_minutes} min
                    </span>
                  )}
                  <span className="text-xs text-indigo-300">{moment.learned_at}</span>
                </div>
              </div>

              {moment.description ? (
                <div className="mt-4 bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">{d.summaryLabel}</p>
                  <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">{moment.description}</p>
                </div>
              ) : (
                <p className="text-sm text-indigo-300 mt-3 italic">{d.noSummary}</p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
