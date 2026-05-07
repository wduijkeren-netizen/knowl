import { createClient } from '@/lib/supabase/server'
import PomodoroTimer from '@/components/PomodoroTimer'

export default async function PomodoroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <PomodoroTimer user={null} subjects={[]} />

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .order('name')

  return <PomodoroTimer user={user} subjects={subjects ?? []} />
}
