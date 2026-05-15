import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomePage from '@/components/HomePage'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const today = new Date().toISOString().slice(0, 10)
  const todayDow = (new Date().getDay() + 6) % 7

  const [{ data: allMoments }, { data: thisMonth }, { data: subjects }, { data: profile }, { data: studySessions }, examRes, slotsRes] = await Promise.all([
    supabase.from('learning_moments').select('id, title, duration_minutes, learned_at, category').order('learned_at', { ascending: false }),
    supabase.from('learning_moments').select('category, duration_minutes').gte('learned_at', firstOfMonth),
    supabase.from('subjects').select('name, goal_minutes, goal_date, recurring_type, recurring_goal_minutes'),
    supabase.from('profiles').select('voornaam').eq('id', user.id).maybeSingle(),
    supabase.from('study_sessions').select('activity, duration_seconds, created_at').gte('created_at', weekAgo),
    supabase.from('agenda_events').select('id, date, title, subject').eq('type', 'exam').gte('date', today).order('date', { ascending: true }).limit(5),
    supabase.from('schedule_slots').select('id, day_of_week, start_time, end_time, label').eq('day_of_week', todayDow).order('start_time'),
  ])

  return <HomePage user={user} allMoments={allMoments ?? []} thisMonth={thisMonth ?? []} subjects={subjects ?? []} displayName={profile?.voornaam ?? null} studySessions={studySessions ?? []} examEvents={examRes.data ?? []} todaySlots={slotsRes.data ?? []} />
}
