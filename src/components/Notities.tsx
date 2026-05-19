'use client'

import Nav from '@/components/Nav'
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Note = {
  id: string
  title: string
  content: string
  subject: string | null
  updated_at: string
  share_token: string | null
  is_public: boolean
}

type Props = {
  userId: string
  initialNotes: Note[]
  subjects: string[]
}

function renderMarkdown(text: string): string {
  if (!text.trim()) return '<p class="text-indigo-300 italic">Lege notitie</p>'
  const lines = text.split('\n')
  let html = ''
  let inUl = false
  let inOl = false

  const inline = (s: string) =>
    s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-indigo-50 text-indigo-700 px-1 rounded text-sm font-mono">$1</code>')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.match(/^[-*] /) && inUl) { html += '</ul>'; inUl = false }
    if (!trimmed.match(/^\d+\. /) && inOl) { html += '</ol>'; inOl = false }

    if (trimmed.startsWith('### ')) {
      html += `<h3 class="text-base font-bold text-indigo-800 mt-4 mb-1">${inline(trimmed.slice(4))}</h3>`
    } else if (trimmed.startsWith('## ')) {
      html += `<h2 class="text-lg font-bold text-indigo-900 mt-5 mb-1.5">${inline(trimmed.slice(3))}</h2>`
    } else if (trimmed.startsWith('# ')) {
      html += `<h1 class="text-xl font-extrabold text-indigo-900 mt-6 mb-2">${inline(trimmed.slice(2))}</h1>`
    } else if (trimmed.startsWith('> ')) {
      html += `<blockquote class="border-l-4 border-indigo-300 pl-3 text-indigo-600 italic my-2">${inline(trimmed.slice(2))}</blockquote>`
    } else if (trimmed.match(/^[-*] /)) {
      if (!inUl) { html += '<ul class="list-disc list-inside space-y-0.5 my-2 text-indigo-800">'; inUl = true }
      html += `<li>${inline(trimmed.slice(2))}</li>`
    } else if (trimmed.match(/^\d+\. /)) {
      if (!inOl) { html += '<ol class="list-decimal list-inside space-y-0.5 my-2 text-indigo-800">'; inOl = true }
      html += `<li>${inline(trimmed.replace(/^\d+\. /, ''))}</li>`
    } else if (!trimmed) {
      html += '<div class="h-2"></div>'
    } else {
      html += `<p class="text-indigo-800 leading-relaxed">${inline(trimmed)}</p>`
    }
  }
  if (inUl) html += '</ul>'
  if (inOl) html += '</ol>'
  return html
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default function Notities({ userId, initialNotes, subjects }: Props) {
  const { tr } = useLanguage()
  const n = tr.notities
  const supabase = createClient()

  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null)
  const [title, setTitle] = useState(initialNotes[0]?.title ?? '')
  const [content, setContent] = useState(initialNotes[0]?.content ?? '')
  const [subject, setSubject] = useState(initialNotes[0]?.subject ?? '')
  const [search, setSearch] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [preview, setPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Stores pending selection to restore after content state update
  const pendingSelection = useRef<{ start: number; end: number } | null>(null)
  // Stores last textarea selection before toolbar button focus-loss
  const lastSelection = useRef<{ start: number; end: number }>({ start: 0, end: 0 })

  // Restore cursor position after content update caused by keyboard shortcut
  // useLayoutEffect fires synchronously after React updates the DOM,
  // before the browser paints — the only reliable way to restore cursor
  // position in a controlled textarea after a state-driven content change.
  useLayoutEffect(() => {
    if (pendingSelection.current && textareaRef.current) {
      textareaRef.current.selectionStart = pendingSelection.current.start
      textareaRef.current.selectionEnd = pendingSelection.current.end
      pendingSelection.current = null
    }
  }, [content])

  const autoSave = useCallback(async (id: string, t: string, c: string, s: string) => {
    setSaveStatus('saving')
    await supabase.from('notes').update({
      title: t.trim() || n.untitled,
      content: c,
      subject: s || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
    setNotes(prev => prev.map(note =>
      note.id === id
        ? { ...note, title: t.trim() || n.untitled, content: c, subject: s || null, updated_at: new Date().toISOString() }
        : note
    ).sort((a, b) => b.updated_at.localeCompare(a.updated_at)))
  }, [supabase, n.untitled])

  useEffect(() => {
    if (!selectedId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(selectedId, title, content, subject), 600)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [title, content, subject, selectedId, autoSave])

  function selectNote(note: Note) {
    setSelectedId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setSubject(note.subject ?? '')
    setPreview(false)
    setConfirmDelete(false)
    setSubjectOpen(false)
    setShareUrl(note.is_public && note.share_token ? `${window.location.origin}/deel/notitie/${note.share_token}` : null)
    setMobileView('editor')
  }

  async function createNote() {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: n.untitled,
      content: '',
      subject: null,
      updated_at: new Date().toISOString(),
      share_token: crypto.randomUUID(),
      is_public: false,
    }
    await supabase.from('notes').insert({ ...newNote, user_id: userId })
    setNotes(prev => [newNote, ...prev])
    selectNote(newNote)
  }

  async function deleteNote() {
    if (!selectedId) return
    await supabase.from('notes').delete().eq('id', selectedId)
    const remaining = notes.filter(note => note.id !== selectedId)
    setNotes(remaining)
    if (remaining.length > 0) selectNote(remaining[0])
    else { setSelectedId(null); setTitle(''); setContent(''); setSubject(''); setShareUrl(null) }
    setConfirmDelete(false)
    setMobileView('list')
  }

  async function handleShare() {
    const note = notes.find(note => note.id === selectedId)
    if (!note || !selectedId) return

    const token = note.share_token ?? crypto.randomUUID()
    if (!note.is_public) {
      await supabase.from('notes').update({ is_public: true, share_token: token }).eq('id', selectedId)
      setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, is_public: true, share_token: token } : n))
    }
    const url = `${window.location.origin}/deel/notitie/${token}`
    setShareUrl(url)
    await navigator.clipboard.writeText(url)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2500)
  }

  async function handleUnshare() {
    if (!selectedId) return
    await supabase.from('notes').update({ is_public: false }).eq('id', selectedId)
    setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, is_public: false } : n))
    setShareUrl(null)
  }

  function applyWrap(before: string, after: string) {
    const ta = textareaRef.current
    if (!ta) return
    // Use lastSelection if textarea lost focus (toolbar button click)
    const start = document.activeElement === ta ? ta.selectionStart : lastSelection.current.start
    const end = document.activeElement === ta ? ta.selectionEnd : lastSelection.current.end
    const selected = content.slice(start, end)
    const newContent = content.slice(0, start) + before + selected + after + content.slice(end)
    setContent(newContent)
    pendingSelection.current = { start: start + before.length, end: end + before.length }
    ta.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = ta.value // read from DOM, never stale

    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      const selected = value.slice(start, end)
      setContent(value.slice(0, start) + '**' + selected + '**' + value.slice(end))
      pendingSelection.current = { start: start + 2, end: end + 2 }
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      const selected = value.slice(start, end)
      setContent(value.slice(0, start) + '*' + selected + '*' + value.slice(end))
      pendingSelection.current = { start: start + 1, end: end + 1 }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        if (value.slice(lineStart, lineStart + 2) === '  ') {
          setContent(value.slice(0, lineStart) + value.slice(lineStart + 2))
          pendingSelection.current = { start: Math.max(start - 2, lineStart), end: Math.max(start - 2, lineStart) }
        }
      } else {
        setContent(value.slice(0, start) + '  ' + value.slice(end))
        pendingSelection.current = { start: start + 2, end: start + 2 }
      }
      return
    }
    if (e.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const currentLine = value.slice(lineStart, start)
      const bulletMatch = currentLine.match(/^([-*] )(.+)/)
      const numberedMatch = currentLine.match(/^(\d+)\. (.+)/)
      if (bulletMatch) {
        e.preventDefault()
        const prefix = bulletMatch[1]
        setContent(value.slice(0, start) + '\n' + prefix + value.slice(end))
        pendingSelection.current = { start: start + 1 + prefix.length, end: start + 1 + prefix.length }
      } else if (numberedMatch) {
        e.preventDefault()
        const nextNum = parseInt(numberedMatch[1]) + 1
        const prefix = nextNum + '. '
        setContent(value.slice(0, start) + '\n' + prefix + value.slice(end))
        pendingSelection.current = { start: start + 1 + prefix.length, end: start + 1 + prefix.length }
      }
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const filtered = notes.filter(note =>
    !search ||
    note.title.toLowerCase().includes(search.toLowerCase()) ||
    (note.subject ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const selectedNote = notes.find(note => note.id === selectedId)
  const isPublic = selectedNote?.is_public ?? false

  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col">
      <Nav />

      <div className="flex-1 flex max-w-6xl mx-auto w-full px-0 sm:px-4 py-0 sm:py-6 gap-0 sm:gap-4">

        {/* Notitie-lijst */}
        <aside className={`${mobileView === 'editor' ? 'hidden' : 'flex'} sm:flex flex-col w-full sm:w-72 shrink-0 bg-white sm:rounded-2xl border-0 sm:border border-indigo-100 sm:shadow-sm overflow-hidden`}>
          <div className="p-4 border-b border-indigo-50 space-y-3">
            <div className="flex justify-between items-center">
              <h1 className="font-bold text-indigo-900 text-lg">{n.title}</h1>
              <button onClick={createNote}
                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors active:scale-95">
                {n.new}
              </button>
            </div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={n.searchPlaceholder}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-sm text-indigo-400 font-medium">{n.noNotes}</p>
                <p className="text-xs text-indigo-300">{n.noNotesSub}</p>
              </div>
            ) : (
              <div className="divide-y divide-indigo-50">
                {filtered.map(note => (
                  <button key={note.id} onClick={() => selectNote(note)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-indigo-50 transition-colors ${selectedId === note.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''}`}>
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-medium text-sm text-indigo-900 truncate">{note.title || n.untitled}</p>
                      {note.is_public && <span className="text-xs text-emerald-500 shrink-0">⬡</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {note.subject && <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2 py-0.5 font-medium truncate max-w-[110px]">{note.subject}</span>}
                      <span className="text-xs text-indigo-300">{formatDate(note.updated_at)}</span>
                    </div>
                    {note.content && (
                      <p className="text-xs text-indigo-300 mt-1 truncate">{note.content.replace(/[#*`>-]/g, '').trim()}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className={`${mobileView === 'list' ? 'hidden' : 'flex'} sm:flex flex-col flex-1 bg-white sm:rounded-2xl border-0 sm:border border-indigo-100 sm:shadow-sm overflow-hidden min-h-[calc(100vh-80px)] sm:min-h-0`}>
          {!selectedNote ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-indigo-900">{n.noNotes}</p>
                <p className="text-sm text-indigo-400 mt-1">{n.noNotesSub}</p>
              </div>
              <button onClick={createNote}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors active:scale-95">
                {n.new}
              </button>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-50 gap-2 flex-wrap">
                {/* Links: terug + vakkeuzebox */}
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileView('list')}
                    className="sm:hidden text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors text-sm">
                    ←
                  </button>

                  {/* Vak-dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setSubjectOpen(o => !o)}
                      className={`flex items-center gap-1.5 text-sm border rounded-xl px-3 py-1.5 transition-colors ${subject ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100' : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'}`}>
                      <span className="max-w-[160px] truncate font-medium">{subject || n.noSubject}</span>
                      <span className="text-xs opacity-60 shrink-0">▾</span>
                    </button>
                    {subjectOpen && (
                      <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-indigo-100 rounded-2xl shadow-xl py-2 min-w-[200px] max-h-60 overflow-y-auto">
                        <button
                          onClick={() => { setSubject(''); setSubjectOpen(false) }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors ${!subject ? 'text-indigo-700 font-semibold' : 'text-gray-400'}`}>
                          {n.noSubject}
                        </button>
                        {subjects.length > 0 && <div className="border-t border-indigo-50 my-1" />}
                        {subjects.map(s => (
                          <button key={s} onClick={() => { setSubject(s); setSubjectOpen(false) }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors ${subject === s ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-gray-700'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rechts: opmaak + opties */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {saveStatus === 'saving' && <span className="text-xs text-indigo-300">{n.saving}</span>}
                  {saveStatus === 'saved' && <span className="text-xs text-emerald-500 font-medium">{n.autoSaved} ✓</span>}

                  {/* Opmaakknoppen */}
                  <div className="flex items-center gap-0.5 bg-indigo-50 rounded-lg p-0.5">
                      <button
                        onMouseDown={e => { e.preventDefault(); applyWrap('**', '**') }}
                        className="text-sm font-bold text-indigo-600 w-7 h-7 rounded-md hover:bg-white transition-colors flex items-center justify-center"
                        title="Ctrl+B">B</button>
                      <button
                        onMouseDown={e => { e.preventDefault(); applyWrap('*', '*') }}
                        className="text-sm italic text-indigo-600 w-7 h-7 rounded-md hover:bg-white transition-colors flex items-center justify-center"
                        title="Ctrl+I">I</button>
                      <button
                        onMouseDown={e => {
                          e.preventDefault()
                          const ta = textareaRef.current
                          if (!ta) return
                          const pos = document.activeElement === ta ? ta.selectionStart : lastSelection.current.start
                          const lineStart = content.lastIndexOf('\n', pos - 1) + 1
                          const newContent = content.slice(0, lineStart) + '# ' + content.slice(lineStart)
                          setContent(newContent)
                          pendingSelection.current = { start: pos + 2, end: pos + 2 }
                          ta.focus()
                        }}
                        className="text-xs font-bold text-indigo-600 w-7 h-7 rounded-md hover:bg-white transition-colors flex items-center justify-center"
                        title="Koptekst">H</button>
                      <button
                        onMouseDown={e => {
                          e.preventDefault()
                          const ta = textareaRef.current
                          if (!ta) return
                          const pos = document.activeElement === ta ? ta.selectionStart : lastSelection.current.start
                          const lineStart = content.lastIndexOf('\n', pos - 1) + 1
                          const newContent = content.slice(0, lineStart) + '- ' + content.slice(lineStart)
                          setContent(newContent)
                          pendingSelection.current = { start: pos + 2, end: pos + 2 }
                          ta.focus()
                        }}
                        className="text-sm text-indigo-600 w-7 h-7 rounded-md hover:bg-white transition-colors flex items-center justify-center"
                        title="Opsommingspunt">•</button>
                    </div>

                  <div className="flex items-center gap-0.5 bg-indigo-50 rounded-lg p-0.5">
                    <button
                      onClick={() => setPreview(false)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${!preview ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400'}`}>
                      {n.edit}
                    </button>
                    <button
                      onClick={() => setPreview(true)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${preview ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400'}`}>
                      {n.preview}
                    </button>
                  </div>

                  {/* Deel-knop */}
                  <button
                    onClick={handleShare}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${isPublic ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'text-indigo-400 hover:bg-indigo-50'}`}>
                    {shareCopied ? '✓ Gekopieerd!' : isPublic ? '🔗 Link' : 'Delen'}
                  </button>

                  {isPublic && (
                    <button onClick={handleUnshare} className="text-xs text-gray-300 hover:text-gray-500 transition-colors px-1">
                      ✕
                    </button>
                  )}

                  {/* Snelkoppelingen help */}
                  <div className="relative hidden sm:block">
                    <button onClick={() => setShowShortcuts(s => !s)}
                      className="text-xs text-indigo-300 hover:text-indigo-500 w-6 h-7 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center">
                      ?
                    </button>
                    {showShortcuts && (
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-indigo-100 rounded-2xl shadow-xl p-4 w-56" onClick={() => setShowShortcuts(false)}>
                        <p className="text-xs font-bold text-indigo-900 mb-2">{n.shortcuts}</p>
                        {[n.shortcutBold, n.shortcutItalic, n.shortcutH1, n.shortcutList, 'Tab → inspringing', 'Enter → lijst doorzetten'].map(s => (
                          <p key={s} className="text-xs text-indigo-400 py-0.5 font-mono">{s}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {confirmDelete ? (
                    <div className="flex items-center gap-1">
                      <button onClick={deleteNote}
                        className="text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-colors">
                        Ja
                      </button>
                      <button onClick={() => setConfirmDelete(false)}
                        className="text-xs text-indigo-400 hover:text-indigo-600 px-2 py-1.5 rounded-lg">
                        Nee
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)}
                      className="text-xs text-red-300 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      {n.deleteNote}
                    </button>
                  )}
                </div>
              </div>

              {/* Gedeelde link banner */}
              {shareUrl && (
                <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-emerald-700 font-medium truncate">{shareUrl}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={async () => { await navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
                      {shareCopied ? '✓' : 'Kopieer'}
                    </button>
                    <button onClick={handleUnshare} className="text-xs text-emerald-400 hover:text-emerald-600">Verwijder link</button>
                  </div>
                </div>
              )}

              {/* Titel */}
              <div className="px-6 pt-5 pb-2 border-b border-indigo-50">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={n.untitled}
                  className="w-full text-2xl font-bold text-indigo-900 placeholder:text-indigo-200 bg-transparent border-0 outline-none focus:ring-0"
                />
              </div>

              {/* Split-view: editor links, live preview rechts */}
              <div className="flex-1 flex overflow-hidden">
                {/* Editor — altijd zichtbaar tenzij pure preview-modus op mobiel */}
                <div className={`${preview ? 'hidden md:flex' : 'flex'} flex-col flex-1 min-w-0 border-r border-indigo-50`}>
                  <div className="px-3 py-1.5 bg-indigo-50/50 border-b border-indigo-50">
                    <span className="text-xs font-medium text-indigo-400">Bewerken</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onSelect={e => {
                      const ta = e.currentTarget
                      lastSelection.current = { start: ta.selectionStart, end: ta.selectionEnd }
                    }}
                    placeholder={n.placeholder}
                    className="flex-1 w-full px-6 py-4 text-sm text-indigo-800 bg-transparent border-0 outline-none focus:ring-0 resize-none leading-relaxed placeholder:text-indigo-200 font-mono"
                    spellCheck
                  />
                </div>

                {/* Live preview — altijd zichtbaar naast editor op desktop */}
                <div className={`${preview ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
                  <div className="px-3 py-1.5 bg-indigo-50/50 border-b border-indigo-50">
                    <span className="text-xs font-medium text-indigo-400">Voorbeeld</span>
                  </div>
                  <div
                    className="flex-1 px-6 py-4 overflow-y-auto text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-2 border-t border-indigo-50 flex justify-between items-center">
                <span className="text-xs text-indigo-300">{wordCount} {n.wordCount}</span>
                <span className="text-xs text-indigo-300">{n.lastEdited} {formatDate(selectedNote.updated_at)}</span>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
