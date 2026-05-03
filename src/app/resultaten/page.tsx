import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Resultaten from '@/components/Resultaten'

export default async function ResultatenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: moments } = await supabase
    .from('learning_moments')
    .select('category, duration_minutes')

  return <Resultaten moments={moments ?? []} />
}
