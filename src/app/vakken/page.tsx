import { createClient } from '@/lib/supabase/server'
import VakkenBeheer from '@/components/VakkenBeheer'
import { fetchAllMoments } from '@/lib/moments'
import { fetchTerms } from '@/lib/termsDb'

export default async function VakkenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <VakkenBeheer user={null} subjects={[]} moments={[]} terms={[]} termsSupported={false} />

  const [{ data: subjects }, moments, terms] = await Promise.all([
    supabase.from('subjects').select('*').order('name'),
    fetchAllMoments(supabase, { search: '', subject: '', year: '' }, 'category, duration_minutes, learned_at'),
    fetchTerms(supabase),
  ])

  return (
    <VakkenBeheer
      user={user}
      subjects={subjects ?? []}
      moments={moments.moments}
      terms={terms.terms}
      termsSupported={terms.supported && (subjects ?? []).every(s => 'terms' in s)}
    />
  )
}
