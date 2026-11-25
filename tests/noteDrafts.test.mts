import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldRestore } from '../src/lib/noteDrafts.ts'

const saved = { title: 'H3', content: '<p>oud</p>', subject: 'Recht', updated_at: '2026-11-25T10:00:00.000Z' }
const at = (iso: string) => Date.parse(iso)

test('lokale kopie wint alleen als die nieuwer en anders is', () => {
  assert.equal(shouldRestore(null, saved), false)
  assert.equal(shouldRestore({ title: 'H3', content: '<p>nieuw</p>', subject: 'Recht', at: at('2026-11-25T10:05:00Z') }, saved), true)
  // ouder dan de opgeslagen versie (bijv. op telefoon verder gewerkt)
  assert.equal(shouldRestore({ title: 'H3', content: '<p>nieuw</p>', subject: 'Recht', at: at('2026-11-25T09:00:00Z') }, saved), false)
  // nieuwer maar precies hetzelfde
  assert.equal(shouldRestore({ title: 'H3', content: '<p>oud</p>', subject: 'Recht', at: at('2026-11-25T11:00:00Z') }, saved), false)
  // alleen de titel is veranderd
  assert.equal(shouldRestore({ title: 'H3 en H4', content: '<p>oud</p>', subject: 'Recht', at: at('2026-11-25T11:00:00Z') }, saved), true)
})
