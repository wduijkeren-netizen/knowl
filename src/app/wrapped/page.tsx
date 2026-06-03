import { createClient } from '@/lib/supabase/server'
import MonthlyWrapped from '@/components/MonthlyWrapped'

export default async function WrappedPage({ searchParams }: { searchParams: { month?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonth = searchParams.month ?? defaultMonth

  const [yearStr, monthStr] = currentMonth.split('-')
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)

  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const lastOfMonth = new Date(year, month, 0).toISOString().split('T')[0]

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const firstOfPrevMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
  const lastOfPrevMonth = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0]

  if (!user) {
    return <MonthlyWrapped thisMonth={[]} lastMonth={[]} isGuest currentMonth={currentMonth} />
  }

  const [{ data: thisMonth }, { data: lastMonthData }] = await Promise.all([
    supabase.from('learning_moments').select('*').gte('learned_at', firstOfMonth).lte('learned_at', lastOfMonth),
    supabase.from('learning_moments').select('*').gte('learned_at', firstOfPrevMonth).lte('learned_at', lastOfPrevMonth),
  ])

  return <MonthlyWrapped thisMonth={thisMonth ?? []} lastMonth={lastMonthData ?? []} currentMonth={currentMonth} />
}
