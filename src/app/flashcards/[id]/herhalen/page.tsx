import { createClient } from '@/lib/supabase/server'
import FlashcardHerhalen from '@/components/FlashcardHerhalen'
import { redirect, notFound } from 'next/navigation'

export default async function HerhalenPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: set } = await supabase
    .from('flashcard_sets')
    .select('id, title, vak')
    .eq('id', params.id)
    .single()

  if (!set) notFound()

  const { data: cards } = await supabase
    .from('flashcards')
    .select('id, front, back')
    .eq('set_id', params.id)

  const today = new Date().toISOString().split('T')[0]

  const { data: srData } = await supabase
    .from('flashcard_sr')
    .select('card_id, interval_days, ease, due_date')
    .eq('user_id', user.id)
    .in('card_id', (cards ?? []).map(c => c.id))

  const srMap: Record<string, { interval_days: number; ease: number; due_date: string }> = {}
  for (const s of srData ?? []) srMap[s.card_id] = s

  // Kaarten die vandaag of eerder aan de beurt zijn (of nog nooit gezien)
  const dueCards = (cards ?? []).filter(c => {
    const sr = srMap[c.id]
    return !sr || sr.due_date <= today
  })

  return (
    <FlashcardHerhalen
      set={set}
      cards={dueCards}
      srMap={srMap}
      userId={user.id}
      totalCards={(cards ?? []).length}
    />
  )
}
