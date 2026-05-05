import { createClient } from '@/lib/supabase/server'
import VakDetail from '@/components/VakDetail'

export default async function VakDetailPage({ params }: { params: { vak: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const vakNaam = decodeURIComponent(params.vak)

  if (!user) {
    return <VakDetail vakNaam={vakNaam} moments={[]} goalMinutes={null} goalDate={null} />
  }

  const [{ data: moments }, { data: subject }] = await Promise.all([
    supabase.from('learning_moments').select('*').eq('category', vakNaam).order('learned_at', { ascending: false }),
    supabase.from('subjects').select('goal_minutes, goal_date').eq('name', vakNaam).single(),
  ])

  return (
    <VakDetail
      vakNaam={vakNaam}
      moments={moments ?? []}
      goalMinutes={subject?.goal_minutes ?? null}
      goalDate={subject?.goal_date ?? null}
    />
  )
}
