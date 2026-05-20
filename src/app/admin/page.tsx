import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = 'wduijkeren@hotmail.nl'

const EVENT_LABELS: Record<string, string> = {
  session_start: 'Sessie gestart',
  add_moment: 'Leermoment toegevoegd',
  delete_moment: 'Leermoment verwijderd',
  add_subject: 'Vak aangemaakt',
  delete_subject: 'Vak verwijderd',
  signup_click: 'Account aangemaakt →',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) redirect('/')

  const { data: events } = await supabase
    .from('guest_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000)

  const allEvents = events ?? []

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const uniqueSessions = new Set(allEvents.map(e => e.session_id)).size
  const sessionsToday = new Set(allEvents.filter(e => e.created_at.slice(0, 10) === todayStr).map(e => e.session_id)).size
  const sessionsThisWeek = new Set(allEvents.filter(e => e.created_at >= weekAgo).map(e => e.session_id)).size
  const sessionsThisMonth = new Set(allEvents.filter(e => e.created_at >= monthAgo).map(e => e.session_id)).size

  const activeSessions = new Set(allEvents.filter(e => e.event_type !== 'session_start').map(e => e.session_id)).size
  const signupClicks = allEvents.filter(e => e.event_type === 'signup_click').length

  // Events per type
  const eventCounts: Record<string, number> = {}
  for (const e of allEvents) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1
  }
  const maxCount = Math.max(...Object.values(eventCounts), 1)

  // Popular categories from add_moment
  const catCounts: Record<string, number> = {}
  for (const e of allEvents) {
    if (e.event_type === 'add_moment' && e.metadata?.category) {
      catCounts[e.metadata.category] = (catCounts[e.metadata.category] ?? 0) + 1
    }
  }
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  // Recent sessions (last 15 unique sessions with their events)
  const sessionMap: Map<string, typeof allEvents> = new Map()
  for (const e of allEvents) {
    if (!sessionMap.has(e.session_id)) sessionMap.set(e.session_id, [])
    sessionMap.get(e.session_id)!.push(e)
  }
  const recentSessions = Array.from(sessionMap.entries()).slice(0, 15)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gastactiviteiten</h1>
            <p className="text-sm text-gray-400">Knowl admin — alleen zichtbaar voor jou</p>
          </div>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full font-medium">{allEvents.length} events totaal</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Statistieken */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Alle sessies', value: uniqueSessions, color: 'indigo' },
            { label: 'Deze maand', value: sessionsThisMonth, color: 'violet' },
            { label: 'Deze week', value: sessionsThisWeek, color: 'blue' },
            { label: 'Vandaag', value: sessionsToday, color: 'sky' },
            { label: 'Actief gedaan', value: activeSessions, color: 'emerald' },
            { label: 'Account →', value: signupClicks, color: 'orange' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Events per type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Acties breakdown</h2>
            <div className="space-y-3">
              {Object.entries(eventCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{EVENT_LABELS[type] ?? type}</span>
                    <span className="font-semibold text-gray-800">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {Object.keys(eventCounts).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nog geen events</p>
              )}
            </div>
          </div>

          {/* Populaire vakken */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Populaire vakken bij gasten</h2>
            {topCats.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nog geen vakken gelogd</p>
            ) : (
              <div className="space-y-2">
                {topCats.map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 bg-violet-50 text-violet-600 px-3 py-1 rounded-full font-medium">{cat}</span>
                    <span className="text-sm font-semibold text-gray-500">{count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recente sessies */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Recente sessies</h2>
          {recentSessions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nog geen gastactiviteit</p>
          ) : (
            <div className="space-y-4">
              {recentSessions.map(([sessionId, sessionEvents]) => {
                const first = sessionEvents[sessionEvents.length - 1]
                const last = sessionEvents[0]
                const actionEvents = sessionEvents.filter(e => e.event_type !== 'session_start')
                const hasSignup = sessionEvents.some(e => e.event_type === 'signup_click')
                return (
                  <div key={sessionId} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">{sessionId.slice(0, 8)}…</span>
                          {hasSignup && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Account aangemaakt</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Eerste bezoek: {fmt(first.created_at)} · Laatste actie: {timeAgo(last.created_at)}</p>
                      </div>
                      <span className="text-xs bg-indigo-50 text-indigo-500 px-2 py-1 rounded-lg shrink-0">
                        {actionEvents.length} {actionEvents.length === 1 ? 'actie' : 'acties'}
                      </span>
                    </div>
                    {actionEvents.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {actionEvents.map(e => (
                          <span key={e.id} className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-lg">
                            {EVENT_LABELS[e.event_type] ?? e.event_type}
                            {e.metadata?.category ? ` · ${e.metadata.category}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    {actionEvents.length === 0 && (
                      <p className="text-xs text-gray-300 italic">Alleen de pagina bekeken, niets gedaan</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
