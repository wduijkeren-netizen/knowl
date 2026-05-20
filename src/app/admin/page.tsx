import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

const ADMIN_EMAIL = 'wduijkeren@hotmail.nl'

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

  // Populaire vakken
  const catCounts: Record<string, number> = {}
  for (const e of allEvents) {
    if (e.event_type === 'add_moment' && e.metadata?.category) {
      catCounts[e.metadata.category] = (catCounts[e.metadata.category] ?? 0) + 1
    }
  }
  const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Recente sessies (laatste 30)
  const sessionMap = new Map<string, typeof allEvents>()
  for (const e of allEvents) {
    if (!sessionMap.has(e.session_id)) sessionMap.set(e.session_id, [])
    sessionMap.get(e.session_id)!.push(e)
  }
  const recentSessions = Array.from(sessionMap.entries()).slice(0, 30)

  // Activiteit laatste 7 dagen
  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const daySessions = new Set(
      allEvents.filter(e => e.created_at.slice(0, 10) === dateStr).map(e => e.session_id)
    ).size
    const dayEvents = allEvents.filter(e => e.created_at.slice(0, 10) === dateStr).length
    return { date: dateStr, count: dayEvents, sessions: daySessions }
  })

  return (
    <AdminDashboard
      events={allEvents}
      totalSessions={uniqueSessions}
      sessionsToday={sessionsToday}
      sessionsThisWeek={sessionsThisWeek}
      sessionsThisMonth={sessionsThisMonth}
      activeSessions={activeSessions}
      signupClicks={signupClicks}
      eventCounts={eventCounts}
      topCats={topCats}
      recentSessions={recentSessions}
      dailyCounts={dailyCounts}
    />
  )
}
