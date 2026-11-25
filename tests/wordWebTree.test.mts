import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTree, flattenTree } from '../src/lib/wordWebTree.ts'

const n = (id: string) => ({ id, label: id.toUpperCase(), x: 0, y: 0, color: '#000' })

test('boom begint bij het begrip met de meeste verbindingen', () => {
  const nodes = [n('b'), n('a'), n('c'), n('d'), n('e')]
  const edges = [
    { id: '1', from: 'a', to: 'b' }, { id: '2', from: 'a', to: 'c' }, { id: '3', from: 'c', to: 'd' }, { id: '4', from: 'a', to: 'd' },
  ]
  const tree = buildTree(nodes, edges)
  assert.equal(tree.length, 2)
  assert.equal(tree[0].node.id, 'a')
  assert.deepEqual(tree[0].children.map(c => c.node.id), ['b', 'c', 'd'])
  assert.equal(tree[1].node.id, 'e')
  assert.deepEqual(flattenTree(tree).map(i => [i.node.id, i.depth]), [['a', 0], ['b', 1], ['c', 1], ['d', 1], ['e', 0]])
})

test('diepere lagen en losse lijnen naar verwijderde begrippen', () => {
  const tree = buildTree([n('x'), n('y'), n('z')], [{ id: '1', from: 'x', to: 'y' }, { id: '2', from: 'y', to: 'z' }, { id: '3', from: 'z', to: 'weg' }])
  assert.equal(tree.length, 1)
  assert.deepEqual(flattenTree(tree).map(i => [i.node.id, i.depth]), [['y', 0], ['x', 1], ['z', 1]])
  assert.deepEqual(buildTree([], []), [])
})
