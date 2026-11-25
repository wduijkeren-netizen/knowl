'use client'

import Glyph from '@/components/Glyph'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'
import SubjectSelect from '@/components/SubjectSelect'
import { ArrowLeft, Check, Download, Link2, MoreHorizontal, MousePointerClick, Pencil, Save, Trash2 } from 'lucide-react'
import { buildSubjectColors } from '@/lib/subjectColors'
import { useStudyTimer } from '@/lib/useStudyTimer'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  const { tr } = useLanguage()
  const ww = tr.woordweb
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const subjectNames = useMemo(() => Array.from(new Set([...subjects.map(s => s.name), ...(web?.vak ? [web.vak] : [])])).sort((a, b) => a.localeCompare(b)), [subjects, web?.vak])
  const subjectColors = useMemo(() => buildSubjectColors(subjectNames), [subjectNames])

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) { if (!(e.target as HTMLElement).closest('[data-menu]')) setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])
  useStudyTimer('woordweb', web?.title ?? ww.newWeb)

  function addNode(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.node')) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const color = COLORS[nodes.length % COLORS.length]
    const newNode = { id: uid(), label: '', x, y, color }
    setNodes(n => [...n, newNode])
    setEditingNodeId(newNode.id)
    setEditNodeLabel('')
  }

  function startDrag(e: React.MouseEvent | React.TouchEvent, id: string) {
    e.stopPropagation()
    if (connecting) {
      if (connecting === id) { setConnecting(null); return }
      const exists = edges.some(ed => (ed.from === connecting && ed.to === id) || (ed.from === id && ed.to === connecting))
      if (!exists) setEdges(ed => [...ed, { id: uid(), from: connecting, to: id, label: '' }])
      setConnecting(null)
      return
    }
    const node = nodes.find(n => n.id === id)
    if (!node) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setDragging({ id, ox: clientX - node.x, oy: clientY - node.y })
  }

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    setNodes(ns => ns.map(n => n.id === dragging.id ? { ...n, x: e.clientX - dragging.ox, y: e.clientY - dragging.oy } : n))
  }, [dragging])

  const onMouseUp = useCallback(() => setDragging(null), [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging) return
    e.preventDefault()
    const t = e.touches[0]
    setNodes(ns => ns.map(n => n.id === dragging.id ? { ...n, x: t.clientX - dragging.ox, y: t.clientY - dragging.oy } : n))
  }, [dragging])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onMouseUp)
    }
  }, [onMouseMove, onMouseUp, onTouchMove])

  function startEditNode(e: React.MouseEvent, node: Node) {
    e.stopPropagation()
    setEditingNodeId(node.id)
    setEditNodeLabel(node.label)
  }

  function saveNodeEdit() {
    setNodes(ns => ns.map(n => n.id === editingNodeId
      ? { ...n, label: editNodeLabel.trim() || 'Knoop' }
      : n
    ))
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
    // Verberg knoopjes tijdelijk voor de export
    const btns = canvasRef.current!.querySelectorAll<HTMLElement>('.node-btns')
    btns.forEach(b => { b.style.display = 'none' })

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(canvasRef.current!, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
    })

    btns.forEach(b => { b.style.display = '' })

    const link = document.createElement('a')
    link.download = `${title || 'woordweb'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setExporting(false)
  }

  async function handleDelete() {
    if (!web) return
    await supabase.from('word_webs').delete().eq('id', web.id)
    router.push('/woordweb')
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
      <Nav loggedIn width="max-w-6xl" />

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-web" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 id="del-web" className="text-base font-semibold text-slate-900 dark:text-white">{ww.deleteTitle}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">&lsquo;{title || 'Dit woordweb'}&rsquo; wordt verwijderd. Dit kun je niet ongedaan maken.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(false)} autoFocus className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">{ww.cancel}</button>
              <button onClick={handleDelete} className="text-sm font-semibold bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700">Verwijderen</button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-sm">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <svg className="absolute -left-6 -top-4 w-56 h-40 opacity-20" viewBox="0 0 220 160" fill="none" stroke="white" strokeWidth="1.5">
            <line x1="40" y1="40" x2="110" y2="80" /><line x1="110" y1="80" x2="180" y2="30" /><line x1="110" y1="80" x2="150" y2="140" /><line x1="40" y1="40" x2="30" y2="120" />
            <circle cx="40" cy="40" r="9" fill="white" fillOpacity=".25" /><circle cx="110" cy="80" r="13" fill="white" fillOpacity=".25" />
            <circle cx="180" cy="30" r="7" fill="white" fillOpacity=".25" /><circle cx="150" cy="140" r="8" fill="white" fillOpacity=".25" /><circle cx="30" cy="120" r="6" fill="white" fillOpacity=".25" />
          </svg>
          <svg className="absolute -right-4 -bottom-10 w-64 h-44 opacity-20" viewBox="0 0 240 170" fill="none" stroke="white" strokeWidth="1.5">
            <line x1="60" y1="60" x2="140" y2="40" /><line x1="140" y1="40" x2="210" y2="90" /><line x1="60" y1="60" x2="120" y2="130" /><line x1="140" y1="40" x2="120" y2="130" />
            <circle cx="60" cy="60" r="10" fill="white" fillOpacity=".25" /><circle cx="140" cy="40" r="8" fill="white" fillOpacity=".25" />
            <circle cx="210" cy="90" r="12" fill="white" fillOpacity=".25" /><circle cx="120" cy="130" r="9" fill="white" fillOpacity=".25" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_minmax(0,30rem)_1fr] items-center gap-x-3 gap-y-3">
          <Link href="/woordweb" className="justify-self-start inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 transition-colors">
            <ArrowLeft className="w-4 h-4" strokeWidth={2} /> Woordwebben
          </Link>

          <div className="col-span-2 order-last sm:order-none sm:col-span-1 flex flex-col items-center gap-2 min-w-0">
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder={ww.webName} aria-label="Naam van het woordweb" maxLength={80}
              className="w-full bg-transparent text-center text-xl md:text-2xl font-bold text-white placeholder:text-white/60 border-b-2 border-white/25 hover:border-white/50 focus:border-white focus:outline-none px-2 py-1 transition-colors"
            />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <SubjectSelect value={vak} onChange={setVak} options={subjectNames.map(n => ({ value: n, label: n }))} colors={subjectColors} emptyLabel={ww.noSubject} label="Vak" className="w-52" />
              <span className="text-xs text-white/85">
                {nodes.length} {nodes.length === 1 ? 'begrip' : 'begrippen'} · {edges.length} {edges.length === 1 ? 'verbinding' : 'verbindingen'}
              </span>
            </div>
          </div>

          <div className="justify-self-end flex items-center gap-2">
            <button onClick={handleSave} disabled={saving || !title.trim()}
              className="inline-flex items-center gap-1.5 bg-white text-indigo-700 text-sm font-semibold px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors">
              {saved ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Save className="w-4 h-4" strokeWidth={2} />}
              {saving ? ww.saving : saved ? ww.saved : ww.save}
            </button>
            <div className="relative" data-menu>
              <button onClick={() => setMenuOpen(o => !o)} aria-label="Meer opties" aria-expanded={menuOpen}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 top-full mt-1.5 z-40 w-60 bg-white rounded-xl border border-indigo-100 shadow-xl py-1 text-slate-700 dark:text-slate-200">
                  <button role="menuitem" onClick={() => { setMenuOpen(false); handleExport() }} disabled={exporting || nodes.length === 0}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-white/5 disabled:opacity-50">
                    <Download className="w-4 h-4" strokeWidth={2} /> {exporting ? ww.exporting : 'Exporteer als afbeelding'}
                  </button>
                  {web && (
                    <>
                      <div className="my-1 border-t border-indigo-100" role="separator" />
                      <button role="menuitem" onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" strokeWidth={2} /> Woordweb verwijderen
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-indigo-100">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" strokeWidth={2} /> Klik op het vlak om een begrip toe te voegen</span>
          <span className="inline-flex items-center gap-1.5"><Pencil className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" strokeWidth={2} /> Dubbelklik om te bewerken</span>
          <span className="inline-flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" strokeWidth={2} /> Verbind begrippen met het schakelknopje</span>
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
                <path d={`M${a.x * 0.25 + b.x * 0.75 - 2.5} ${a.y * 0.25 + b.y * 0.75 - 2.5}l5 5m0-5l-5 5`} stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
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
            onTouchStart={e => startDrag(e, node.id)}
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
                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700 transition-colors"><Glyph name="check" className="w-4 h-4" /></button>
              </div>
            ) : (
              <div
                className={`relative flex items-center justify-center px-4 py-2 rounded-2xl shadow-md text-white text-sm font-semibold cursor-grab active:cursor-grabbing transition-all ${connecting === node.id ? 'ring-4 ring-offset-2 ring-violet-400' : ''}`}
                onDoubleClick={e => startEditNode(e, node)}
                style={{ background: node.color, minWidth: '80px', textAlign: 'center' }}
              >
                <span className="flex-1">{node.label}</span>
                <div className="node-btns absolute -top-2 -right-2 flex gap-0.5" style={{ opacity: 1 }}>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => startEditNode(e, node)}
                    className="w-5 h-5 bg-white rounded-full text-gray-500 hover:text-indigo-600 text-xs flex items-center justify-center shadow border border-gray-200 transition-colors" title="Bewerken"><Glyph name="pen" className="w-3 h-3" /></button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setConnecting(connecting === node.id ? null : node.id) }}
                    className={`w-5 h-5 rounded-full text-xs flex items-center justify-center shadow border transition-colors ${connecting === node.id ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 hover:text-violet-600 border-gray-200'}`}
                    title="Verbinden"><Glyph name="connect" className="w-3 h-3" /></button>
                  <button onMouseDown={e => e.stopPropagation()} onClick={e => deleteNode(e, node.id)}
                    className="w-5 h-5 bg-white rounded-full text-gray-500 hover:text-red-500 text-xs flex items-center justify-center shadow border border-gray-200 transition-colors" title="Verwijderen"><Glyph name="close" className="w-3 h-3" /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Glyph name="web" className="w-10 h-10 mx-auto mb-2 text-indigo-400" />
              <p className="text-indigo-300 font-medium">{ww.emptyCanvas}</p>
              <p className="text-xs text-indigo-200 mt-1">{ww.hint}</p>
            </div>
          </div>
        )}

        {connecting && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-20">
            {ww.connectMode} ·{' '}
            <button onClick={() => setConnecting(null)} className="underline">{ww.cancelConnect}</button>
          </div>
        )}
      </div>
    </div>
  )
}
