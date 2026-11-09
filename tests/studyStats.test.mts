import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMinutes, addDays, weekStart, computeStreak, weekComparison, heatmapLevel, reviewOrder, minutesByDay,
} from '../src/lib/studyStats.ts'

test('formatMinutes gebruikt overal dezelfde notatie', () => {
  assert.equal(formatMinutes(0), '0 min')
  assert.equal(formatMinutes(45), '45 min')
  assert.equal(formatMinutes(60), '1 u')
  assert.equal(formatMinutes(500), '8 u 20 min')
  assert.equal(formatMinutes(2400), '40 u')
})

test('weekStart is maandag', () => {
  assert.equal(weekStart('2026-11-09'), '2026-11-09')
  assert.equal(weekStart('2026-11-15'), '2026-11-09')
  assert.equal(addDays('2026-10-25', 1), '2026-10-26')
})

test('streak telt opeenvolgende dagen en is in gevaar als vandaag nog niets is gelogd', () => {
  const today = '2026-11-09'
  assert.deepEqual(computeStreak([], today), { streak: 0, shields: 0, studiedToday: false, atRisk: false })
  const r = computeStreak(['2026-11-07', '2026-11-08'], today)
  assert.equal(r.streak, 2)
  assert.equal(r.atRisk, true)
  const r2 = computeStreak(['2026-11-07', '2026-11-08', '2026-11-09'], today)
  assert.equal(r2.streak, 3)
  assert.equal(r2.atRisk, false)
  assert.equal(r2.shields, 1)
})

test('een schild vangt een gemiste dag op, zonder schild begint de streak opnieuw', () => {
  const today = '2026-11-10'
  const withShield = computeStreak(['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10'], today)
  assert.equal(withShield.streak, 7)
  const noShield = computeStreak(['2026-11-04', '2026-11-05', '2026-11-07', '2026-11-08'], today)
  assert.equal(noShield.streak, 0)
  const restarted = computeStreak(['2026-11-04', '2026-11-05', '2026-11-07', '2026-11-08', '2026-11-09'], '2026-11-09')
  assert.equal(restarted.streak, 3)
})

test('schilden zijn begrensd tot drie', () => {
  const days = Array.from({ length: 15 }, (_, i) => addDays('2026-10-01', i))
  assert.equal(computeStreak(days, addDays('2026-10-01', 14)).shields, 3)
})

test('weekvergelijking vergelijkt alleen dezelfde periode', () => {
  const byDay = minutesByDay([
    { learned_at: '2026-11-02', duration_minutes: 30 },
    { learned_at: '2026-11-04', duration_minutes: 60 },
    { learned_at: '2026-11-07', duration_minutes: 90 },
    { learned_at: '2026-11-09', duration_minutes: 45 },
  ])
  const c = weekComparison(byDay, '2026-11-09')
  assert.equal(c.thisWeek, 45)
  assert.equal(c.lastWeek, 30)
  assert.equal(c.diff, 15)
  assert.equal(c.comparable, true)
  assert.equal(weekComparison(minutesByDay([{ learned_at: '2026-11-09', duration_minutes: 20 }]), '2026-11-09').comparable, false)
})

test('alle kleurniveaus van de kalender zijn bereikbaar', () => {
  assert.deepEqual([0, 10, 45, 90, 200].map(heatmapLevel), [0, 1, 2, 3, 4])
})

test('herhalen gebruikt alleen eerdere leermomenten met een samenvatting', () => {
  const list = reviewOrder([
    { learned_at: '2026-11-09', description: 'vandaag' },
    { learned_at: '2026-11-02', description: 'week geleden' },
    { learned_at: '2026-10-20', description: '' },
    { learned_at: '2026-11-05', description: 'vier dagen' },
  ], '2026-11-09')
  assert.deepEqual(list.map(m => m.description), ['week geleden', 'vier dagen'])
})
