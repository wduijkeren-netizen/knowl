import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Rooster from '@/components/Rooster'

export const metadata = { title: 'Rooster — Knowl' }

export default async function RoosterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: slots } = await supabase
    .from('schedule_slots')
    .select('id, day_of_week, start_time, end_time, label')
    .order('day_of_week').order('start_time')
  return <Rooster initialSlots={slots ?? []} userId={user.id} />
}
