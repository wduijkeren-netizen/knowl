import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMinutes, addDays, weekStart, computeStreak, weekComparison, heatmapLevel, minutesByDay, reviewSchedule, reviewQueue, formatDay, schoolYearOf, schoolYearRange, groupLabel,
  selectionRange, percentages, subjectTotals, weeklyBySubject, weekdayTotals, dayPartOf, isoWeek,
  subjectInsight, trendInsight, weekdayInsight, typeInsight,
} from '../src/lib/studyStats.ts'
import { buildSubjectColors, SUBJECT_PALETTE } from '../src/lib/subjectColors.ts'

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

test('herhaalschema: 1, 7 en 30 dagen na registratie, vergeten begint opnieuw', () => {
  assert.equal(reviewSchedule('2026-11-01', []).due, '2026-11-02')
  assert.equal(reviewSchedule('2026-11-01', [{ result: 'remembered', date: '2026-11-02' }]).due, '2026-11-08')
  assert.equal(reviewSchedule('2026-11-01', [{ result: 'remembered', date: '2026-11-02' }, { result: 'remembered', date: '2026-11-08' }]).due, '2026-12-01')
  assert.equal(reviewSchedule('2026-11-01', [{ result: 'remembered', date: '2026-11-02' }, { result: 'remembered', date: '2026-11-08' }, { result: 'remembered', date: '2026-12-01' }]).done, true)
  assert.equal(reviewSchedule('2026-11-01', [{ result: 'remembered', date: '2026-11-02' }, { result: 'forgotten', date: '2026-11-09' }]).due, '2026-11-10')
  assert.equal(reviewSchedule('2026-09-26', [], '2026-11-09').step, 2)
  assert.equal(reviewSchedule('2026-10-30', [], '2026-11-09').step, 1)
})

test('herhaalwachtrij: alleen actieve vakken, met notitie, niet te oud, achterstallige eerst', () => {
  const today = '2026-11-09'
  const moments = [
    { id: 'a', learned_at: '2026-11-08', description: 'gisteren', category: 'Statistiek' },
    { id: 'b', learned_at: '2026-11-02', description: 'week geleden', category: 'Statistiek' },
    { id: 'c', learned_at: '2026-11-01', description: 'oud vak', category: 'Geschiedenis' },
    { id: 'd', learned_at: '2026-05-20', description: '173 dagen', category: 'Statistiek' },
    { id: 'e', learned_at: '2026-11-07', description: '', category: 'Statistiek' },
    { id: 'f', learned_at: '2026-11-09', description: 'vandaag', category: 'Statistiek' },
  ]
  const { due, nextDue } = reviewQueue(moments, [], new Set(['Statistiek']), today)
  assert.deepEqual(due.map(d => d.moment.id), ['a', 'b'])
  assert.deepEqual(due.map(d => d.step), [0, 1])
  assert.equal(nextDue, '2026-11-10')
  const after = reviewQueue(moments, [{ moment_id: 'b', result: 'remembered', reviewed_at: '2026-11-09T10:00:00' }], new Set(['Statistiek']), today)
  assert.deepEqual(after.due.map(d => d.moment.id), ['a'])
})

test('vakkleuren zijn vast per vaknaam en uniek zolang er kleuren over zijn', () => {
  const a = buildSubjectColors(['Statistiek', 'Recht', 'Marketing'])
  const b = buildSubjectColors(['Marketing', 'Statistiek', 'Recht'])
  assert.deepEqual(a, b)
  assert.equal(new Set(Object.values(a)).size, 3)
  const many = buildSubjectColors(SUBJECT_PALETTE.map((_, i) => `Vak ${i}`))
  assert.equal(new Set(Object.values(many)).size, SUBJECT_PALETTE.length)
})

test('datums, schooljaren en tussenkopjes', () => {
  assert.equal(formatDay('2026-11-05'), 'do 5 nov')
  assert.equal(schoolYearOf('2026-08-01'), '2026-2027')
  assert.equal(schoolYearOf('2026-07-31'), '2025-2026')
  assert.equal(schoolYearOf(''), null)
  assert.deepEqual(schoolYearRange('2025-2026'), ['2025-08-01', '2026-07-31'])
  const today = '2026-11-12'
  assert.equal(groupLabel('2026-11-12', today), 'Vandaag')
  assert.equal(groupLabel('2026-11-11', today), 'Gisteren')
  assert.equal(groupLabel('2026-11-09', today), 'Deze week')
  assert.equal(groupLabel('2026-11-03', today), 'November 2026')
  assert.equal(groupLabel('2026-10-20', today), 'Oktober 2026')
})

