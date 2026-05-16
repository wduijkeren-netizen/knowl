export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type BadgeData = {
  totalMoments: number
  totalMinutes: number
  maxStreak: number
  pomodoroCompleted: number
  flashcardsSR: number
  subjectCount: number
  hasEarlyMoment: boolean
  hasLateMoment: boolean
  hasWordweb: boolean
}

export type BadgeDef = {
  id: string
  emoji: string
  title: string
  desc: string
  rarity: BadgeRarity
  check: (d: BadgeData) => boolean
}

export const BADGES: BadgeDef[] = [
  { id: 'first_step', emoji: '🌱', title: 'Eerste stap', desc: 'Je eerste leermoment gelogd', rarity: 'common', check: d => d.totalMoments >= 1 },
  { id: 'week_streak', emoji: '🔥', title: 'Op stoom', desc: '7 dagen op rij gestudeerd', rarity: 'common', check: d => d.maxStreak >= 7 },
  { id: 'month_streak', emoji: '⭐', title: 'IJzersterk', desc: '30 dagen op rij gestudeerd', rarity: 'rare', check: d => d.maxStreak >= 30 },
  { id: 'ten_hours', emoji: '📚', title: '10 uur student', desc: 'Totaal 10 uur gestudeerd', rarity: 'common', check: d => d.totalMinutes >= 600 },
  { id: 'fifty_hours', emoji: '💡', title: '50 uur student', desc: 'Totaal 50 uur gestudeerd', rarity: 'rare', check: d => d.totalMinutes >= 3000 },
  { id: 'hundred_hours', emoji: '🏆', title: '100 uur student', desc: 'Totaal 100 uur gestudeerd', rarity: 'epic', check: d => d.totalMinutes >= 6000 },
  { id: 'fifty_moments', emoji: '📖', title: 'Toegewijd', desc: '50 leermomenten gelogd', rarity: 'rare', check: d => d.totalMoments >= 50 },
  { id: 'hundred_moments', emoji: '💎', title: 'Marathonstudent', desc: '100 leermomenten gelogd', rarity: 'epic', check: d => d.totalMoments >= 100 },
  { id: 'pomodoro_start', emoji: '⏰', title: 'Focus!', desc: 'Eerste pomodoro-sessie voltooid', rarity: 'common', check: d => d.pomodoroCompleted >= 1 },
  { id: 'pomodoro_master', emoji: '⚡', title: 'Pomodoro-master', desc: '25 pomodoro-sessies voltooid', rarity: 'rare', check: d => d.pomodoroCompleted >= 25 },
  { id: 'flashcard_ninja', emoji: '🧠', title: 'Flashcard-ninja', desc: '50 flashcards via herhaling bestudeerd', rarity: 'rare', check: d => d.flashcardsSR >= 50 },
  { id: 'multi_subject', emoji: '🎓', title: 'Veelzijdig', desc: '5 of meer vakken bijgehouden', rarity: 'common', check: d => d.subjectCount >= 5 },
  { id: 'early_bird', emoji: '🌅', title: 'Vroege vogel', desc: 'Gestudeerd vóór 8:00', rarity: 'rare', check: d => d.hasEarlyMoment },
  { id: 'night_owl', emoji: '🌙', title: 'Nachtbraker', desc: 'Gestudeerd ná 23:00', rarity: 'rare', check: d => d.hasLateMoment },
  { id: 'explorer', emoji: '🗺️', title: 'Ontdekkingsreiziger', desc: 'Een woordweb aangemaakt', rarity: 'common', check: d => d.hasWordweb },
]

const legendCheck = (d: BadgeData) => BADGES.filter(b => b.check(d)).length >= 10
export const LEGEND_BADGE: BadgeDef = {
  id: 'legend', emoji: '🚀', title: 'Knowl Legende', desc: '10 andere badges behaald — je bent een legende',
  rarity: 'legendary', check: legendCheck
}

export const ALL_BADGES = [...BADGES, LEGEND_BADGE]

export function computeMaxStreak(moments: { learned_at: string }[]): number {
  if (moments.length === 0) return 0
  const dates = Array.from(new Set(moments.map(m => m.learned_at.slice(0, 10)))).sort()
  let max = 1, cur = 1
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i]).getTime() - new Date(dates[i-1]).getTime()) / 86400000
    if (Math.round(diff) === 1) { cur++; if (cur > max) max = cur } else { cur = 1 }
  }
  return max
}
