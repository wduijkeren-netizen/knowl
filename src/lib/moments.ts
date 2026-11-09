import type { SupabaseClient } from '@supabase/supabase-js'
import { schoolYearRange } from '@/lib/studyStats'

export type LearningMoment = {
  id: string
  title: string
  description: string | null
  category: string | null
  learned_at: string
  duration_minutes: number | null
  photo_url: string | null
  is_public: boolean
  share_token: string
  notes?: string | null
}

export type MomentFilters = { search: string; subject: string; year: string }

export const PAGE_SIZE = 20
export const NO_SUBJECT = '__geen_vak__'
export const OTHER_YEAR = 'overig'
const CHUNK = 1000

function cleanTerm(search: string) {
  return search.replace(/[,()%*\\]/g, ' ').trim()
}

function filteredQuery(supabase: SupabaseClient, columns: string, filters: MomentFilters, count = false) {
  let q = supabase.from('learning_moments').select(columns, count ? { count: 'exact' } : undefined)
  const term = cleanTerm(filters.search)
  if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
  if (filters.subject === NO_SUBJECT) q = q.is('category', null)
  else if (filters.subject) q = q.eq('category', filters.subject)
  if (filters.year === OTHER_YEAR) q = q.is('learned_at', null)
  else if (filters.year) {
    const [from, to] = schoolYearRange(filters.year)
    q = q.gte('learned_at', from).lte('learned_at', to)
  }
  return q.order('learned_at', { ascending: false }).order('id', { ascending: false })
}

/** Eén pagina leermomenten met het totaal aantal dat aan de filters voldoet. */
export async function fetchMomentsPage(supabase: SupabaseClient, filters: MomentFilters, offset: number) {
  const { data, error, count } = await filteredQuery(supabase, '*', filters, true).range(offset, offset + PAGE_SIZE - 1)
  return { moments: (data ?? []) as unknown as LearningMoment[], total: count ?? 0, error }
}

/** Alle leermomenten die aan de filters voldoen, in blokken van 1000 (de limiet van de database). */
export async function fetchAllMoments(supabase: SupabaseClient, filters: MomentFilters, columns = '*') {
  const all: LearningMoment[] = []
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await filteredQuery(supabase, columns, filters).range(from, from + CHUNK - 1)
    if (error) return { moments: all, error }
    const rows = (data ?? []) as unknown as LearningMoment[]
    all.push(...rows)
    if (rows.length < CHUNK) return { moments: all, error: null }
  }
}
