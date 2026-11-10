import { addDays, schoolYearOf, schoolYearRange, type Range } from './studyStats.ts'

export const MAX_TERMS = 3

export type SchoolTerm = { school_year: string; term: number; starts_on: string }
export type TermSubject = { name: string; is_active?: boolean | null; school_year?: string | null; terms?: number[] | null }

/** Trimesters van een schooljaar, oplopend. Trimester 1 begint standaard bij de start van het schooljaar. */
export function termsOfYear(terms: SchoolTerm[], year: string): SchoolTerm[] {
  const list = terms.filter(t => t.school_year === year).sort((a, b) => a.term - b.term)
  if (!list.some(t => t.term === 1)) list.unshift({ school_year: year, term: 1, starts_on: schoolYearRange(year)[0] })
  return list
}

export function termRange(terms: SchoolTerm[], year: string, term: number): Range {
  const list = termsOfYear(terms, year)
  const index = list.findIndex(t => t.term === term)
  if (index === -1) return { from: null, to: null }
  const next = list[index + 1]
  return { from: list[index].starts_on, to: next ? addDays(next.starts_on, -1) : schoolYearRange(year)[1] }
}

/** Huidig schooljaar en trimester: het laatst gestarte trimester van het schooljaar van vandaag. */
export function currentTerm(terms: SchoolTerm[], today: string) {
  const year = schoolYearOf(today)!
  const started = termsOfYear(terms, year).filter(t => t.starts_on <= today)
  return { year, term: started.length ? started[started.length - 1].term : 1 }
}

export function termOfDate(terms: SchoolTerm[], date: string) {
  const year = schoolYearOf(date)
  if (!year) return null
  const started = termsOfYear(terms, year).filter(t => t.starts_on <= date)
  return { year, term: started.length ? started[started.length - 1].term : 1 }
}

/** Een vak zonder trimesters loopt het hele schooljaar. */
export function subjectInTerm(subject: TermSubject, year: string, term: number) {
  if (!subject.terms || subject.terms.length === 0) return !subject.school_year || subject.school_year === year
  return (!subject.school_year || subject.school_year === year) && subject.terms.includes(term)
}

/** Vakken die je nu kunt kiezen bij een nieuw leermoment: actief en horend bij het huidige trimester. */
export function selectableSubjects<T extends TermSubject>(subjects: T[], terms: SchoolTerm[], today: string) {
  const { year, term } = currentTerm(terms, today)
  return subjects.filter(s => s.is_active !== false && (!s.terms?.length || subjectInTerm(s, year, term)))
}

export function termLabel(subject: TermSubject) {
  if (!subject.terms || subject.terms.length === 0) return 'Heel jaar'
  return `Trimester ${[...subject.terms].sort().join(', ')}`
}

export type PeriodOption = { value: string; label: string; from: string; to: string }

/** Keuzes per schooljaar: het hele jaar, en per gestart trimester zodra er meer dan één is. */
export function periodOptions(terms: SchoolTerm[], years: string[], today: string): PeriodOption[] {
  const out: PeriodOption[] = []
  for (const year of years) {
    const [from, to] = schoolYearRange(year)
    out.push({ value: year, label: year, from, to })
    const started = termsOfYear(terms, year).filter(t => t.starts_on <= today)
    if (started.length < 2) continue
    for (const t of started) {
      const r = termRange(terms, year, t.term)
      out.push({ value: `${year}#${t.term}`, label: `${year} · Trimester ${t.term}`, from: r.from!, to: r.to! })
    }
  }
  return out
}
