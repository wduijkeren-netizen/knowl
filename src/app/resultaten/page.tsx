import { createClient } from '@/lib/supabase/server'
import Resultaten from '@/components/Resultaten'

export default async function ResultatenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Resultaten moments={[]} subjects={[]} isGuest />

  const [{ data: moments }, { data: subjects }] = await Promise.all([
    supabase.from('learning_moments').select('category, duration_minutes, learned_at'),
    supabase.from('subjects').select('name, school_year'),
  ])

  return <Resultaten moments={moments ?? []} subjects={subjects ?? []} />
}
