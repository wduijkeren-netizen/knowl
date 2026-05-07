import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WeeklyOverview from '@/components/WeeklyOverview'

export default async function WeekPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const mondayStr = monday.toISOString().split('T')[0]

  const { data: moments } = await supabase
    .from('learning_moments')
    .select('title, category, duration_minutes, learned_at')
    .gte('learned_at', mondayStr)
    .order('learned_at', { ascending: true })

  return <WeeklyOverview moments={moments ?? []} weekStart={mondayStr} />
}
