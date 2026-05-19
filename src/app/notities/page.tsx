import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Notities from '@/components/Notities'

export default async function NotitiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: notes }, { data: subjects }] = await Promise.all([
    supabase.from('notes').select('id, title, content, subject, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('subjects').select('name').order('name'),
  ])

  return (
    <Notities
      userId={user.id}
      initialNotes={notes ?? []}
      subjects={(subjects ?? []).map(s => s.name)}
    />
  )
}
