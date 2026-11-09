export type StudyMoment = { learned_at: string; duration_minutes: number | null }

export const MAX_SHIELDS = 3
export const DAYS_PER_SHIELD = 3

export function formatMinutes(total: number) {
  const minutes = Math.max(0, Math.round(total))
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} u` : `${h} u ${m} min`
}

export function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + days)
  return localDateStr(d)
}

export function weekdayIndex(date: string) {
  return (new Date(`${date}T12:00:00`).getDay() + 6) % 7
}

export function weekStart(date: string) {
  return addDays(date, -weekdayIndex(date))
}

export function minutesByDay(moments: StudyMoment[]) {
  const map: Record<string, number> = {}
  for (const m of moments) map[m.learned_at] = (map[m.learned_at] ?? 0) + (m.duration_minutes ?? 0)
  return map
}

export function sumBetween(byDay: Record<string, number>, from: string, to: string) {
  let total = 0
  for (const [day, min] of Object.entries(byDay)) if (day >= from && day <= to) total += min
  return total
}

/**
 * Streak in dagen. Een dag telt als je er een leermoment op hebt gelogd (ook zonder minuten).
 * Na elke DAYS_PER_SHIELD dagen op rij verdien je een schild (max MAX_SHIELDS). Een gemiste dag
 * kost een schild in plaats van je streak; zonder schild begint de streak opnieuw en vervallen
 * de schilden. Vandaag telt pas als gemist wanneer de dag voorbij is.
 */
export function computeStreak(studyDays: Iterable<string>, today: string) {
  const days = new Set(Array.from(studyDays).filter(d => d <= today))
  const studiedToday = days.has(today)
  if (days.size === 0) return { streak: 0, shields: 0, studiedToday, atRisk: false }

  let streak = 0
  let shields = 0
  let run = 0
  for (let day = Array.from(days).sort()[0]; day <= today; day = addDays(day, 1)) {
    if (days.has(day)) {
      streak++
      run++
      if (run % DAYS_PER_SHIELD === 0 && shields < MAX_SHIELDS) shields++
    } else if (day === today) {
      break
    } else if (streak > 0 && shields > 0) {
      shields--
      run = 0
    } else {
      streak = 0
      shields = 0
      run = 0
    }
  }
  return { streak, shields, studiedToday, atRisk: streak > 0 && !studiedToday }
}

/** Vergelijkt maandag t/m vandaag met dezelfde dagen van vorige week. */
export function weekComparison(byDay: Record<string, number>, today: string) {
  const start = weekStart(today)
  const lastStart = addDays(start, -7)
  const thisWeek = sumBetween(byDay, start, today)
  const lastWeek = sumBetween(byDay, lastStart, addDays(today, -7))
  const hasHistory = Object.keys(byDay).some(d => d < start)
  return { thisWeek, lastWeek, diff: thisWeek - lastWeek, comparable: hasHistory }
}

export function heatmapLevel(minutes: number) {
  if (minutes <= 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

export const REVIEW_STEPS = [1, 7, 30]
export const REVIEW_MAX_AGE_DAYS = 45

export type ReviewResult = 'remembered' | 'forgotten'
export type MomentReview = { moment_id: string; result: ReviewResult; reviewed_at: string }

/**
 * Herhaalschema per leermoment: 1, 7 en 30 dagen na de registratie. 'Vergeten' zet de
 * teller terug; het schema start dan opnieuw vanaf de dag van die herhaling. Een volgende
 * herhaling valt altijd minstens een dag na de vorige. Is een leermoment nog nooit herhaald,
 * dan begint het bij de laatste stap die al bereikt is (een notitie van 10 dagen oud: de 7-dagenstap).
 * Na drie keer 'Wist ik nog' is het leermoment klaar.
 */
export function reviewSchedule(learnedAt: string, reviews: { result: ReviewResult; date: string }[], today?: string) {
  let base = learnedAt
  let step = 0
  if (reviews.length === 0 && today) {
    const age = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${learnedAt}T12:00:00`).getTime()) / 86400000)
    while (step + 1 < REVIEW_STEPS.length && REVIEW_STEPS[step + 1] <= age) step++
  }
  let last: string | null = null
  for (const r of [...reviews].sort((a, b) => a.date.localeCompare(b.date))) {
    if (r.result === 'forgotten') { base = r.date; step = 0 } else step++
    last = r.date
  }
  if (step >= REVIEW_STEPS.length) return { done: true as const, step, due: null }
  const planned = addDays(base, REVIEW_STEPS[step])
  const earliest = last ? addDays(last, 1) : planned
  return { done: false as const, step, due: planned > earliest ? planned : earliest }
}

/**
 * Leermomenten om te herhalen: alleen met een notitie, uit een actief vak, en niet ouder
 * dan REVIEW_MAX_AGE_DAYS tenzij ze al eerder herhaald zijn. Achterstallige eerst.
 */
