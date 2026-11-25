'use client'

import Glyph from '@/components/Glyph'
import Nav from '@/components/Nav'
import SubjectSelect from '@/components/SubjectSelect'
import ToolBanner, { bannerButton, bannerTitleInput } from '@/components/ToolBanner'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  AlertTriangle, Bold, Check, CloudOff, Heading1, Heading2, Italic, Layers, Link2, List, ListOrdered, Pilcrow, Plus, Save,
  Search, Share2, Table, Trash2, Underline,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import { clearDraft, readDraft, shouldRestore, writeDraft, type NoteValues } from '@/lib/noteDrafts'

type Note = { id: string; title: string; content: string; subject: string | null; updated_at: string; share_token: string | null; is_public: boolean }
type Props = { userId: string; initialNotes: Note[]; subjects: string[] }
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'offline'

const AUTOSAVE_MS = 800
const RETRY_MS = [3000, 8000, 20000, 45000]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

export default function Notities({ userId, initialNotes, subjects }: Props) {
  const { tr } = useLanguage()
  const n = tr.notities
  const supabase = useMemo(() => createClient(), [])

  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [title, setTitle] = useState(initialNotes[0]?.title ?? '')
  const [content, setContent] = useState(initialNotes[0]?.content ?? '')
  const [subject, setSubject] = useState(initialNotes[0]?.subject ?? '')
  const [search, setSearch] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [tablePicker, setTablePicker] = useState(false)
  const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 })
  const [creating, setCreating] = useState(false)

  const editorRef = useRef<HTMLDivElement>(null)
  const pending = useRef(new Map<string, NoteValues>())
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retry = useRef<{ timer: ReturnType<typeof setTimeout> | null; attempt: number }>({ timer: null, attempt: 0 })
  const chain = useRef<Promise<void>>(Promise.resolve())
  const current = useRef({ id: selectedId, title, content, subject })
  current.current = { id: selectedId, title, content, subject }

  const colors = useMemo(() => buildSubjectColors([...subjects, ...notes.map(x => x.subject).filter((s): s is string => !!s)]), [subjects, notes])

  // ---------- Opslaan ----------

  const saveOne = useCallback(async (id: string) => {
    const values = pending.current.get(id)
    if (!values) return true
    const row = { title: values.title.trim() || n.untitled, content: values.content, subject: values.subject || null, updated_at: new Date().toISOString() }
    let { data, error } = await supabase.from('notes').update(row).eq('id', id).select('id')
    if (!error && (!data || data.length === 0)) {
      // De notitie bestond nog niet in de database (bijv. aanmaken mislukte): maak hem alsnog aan.
      const res = await supabase.from('notes').upsert({ id, user_id: userId, share_token: crypto.randomUUID(), is_public: false, ...row }).select('id')
      data = res.data
      error = res.error
    }
    if (error || !data || data.length === 0) return false
    if (pending.current.get(id) === values) {
      pending.current.delete(id)
      clearDraft(id, values.content)
    }
    setNotes(prev => prev.map(note => (note.id === id ? { ...note, title: row.title, content: row.content, subject: row.subject, updated_at: row.updated_at } : note)))
    return true
  }, [supabase, userId, n.untitled])

  const flush = useCallback((): Promise<void> => {
    if (debounce.current) { clearTimeout(debounce.current); debounce.current = null }
    if (retry.current.timer) { clearTimeout(retry.current.timer); retry.current.timer = null }
    chain.current = chain.current.then(async () => {
      const ids = Array.from(pending.current.keys())
      if (ids.length === 0) return
      setSaveState('saving')
      let ok = true
      for (const id of ids) ok = (await saveOne(id)) && ok
      if (ok && pending.current.size === 0) {
        retry.current.attempt = 0
        setSavedAt(new Date())
        setSaveState('saved')
      } else if (!ok) {
        setSaveState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error')
        const wait = RETRY_MS[Math.min(retry.current.attempt, RETRY_MS.length - 1)]
        retry.current.attempt++
        retry.current.timer = setTimeout(() => { flush() }, wait)
      } else {
        setSaveState('pending')
      }
    })
    return chain.current
  }, [saveOne])

  const markChanged = useCallback((values: Partial<NoteValues>) => {
    const c = current.current
    if (!c.id) return
    const next = { title: c.title, content: c.content, subject: c.subject, ...values }
    pending.current.set(c.id, next)
    writeDraft(c.id, next)
    setSaveState(s => (s === 'error' || s === 'offline' ? s : 'pending'))
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => { flush() }, AUTOSAVE_MS)
  }, [flush])

  // Bij weggaan, tabblad wisselen of offline/online: meteen opslaan.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    const onPageHide = () => { flush() }
    const onOnline = () => { if (pending.current.size) flush() }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pending.current.size) { flush(); e.preventDefault() }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('online', onOnline)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('beforeunload', onBeforeUnload)
      flush()
    }
  }, [flush])

  // Lokale kopieën die nooit zijn aangekomen (bijv. uit een vorige sessie) alsnog opslaan.
  useEffect(() => {
    let found = false
    for (const note of initialNotes) {
      const raw = readDraft(note.id)
      if (!raw) continue
      const d = raw.at === Number.MAX_SAFE_INTEGER ? { ...raw, title: note.title, subject: note.subject ?? '' } : raw
      if (shouldRestore(d, { ...note, subject: note.subject ?? '' })) {
        pending.current.set(note.id, { title: d.title, content: d.content, subject: d.subject })
        found = true
        if (note.id === current.current.id) {
          setTitle(d.title)
          setContent(d.content)
          setSubject(d.subject)
          current.current = { id: note.id, title: d.title, content: d.content, subject: d.subject }
          if (editorRef.current) editorRef.current.innerHTML = d.content
        }
      } else clearDraft(note.id)
    }
    if (found) flush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Notitie openen ----------

  function valuesFor(note: Note): NoteValues {
    return pending.current.get(note.id) ?? { title: note.title, content: note.content, subject: note.subject ?? '' }
  }

  useEffect(() => {
    if (!editorRef.current || !selectedId) return
    document.execCommand('defaultParagraphSeparator', false, 'p')
    editorRef.current.innerHTML = current.current.content || ''
  }, [selectedId])

  function selectNote(note: Note) {
    if (selectedId && selectedId !== note.id && pending.current.size) flush()
    const v = valuesFor(note)
    setSelectedId(note.id)
    setTitle(v.title)
    setContent(v.content)
    setSubject(v.subject)
    current.current = { id: note.id, ...v }
    setConfirmDelete(false)
    setShareUrl(note.is_public && note.share_token ? `${window.location.origin}/deel/notitie/${note.share_token}` : null)
    setMobileView('editor')
  }

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    setContent(html)
    current.current.content = html
    markChanged({ content: html })
  }, [markChanged])

  async function createNote() {
    if (creating) return
    setCreating(true)
    if (pending.current.size) flush()
    const note: Note = { id: crypto.randomUUID(), title: n.untitled, content: '', subject: null, updated_at: new Date().toISOString(), share_token: crypto.randomUUID(), is_public: false }
    const { error } = await supabase.from('notes').insert({ ...note, user_id: userId })
    setCreating(false)
    if (error) { setToast('Nieuwe notitie aanmaken lukte niet. Controleer je verbinding en probeer het opnieuw.'); return }
    setNotes(prev => [note, ...prev])
    selectNote(note)
    setTimeout(() => editorRef.current?.focus(), 50)
  }

  async function deleteNote() {
    if (!selectedId) return
    const id = selectedId
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) { setToast('Verwijderen lukte niet.'); setConfirmDelete(false); return }
    pending.current.delete(id)
    clearDraft(id)
    const remaining = notes.filter(note => note.id !== id)
    setNotes(remaining)
    setConfirmDelete(false)
    if (remaining.length > 0) selectNote(remaining[0])
    else { setSelectedId(null); setTitle(''); setContent(''); setSubject(''); setShareUrl(null) }
    setMobileView('list')
  }

  async function handleShare() {
    const note = notes.find(x => x.id === selectedId)
    if (!note || !selectedId) return
    const token = note.share_token ?? crypto.randomUUID()
    if (!note.is_public) {
      const { error } = await supabase.from('notes').update({ is_public: true, share_token: token }).eq('id', selectedId)
      if (error) { setToast('Delen lukte niet.'); return }
      setNotes(prev => prev.map(x => (x.id === selectedId ? { ...x, is_public: true, share_token: token } : x)))
    }
    const url = `${window.location.origin}/deel/notitie/${token}`
    setShareUrl(url)
    try { await navigator.clipboard.writeText(url) } catch {}
    setToast('Link gekopieerd.')
  }

  async function handleUnshare() {
    if (!selectedId) return
    await supabase.from('notes').update({ is_public: false }).eq('id', selectedId)
    setNotes(prev => prev.map(x => (x.id === selectedId ? { ...x, is_public: false } : x)))
    setShareUrl(null)
    setToast('Delen gestopt.')
  }

  async function createFlashcardsFromNote() {
    if (!selectedId || !content) return
    const doc = new DOMParser().parseFromString(content, 'text/html')
    const pairs: { front: string; back: string }[] = []
    const nodes = Array.from(doc.body.childNodes)
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as Element
      if (!node.tagName || !['H1', 'H2', 'H3'].includes(node.tagName)) continue
      const front = node.textContent?.trim() ?? ''
      if (!front) continue
      const back: string[] = []
      for (let j = i + 1; j < nodes.length; j++) {
        const next = nodes[j] as Element
        if (!next.tagName) continue
        if (['H1', 'H2', 'H3'].includes(next.tagName)) break
        const text = next.textContent?.trim()
        if (text) back.push(text)
      }
      pairs.push({ front, back: back.slice(0, 3).join(' · ') })
    }
    if (pairs.length === 0) { setToast('Geen kopteksten gevonden. Gebruik H1 of H2 voor de voorkant van een kaart.'); return }
    const setId = crypto.randomUUID()
    const { error } = await supabase.from('flashcard_sets').insert({ id: setId, user_id: userId, title: title || n.untitled, vak: subject || null, is_public: false, share_token: crypto.randomUUID(), edit_token: crypto.randomUUID() })
    if (error) { setToast('Flashcards maken lukte niet.'); return }
    await supabase.from('flashcards').insert(pairs.map(p => ({ id: crypto.randomUUID(), set_id: setId, front: p.front, back: p.back || '...' })))
    setToast(`${pairs.length} flashcards gemaakt.`)
  }

  // ---------- Studietijd ----------

  const [sessionSeconds, setSessionSeconds] = useState(0)
  const sessionStart = useRef(Date.now())
  const savedSeconds = useRef(0)
  const [showAddMoment, setShowAddMoment] = useState(false)
  const [momentTitle, setMomentTitle] = useState('')
  const [momentMinutes, setMomentMinutes] = useState('')
  useEffect(() => {
    const tick = () => setSessionSeconds(savedSeconds.current + Math.floor((Date.now() - sessionStart.current) / 1000))
    let timer: ReturnType<typeof setInterval> | null = setInterval(tick, 10000)
    function onVisibility() {
      if (document.hidden) {
        savedSeconds.current += Math.floor((Date.now() - sessionStart.current) / 1000)
        if (timer) { clearInterval(timer); timer = null }
      } else {
        sessionStart.current = Date.now()
        if (!timer) timer = setInterval(tick, 10000)
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])
  useEffect(() => {
    sessionStart.current = Date.now()
    savedSeconds.current = 0
    setSessionSeconds(0)
    setShowAddMoment(false)
  }, [selectedId])

  async function saveAsMoment() {
    const mins = parseInt(momentMinutes)
    if (!mins || mins < 1) return
    const { error } = await supabase.from('learning_moments').insert({
      id: crypto.randomUUID(), user_id: userId, title: momentTitle.trim() || `Notities: ${title}`, category: subject || null,
      duration_minutes: mins, learned_at: new Date().toISOString().split('T')[0], description: null,
    })
    if (error) { setToast('Opslaan als leermoment lukte niet.'); return }
    setShowAddMoment(false)
    sessionStart.current = Date.now()
    savedSeconds.current = 0
    setSessionSeconds(0)
    setToast('Toegevoegd aan je leermomenten.')
  }

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(id)
  }, [toast])

  // ---------- Opmaak ----------

  function fmt(command: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, value ?? undefined)
    handleInput()
  }

  function parentOf<T extends Element>(test: (n: Node) => n is T): T | null {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return null
    let node: Node | null = sel.getRangeAt(0).startContainer
    while (node && node !== editorRef.current) {
      if (test(node)) return node
      node = node.parentNode
    }
    return null
  }

  function placeCaret(el: Element) {
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  function indentListItem(li: HTMLLIElement) {
    const list = li.parentElement
    const prev = li.previousElementSibling as HTMLLIElement | null
    if (!list || !prev) return
    let sub = prev.querySelector(':scope > ul, :scope > ol') as HTMLElement | null
    if (!sub) { sub = document.createElement(list.tagName.toLowerCase()); prev.appendChild(sub) }
    sub.appendChild(li)
    placeCaret(li)
    handleInput()
  }

  function outdentListItem(li: HTMLLIElement) {
    const list = li.parentElement
    if (!list) return
    const parentLi = list.parentElement
    if (!(parentLi instanceof HTMLLIElement)) { fmt('outdent'); return }
    const outer = parentLi.parentElement
    if (!outer) return
    const after: Element[] = []
    for (let x = li.nextElementSibling; x; x = x.nextElementSibling) after.push(x)
    outer.insertBefore(li, parentLi.nextSibling)
    if (after.length) { const sub = document.createElement(list.tagName.toLowerCase()); after.forEach(a => sub.appendChild(a)); li.appendChild(sub) }
    if (!list.children.length) parentLi.removeChild(list)
    placeCaret(li)
    handleInput()
  }

  function insertTable(rows: number, cols: number) {
    editorRef.current?.focus()
    const head = Array.from({ length: cols }, (_, i) => `<th>Kolom ${i + 1}</th>`).join('')
    const row = `<tr>${Array.from({ length: cols }, () => '<td></td>').join('')}</tr>`
    document.execCommand('insertHTML', false, `<table><thead><tr>${head}</tr></thead><tbody>${Array.from({ length: rows - 1 }, () => row).join('')}</tbody></table><p><br></p>`)
    handleInput()
    setTablePicker(false)
  }

  function manualSave() {
    if (!selectedId) return
    const c = current.current
    if (!pending.current.has(selectedId)) pending.current.set(selectedId, { title: c.title, content: c.content, subject: c.subject })
    flush()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); manualSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase()
      if (k === 'b') { e.preventDefault(); fmt('bold') }
      if (k === 'i') { e.preventDefault(); fmt('italic') }
      if (k === 'u') { e.preventDefault(); fmt('underline') }
    }
    if (e.key !== 'Tab') return
    e.preventDefault()
    const td = parentOf((x): x is HTMLTableCellElement => x instanceof HTMLTableCellElement)
    if (td) {
      const cells = Array.from(editorRef.current?.querySelectorAll('th, td') ?? [])
      const target = cells[cells.indexOf(td) + (e.shiftKey ? -1 : 1)]
      if (target) placeCaret(target)
      return
    }
    const li = parentOf((x): x is HTMLLIElement => x instanceof HTMLLIElement)
    if (li) { if (e.shiftKey) outdentListItem(li); else indentListItem(li) }
    else { document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;'); handleInput() }
  }

  // ---------- Weergave ----------

  const wordCount = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length
  const term = search.trim().toLowerCase()
  const filtered = notes.filter(x => !term || x.title.toLowerCase().includes(term) || (x.subject ?? '').toLowerCase().includes(term) || x.content.replace(/<[^>]*>/g, ' ').toLowerCase().includes(term))
  const selectedNote = notes.find(x => x.id === selectedId)
  const isPublic = selectedNote?.is_public ?? false

  const status = {
    idle: { icon: null, text: '', cls: 'text-white/80' },
    pending: { icon: null, text: 'Niet opgeslagen wijzigingen', cls: 'text-white/85' },
    saving: { icon: null, text: 'Opslaan…', cls: 'text-white/85' },
    saved: { icon: <Check className="w-3.5 h-3.5" strokeWidth={2.5} />, text: savedAt ? `Opgeslagen om ${formatTime(savedAt)}` : 'Opgeslagen', cls: 'text-white' },
    error: { icon: <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2.5} />, text: 'Opslaan mislukt, ik probeer het opnieuw', cls: 'text-amber-100 font-semibold' },
    offline: { icon: <CloudOff className="w-3.5 h-3.5" strokeWidth={2.5} />, text: 'Geen verbinding, je tekst is lokaal bewaard', cls: 'text-amber-100 font-semibold' },
  }[saveState]

  const toolBtn = (active = false) => `h-8 min-w-8 px-1.5 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10'}`
  const Tool = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick() }} title={label} aria-label={label} className={toolBtn()}>{children}</button>
  )

  return (
    <div className="h-screen bg-[#f8f7ff] flex flex-col overflow-hidden">
      <Nav loggedIn width="max-w-6xl" />

      <ToolBanner
        variant="notes"
        onBack={selectedNote && mobileView === 'editor' ? () => setMobileView('list') : undefined}
        backLabel="Alle notities"
        backMobileOnly
        title={selectedNote ? (
          <input value={title} onChange={e => { setTitle(e.target.value); current.current.title = e.target.value; markChanged({ title: e.target.value }) }}
            placeholder={n.untitled} aria-label="Titel van de notitie" maxLength={120} className={bannerTitleInput} />
        ) : n.title}
        below={selectedNote ? (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SubjectSelect value={subject} onChange={v => { setSubject(v); current.current.subject = v; markChanged({ subject: v }) }}
              options={subjects.map(s => ({ value: s, label: s }))} colors={colors} emptyLabel={n.noSubject} label="Vak" className="w-52" />
            <span className={`inline-flex items-center gap-1 text-xs ${status.cls}`} role="status" aria-live="polite">{status.icon}{status.text}</span>
            {(saveState === 'error' || saveState === 'offline') && (
              <button onClick={manualSave} className="text-xs font-semibold underline underline-offset-2 text-white">Nu opnieuw proberen</button>
            )}
          </div>
        ) : <span className="text-xs text-white/85">{notes.length} {notes.length === 1 ? 'notitie' : 'notities'}</span>}
        actions={selectedNote ? (
          <button onClick={manualSave} disabled={saveState === 'saving'} className={bannerButton} title="Opslaan (Ctrl+S)">
            {saveState === 'saved' ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Save className="w-4 h-4" strokeWidth={2} />}
            {saveState === 'saving' ? 'Opslaan…' : 'Opslaan'}
          </button>
        ) : (
          <button onClick={createNote} disabled={creating} className={bannerButton}><Plus className="w-4 h-4" strokeWidth={2.5} /> Nieuwe notitie</button>
        )}
        menu={selectedNote ? [
          { label: 'Flashcards maken van kopjes', icon: <Layers className="w-4 h-4" strokeWidth={2} />, onClick: createFlashcardsFromNote },
          { label: isPublic ? 'Link opnieuw kopiëren' : 'Delen (link kopiëren)', icon: <Share2 className="w-4 h-4" strokeWidth={2} />, onClick: handleShare },
          ...(isPublic ? [{ label: 'Delen stoppen', icon: <Link2 className="w-4 h-4" strokeWidth={2} />, onClick: handleUnshare }] : []),
          { label: 'Notitie verwijderen', icon: <Trash2 className="w-4 h-4" strokeWidth={2} />, onClick: () => setConfirmDelete(true), danger: true, divider: true },
        ] : []}
      />

      <div className="flex-1 flex max-w-6xl mx-auto w-full sm:px-4 sm:py-5 gap-4 min-h-0">
        <aside className={`${mobileView === 'editor' && selectedNote ? 'hidden' : 'flex'} sm:flex flex-col w-full sm:w-72 shrink-0 bg-white sm:rounded-2xl sm:border border-indigo-100 sm:shadow-sm min-h-0`} aria-label="Notities">
          <div className="p-3 space-y-2 border-b border-indigo-100">
            <button onClick={createNote} disabled={creating}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60">
              <Plus className="w-4 h-4" strokeWidth={2.5} /> {creating ? 'Aanmaken…' : 'Nieuwe notitie'}
            </button>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={2} aria-hidden />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={n.searchPlaceholder} aria-label="Zoek in notities"
                className="w-full border border-indigo-100 bg-white rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{notes.length ? 'Niets gevonden' : n.noNotes}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{notes.length ? 'Probeer een ander woord.' : n.noNotesSub}</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {filtered.map(note => {
                  const color = note.subject ? colors[note.subject] ?? NO_SUBJECT_COLOR : NO_SUBJECT_COLOR
                  const active = note.id === selectedId
                  const v = active ? { title, content } : valuesFor(note)
                  const unsaved = pending.current.has(note.id)
                  return (
                    <li key={note.id}>
                      <button onClick={() => selectNote(note)} aria-current={active ? 'true' : undefined}
                        className={`relative w-full text-left rounded-xl border pl-3.5 pr-3 py-2.5 transition ${active ? 'shadow-sm' : 'hover:shadow-sm'}`}
                        style={{ backgroundImage: `linear-gradient(${color}${active ? '1c' : '0d'}, ${color}${active ? '1c' : '0d'})`, borderColor: active ? `${color}66` : `${color}26` }}>
                        <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: color }} aria-hidden />
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate flex-1">{v.title || n.untitled}</span>
                          {unsaved && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Nog niet opgeslagen" />}
                          {note.is_public && <Share2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" strokeWidth={2} aria-label="Gedeeld" />}
                        </span>
                        <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                          {note.subject ? `${note.subject} · ` : ''}{formatDate(note.updated_at)}
                        </span>
                        {v.content && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{v.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <main className={`${mobileView === 'list' || !selectedNote ? 'hidden' : 'flex'} sm:flex flex-col flex-1 bg-white sm:rounded-2xl sm:border border-indigo-100 sm:shadow-sm min-h-0 min-w-0`}>
          {!selectedNote ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Glyph name="pen" className="w-7 h-7" /></span>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.noNotes}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{n.noNotesSub}</p>
              <button onClick={createNote} disabled={creating} className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Nieuwe notitie
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-indigo-100 bg-indigo-50/60 dark:bg-white/5 sm:rounded-t-2xl shrink-0" role="toolbar" aria-label="Opmaak">
                <Tool onClick={() => fmt('bold')} label="Vet (Ctrl+B)"><Bold className="w-4 h-4" strokeWidth={2.5} /></Tool>
                <Tool onClick={() => fmt('italic')} label="Cursief (Ctrl+I)"><Italic className="w-4 h-4" strokeWidth={2.5} /></Tool>
                <Tool onClick={() => fmt('underline')} label="Onderstrepen (Ctrl+U)"><Underline className="w-4 h-4" strokeWidth={2.5} /></Tool>
                <span className="w-px h-5 bg-indigo-200 mx-1" aria-hidden />
                <Tool onClick={() => fmt('formatBlock', 'h1')} label="Grote koptekst"><Heading1 className="w-4 h-4" strokeWidth={2.25} /></Tool>
                <Tool onClick={() => fmt('formatBlock', 'h2')} label="Kleine koptekst"><Heading2 className="w-4 h-4" strokeWidth={2.25} /></Tool>
                <Tool onClick={() => fmt('formatBlock', 'p')} label="Gewone tekst"><Pilcrow className="w-4 h-4" strokeWidth={2.25} /></Tool>
                <span className="w-px h-5 bg-indigo-200 mx-1" aria-hidden />
                <Tool onClick={() => fmt('insertUnorderedList')} label="Opsomming"><List className="w-4 h-4" strokeWidth={2.25} /></Tool>
                <Tool onClick={() => fmt('insertOrderedList')} label="Genummerde lijst"><ListOrdered className="w-4 h-4" strokeWidth={2.25} /></Tool>
                <div className="relative">
                  <Tool onClick={() => setTablePicker(o => !o)} label="Tabel invoegen"><Table className="w-4 h-4" strokeWidth={2.25} /></Tool>
                  {tablePicker && (
                    <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-indigo-100 rounded-xl shadow-xl p-2">
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-1.5 text-center">{tableHover.rows > 0 ? `${tableHover.rows} × ${tableHover.cols}` : 'Kies grootte'}</p>
                      <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
                        {Array.from({ length: 5 }, (_, r) => Array.from({ length: 6 }, (_, c) => (
                          <button key={`${r}-${c}`} onMouseEnter={() => setTableHover({ rows: r + 1, cols: c + 1 })} onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
                            onClick={() => insertTable(r + 1, c + 1)} aria-label={`${r + 1} bij ${c + 1}`}
                            className={`w-5 h-5 rounded border ${r < tableHover.rows && c < tableHover.cols ? 'bg-indigo-500 border-indigo-500' : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-200'}`} />
                        )))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {shareUrl && (
                <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={2} />
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 font-medium truncate flex-1">{shareUrl}</p>
                  <button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl) } catch {} setToast('Link gekopieerd.') }} className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 shrink-0">Kopieer</button>
                </div>
              )}

              <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={handleInput} onKeyDown={handleKeyDown}
                role="textbox" aria-multiline="true" aria-label="Notitie"
                data-placeholder={n.placeholder?.split('\n')[0] ?? 'Begin met typen...'}
                className="notes-editor flex-1 px-6 py-4 text-sm overflow-y-auto min-h-0" />

              {showAddMoment && (
                <div className="mx-4 mb-2 bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Toevoegen aan je leermomenten</p>
                  <div className="flex gap-2">
                    <input value={momentTitle} onChange={e => setMomentTitle(e.target.value)} placeholder="Titel" aria-label="Titel"
                      className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <label className="flex items-center gap-1.5 border border-gray-200 rounded-xl px-3 py-2 bg-white shrink-0">
                      <input type="number" min="1" value={momentMinutes} onChange={e => setMomentMinutes(e.target.value)} aria-label="Minuten" className="w-12 text-sm font-semibold outline-none text-center" />
                      <span className="text-xs text-slate-600">min</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddMoment(false)} className="text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl hover:bg-white">Annuleren</button>
                    <button onClick={saveAsMoment} className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700">Opslaan</button>
                  </div>
                </div>
              )}

              <div className="px-4 py-2 border-t border-indigo-100 flex justify-between items-center gap-3 text-xs text-slate-600 dark:text-slate-300 shrink-0">
                <span>{wordCount} {n.wordCount} · {n.lastEdited} {formatDate(selectedNote.updated_at)}</span>
                {sessionSeconds >= 60 && !showAddMoment ? (
                  <button onClick={() => { setMomentTitle(title || n.untitled); setMomentMinutes(String(Math.max(1, Math.round(sessionSeconds / 60)))); setShowAddMoment(true) }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 shrink-0">
                    <Glyph name="clock" className="w-3.5 h-3.5" /> {Math.round(sessionSeconds / 60)} min als leermoment
                  </button>
                ) : null}
              </div>
            </>
          )}
        </main>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-note" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 id="del-note" className="text-base font-semibold text-slate-900 dark:text-white">Notitie verwijderen?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">&lsquo;{title || n.untitled}&rsquo; wordt verwijderd. Dit kun je niet ongedaan maken.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setConfirmDelete(false)} autoFocus className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
              <button onClick={deleteNote} className="text-sm font-semibold bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700">Verwijderen</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-5 flex justify-center pointer-events-none z-50" role="status">
          <span className="bg-slate-900 text-white text-sm font-medium rounded-xl px-4 py-2.5 shadow-lg max-w-[90vw] text-center">{toast}</span>
        </div>
      )}
    </div>
  )
}
