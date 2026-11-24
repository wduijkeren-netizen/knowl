import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ToetsPlanner from '@/components/ToetsPlanner'
import { fetchAllMoments } from '@/lib/moments'
import { fetchTerms } from '@/lib/termsDb'
import { selectableSubjects } from '@/lib/terms'
import { localDateStr } from '@/lib/studyStats'
import type { StudyGoal } from '@/lib/examPlan'

export default async function ToetsenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [goalsRes, { data: subjects }, moments, { terms }] = await Promise.all([
    supabase.from('study_goals').select('*').order('exam_date'),
    supabase.from('subjects').select('*').order('name'),
    fetchAllMoments(supabase, { search: '', subject: '', year: '' }, 'category, duration_minutes, learned_at'),
    fetchTerms(supabase),
  ])

  return (
    <ToetsPlanner
      userId={user.id}
      goals={(goalsRes.data ?? []) as StudyGoal[]}
      supported={!goalsRes.error}
      allSubjects={(subjects ?? []).map(s => s.name as string)}
      subjects={selectableSubjects(subjects ?? [], terms, localDateStr(new Date())).map(s => s.name as string)}
      moments={moments.moments}
    />
  )
}
