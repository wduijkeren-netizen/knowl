import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomePage from '@/components/HomePage'
import { fetchAllMoments } from '@/lib/moments'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const today = now.toISOString().slice(0, 10)
  const todayDow = (now.getDay() + 6) % 7

  const [allMomentsRes, { data: subjects }, { data: profile }, goalRes, reviewRes, { data: studySessions }, examRes, slotsRes] = await Promise.all([
    fetchAllMoments(supabase, { search: '', subject: '', year: '' }, 'id, title, description, duration_minutes, learned_at, category'),
    supabase.from('subjects').select('name, goal_minutes, goal_date, recurring_type, recurring_goal_minutes, school_year, is_active'),
    supabase.from('profiles').select('voornaam').eq('id', user.id).maybeSingle(),
    supabase.from('profiles').select('weekly_goal_minutes').eq('id', user.id).maybeSingle(),
    supabase.from('moment_reviews').select('moment_id, result, reviewed_at').order('reviewed_at'),
    supabase.from('study_sessions').select('activity, duration_seconds, created_at').gte('created_at', weekAgo),
    supabase.from('agenda_events').select('id, date, title, subject').eq('type', 'exam').gte('date', today).order('date', { ascending: true }).limit(5),
    supabase.from('schedule_slots').select('id, day_of_week, start_time, end_time, label').eq('day_of_week', todayDow).order('start_time'),
  ])

  return (
    <HomePage
      user={user}
      allMoments={allMomentsRes.moments}
      subjects={subjects ?? []}
      displayName={profile?.voornaam ?? null}
      weeklyGoal={goalRes.error ? null : (goalRes.data?.weekly_goal_minutes ?? null)}
      weeklyGoalSupported={!goalRes.error}
      reviews={reviewRes.error ? [] : (reviewRes.data ?? [])}
      reviewsSupported={!reviewRes.error}
      studySessions={studySessions ?? []}
      examEvents={examRes.data ?? []}
      todaySlots={slotsRes.data ?? []}
    />
  )
}