test('periodes binnen een schooljaar', () => {
  const today = '2026-11-12'
  assert.deepEqual(selectionRange('', 'alles', today), { from: null, to: null })
  assert.deepEqual(selectionRange('2026-2027', 'alles', today), { from: '2026-08-01', to: '2027-07-31' })
  assert.deepEqual(selectionRange('2026-2027', 'jaar', today), { from: '2026-08-01', to: '2026-11-12' })
  assert.deepEqual(selectionRange('', 'jaar', today), { from: '2026-01-01', to: '2026-11-12' })
  assert.deepEqual(selectionRange('', 'periode', today), { from: '2026-09-07', to: '2026-11-12' })
  const old = selectionRange('2024-2025', 'periode', today)
  assert.ok(old.from! > old.to!, 'oud schooljaar + deze periode is leeg')
})

test('percentages tellen op tot 100', () => {
  assert.deepEqual(percentages([1, 1, 1]), [34, 33, 33])
  assert.deepEqual(percentages([530, 380, 340, 65]), [40, 29, 26, 5])
  assert.deepEqual(percentages([0, 0]), [0, 0])
})

test('tijd per vak, per week en per weekdag', () => {
  const ms = [
    { learned_at: '2026-11-09', duration_minutes: 60, category: 'EBR' },
    { learned_at: '2026-11-10', duration_minutes: 30, category: 'IBR' },
    { learned_at: '2026-11-03', duration_minutes: 45, category: null },
    { learned_at: '2026-11-04', duration_minutes: null, category: 'EBR' },
  ]
  assert.deepEqual(subjectTotals(ms), [{ name: 'EBR', minutes: 60 }, { name: 'Zonder vak', minutes: 45 }, { name: 'IBR', minutes: 30 }])
  const weeks = weeklyBySubject(ms, '2026-11-12', 3)
  assert.deepEqual(weeks.map(w => [w.start, w.total]), [['2026-10-26', 0], ['2026-11-02', 45], ['2026-11-09', 90]])
  assert.equal(weeks[2].week, isoWeek('2026-11-09'))
  assert.equal(isoWeek('2026-11-09'), 46)
  assert.deepEqual(weekdayTotals(ms), [60, 75, 0, 0, 0, 0, 0])
})

test('dagdelen alleen met een echt tijdstip', () => {
  assert.equal(dayPartOf('08:30'), 'Ochtend')
  assert.equal(dayPartOf('12:00'), 'Middag')
  assert.equal(dayPartOf('23:59:00'), 'Avond')
  assert.equal(dayPartOf('02:15'), 'Nacht')
  assert.equal(dayPartOf(null), null)
  assert.equal(dayPartOf(''), null)
})

test('conclusies volgen de gegevens', () => {
  assert.equal(subjectInsight([]), null)
  assert.equal(subjectInsight([{ name: 'EBR', minutes: 530 }, { name: 'IBR', minutes: 380 }, { name: 'BTW', minutes: 340 }, { name: 'EXV', minutes: 65 }]), 'EXV krijgt 5% van je studietijd, terwijl EBR 40% krijgt.')
  assert.equal(subjectInsight([{ name: 'EBR', minutes: 60 }]), 'Al je studietijd ging naar EBR.')
  assert.equal(trendInsight([{ start: '2026-10-05', total: 0 }, { start: '2026-10-12', total: 30 }]), null)
  assert.match(trendInsight([30, 40, 30, 35, 90, 100, 80, 120].map((t, i) => ({ start: `2026-09-${String(7 + i * 3).padStart(2, '0')}`, total: t })))!, /toegenomen/)
  assert.equal(weekdayInsight([0, 0, 0, 0, 0, 0, 0]), null)
  assert.equal(weekdayInsight([60, 40, 50, 120, 5, 0, 30]), 'Je sterkste studiedag is donderdag. Op vrijdag en zaterdag studeer je nauwelijks.')
  assert.match(typeInsight({ new: 70, practice: 10, review: 20 })!, /70% naar nieuwe stof/)
})
