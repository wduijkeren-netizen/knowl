import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfielForm from '@/components/ProfielForm'

export default async function ProfielPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: moments }, { data: srCards }, { data: subjects }, { data: wordWebs }] = await Promise.all([
    supabase.from('profiles').select('voornaam, achternaam, telefoonnummer, geboortedatum, postcode, stad').eq('id', user.id).maybeSingle(),
    supabase.from('learning_moments').select('learned_at, duration_minutes, created_at').eq('user_id', user.id),
    supabase.from('flashcard_sr').select('card_id').eq('user_id', user.id),
    supabase.from('subjects').select('id'),
    supabase.from('word_webs').select('id').limit(1),
  ])

  return (
    <ProfielForm
      user={user}
      profile={profile ?? {}}
      moments={moments ?? []}
      flashcardsSR={srCards?.length ?? 0}
      subjectCount={subjects?.length ?? 0}
      hasWordweb={(wordWebs?.length ?? 0) > 0}
    />
  )
}
