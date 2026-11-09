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

const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 120]

/** Leermomenten met een samenvatting, gesorteerd op hoe dicht ze bij een herhaalmoment zitten. */
export function reviewOrder<T extends { learned_at: string; description?: string | null }>(moments: T[], today: string) {
  const todayTime = new Date(`${today}T12:00:00`).getTime()
  return moments
    .filter(m => (m.description ?? '').trim().length > 0 && m.learned_at < today)
    .map(m => {
      const age = Math.round((todayTime - new Date(`${m.learned_at}T12:00:00`).getTime()) / 86400000)
      const distance = Math.min(...REVIEW_INTERVALS.map(i => Math.abs(age - i)))
      return { m, age, distance }
    })
    .sort((a, b) => a.distance - b.distance || b.age - a.age)
    .map(x => x.m)
}
