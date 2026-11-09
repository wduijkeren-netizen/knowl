import { createClient } from '@/lib/supabase/server'
import Dashboard from '@/components/Dashboard'
import GuestDashboard from '@/components/GuestDashboard'
import { buildSubjectYearMap, getCurrentSchoolYear } from '@/lib/schoolYear'
import { fetchAllMoments, fetchMomentsPage, type LearningMoment } from '@/lib/moments'

export default async function LeerMomentenPage({ searchParams }: { searchParams: { zoek?: string; minuten?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <GuestDashboard />

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const initialSearch = searchParams.zoek ?? ''
  const [{ data: subjects }, stats, firstPage, { data: spacedRows }] = await Promise.all([
    supabase.from('subjects').select('id, name, school_year, is_active').order('name'),
    fetchAllMoments(supabase, { search: '', subject: '', year: '' }, 'id, category, duration_minutes, learned_at'),
    fetchMomentsPage(supabase, { search: initialSearch, subject: '', year: '' }, 0),
    supabase.from('learning_moments').select('*').lte('learned_at', sevenDaysAgo).order('learned_at', { ascending: false }).limit(100),
  ])

  const subjectYearMap = buildSubjectYearMap(subjects ?? [])
  const currentSchoolYear = getCurrentSchoolYear()
  const isCurrentSubject = (category: string | null) => {
    if (!category) return true
    const year = subjectYearMap[category]
    return !year || year === currentSchoolYear
  }
  const spacedCandidates = ((spacedRows ?? []) as LearningMoment[]).filter(m => isCurrentSubject(m.category))
  const spacedMoment = spacedCandidates.find(m => m.description) ?? spacedCandidates[0] ?? null
  const minutes = parseInt(searchParams.minuten ?? '')

  return (
    <Dashboard
      user={user}
      subjects={subjects ?? []}
      statRows={stats.moments}
      initialPage={{ moments: firstPage.moments, total: firstPage.total, failed: !!firstPage.error }}
      initialSearch={initialSearch}
      initialMinutes={Number.isFinite(minutes) && minutes > 0 ? minutes : null}
      spacedMoment={spacedMoment}
    />
  )
}
