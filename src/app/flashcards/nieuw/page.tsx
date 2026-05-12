import { createClient } from '@/lib/supabase/server'
import FlashcardNieuw from '@/components/FlashcardNieuw'
import { redirect } from 'next/navigation'

export default async function NieuwePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .order('name')

  return <FlashcardNieuw subjects={subjects ?? []} userId={user.id} />
}
