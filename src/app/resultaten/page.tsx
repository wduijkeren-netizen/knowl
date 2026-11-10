import { createClient } from '@/lib/supabase/server'
import Resultaten from '@/components/Resultaten'
import { fetchAllMoments } from '@/lib/moments'
import { fetchTerms } from '@/lib/termsDb'

export default async function ResultatenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Resultaten moments={[]} subjects={[]} isGuest />

  const [moments, { data: subjects }, { terms }] = await Promise.all([
    fetchAllMoments(supabase, { search: '', subject: '', year: '' }),
    supabase.from('subjects').select('*').order('name'),
    fetchTerms(supabase),
  ])

  return <Resultaten userId={user.id} moments={moments.moments} subjects={subjects ?? []} loadFailed={!!moments.error} terms={terms} />
}
