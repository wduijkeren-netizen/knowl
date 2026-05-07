import { createClient } from '@/lib/supabase/server'
import Resultaten from '@/components/Resultaten'

export default async function ResultatenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <Resultaten moments={[]} isGuest />

  const { data: moments } = await supabase
    .from('learning_moments')
    .select('category, duration_minutes, learned_at')

  return <Resultaten moments={moments ?? []} />
}
