import { createClient } from '@/lib/supabase/server'
import Agenda from '@/components/Agenda'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Agenda sessions={[]} />

  const { data: sessions } = await supabase
    .from('learning_moments')
    .select('title, category, duration_minutes, learned_at')
    .order('learned_at', { ascending: true })

  return <Agenda sessions={sessions ?? []} />
}
