import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'
import GuestDashboard from '@/components/GuestDashboard'
import { buildSubjectYearMap, getCurrentSchoolYear } from '@/lib/schoolYear'

export default async function LeerMomentenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <GuestDashboard />

  const [{ data: moments }, { data: subjects }] = await Promise.all([
    supabase.from('learning_moments').select('*').order('learned_at', { ascending: false }),
    supabase.from('subjects').select('id, name, school_year, is_active').order('name'),
  ])

  const subjectYearMap = buildSubjectYearMap(subjects ?? [])
  const currentSchoolYear = getCurrentSchoolYear()
  const isCurrentSubject = (category: string | null) => {
    if (!category) return true
    const year = subjectYearMap[category]
    return !year || year === currentSchoolYear
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const spacedCandidates = (moments ?? []).filter(m => m.learned_at <= sevenDaysAgo && isCurrentSubject(m.category))
  const spacedMoment = spacedCandidates.find(m => m.description) ?? spacedCandidates[0]

  return <Dashboard user={user} moments={moments ?? []} subjects={subjects ?? []} spacedMoment={spacedMoment ?? null} />
}
