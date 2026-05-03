import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfielForm from '@/components/ProfielForm'

export default async function ProfielPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('voornaam, achternaam')
    .eq('id', user.id)
    .single()

  return <ProfielForm user={user} profile={profile ?? { voornaam: '', achternaam: '' }} />
}
