import { createClient } from '@/lib/supabase/server'
import Agenda from '@/components/Agenda'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Agenda sessions={[]} subjects={[]} events={[]} userId={null} />

  const [{ data: sessions }, { data: subjects }, { data: events }] = await Promise.all([
    supabase.from('learning_moments').select('title, category, duration_minutes, learned_at').order('learned_at', { ascending: true }),
    supabase.from('subjects').select('name').order('name'),
    supabase.from('agenda_events').select('id, date, type, title, subject, time').eq('user_id', user.id),
  ])

  return (
    <Agenda
      sessions={sessions ?? []}
      subjects={(subjects ?? []).map(s => s.name)}
      events={(events ?? []) as { id: string; date: string; type: 'exam' | 'planned'; title: string; subject: string; time: string }[]}
      userId={user.id}
    />
  )
}
