export const UNKNOWN_YEAR = 'onbekend'

export function getCurrentSchoolYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export function getSchoolYearOptions() {
  const startYear = parseInt(getCurrentSchoolYear().split('-')[0], 10)
  const options: string[] = []
  for (let i = 1; i >= -5; i--) options.push(`${startYear + i}-${startYear + i + 1}`)
  return options
}

export function getYearTabs(years: (string | null)[]) {
  const set = new Set<string>()
  let hasUnknown = false
  for (const y of years) {
    if (y) set.add(y)
    else hasUnknown = true
  }
  const tabs = Array.from(set).sort((a, b) => b.localeCompare(a))
  if (hasUnknown) tabs.push(UNKNOWN_YEAR)
  return tabs
}

export function buildSubjectYearMap(subjects: { name: string; school_year?: string | null }[]) {
  const map: Record<string, string | null> = {}
  for (const s of subjects) map[s.name] = s.school_year ?? null
  return map
}

export function momentYear(category: string | null | undefined, subjectYearMap: Record<string, string | null>) {
  if (!category) return UNKNOWN_YEAR
  return subjectYearMap[category] ?? UNKNOWN_YEAR
}

export function momentYearOrNull(category: string | null | undefined, subjectYearMap: Record<string, string | null>) {
  if (!category) return null
  return subjectYearMap[category] ?? null
}
