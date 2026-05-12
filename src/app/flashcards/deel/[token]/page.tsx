import { createClient } from '@/lib/supabase/server'
import FlashcardStudeer from '@/components/FlashcardStudeer'
import { notFound } from 'next/navigation'

export default async function DeelPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  const { data: set } = await supabase
    .from('flashcard_sets')
    .select('id, title, vak')
    .eq('share_token', params.token)
    .eq('is_public', true)
    .single()

  if (!set) notFound()

  const { data: cards } = await supabase
    .from('flashcards')
    .select('id, front, back')
    .eq('set_id', set.id)
    .order('created_at')

  return <FlashcardStudeer set={set} cards={cards ?? []} srMap={{}} />
}
