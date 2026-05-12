import { createClient } from '@/lib/supabase/server'
import WoordwebEditor from '@/components/WoordwebEditor'
import { redirect, notFound } from 'next/navigation'

export default async function WoordwebDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: web } = await supabase
    .from('word_webs')
    .select('id, title, vak, nodes, edges')
    .eq('id', params.id)
    .single()

  if (!web) notFound()

  const { data: subjects } = await supabase.from('subjects').select('id, name').order('name')

  return <WoordwebEditor web={web} subjects={subjects ?? []} userId={user.id} />
}
