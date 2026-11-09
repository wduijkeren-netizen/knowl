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
