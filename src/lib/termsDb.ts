import type { SupabaseClient } from '@supabase/supabase-js'
import type { SchoolTerm } from '@/lib/terms'

/** Trimesters van de gebruiker; supported is false zolang de tabel nog niet bestaat. */
export async function fetchTerms(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('school_terms').select('school_year, term, starts_on').order('starts_on')
  return { terms: (data ?? []) as SchoolTerm[], supported: !error }
}
