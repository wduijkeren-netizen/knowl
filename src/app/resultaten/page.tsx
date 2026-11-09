import { createClient } from '@/lib/supabase/server'
import Resultaten from '@/components/Resultaten'
import { fetchAllMoments } from '@/lib/moments'

export default async function ResultatenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Resultaten moments={[]} subjects={[]} isGuest />

  const [moments, { data: subjects }] = await Promise.all([
    fetchAllMoments(supabase, { search: '', subject: '', year: '' }),
    supabase.from('subjects').select('id, name, school_year, is_active, goal_minutes, goal_date').order('name'),
  ])

  return <Resultaten userId={user.id} moments={moments.moments} subjects={subjects ?? []} loadFailed={!!moments.error} />
}
