import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GroepCreate from '@/components/GroepCreate'

export default async function GroepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <GroepCreate userId={user.id} userName={user.email?.split('@')[0] ?? 'Student'} />
}
