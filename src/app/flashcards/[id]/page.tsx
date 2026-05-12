import { createClient } from '@/lib/supabase/server'
import FlashcardStudeer from '@/components/FlashcardStudeer'
import { redirect, notFound } from 'next/navigation'

export default async function StudeerPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: set } = await supabase
    .from('flashcard_sets')
    .select('id, title, vak')
    .eq('id', params.id)
    .single()

  if (!set) notFound()

  const [{ data: cards }, { data: srData }] = await Promise.all([
    supabase.from('flashcards').select('id, front, back').eq('set_id', params.id).order('created_at'),
    supabase.from('flashcard_sr').select('card_id, interval_days').eq('user_id', user.id),
  ])

  const srMap: Record<string, number> = {}
  for (const s of srData ?? []) srMap[s.card_id] = s.interval_days

  return <FlashcardStudeer set={set} cards={cards ?? []} srMap={srMap} />
}
