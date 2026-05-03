import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VakkenBeheer from '@/components/VakkenBeheer'

function getPeriodStart(type: string) {
  const now = new Date()
  if (type === 'daily') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0]
  }
  if (type === 'weekly') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return monday.toISOString().split('T')[0]
  }
  if (type === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
  return null
}

export default async function VakkenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: subjects }, { data: moments }] = await Promise.all([
    supabase.from('subjects').select('id, name, goal_minutes, goal_date, recurring_type, recurring_goal_minutes').order('name'),
    supabase.from('learning_moments').select('category, duration_minutes, learned_at'),
  ])

  const momentCounts: Record<string, number> = {}
  const minutesPerSubject: Record<string, number> = {}
  const minutesThisPeriod: Record<string, number> = {}

  const subjectRecurringType: Record<string, string> = {}
  for (const s of subjects ?? []) {
    if (s.recurring_type) subjectRecurringType[s.name] = s.recurring_type
  }

  for (const m of moments ?? []) {
    if (!m.category) continue
    momentCounts[m.category] = (momentCounts[m.category] ?? 0) + 1
    minutesPerSubject[m.category] = (minutesPerSubject[m.category] ?? 0) + (m.duration_minutes ?? 0)

    const recurringType = subjectRecurringType[m.category]
    if (recurringType) {
      const periodStart = getPeriodStart(recurringType)
      if (periodStart && m.learned_at >= periodStart) {
        minutesThisPeriod[m.category] = (minutesThisPeriod[m.category] ?? 0) + (m.duration_minutes ?? 0)
      }
    }
  }

  return (
    <VakkenBeheer
      user={user}
      subjects={subjects ?? []}
      momentCounts={momentCounts}
      minutesPerSubject={minutesPerSubject}
      minutesThisPeriod={minutesThisPeriod}
    />
  )
}
