import { createClient } from '@/lib/supabase/server'
import FlashcardOverzicht from '@/components/FlashcardOverzicht'
import { redirect } from 'next/navigation'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: sets } = await supabase
    .from('flashcard_sets')
    .select('id, title, vak, created_at, is_public, share_token')
    .order('created_at', { ascending: false })

  const today = new Date().toISOString().split('T')[0]

  const [{ data: counts }, { data: srData }] = await Promise.all([
    supabase.from('flashcards').select('set_id, id'),
    supabase.from('flashcard_sr').select('card_id, due_date').eq('user_id', user.id),
  ])

  const countMap: Record<string, number> = {}
  const cardToSet: Record<string, string> = {}
  for (const c of counts ?? []) {
    countMap[c.set_id] = (countMap[c.set_id] ?? 0) + 1
    cardToSet[c.id] = c.set_id
  }

  const dueMap: Record<string, number> = {}
  for (const c of counts ?? []) {
    const sr = (srData ?? []).find(s => s.card_id === c.id)
    if (!sr || sr.due_date <= today) {
      dueMap[c.set_id] = (dueMap[c.set_id] ?? 0) + 1
    }
  }

  return <FlashcardOverzicht sets={sets ?? []} countMap={countMap} dueMap={dueMap} />
}
