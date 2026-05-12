import { createClient } from '@/lib/supabase/server'
import WoordwebEditor from '@/components/WoordwebEditor'
import { redirect } from 'next/navigation'

export default async function NieuwWoordwebPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subjects } = await supabase.from('subjects').select('id, name').order('name')

  return <WoordwebEditor web={null} subjects={subjects ?? []} userId={user.id} />
}
