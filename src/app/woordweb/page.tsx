import { createClient } from '@/lib/supabase/server'
import WoordwebOverzicht from '@/components/WoordwebOverzicht'
import { redirect } from 'next/navigation'

export default async function WoordwebPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: webs } = await supabase
    .from('word_webs')
    .select('id, title, vak, created_at')
    .order('created_at', { ascending: false })

  return <WoordwebOverzicht webs={webs ?? []} />
}
