import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GroepSession from '@/components/GroepSession'

export default async function GroepSessionPage({ params }: { params: { code: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('group_sessions')
    .select('*')
    .eq('code', params.code.toUpperCase())
    .maybeSingle()

  if (!session) redirect('/pomodoro/groep')

  return <GroepSession
    initialSession={session}
    userId={user.id}
    userName={user.email?.split('@')[0] ?? 'Student'}
    isHost={session.host_id === user.id}
  />
}
