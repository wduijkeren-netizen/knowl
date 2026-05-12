import { createClient } from '@/lib/supabase/server'
import FlashcardOverzicht from '@/components/FlashcardOverzicht'
import { redirect } from 'next/navigation'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: sets } = await supabase
    .from('flashcard_sets')
    .select('id, title, vak, created_at')
    .order('created_at', { ascending: false })

  const { data: counts } = await supabase
    .from('flashcards')
    .select('set_id')

  const countMap: Record<string, number> = {}
  for (const c of counts ?? []) {
    countMap[c.set_id] = (countMap[c.set_id] ?? 0) + 1
  }

  return <FlashcardOverzicht sets={sets ?? []} countMap={countMap} />
}