export function reviewQueue<T extends { id?: string; learned_at: string; description?: string | null; category?: string | null }>(
  moments: T[], reviews: MomentReview[], activeSubjects: Set<string>, today: string,
) {
  const byMoment: Record<string, { result: ReviewResult; date: string }[]> = {}
  for (const r of reviews) (byMoment[r.moment_id] ??= []).push({ result: r.result, date: localDateStr(new Date(r.reviewed_at)) })
  const oldest = addDays(today, -REVIEW_MAX_AGE_DAYS)

  const planned = moments
    .filter(m => m.id && (m.description ?? '').trim() && m.category && activeSubjects.has(m.category))
    .filter(m => m.learned_at >= oldest || byMoment[m.id!])
    .map(m => ({ moment: m, ...reviewSchedule(m.learned_at, byMoment[m.id!] ?? [], today) }))
    .filter(p => !p.done) as { moment: T; done: false; step: number; due: string }[]

  const due = planned.filter(p => p.due <= today).sort((a, b) => a.due.localeCompare(b.due) || b.moment.learned_at.localeCompare(a.moment.learned_at))
  const upcoming = planned.filter(p => p.due > today).sort((a, b) => a.due.localeCompare(b.due))
  return { due, nextDue: upcoming[0]?.due ?? null }
}

const MONTH_NAMES = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December']

/** Vaste datumnotatie in de app: 'do 5 nov'. */
export function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')
}

/** Schooljaar loopt van 1 augustus t/m 31 juli. */
export function schoolYearOf(date: string) {
  const y = Number(date.slice(0, 4))
  const m = Number(date.slice(5, 7))
  if (!y || !m) return null
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export function schoolYearRange(year: string): [string, string] {
  const start = Number(year.slice(0, 4))
  return [`${start}-08-01`, `${start + 1}-07-31`]
}

/** Tussenkopje voor de lijst: Vandaag, Gisteren, Deze week of maand + jaar. */
export function groupLabel(date: string, today: string) {
  if (date === today) return 'Vandaag'
  if (date === addDays(today, -1)) return 'Gisteren'
  if (date < today && date >= weekStart(today)) return 'Deze week'
  return `${MONTH_NAMES[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`
}

// ── Analyse: gedeelde berekeningen voor Resultaten (en waar nodig Home en Leermomenten) ──

export type Period = 'periode' | 'jaar' | 'alles'
export const PERIOD_WEEKS = 10
export const NO_SUBJECT_LABEL = 'Zonder vak'

export type Range = { from: string | null; to: string | null }

/** Datumbereik voor schooljaar ('' = alle) en periode. 'Deze periode' = de laatste PERIOD_WEEKS weken. */
export function selectionRange(year: string, period: Period, today: string): Range {
  let from: string | null = null
  let to: string | null = null
  if (year) [from, to] = schoolYearRange(year)
  if (period === 'periode') {
    const start = addDays(weekStart(today), -(PERIOD_WEEKS - 1) * 7)
    from = from && from > start ? from : start
    to = to && to < today ? to : today
  } else if (period === 'jaar') {
    const start = `${today.slice(0, 4)}-01-01`
    from = from && from > start ? from : start
    to = to && to < today ? to : today
  }
  return { from, to }
}

export function inRange(date: string, range: Range) {
  return (!range.from || date >= range.from) && (!range.to || date <= range.to)
}

/** Afgeronde percentages die samen precies 100 zijn (grootste-rest-methode). */
export function percentages(values: number[]) {
  const total = values.reduce((s, v) => s + v, 0)
  if (total <= 0) return values.map(() => 0)
  const raw = values.map(v => (v / total) * 100)
  const result = raw.map(Math.floor)
  let left = 100 - result.reduce((s, v) => s + v, 0)
  raw.map((v, i) => ({ i, rest: v - Math.floor(v) })).sort((a, b) => b.rest - a.rest).forEach(({ i }) => { if (left > 0) { result[i]++; left-- } })
  return result
}

type Timed = { learned_at: string; duration_minutes: number | null; category?: string | null }

export function totalMinutes(moments: Timed[]) {
  return moments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
}

export function subjectTotals(moments: Timed[]) {
  const per: Record<string, number> = {}
  for (const m of moments) {
    if (!m.duration_minutes) continue
    const key = m.category || NO_SUBJECT_LABEL
    per[key] = (per[key] ?? 0) + m.duration_minutes
  }
  return Object.entries(per).map(([name, minutes]) => ({ name, minutes })).sort((a, b) => b.minutes - a.minutes)
}

export function isoWeek(date: string) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

/** Studietijd per week (oud naar nieuw) eindigend in de week van endDate, opgesplitst per vak. */
export function weeklyBySubject(moments: Timed[], endDate: string, weeks: number) {
  const lastStart = weekStart(endDate)
  const rows = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(lastStart, -(weeks - 1 - i) * 7)
    return { start, end: addDays(start, 6), week: isoWeek(start), total: 0, bySubject: {} as Record<string, number> }
  })
  for (const m of moments) {
    if (!m.duration_minutes) continue
    const row = rows.find(r => m.learned_at >= r.start && m.learned_at <= r.end)
    if (!row) continue
    const key = m.category || NO_SUBJECT_LABEL
    row.bySubject[key] = (row.bySubject[key] ?? 0) + m.duration_minutes
    row.total += m.duration_minutes
  }
  return rows
}

