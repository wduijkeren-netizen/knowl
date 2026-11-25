'use client'

import Glyph from '@/components/Glyph'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Download, Hand, ListTree, MousePointerClick, Plus, Save, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import SubjectSelect from '@/components/SubjectSelect'
import ToolBanner, { bannerButton, bannerTitleInput } from '@/components/ToolBanner'
import { useStudyTimer } from '@/lib/useStudyTimer'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { buildSubjectColors } from '@/lib/subjectColors'
import { buildTree, type TreeItem, type WebEdge, type WebNode } from '@/lib/wordWebTree'

type Web = { id: string; title: string; vak: string | null; nodes: WebNode[]; edges: WebEdge[] }
type Subject = { id: string; name: string }
type Props = { web: Web | null; subjects: Subject[]; userId: string }

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#475569']
const DOUBLE_TAP_MS = 350
const DRAG_THRESHOLD = 5

function uid() { return Math.random().toString(36).slice(2) }

export default function WoordwebEditor({ web, subjects, userId }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const canvasRef = useRef<HTMLDivElement>(null)
  const { tr } = useLanguage()
  const ww = tr.woordweb

  const [title, setTitle] = useState(web?.title ?? '')
  const [vak, setVak] = useState(web?.vak ?? '')
  const [nodes, setNodes] = useState<WebNode[]>(web?.nodes ?? [])
  const [edges, setEdges] = useState<WebEdge[]>(web?.edges ?? [])
  const [selected, setSelected] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [editNodeLabel, setEditNodeLabel] = useState('')
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [editEdgeLabel, setEditEdgeLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const drag = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number; moved: boolean } | null>(null)
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null)
  useStudyTimer('woordweb', web?.title ?? ww.newWeb)

  const subjectNames = useMemo(() => Array.from(new Set([...subjects.map(s => s.name), ...(web?.vak ? [web.vak] : [])])).sort((a, b) => a.localeCompare(b)), [subjects, web?.vak])
  const subjectColors = useMemo(() => buildSubjectColors(subjectNames), [subjectNames])
  const tree = useMemo(() => buildTree(nodes, edges), [nodes, edges])

  const changeNodes = useCallback((fn: (n: WebNode[]) => WebNode[]) => { setNodes(fn); setDirty(true) }, [])
  const changeEdges = useCallback((fn: (e: WebEdge[]) => WebEdge[]) => { setEdges(fn); setDirty(true) }, [])

  function startEditing(id: string) {
    const node = nodes.find(n => n.id === id)
    if (!node) return
    setSelected(id)
    setEditingNodeId(id)
    setEditNodeLabel(node.label)
  }

  function addNodeAt(x: number, y: number, connectTo?: string) {
    const color = connectTo ? nodes.find(n => n.id === connectTo)?.color ?? COLORS[0] : COLORS[nodes.length % COLORS.length]
    const node = { id: uid(), label: '', x, y, color }
    changeNodes(n => [...n, node])
    if (connectTo) changeEdges(e => [...e, { id: uid(), from: connectTo, to: node.id, label: '' }])
    setSelected(node.id)
    setEditingNodeId(node.id)
    setEditNodeLabel('')
  }

  function addChild(parentId: string) {
    const parent = nodes.find(n => n.id === parentId)
    if (!parent) return
    const count = edges.filter(e => e.from === parentId || e.to === parentId).length
    const angle = (count * 55 * Math.PI) / 180 + Math.PI / 6
    const rect = canvasRef.current?.getBoundingClientRect()
    const x = Math.max(60, Math.min((rect?.width ?? 800) - 60, parent.x + Math.cos(angle) * 150))
    const y = Math.max(40, Math.min((rect?.height ?? 600) - 40, parent.y + Math.sin(angle) * 110))
    if (collapsed.has(parentId)) setCollapsed(c => { const n = new Set(c); n.delete(parentId); return n })
    addNodeAt(x, y, parentId)
  }

  function onCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('.node, .edge-ui')) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const now = Date.now()
    const prev = lastTap.current
    if (prev && now - prev.t < DOUBLE_TAP_MS && Math.hypot(prev.x - x, prev.y - y) < 30) {
      lastTap.current = null
      addNodeAt(x, y)
      return
    }
    lastTap.current = { t: now, x, y }
    setSelected(null)
    setConnecting(null)
  }

  function onNodePointerDown(e: React.PointerEvent, id: string) {
    if ((e.target as HTMLElement).closest('input, button')) return
    e.stopPropagation()
    const node = nodes.find(n => n.id === id)
    if (!node) return
    drag.current = { id, startX: e.clientX, startY: e.clientY, ox: e.clientX - node.x, oy: e.clientY - node.y, moved: false }
  }

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return
    d.moved = true
    changeNodes(ns => ns.map(n => (n.id === d.id ? { ...n, x: e.clientX - d.ox, y: e.clientY - d.oy } : n)))
  }, [changeNodes])

  const onPointerUp = useCallback(() => {
    const d = drag.current
    drag.current = null
    if (!d || d.moved) return
    if (connecting) {
      if (connecting !== d.id) {
        changeEdges(es => (es.some(ed => (ed.from === connecting && ed.to === d.id) || (ed.from === d.id && ed.to === connecting)) ? es : [...es, { id: uid(), from: connecting, to: d.id, label: '' }]))
      }
      setConnecting(null)
      return
    }
    startEditing(d.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connecting, nodes, changeEdges])

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [onPointerMove, onPointerUp])

  useEffect(() => {
    if (!dirty) return
    function warn(e: BeforeUnloadEvent) { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function saveNodeEdit() {
    if (!editingNodeId) return
    const id = editingNodeId
    changeNodes(ns => ns.map(n => (n.id === id ? { ...n, label: editNodeLabel.trim() || n.label || 'Begrip' } : n)))
    setEditingNodeId(null)
  }

  function renameNode(id: string, label: string) {
    changeNodes(ns => ns.map(n => (n.id === id ? { ...n, label } : n)))
  }

  function recolor(id: string, color: string) {
    changeNodes(ns => ns.map(n => (n.id === id ? { ...n, color } : n)))
  }

  function removeNode(id: string) {
    changeNodes(ns => ns.filter(n => n.id !== id))
    changeEdges(es => es.filter(e => e.from !== id && e.to !== id))
    if (connecting === id) setConnecting(null)
    if (selected === id) setSelected(null)
    if (editingNodeId === id) setEditingNodeId(null)
  }

  function saveEdgeEdit() {
    const id = editingEdgeId
    changeEdges(es => es.map(e => (e.id === id ? { ...e, label: editEdgeLabel.trim() } : e)))
    setEditingEdgeId(null)
  }

  async function handleExport() {
    if (!canvasRef.current) return
    setExporting(true)
    const hide = canvasRef.current.querySelectorAll<HTMLElement>('.node-btns, .edge-ui')
    hide.forEach(b => { b.style.visibility = 'hidden' })
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(canvasRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
    hide.forEach(b => { b.style.visibility = '' })
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
      if (data) { setSaving(false); setDirty(false); router.push(`/woordweb/${data.id}`); return }
    }
    setSaving(false)
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const getNode = (id: string) => nodes.find(n => n.id === id)
  const selectedNode = selected ? getNode(selected) : null

  function renderRow(item: TreeItem): React.ReactNode {
    const n = item.node
    const isSel = selected === n.id
    const hasKids = item.children.length > 0
    const isCollapsed = collapsed.has(n.id)
    return (
      <li key={n.id}>
        <div className={`group flex items-center gap-1 rounded-lg pr-1 ${isSel ? 'bg-indigo-50 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
          style={{ paddingLeft: `${item.depth * 14 + 4}px` }}>
          <button onClick={() => setCollapsed(c => { const s = new Set(c); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); return s })}
            aria-label={isCollapsed ? `${n.label} uitklappen` : `${n.label} inklappen`} disabled={!hasKids}
            className={`w-5 h-5 flex items-center justify-center rounded text-slate-500 ${hasKids ? 'hover:text-indigo-700' : 'invisible'}`}>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} strokeWidth={2.5} />
          </button>
          <button onClick={() => setSelected(isSel ? null : n.id)} aria-pressed={isSel} className="flex-1 min-w-0 flex items-center gap-2 py-1.5 text-left">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: n.color }} aria-hidden />
            <span className={`text-sm truncate ${item.depth === 0 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>{n.label || 'Naamloos begrip'}</span>
            {hasKids && isCollapsed && <span className="text-[11px] text-slate-500 shrink-0">+{item.children.length}</span>}
          </button>
          <button onClick={() => addChild(n.id)} aria-label={`Subbegrip onder ${n.label}`} title="Subbegrip toevoegen"
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-500 hover:text-indigo-700 hover:bg-white dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
        {isSel && (
          <div className="mt-1 mb-2 mx-1 p-3 rounded-xl border border-indigo-100 bg-white space-y-3" style={{ marginLeft: `${item.depth * 14 + 4}px` }}>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Naam
              <input value={n.label} onChange={e => renameNode(n.id, e.target.value)} maxLength={60}
                className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </label>
            <div>
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Kleur</span>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kleur">
                {COLORS.map(c => (
                  <button key={c} role="radio" aria-checked={n.color === c} aria-label={`Kleur ${c}`} onClick={() => recolor(n.id, c)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${n.color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`} style={{ backgroundColor: c }}>
                    {n.color === c && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => addChild(n.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Subbegrip
              </button>
              <button onClick={() => { setConnecting(n.id); setPanelOpen(false) }} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-gray-200 rounded-lg px-2 py-1 hover:bg-slate-50">
                <Glyph name="connect" className="w-3.5 h-3.5" /> Verbinden
              </button>
              <button onClick={() => removeNode(n.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 ml-auto">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={2} /> Verwijderen
              </button>
            </div>
          </div>
        )}
        {hasKids && !isCollapsed && <ul>{item.children.map(renderRow)}</ul>}
      </li>
    )
  }

  const panel = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Begrippen <span className="font-normal text-slate-500">({nodes.length})</span></h2>
        <button onClick={() => setPanelOpen(false)} aria-label="Begrippen sluiten" className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {nodes.length === 0 ? (
          <p className="px-2 py-6 text-sm text-slate-600 dark:text-slate-300 text-center">Nog geen begrippen. Dubbeltik op het vlak om je eerste begrip te maken.</p>
        ) : (
          <ul className="space-y-0.5">{tree.map(renderRow)}</ul>
        )}
      </div>
      <div className="border-t border-indigo-100 p-3">
        <button onClick={() => { const r = canvasRef.current?.getBoundingClientRect(); addNodeAt((r?.width ?? 600) / 2, (r?.height ?? 500) / 2); setPanelOpen(false) }}
          className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-3 py-2 hover:bg-indigo-700">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> Nieuw begrip
        </button>
      </div>
    </div>
  )

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

      <ToolBanner
        backHref="/woordweb"
        backLabel="Woordwebben"
        title={<input value={title} onChange={e => { setTitle(e.target.value); setDirty(true) }} placeholder={ww.webName} aria-label="Naam van het woordweb" maxLength={80} className={bannerTitleInput} />}
        below={
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SubjectSelect value={vak} onChange={v => { setVak(v); setDirty(true) }} options={subjectNames.map(n => ({ value: n, label: n }))} colors={subjectColors} emptyLabel={ww.noSubject} label="Vak" className="w-52" />
            <span className="text-xs text-white/85">{nodes.length} {nodes.length === 1 ? 'begrip' : 'begrippen'} · {edges.length} {edges.length === 1 ? 'verbinding' : 'verbindingen'}</span>
          </div>
        }
        actions={
          <button onClick={handleSave} disabled={saving || !title.trim()} className={bannerButton}>
            {saved ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Save className="w-4 h-4" strokeWidth={2} />}
            {saving ? ww.saving : saved ? ww.saved : ww.save}
            {dirty && !saving && !saved && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-label="Niet opgeslagen wijzigingen" />}
          </button>
        }
        menu={[
          { label: exporting ? ww.exporting : 'Exporteer als afbeelding', icon: <Download className="w-4 h-4" strokeWidth={2} />, onClick: handleExport, disabled: exporting || nodes.length === 0 },
          ...(web ? [{ label: 'Woordweb verwijderen', icon: <Trash2 className="w-4 h-4" strokeWidth={2} />, onClick: () => setConfirmDelete(true), danger: true, divider: true }] : []),
        ]}
      />

      <div className="bg-white border-b border-indigo-100">
        <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
          <button onClick={() => setPanelOpen(true)} className="lg:hidden inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-lg px-2.5 py-1">
            <ListTree className="w-3.5 h-3.5" strokeWidth={2} /> Begrippen ({nodes.length})
          </button>
          <span className="inline-flex items-center gap-1.5"><MousePointerClick className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" strokeWidth={2} /> Dubbeltik op het vlak voor een nieuw begrip</span>
          <span className="inline-flex items-center gap-1.5"><Glyph name="pen" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" /> Tik op een begrip om het te bewerken</span>
          <span className="inline-flex items-center gap-1.5"><Hand className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-300" strokeWidth={2} /> Sleep om te verplaatsen</span>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <aside className="hidden lg:block w-72 shrink-0 bg-white border-r border-indigo-100" aria-label="Begrippen">
          <div className="sticky top-[57px] h-[calc(100vh-57px)]">{panel}</div>
        </aside>

        {panelOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Begrippen">
            <div className="w-[85vw] max-w-xs bg-white shadow-2xl h-full">{panel}</div>
            <button className="flex-1 bg-slate-900/40" onClick={() => setPanelOpen(false)} aria-label="Sluiten" />
          </div>
        )}

        <div
          ref={canvasRef}
          onClick={onCanvasClick}
          className="flex-1 relative overflow-hidden cursor-crosshair select-none"
          style={{ minHeight: '600px', touchAction: 'manipulation', background: 'radial-gradient(circle, #e0e7ff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        >
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            {edges.map(edge => {
              const a = getNode(edge.from)
              const b = getNode(edge.to)
              if (!a || !b) return null
              const mx = (a.x + b.x) / 2
              const my = (a.y + b.y) / 2
              const hasLabel = !!edge.label?.trim()
              const highlight = selected === a.id || selected === b.id
              const dx = a.x * 0.25 + b.x * 0.75
              const dy = a.y * 0.25 + b.y * 0.75
              return (
                <g key={edge.id}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={highlight ? '#818cf8' : '#c7d2fe'} strokeWidth={highlight ? 2.5 : 2} />
                  {editingEdgeId === edge.id ? (
                    <foreignObject x={mx - 60} y={my - 16} width="120" height="32" className="edge-ui" style={{ pointerEvents: 'all' }}>
                      <input autoFocus value={editEdgeLabel} onChange={e => setEditEdgeLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdgeEdit(); if (e.key === 'Escape') setEditingEdgeId(null) }}
                        onBlur={saveEdgeEdit} placeholder="label..."
                        style={{ width: '100%', fontSize: '11px', padding: '2px 6px', borderRadius: '8px', border: '2px solid #6366f1', outline: 'none', background: 'white', textAlign: 'center' }} />
                    </foreignObject>
                  ) : (
                    <g className={`cursor-pointer ${hasLabel ? '' : 'edge-ui'}`} style={{ pointerEvents: 'all' }}
                      onClick={e => { e.stopPropagation(); setEditingEdgeId(edge.id); setEditEdgeLabel(edge.label ?? '') }}>
                      {hasLabel ? (
                        <>
                          <rect x={mx - 36} y={my - 10} width="72" height="20" rx="6" fill="white" stroke="#c7d2fe" strokeWidth="1.5" />
                          <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#4f46e5" fontWeight="500">{edge.label}</text>
                        </>
                      ) : (
                        <>
                          <circle cx={mx} cy={my} r="10" fill="white" stroke="#e0e7ff" strokeWidth="1.5" />
                          <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" fill="#a5b4fc">+</text>
                        </>
                      )}
                    </g>
                  )}
                  <g className="edge-ui cursor-pointer" style={{ pointerEvents: 'all' }} onClick={e => { e.stopPropagation(); changeEdges(es => es.filter(x => x.id !== edge.id)) }}>
                    <circle cx={dx} cy={dy} r="7" fill="white" stroke="#fecdd3" strokeWidth="1.5" />
                    <path d={`M${dx - 2.5} ${dy - 2.5}l5 5m0-5l-5 5`} stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
                  </g>
                </g>
              )
            })}
          </svg>

          {nodes.map(node => {
            const isSel = selected === node.id
            return (
              <div key={node.id} className="node absolute" style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: isSel ? 15 : 10, touchAction: 'none' }}
                onPointerDown={e => onNodePointerDown(e, node.id)} onClick={e => e.stopPropagation()}>
                {editingNodeId === node.id ? (
                  <div className="bg-white rounded-2xl shadow-lg border-2 p-2 flex gap-1" style={{ borderColor: node.color }}>
                    <input autoFocus value={editNodeLabel} onChange={e => setEditNodeLabel(e.target.value)} placeholder="Begrip"
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') saveNodeEdit() }} onBlur={saveNodeEdit} maxLength={60}
                      className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36" />
                    <button onPointerDown={e => e.preventDefault()} onClick={saveNodeEdit} aria-label="Klaar"
                      className="bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-700"><Check className="w-4 h-4" strokeWidth={2.5} /></button>
                  </div>
                ) : (
                  <div className={`relative flex items-center justify-center px-4 py-2 rounded-2xl shadow-md text-white text-sm font-semibold cursor-grab active:cursor-grabbing transition-shadow ${connecting === node.id ? 'ring-4 ring-offset-2 ring-violet-400' : isSel ? 'ring-[3px] ring-offset-2 ring-indigo-400' : ''} ${connecting && connecting !== node.id ? 'hover:ring-4 hover:ring-violet-300' : ''}`}
                    style={{ background: node.color, minWidth: '80px', textAlign: 'center' }}>
                    <span className="flex-1">{node.label || 'Begrip'}</span>
                    {isSel && (
                      <div className="node-btns absolute -top-2.5 -right-2.5 flex gap-1">
                        <button onClick={e => { e.stopPropagation(); setConnecting(connecting === node.id ? null : node.id) }} aria-label="Verbinden met een ander begrip" title="Verbinden"
                          className={`w-6 h-6 rounded-full flex items-center justify-center shadow border ${connecting === node.id ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-600 hover:text-violet-700 border-gray-200'}`}>
                          <Glyph name="connect" className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); addChild(node.id) }} aria-label="Subbegrip toevoegen" title="Subbegrip"
                          className="w-6 h-6 bg-white rounded-full text-slate-600 hover:text-indigo-700 flex items-center justify-center shadow border border-gray-200"><Plus className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
                        <button onClick={e => { e.stopPropagation(); removeNode(node.id) }} aria-label="Begrip verwijderen" title="Verwijderen"
                          className="w-6 h-6 bg-white rounded-full text-slate-600 hover:text-red-600 flex items-center justify-center shadow border border-gray-200"><X className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <span className="w-14 h-14 mx-auto rounded-2xl bg-white border border-indigo-100 shadow-sm text-indigo-600 flex items-center justify-center"><Glyph name="web" className="w-7 h-7" /></span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-3">Dubbeltik hier voor je eerste begrip</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Begin met het hoofdonderwerp in het midden</p>
              </div>
            </div>
          )}

          {connecting && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-20 whitespace-nowrap">
              Tik op het begrip om mee te verbinden ·{' '}
              <button onClick={e => { e.stopPropagation(); setConnecting(null) }} className="underline">{ww.cancelConnect}</button>
            </div>
          )}

          {selectedNode && !editingNodeId && !connecting && (
            <div className="lg:hidden absolute bottom-3 inset-x-3 z-20 bg-white rounded-2xl border border-indigo-100 shadow-xl p-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedNode.color }} aria-hidden />
              <span className="text-sm font-medium text-slate-900 dark:text-white truncate flex-1">{selectedNode.label || 'Begrip'}</span>
              <div className="flex gap-1">
                {COLORS.slice(0, 5).map(c => (
                  <button key={c} onClick={() => recolor(selectedNode.id, c)} aria-label={`Kleur ${c}`}
                    className={`w-6 h-6 rounded-full ${selectedNode.color === c ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`} style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={() => setPanelOpen(true)} className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg hover:bg-indigo-50">Meer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
