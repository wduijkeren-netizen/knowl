import { createClient } from '@/lib/supabase/server'
import FlashcardQuiz from '@/components/FlashcardQuiz'
import { redirect, notFound } from 'next/navigation'

export default async function QuizPage({ params }: { params: { id: string } }) {
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
    .order('created_at')

  if (!cards || cards.length < 2) redirect(`/flashcards/${params.id}`)

  return <FlashcardQuiz set={set} cards={cards} />
}
