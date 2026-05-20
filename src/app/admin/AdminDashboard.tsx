'use client'

import { useState } from 'react'

const EVENT_LABELS: Record<string, string> = {
  session_start: 'Pagina bezocht',
  add_moment: 'Leermoment toegevoegd',
  delete_moment: 'Leermoment verwijderd',
  add_subject: 'Vak aangemaakt',
  delete_subject: 'Vak verwijderd',
  signup_click: 'Inlogknop geklikt',
}

const EVENT_COLORS: Record<string, string> = {
  session_start: 'bg-gray-100 text-gray-500',
  add_moment: 'bg-indigo-100 text-indigo-600',
  delete_moment: 'bg-red-100 text-red-500',
  add_subject: 'bg-violet-100 text-violet-600',
  delete_subject: 'bg-red-100 text-red-500',
  signup_click: 'bg-orange-100 text-orange-600',
}

type Event = {
  id: string
  session_id: string
  event_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

type Props = {
  events: Event[]
  totalSessions: number
  sessionsToday: number
  sessionsThisWeek: number
  sessionsThisMonth: number
  activeSessions: number
  signupClicks: number
  eventCounts: Record<string, number>
  topCats: [string, number][]
  recentSessions: [string, Event[]][]
  dailyCounts: { date: string; count: number; sessions: number }[]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'zojuist'
  if (m < 60) return `${m} min geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} uur geleden`
  return `${Math.floor(h / 24)} dagen geleden`
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtDay(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function AdminDashboard({
  totalSessions, sessionsToday, sessionsThisWeek, sessionsThisMonth,
  activeSessions, signupClicks, eventCounts, topCats, recentSessions, dailyCounts,
}: Props) {
  const [tab, setTab] = useState<'overzicht' | 'sessies' | 'acties'>('overzicht')
  const [sessionFilter, setSessionFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const conversionPct = totalSessions > 0 ? Math.round((signupClicks / totalSessions) * 100) : 0
  const activePct = totalSessions > 0 ? Math.round((activeSessions / totalSessions) * 100) : 0
  const maxDaily = Math.max(...dailyCounts.map(d => d.sessions), 1)
  const maxEvents = Math.max(...Object.values(eventCounts), 1)

  const filteredSessions = recentSessions.filter(([, evs]) => {
    const actions = evs.filter(e => e.event_type !== 'session_start')
    if (sessionFilter === 'active') return actions.length > 0
    if (sessionFilter === 'inactive') return actions.length === 0
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gastactiviteiten</h1>
            <p className="text-sm text-gray-400 mt-0.5">Knowl admin · alleen zichtbaar voor jou</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-medium">Live data</span>
          </div>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-6 flex gap-1 border-t border-gray-100">
          {(['overzicht', 'sessies', 'acties'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t === 'overzicht' ? 'Overzicht' : t === 'sessies' ? 'Sessies' : 'Acties & Vakken'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── TAB: OVERZICHT ── */}
        {tab === 'overzicht' && (
          <div className="space-y-6">

            {/* Statistieken */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Alle sessies', value: totalSessions, sub: 'ooit', color: 'text-indigo-600' },
                { label: 'Deze maand', value: sessionsThisMonth, sub: 'unieke bezoekers', color: 'text-violet-600' },
                { label: 'Deze week', value: sessionsThisWeek, sub: 'unieke bezoekers', color: 'text-blue-600' },
                { label: 'Vandaag', value: sessionsToday, sub: 'unieke bezoekers', color: 'text-sky-600' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className={`text-4xl font-bold ${color}`}>{value}</p>
                  <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>

            {/* Conversie-funnel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-800 mb-1">Conversie-funnel</h2>
              <p className="text-xs text-gray-400 mb-5">Van bezoeker naar gebruiker</p>
              <div className="space-y-3">
                {[
                  { label: 'Bezoekers', value: totalSessions, pct: 100, color: 'bg-indigo-500', desc: 'Iedereen die de site opende' },
                  { label: 'Actief gedaan', value: activeSessions, pct: activePct, color: 'bg-violet-500', desc: 'Deed minstens één actie' },
                  { label: 'Inlogknop geklikt', value: signupClicks, pct: conversionPct, color: 'bg-orange-400', desc: 'Klikte op "Inloggen / aanmelden"' },
                ].map(({ label, value, pct, color, desc }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                        <span className="text-xs text-gray-400 ml-2">{desc}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-800">{value}</span>
                        <span className="text-xs text-gray-400 ml-1">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activiteit laatste 7 dagen */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-800 mb-1">Activiteit afgelopen 7 dagen</h2>
              <p className="text-xs text-gray-400 mb-5">Unieke bezoekers per dag</p>
              {dailyCounts.every(d => d.sessions === 0) ? (
                <p className="text-sm text-gray-400 text-center py-6">Nog geen data voor de afgelopen week</p>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {dailyCounts.map(({ date, sessions }) => (
                    <div key={date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-indigo-600">{sessions > 0 ? sessions : ''}</span>
                      <div className="w-full flex items-end" style={{ height: '80px' }}>
                        <div
                          className="w-full bg-indigo-100 rounded-t-lg hover:bg-indigo-200 transition-colors"
                          style={{ height: `${Math.max((sessions / maxDaily) * 80, sessions > 0 ? 4 : 0)}px` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 text-center leading-tight">{fmtDay(date).split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: SESSIES ── */}
        {tab === 'sessies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{recentSessions.length} meest recente sessies</p>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {([['all', 'Alle'], ['active', 'Actief'], ['inactive', 'Passief']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSessionFilter(val)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sessionFilter === val ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <p className="text-gray-400 text-sm">Geen sessies gevonden</p>
              </div>
            ) : (
              filteredSessions.map(([sessionId, sessionEvents]) => {
                const first = sessionEvents[sessionEvents.length - 1]
                const last = sessionEvents[0]
                const actionEvents = sessionEvents.filter(e => e.event_type !== 'session_start')
                const hasSignup = sessionEvents.some(e => e.event_type === 'signup_click')

                return (
                  <div key={sessionId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{sessionId.slice(0, 12)}…</span>
                        {hasSignup && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full font-medium">Inlogknop geklikt</span>
                        )}
                        {actionEvents.length === 0 && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full">Alleen gekeken</span>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${actionEvents.length > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}>
                        {actionEvents.length} {actionEvents.length === 1 ? 'actie' : 'acties'}
                      </span>
                    </div>

                    <div className="flex gap-4 text-xs text-gray-400 mb-4">
                      <span>Eerste bezoek: <span className="text-gray-600">{fmt(first.created_at)}</span></span>
                      <span>Laatste actie: <span className="text-gray-600">{timeAgo(last.created_at)}</span></span>
                    </div>

                    {actionEvents.length > 0 ? (
                      <div className="border-l-2 border-indigo-100 pl-4 space-y-2">
                        {actionEvents.map(e => (
                          <div key={e.id} className="flex items-center gap-3">
                            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${EVENT_COLORS[e.event_type] ?? 'bg-gray-100 text-gray-500'}`}>
                              {EVENT_LABELS[e.event_type] ?? e.event_type}
                            </span>
                            {e.metadata?.category != null && (
                              <span className="text-xs text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">{String(e.metadata.category)}</span>
                            )}
                            {e.metadata?.duration_minutes != null && (
                              <span className="text-xs text-gray-400">{String(e.metadata.duration_minutes)} min</span>
                            )}
                            <span className="text-xs text-gray-300 ml-auto">{timeAgo(e.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 italic">Deze bezoeker heeft alleen rondgekeken zonder iets te doen.</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── TAB: ACTIES & VAKKEN ── */}
        {tab === 'acties' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-800 mb-1">Acties breakdown</h2>
              <p className="text-xs text-gray-400 mb-5">Wat doen gasten het meest?</p>
              <div className="space-y-4">
                {Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${EVENT_COLORS[type] ?? 'bg-gray-100 text-gray-500'}`}>
                        {EVENT_LABELS[type] ?? type}
                      </span>
                      <span className="text-sm font-bold text-gray-700">{count}×</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(count / maxEvents) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {Object.keys(eventCounts).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Nog geen acties gelogd</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-800 mb-1">Populaire vakken</h2>
              <p className="text-xs text-gray-400 mb-5">Vakken die gasten zelf invoeren bij leermomenten</p>
              {topCats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nog geen vakken gelogd</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topCats.map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-2">
                      <span className="text-sm font-medium text-violet-700">{cat}</span>
                      <span className="text-xs bg-violet-200 text-violet-600 rounded-full px-2 py-0.5 font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
