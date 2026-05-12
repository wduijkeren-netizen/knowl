'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { useStudyTimer } from '@/lib/useStudyTimer'

type Node = { id: string; label: string; x: number; y: number; color: string }
type Edge = { id: string; from: string; to: string; label?: string }
type Web = { id: string; title: string; vak: string | null; nodes: Node[]; edges: Edge[] }
type Subject = { id: string; name: string }
type Props = { web: Web | null; subjects: Subject[]; userId: string }

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

function uid() { return Math.random().toString(36).slice(2) }

export default function WoordwebEditor({ web, subjects, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [title, setTitle] = useState(web?.title ?? '')
  const [vak, setVak] = useState(web?.vak ?? '')
  const [nodes, setNodes] = useState<Node[]>(web?.nodes ?? [])
  const [edges, setEdges] = useState<Edge[]>(web?.edges ?? [])
  const [connecting, setConnecting] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editNodeLabel, setEditNodeLabel] = useState('')
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [editEdgeLabel, setEditEdgeLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  useStudyTimer('woordweb', web?.title ?? 'Nieuw web')

  function addNode(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.node')) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const color = COLORS[nodes.length % COLORS.length]
    const newNode = { id: uid(), label: 'Nieuw', x, y, color }
    setNodes(n => [...n, newNode])
    setEditingNodeId(newNode.id)
    setEditNodeLabel('Nieuw')
  }

  function startDrag(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (connecting) {
      if (connecting === id) { setConnecting(null); return }
      const exists = edges.some(ed => (ed.from === connecting && ed.to === id) || (ed.from === id && ed.to === connecting))
      if (!exists) setEdges(ed => [...ed, { id: uid(), from: connecting, to: id, label: '' }])
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

  function startEditNode(e: React.MouseEvent, node: Node) {
    e.stopPropagation()
    setEditingNodeId(node.id)
    setEditNodeLabel(node.label)
  }

  function saveNodeEdit() {
    setNodes(ns => ns.map(n => n.id === editingNodeId ? { ...n, label: editNodeLabel.trim() || n.label } : n))
    setEditingNodeId(null)
  }

  function startEditEdge(e: React.MouseEvent, edge: Edge) {
    e.stopPropagation()
    setEditingEdgeId(edge.id)
    setEditEdgeLabel(edge.label ?? '')
  }

  function saveEdgeEdit() {
    setEdges(es => es.map(e => e.id === editingEdgeId ? { ...e, label: editEdgeLabel.trim() } : e))
    setEditingEdgeId(null)
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

  async function handleExport() {
    setExporting(true)
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(canvasRef.current!, {
      backgroundColor: '#f8f7ff',
      scale: 2,
      useCORS: true,
    })
    const link = document.createElement('a')
    link.download = `${title || 'woordweb'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setExporting(false)
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
        <Link href="/woordweb" className="text-indigo-400 hover:text-indigo-600 text-sm transition-colors shrink-0">← Terug</Link>
        <input
          value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Naam van het web"
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
        />
        <select value={vak} onChange={e => setVak(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
          <option value="">Geen vak</option>
          {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={handleExport} disabled={exporting || nodes.length === 0}
            className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-indigo-200 disabled:opacity-40 transition-all">
            {exporting ? 'Exporteren...' : '↓ Exporteer als afbeelding'}
          </button>
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
        {/* SVG voor lijnen en labels */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          {edges.map(edge => {
            const a = getNode(edge.from)
            const b = getNode(edge.to)
            if (!a || !b) return null
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const hasLabel = edge.label && edge.label.trim().length > 0
            return (
              <g key={edge.id}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#c7d2fe" strokeWidth="2" />

                {/* Label op de lijn */}
                {editingEdgeId === edge.id ? (
                  <foreignObject x={mx - 60} y={my - 16} width="120" height="32" style={{ pointerEvents: 'all' }}>
                    <input
                      autoFocus
                      value={editEdgeLabel}
                      onChange={e => setEditEdgeLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdgeEdit(); if (e.key === 'Escape') setEditingEdgeId(null) }}
                      onBlur={saveEdgeEdit}
                      placeholder="label..."
                      style={{ width: '100%', fontSize: '11px', padding: '2px 6px', borderRadius: '8px', border: '2px solid #6366f1', outline: 'none', background: 'white', textAlign: 'center' }}
                    />
                  </foreignObject>
                ) : (
                  <g
                    className="cursor-pointer"
                    style={{ pointerEvents: 'all' }}
                    onClick={e => { e.stopPropagation(); startEditEdge(e as unknown as React.MouseEvent, edge) }}
                  >
                    {hasLabel ? (
                      <>
                        <rect x={mx - 36} y={my - 10} width="72" height="20" rx="6" fill="white" stroke="#c7d2fe" strokeWidth="1.5" />
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#6366f1" fontWeight="500">{edge.label}</text>
                      </>
                    ) : (
                      <>
                        <circle cx={mx} cy={my} r="10" fill="white" stroke="#e0e7ff" strokeWidth="1.5" />
                        <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#c7d2fe">+</text>
                      </>
                    )}
                  </g>
                )}

                {/* Verwijder-knopje aan het einde van de lijn */}
                <circle cx={(a.x * 0.25 + b.x * 0.75)} cy={(a.y * 0.25 + b.y * 0.75)} r="7" fill="white" stroke="#fecdd3" strokeWidth="1.5"
                  className="cursor-pointer" style={{ pointerEvents: 'all' }}
                  onClick={e => { e.stopPropagation(); deleteEdge(edge.id) }} />
                <text x={(a.x * 0.25 + b.x * 0.75)} y={(a.y * 0.25 + b.y * 0.75) + 4} textAnchor="middle" fontSize="9" fill="#fca5a5" style={{ pointerEvents: 'none' }}>✕</text>
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
            {editingNodeId === node.id ? (
              <div className="bg-white rounded-2xl shadow-lg border-2 p-2 flex gap-1" style={{ borderColor: node.color }}
                onClick={e => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editNodeLabel}
                  onChange={e => setEditNodeLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNodeEdit(); if (e.key === 'Escape') saveNodeEdit() }}
                  onBlur={saveNodeEdit}
                  className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-32"
                />
                <button onClick={saveNodeEdit}
                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors">✓</button>
              </div>
            ) : (
              <div
                className={`relative flex items-center gap-1 px-4 py-2 rounded-2xl shadow-md text-white text-sm font-semibold cursor-grab active:cursor-grabbing transition-all ${connecting === node.id ? 'ring-4 ring-offset-2 ring-violet-400' : ''}`}
                onDoubleClick={e => startEditNode(e, node)}
                style={{ background: node.color, minWidth: '80px', textAlign: 'center' }}
              >
                <span className="flex-1">{node.label}</span>
                <div className="absolute -top-2 -right-2 flex gap-0.5" style={{ opacity: 1 }}>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => startEditNode(e, node)}
                    className="w-5 h-5 bg-white rounded-full text-gray-500 hover:text-indigo-600 text-xs flex items-center justify-center shadow border border-gray-200 transition-colors" title="Bewerken">✎</button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setConnecting(connecting === node.id ? null : node.id) }}
                    className={`w-5 h-5 rounded-full text-xs flex items-center justify-center shadow border transition-colors ${connecting === node.id ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 hover:text-violet-600 border-gray-200'}`}
                    title="Verbinden">⟷</button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => deleteNode(e, node.id)}
                    className="w-5 h-5 bg-white rounded-full text-gray-500 hover:text-red-500 text-xs flex items-center justify-center shadow border border-gray-200 transition-colors" title="Verwijderen">✕</button>
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
              <p className="text-xs text-indigo-200 mt-1">Dubbelklik op een knoop om de tekst te bewerken · Klik op + op een lijn om een label toe te voegen</p>
            </div>
          </div>
        )}

        {connecting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-20">
            Klik nu op een andere knoop om te verbinden ·{' '}
            <button onClick={() => setConnecting(null)} className="underline">Annuleren</button>
          </div>
        )}
      </div>
    </div>
  )
}
