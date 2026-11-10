import { createClient } from '@/lib/supabase/server'
import PomodoroTimer from '@/components/PomodoroTimer'
import { fetchTerms } from '@/lib/termsDb'
import { selectableSubjects } from '@/lib/terms'
import { localDateStr } from '@/lib/studyStats'

export default async function PomodoroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <PomodoroTimer user={null} subjects={[]} />

  const [{ data: subjects }, { terms }] = await Promise.all([
    supabase.from('subjects').select('*').order('name'),
    fetchTerms(supabase),
  ])
  const current = selectableSubjects(subjects ?? [], terms, localDateStr(new Date())).map(s => ({ id: s.id as string, name: s.name as string }))

  return <PomodoroTimer user={user} subjects={current} />
}
