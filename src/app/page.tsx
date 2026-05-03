import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/Dashboard'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: moments }, { data: subjects }] = await Promise.all([
    supabase.from('learning_moments').select('*').order('learned_at', { ascending: false }),
    supabase.from('subjects').select('id, name').order('name'),
  ])

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const spacedMoment = (moments ?? []).find(m => m.learned_at <= sevenDaysAgo && m.description)
    ?? (moments ?? []).find(m => m.learned_at <= sevenDaysAgo)

  return <Dashboard user={user} moments={moments ?? []} subjects={subjects ?? []} spacedMoment={spacedMoment ?? null} />
}
