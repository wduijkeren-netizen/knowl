import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import DeelView from './DeelView'

export async function generateMetadata({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: moment } = await supabase
    .from('learning_moments')
    .select('title, description, category')
    .eq('share_token', params.token)
    .eq('is_public', true)
    .single()
  if (!moment) return { title: 'Leermoment — Knowl' }
  return {
    title: `${moment.title} — Knowl`,
    description: moment.description
      ? moment.description.slice(0, 160)
      : `Bekijk dit leermoment${moment.category ? ` over ${moment.category}` : ''} gedeeld via Knowl.`,
  }
}

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
