export type WebNode = { id: string; label: string; x: number; y: number; color: string }
export type WebEdge = { id: string; from: string; to: string; label?: string }
export type TreeItem = { node: WebNode; depth: number; children: TreeItem[] }

/**
 * Zet een woordweb om in een boom: per losse groep begint de boom bij het begrip met de meeste
 * verbindingen (het middelpunt), daarna volgen de begrippen die eraan vastzitten, laag voor laag.
 */
export function buildTree(nodes: WebNode[], edges: WebEdge[]): TreeItem[] {
  const neighbours = new Map<string, string[]>(nodes.map(n => [n.id, []]))
  for (const e of edges) {
    if (!neighbours.has(e.from) || !neighbours.has(e.to)) continue
    neighbours.get(e.from)!.push(e.to)
    neighbours.get(e.to)!.push(e.from)
  }
  const order = new Map(nodes.map((n, i) => [n.id, i]))
  const byId = new Map(nodes.map(n => [n.id, n]))
  const seen = new Set<string>()
  const roots: TreeItem[] = []

  const remaining = () => nodes.filter(n => !seen.has(n.id))
  while (seen.size < nodes.length) {
    const component = new Set<string>()
    const stack = [remaining()[0].id]
    while (stack.length) {
      const id = stack.pop()!
      if (component.has(id)) continue
      component.add(id)
      for (const n of neighbours.get(id)!) if (!component.has(n)) stack.push(n)
    }
    const rootId = Array.from(component).sort((a, b) => neighbours.get(b)!.length - neighbours.get(a)!.length || order.get(a)! - order.get(b)!)[0]
    const root: TreeItem = { node: byId.get(rootId)!, depth: 0, children: [] }
    seen.add(rootId)
    const queue: TreeItem[] = [root]
    while (queue.length) {
      const item = queue.shift()!
      const next = neighbours.get(item.node.id)!.filter(id => !seen.has(id)).sort((a, b) => order.get(a)! - order.get(b)!)
      for (const id of next) {
        seen.add(id)
        const child: TreeItem = { node: byId.get(id)!, depth: item.depth + 1, children: [] }
        item.children.push(child)
        queue.push(child)
      }
    }
    roots.push(root)
  }
  return roots
}

export function flattenTree(items: TreeItem[]): TreeItem[] {
  return items.flatMap(i => [i, ...flattenTree(i.children)])
}
