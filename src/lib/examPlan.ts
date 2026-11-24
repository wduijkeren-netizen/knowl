import { addDays, weekdayIndex, type MomentType } from './studyStats.ts'

export type StudyGoal = {
  id: string
  subject: string
  title: string
  exam_date: string
  goal: string | null
  target_minutes: number
  study_days: number[]
  start_date: string
  agenda_event_id?: string | null
}

export type PlanDay = { date: string; planned: number; done: number; phase: MomentType }
export type PlanStatus = 'klaar' | 'op_schema' | 'achter' | 'voorbij'

export const WEEKDAY_SHORT = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
export const PHASE_COLORS: Record<MomentType, string> = { new: '#4f46e5', practice: '#0f766e', review: '#c2410c', assignment: '#be185d' }

/** Studiedagen tussen twee datums (inclusief), alleen op de gekozen weekdagen. */
export function studyDates(from: string, to: string, days: number[]) {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) if (days.includes(weekdayIndex(d))) out.push(d)
  return out
}

/** Eerst nieuwe stof, daarna oefenen, de laatste twee studiedagen herhalen. */
export function phaseFor(index: number, total: number): MomentType {
  if (total - index <= 2) return 'review'
  if (index >= Math.floor((total - 2) * 0.6)) return 'practice'
  return 'new'
}

const roundUp5 = (n: number) => Math.ceil(n / 5) * 5

/**
 * De planning: wat al gedaan is telt mee, de resterende minuten worden verdeeld over de studiedagen
 * van vandaag tot de dag voor de toets. Zo past de planning zich elke dag aan.
 */
export function buildPlan(goal: StudyGoal, doneByDay: Record<string, number>, today: string) {
  const last = addDays(goal.exam_date, -1)
  const days = goal.study_days.length ? goal.study_days : [0, 1, 2, 3, 4]
  const all = studyDates(goal.start_date, last, days)
  const done = Object.entries(doneByDay)
    .filter(([d]) => d >= goal.start_date && d <= goal.exam_date)
    .reduce((s, [, m]) => s + m, 0)
  const doneBefore = Object.entries(doneByDay)
    .filter(([d]) => d >= goal.start_date && d < today)
    .reduce((s, [, m]) => s + m, 0)
  const remainingFromToday = Math.max(0, goal.target_minutes - doneBefore)
  const ahead = all.filter(d => d >= today)
  const perDay = ahead.length ? roundUp5(remainingFromToday / ahead.length) : 0

  const plan: PlanDay[] = all.map((date, i) => ({
    date,
    planned: date >= today ? perDay : 0,
    done: doneByDay[date] ?? 0,
    phase: phaseFor(i, all.length),
  }))

  const passed = all.filter(d => d < today).length
  const expected = all.length ? Math.round(goal.target_minutes * (passed / all.length)) : goal.target_minutes
  let status: PlanStatus
  if (today > goal.exam_date) status = 'voorbij'
  else if (done >= goal.target_minutes) status = 'klaar'
  else if (doneBefore >= expected * 0.85) status = 'op_schema'
  else status = 'achter'

  const todayPlan = plan.find(d => d.date === today) ?? null
  const daysLeft = Math.round((new Date(`${goal.exam_date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000)
  return {
    plan,
    done,
    remaining: Math.max(0, goal.target_minutes - done),
    perDay,
    studyDaysLeft: ahead.length,
    status,
    today: todayPlan ? { ...todayPlan, open: Math.max(0, todayPlan.planned - todayPlan.done) } : null,
    nextDay: plan.find(d => d.date > today) ?? null,
    daysLeft,
    pct: Math.min(100, Math.round((done / Math.max(1, goal.target_minutes)) * 100)),
  }
}

export function minutesByDayFor(moments: { category?: string | null; learned_at: string; duration_minutes: number | null }[], subject: string) {
  const out: Record<string, number> = {}
  for (const m of moments) if (m.category === subject && m.duration_minutes) out[m.learned_at] = (out[m.learned_at] ?? 0) + m.duration_minutes
  return out
}
