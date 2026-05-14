import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DeelView from './DeelView'

export default async function DeelPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  const { data: moment } = await supabase
    .from('learning_moments')
    .select('title, description, category, learned_at, duration_minutes, photo_url')
    .eq('share_token', params.token)
    .eq('is_public', true)
    .single()

  if (!moment) notFound()

  return <DeelView moment={moment} />
}
