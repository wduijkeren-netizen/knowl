import { createClient } from '@/lib/supabase/server'
import FlashcardBewerken from '@/components/FlashcardBewerken'
import { redirect, notFound } from 'next/navigation'

export default async function BewerkenPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: set } = await supabase
    .from('flashcard_sets')
    .select('id, title, vak')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!set) notFound()

  const { data: cards } = await supabase
    .from('flashcards')
    .select('id, front, back')
    .eq('set_id', params.id)
    .order('created_at')

  const { data: subjects } = await supabase.from('subjects').select('id, name').order('name')

  return <FlashcardBewerken set={set} cards={cards ?? []} subjects={subjects ?? []} userId={user.id} />
}
