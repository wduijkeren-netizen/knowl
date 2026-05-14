import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LidWordenForm from '@/components/LidWordenForm'

export default async function LidWordenPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: set } = await supabase
    .from('flashcard_sets')
    .select('id, title, vak')
    .eq('edit_token', params.token)
    .single()

  if (!set) redirect('/flashcards')

  // Als al ingelogd, meteen toevoegen als lid
  if (user) {
    // Controleer of al lid of eigenaar
    const { data: existing } = await supabase
      .from('flashcard_set_members')
      .select('id')
      .eq('set_id', set.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      await supabase.from('flashcard_set_members').insert({ set_id: set.id, user_id: user.id })
    }
    redirect(`/flashcards/${set.id}`)
  }

  // Niet ingelogd: uitleg tonen en doorsturen naar login
  return <LidWordenForm set={set} token={params.token} />
}
