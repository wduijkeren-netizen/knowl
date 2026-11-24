import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPlan, phaseFor, studyDates, type StudyGoal } from '../src/lib/examPlan.ts'

const goal: StudyGoal = {
  id: 'g', subject: 'Recht', title: 'Toets H3', exam_date: '2026-12-07', goal: null,
  target_minutes: 600, study_days: [0, 1, 2, 3, 4], start_date: '2026-11-23',
}

test('studiedagen volgen de gekozen weekdagen', () => {
  // ma 23 nov t/m zo 6 dec, alleen werkdagen = 10 dagen
  assert.equal(studyDates('2026-11-23', '2026-12-06', [0, 1, 2, 3, 4]).length, 10)
  assert.deepEqual(studyDates('2026-11-23', '2026-11-29', [5, 6]), ['2026-11-28', '2026-11-29'])
})

test('fases: nieuwe stof, oefenen, laatste twee dagen herhalen', () => {
  const phases = Array.from({ length: 10 }, (_, i) => phaseFor(i, 10))
  assert.deepEqual(phases, ['new', 'new', 'new', 'new', 'practice', 'practice', 'practice', 'practice', 'review', 'review'])
  assert.deepEqual([phaseFor(0, 1)], ['review'])
})

test('minuten worden verdeeld en de planning past zich aan', () => {
  const start = buildPlan(goal, {}, '2026-11-23')
  assert.equal(start.perDay, 60)
  assert.equal(start.studyDaysLeft, 10)
  assert.equal(start.status, 'op_schema')
  // twee dagen niets gedaan: resterende 600 over 8 dagen = 75
  const behind = buildPlan(goal, {}, '2026-11-25')
  assert.equal(behind.perDay, 75)
  assert.equal(behind.status, 'achter')
  // wel gedaan: 120 min in de eerste twee dagen
  const onTrack = buildPlan(goal, { '2026-11-23': 60, '2026-11-24': 60, '2026-11-01': 500 }, '2026-11-25')
  assert.equal(onTrack.done, 120)
  assert.equal(onTrack.perDay, 60)
  assert.equal(onTrack.status, 'op_schema')
  // vandaag al deels gedaan: telt niet dubbel in de verdeling
  const partly = buildPlan(goal, { '2026-11-23': 20 }, '2026-11-23')
  assert.equal(partly.today?.planned, 60)
  assert.equal(partly.today?.open, 40)
})

test('klaar en voorbij', () => {
  assert.equal(buildPlan(goal, { '2026-11-24': 600 }, '2026-11-26').status, 'klaar')
  assert.equal(buildPlan(goal, {}, '2026-12-08').status, 'voorbij')
  assert.equal(buildPlan(goal, {}, '2026-12-07').daysLeft, 0)
})
