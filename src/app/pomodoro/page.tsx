import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PomodoroTimer from '@/components/PomodoroTimer'

export default async function PomodoroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <PomodoroTimer />
}
