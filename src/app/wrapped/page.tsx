import { createClient } from '@/lib/supabase/server'
import MonthlyWrapped from '@/components/MonthlyWrapped'

export default async function WrappedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const now = new Date()
    return <MonthlyWrapped thisMonth={[]} lastMonth={[]} monthName={now.toLocaleString('nl-NL', { month: 'long' })} isGuest />
  }

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  const [{ data: thisMonth }, { data: lastMonth }] = await Promise.all([
    supabase.from('learning_moments').select('*').gte('learned_at', firstOfMonth),
    supabase.from('learning_moments').select('*').gte('learned_at', firstOfLastMonth).lte('learned_at', lastOfLastMonth),
  ])

  return <MonthlyWrapped thisMonth={thisMonth ?? []} lastMonth={lastMonth ?? []} monthName={now.toLocaleString('nl-NL', { month: 'long' })} />
}
