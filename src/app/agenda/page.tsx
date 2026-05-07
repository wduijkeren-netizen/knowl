import { createClient } from '@/lib/supabase/server'
import Agenda from '@/components/Agenda'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Agenda sessions={[]} subjects={[]} />

  const [{ data: sessions }, { data: subjects }] = await Promise.all([
    supabase.from('learning_moments').select('title, category, duration_minutes, learned_at').order('learned_at', { ascending: true }),
    supabase.from('subjects').select('name').order('name'),
  ])

  return <Agenda sessions={sessions ?? []} subjects={(subjects ?? []).map(s => s.name)} />
}
