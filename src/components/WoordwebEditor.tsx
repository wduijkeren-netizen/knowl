'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'

type Node = { id: string; label: string; x: number; y: number; color: string }
type Edge = { id: string; from: string; to: string }
type Web = { id: string; title: string; vak: string | null; nodes: Node[]; edges: Edge[] }
type Subject = { id: string; name: string }
type Props = { web: Web | null; subjects: Subject[]; userId: string }

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

function uid() { return Math.random().toString(36).slice(2) }

export default function WoordwebEditor({ web, subjects, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const svgRef = useRef<SVGSVGElement>(null)

  const [title, setTitle] = useState(web?.title ?? '')
  const [vak, setVak] = useState(web?.vak ?? '')
  const [nodes, setNodes] = useState<Node[]>(web?.nodes ?? [])
  const [edges, setEdges] = useState<Edge[]>(web?.edges ?? [])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  function addNode(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.node')) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const color = COLORS[nodes.length % COLORS.length]
    setNodes(n => [...n, { id: uid(), label: 'Nieuw', x, y, color }])
  }

  function startDrag(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (connecting) {
      if (connecting === id) { setConnecting(null); return }
      const exists = edges.some(e => (e.from === connecting && e.to === id) || (e.from === id && e.to === connecting))
      if (!exists) setEdges(ed => [...ed, { id: uid(), from: connecting, to: id }])
      setConnecting(null)
      return
    }
    const node = nodes.find(n => n.id === id)!
    setDragging({ id, ox: e.clientX - node.x, oy: e.clientY - node.y })
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    setNodes(ns => ns.map(n => n.id === dragging.id ? { ...n, x: e.clientX - dragging.ox, y: e.clientY - dragging.oy } : n))
  }, [dragging])

  const onMouseUp = useCallback(() => setDragging(null), [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onMouseMove, onMouseUp])

  function startEdit(e: React.MouseEvent, node: Node) {
    e.stopPropagation()
    setEditingId(node.id)
    setEditLabel(node.label)
  }

  function saveEdit() {
    setNodes(ns => ns.map(n => n.id === editingId ? { ...n, label: editLabel || n.label } : n))
    setEditingId(null)
  }

  function deleteNode(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setNodes(ns => ns.filter(n => n.id !== id))
    setEdges(es => es.filter(e => e.from !== id && e.to !== id))
    if (connecting === id) setConnecting(null)
  }

  function deleteEdge(id: string) {
    setEdges(es => es.filter(e => e.id !== id))
  }

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const payload = { title: title.trim(), vak: vak || null, nodes, edges, user_id: userId }
    if (web) {
      await supabase.from('word_webs').update(payload).eq('id', web.id)
    } else {
      const { data } = await supabase.from('word_webs').insert(payload).select('id').single()
      if (data) { setSaving(false); router.push(`/woordweb/${data.id}`); return }
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const getNode = (id: string) => nodes.find(n => n.id === id)

  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col">
      <Nav />

      {/* Toolbar */}
      <div className="bg-white border-b border-indigo-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        <Link href="/woordweb" className="text-indigo-400 hover:text-indigo-600 text-sm transition-colors">← Terug</Link>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Naam van het web"
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-48"
        />
        <select value={vak} onChange={e => setVak(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
          <option value="">Geen vak</option>
          {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <span className="text-xs text-indigo-300 self-center hidden sm:block">Klik op canvas → knoop · Klik knoop → slepen · Verbinden-knop → lijn trekken</span>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all">
            {saving ? 'Opslaan...' : saved ? 'Opgeslagen ✓' : 'Opslaan'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onClick={addNode}
        className="flex-1 relative overflow-hidden cursor-crosshair select-none"
        style={{ minHeight: '600px', background: 'radial-gradient(circle, #e0e7ff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      >
        {/* Verbindingslijnen */}
        <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {edges.map(edge => {
            const a = getNode(edge.from)
            const b = getNode(edge.to)
            if (!a || !b) return null
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            return (
              <g key={edge.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#c7d2fe" strokeWidth="2" />
                <circle cx={mx} cy={my} r="8" fill="white" stroke="#c7d2fe" strokeWidth="1.5"
                  className="cursor-pointer pointer-events-auto"
                  onClick={() => deleteEdge(edge.id)} />
                <text x={mx} y={my + 4} textAnchor="middle" fontSize="10" fill="#a5b4fc" className="pointer-events-none">✕</text>
              </g>
            )
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            className="node absolute"
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: 10 }}
            onMouseDown={e => startDrag(e, node.id)}
          >
            {editingId === node.id ? (
              <div className="bg-white rounded-2xl shadow-lg border-2 p-2 flex gap-1" style={{ borderColor: node.color }}
                onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32"
                />
                <button onClick={saveEdit}
                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors">
                  ✓
                </button>
              </div>
            ) : (
              <div
                className={`relative flex items-center gap-1 px-4 py-2 rounded-2xl shadow-md text-white text-sm font-semibold cursor-grab active:cursor-grabbing transition-all ${connecting === node.id ? 'ring-4 ring-offset-2 ring-violet-400' : ''}`}
                style={{ background: node.color, minWidth: '80px', textAlign: 'center' }}
              >
                <span className="flex-1">{node.label}</span>
                <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100"
                  style={{ opacity: 1 }}>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => startEdit(e, node)}
                    className="w-5 h-5 bg-white rounded-full text-gray-500 hover:text-indigo-600 text-xs flex items-center justify-center shadow border border-gray-200 transition-colors"
                    title="Bewerken">✎</button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setConnecting(connecting === node.id ? null : node.id) }}
                    className={`w-5 h-5 rounded-full text-xs flex items-center justify-center shadow border transition-colors ${connecting === node.id ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 hover:text-violet-600 border-gray-200'}`}
                    title="Verbinden">⟷</button>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => deleteNode(e, node.id)}
                    className="w-5 h-5 bg-white rounded-full text-gray-500 hover:text-red-500 text-xs flex items-center justify-center shadow border border-gray-200 transition-colors"
                    title="Verwijderen">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-4xl mb-2">🕸️</p>
              <p className="text-indigo-300 font-medium">Klik ergens op het canvas om een knoop toe te voegen</p>
            </div>
          </div>
        )}

        {connecting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg">
            Klik nu op een andere knoop om te verbinden · <button onClick={() => setConnecting(null)} className="underline">Annuleren</button>
          </div>
        )}
      </div>
    </div>
  )
}