/** Opgetelde studietijd per weekdag, maandag t/m zondag. */
export function weekdayTotals(moments: Timed[]) {
  const totals = Array(7).fill(0) as number[]
  for (const m of moments) if (m.duration_minutes) totals[weekdayIndex(m.learned_at)] += m.duration_minutes
  return totals
}

export const DAY_PARTS = ['Ochtend', 'Middag', 'Avond', 'Nacht'] as const
export type DayPart = typeof DAY_PARTS[number]

export function dayPartOf(time: string | null | undefined): DayPart | null {
  if (!time || !/^\d{2}:\d{2}/.test(time)) return null
  const h = Number(time.slice(0, 2))
  if (h >= 6 && h < 12) return 'Ochtend'
  if (h >= 12 && h < 18) return 'Middag'
  if (h >= 18) return 'Avond'
  return 'Nacht'
}

export const MOMENT_TYPES = { new: 'Nieuwe stof', practice: 'Oefenen', review: 'Herhalen' } as const
export type MomentType = keyof typeof MOMENT_TYPES

const WEEKDAY_NAMES = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} en ${names[names.length - 1]}`
}

export function subjectInsight(rows: { name: string; minutes: number }[]) {
  if (rows.length === 0) return null
  const pct = percentages(rows.map(r => r.minutes))
  if (rows.length === 1) return `Al je studietijd ging naar ${rows[0].name}.`
  const top = rows[0], bottom = rows[rows.length - 1]
  if (pct[0] - pct[rows.length - 1] <= 10) return `Je verdeelt je tijd redelijk evenwichtig over je vakken. ${top.name} krijgt het meest, met ${pct[0]}%.`
  return `${bottom.name} krijgt ${pct[rows.length - 1]}% van je studietijd, terwijl ${top.name} ${pct[0]}% krijgt.`
}

export function trendInsight(weeks: { start: string; total: number }[]) {
  const withData = weeks.filter(w => w.total > 0)
  if (withData.length < 3) return null
  const best = weeks.reduce((a, b) => (b.total > a.total ? b : a))
  const bestText = `Je beste studieweek was de week van ${formatDay(best.start).replace(/^\S+ /, '')}.`
  const half = Math.floor(weeks.length / 2)
  const recent = weeks.slice(-half).reduce((s, w) => s + w.total, 0)
  const before = weeks.slice(-half * 2, -half).reduce((s, w) => s + w.total, 0)
  if (before === 0) return bestText
  const change = (recent - before) / before
  if (change > 0.15) return `Je studietijd is de afgelopen ${half} weken toegenomen. ${bestText}`
  if (change < -0.15) return `Je studietijd is de afgelopen ${half} weken afgenomen. ${bestText}`
  return `Je studietijd is de afgelopen weken redelijk stabiel gebleven. ${bestText}`
}

export function weekdayInsight(totals: number[]) {
  const max = Math.max(...totals)
  if (max <= 0) return null
  const strongest = totals.map((t, i) => (t === max ? WEEKDAY_NAMES[i] : null)).filter((n): n is string => !!n)
  const weak = totals.map((t, i) => (t < max * 0.15 ? WEEKDAY_NAMES[i] : null)).filter((n): n is string => !!n)
  const first = strongest.length === 1 ? `Je sterkste studiedag is ${strongest[0]}.` : `Je studeert vooral op ${joinNames(strongest)}.`
  if (weak.length === 0) return `${first} Je studeert op alle dagen van de week.`
  if (weak.length >= 5) return first
  return `${first} Op ${joinNames(weak)} studeer je nauwelijks.`
}

export function dayPartInsight(totals: Record<DayPart, number>) {
  const entries = DAY_PARTS.map(p => [p, totals[p]] as const)
  const max = Math.max(...entries.map(e => e[1]))
  if (max <= 0) return null
  const top = entries.filter(e => e[1] === max).map(e => e[0].toLowerCase())
  return `Je studeert voornamelijk in de ${joinNames(top)}.`
}

export function typeInsight(totals: Record<MomentType, number>) {
  const keys = Object.keys(MOMENT_TYPES) as MomentType[]
  const pct = percentages(keys.map(k => totals[k]))
  if (pct.every(p => p === 0)) return null
  const byKey = Object.fromEntries(keys.map((k, i) => [k, pct[i]])) as Record<MomentType, number>
  const base = `Van de tijd waarbij je het type invulde, ging ${byKey.new}% naar nieuwe stof, ${byKey.practice}% naar oefenen en ${byKey.review}% naar herhalen.`
  if (byKey.new >= 60 && byKey.review < 15) return `${base} Plan wat vaker een herhaling in, dan blijft de stof beter hangen.`
  return base
}
