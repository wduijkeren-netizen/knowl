'use client'

import Nav from '@/components/Nav'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Note = {
  id: string
  title: string
  content: string
  subject: string | null
  updated_at: string
}

type Props = {
  userId: string
  initialNotes: Note[]
  subjects: string[]
}

// Simple markdown → HTML renderer (no external lib)
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
      .replace(/`(.*?)`/g, '<code class="bg-indigo-50 text-indigo-700 px-1 rounded text-sm">$1</code>')

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

function wrapSelection(ta: HTMLTextAreaElement, before: string, after: string, setter: (v: string) => void) {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const value = ta.value
  const selected = value.slice(start, end)
  const newValue = value.slice(0, start) + before + selected + after + value.slice(end)
  setter(newValue)
  setTimeout(() => {
    ta.selectionStart = start + before.length
    ta.selectionEnd = end + before.length
    ta.focus()
  }, 0)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      note.id === id ? { ...note, title: t.trim() || n.untitled, content: c, subject: s || null, updated_at: new Date().toISOString() } : note
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
    setMobileView('editor')
  }

  async function createNote() {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: n.untitled,
      content: '',
      subject: null,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('notes').insert({ ...newNote, user_id: userId })
    setNotes(prev => [newNote, ...prev])
    selectNote(newNote)
  }

  async function deleteNote() {
    if (!selectedId) return
    await supabase.from('notes').delete().eq('id', selectedId)
    const remaining = notes.filter(n => n.id !== selectedId)
    setNotes(remaining)
    if (remaining.length > 0) selectNote(remaining[0])
    else { setSelectedId(null); setTitle(''); setContent(''); setSubject('') }
    setConfirmDelete(false)
    setMobileView('list')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = e.currentTarget
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = ta.value

    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault()
      wrapSelection(ta, '**', '**', setContent)
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault()
      wrapSelection(ta, '*', '*', setContent)
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        if (value.slice(lineStart, lineStart + 2) === '  ') {
          setContent(value.slice(0, lineStart) + value.slice(lineStart + 2))
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = Math.max(start - 2, lineStart) }, 0)
        }
      } else {
        setContent(value.slice(0, start) + '  ' + value.slice(end))
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2 }, 0)
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
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1 + prefix.length }, 0)
      } else if (numberedMatch) {
        e.preventDefault()
        const nextNum = parseInt(numberedMatch[1]) + 1
        const prefix = nextNum + '. '
        setContent(value.slice(0, start) + '\n' + prefix + value.slice(end))
        setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 1 + prefix.length }, 0)
      }
    }
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const filtered = notes.filter(note =>
    !search || note.title.toLowerCase().includes(search.toLowerCase()) ||
    (note.subject ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const selectedNote = notes.find(n => n.id === selectedId)

  return (
    <div className="min-h-screen bg-[#f8f7ff] flex flex-col">
      <Nav />

      <div className="flex-1 flex max-w-6xl mx-auto w-full px-0 sm:px-4 py-0 sm:py-6 gap-0 sm:gap-4">

        {/* Notitie-lijst — verborgen op mobiel als editor open is */}
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
                    <p className="font-medium text-sm text-indigo-900 truncate">{note.title || n.untitled}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {note.subject && <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2 py-0.5 font-medium truncate max-w-[100px]">{note.subject}</span>}
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
              {/* Editor toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-50 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button onClick={() => setMobileView('list')}
                    className="sm:hidden text-indigo-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                    ← Lijst
                  </button>
                  <select value={subject} onChange={e => setSubject(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-gray-600 max-w-[140px]">
                    <option value="">{n.noSubject}</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  {saveStatus === 'saving' && <span className="text-xs text-indigo-300">{n.saving}</span>}
                  {saveStatus === 'saved' && <span className="text-xs text-emerald-500 font-medium">{n.autoSaved} ✓</span>}

                  <div className="hidden sm:flex items-center gap-1 bg-indigo-50 rounded-lg p-0.5">
                    <button
                      onClick={() => !preview && textareaRef.current && wrapSelection(textareaRef.current, '**', '**', setContent)}
                      className="text-xs font-bold text-indigo-600 px-2 py-1 rounded-md hover:bg-white transition-colors"
                      title="Ctrl+B"
                    >B</button>
                    <button
                      onClick={() => !preview && textareaRef.current && wrapSelection(textareaRef.current, '*', '*', setContent)}
                      className="text-xs italic text-indigo-600 px-2 py-1 rounded-md hover:bg-white transition-colors"
                      title="Ctrl+I"
                    >I</button>
                  </div>

                  <button
                    onClick={() => setPreview(p => !p)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${preview ? 'bg-indigo-600 text-white' : 'text-indigo-500 hover:bg-indigo-50'}`}>
                    {preview ? n.edit : n.preview}
                  </button>

                  <div className="relative">
                    <button onClick={() => setShowShortcuts(s => !s)}
                      className="text-xs text-indigo-300 hover:text-indigo-500 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors hidden sm:block"
                      title={n.shortcuts}>
                      ?
                    </button>
                    {showShortcuts && (
                      <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-indigo-100 rounded-2xl shadow-xl p-4 w-56">
                        <p className="text-xs font-bold text-indigo-900 mb-2">{n.shortcuts}</p>
                        {[n.shortcutBold, n.shortcutItalic, n.shortcutH1, n.shortcutList, 'Tab → inspringing'].map(s => (
                          <p key={s} className="text-xs text-indigo-500 py-0.5">{s}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {confirmDelete ? (
                    <div className="flex items-center gap-1">
                      <button onClick={deleteNote}
                        className="text-xs bg-red-500 text-white px-2.5 py-1.5 rounded-lg font-medium hover:bg-red-600 transition-colors">
                        Ja, verwijder
                      </button>
                      <button onClick={() => setConfirmDelete(false)}
                        className="text-xs text-indigo-400 hover:text-indigo-600 px-2 py-1.5 rounded-lg">
                        Annuleer
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)}
                      className="text-xs text-red-300 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      {n.deleteNote}
                    </button>
                  )}
                </div>
              </div>

              {/* Titelbalk */}
              <div className="px-6 pt-5 pb-2">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={n.untitled}
                  className="w-full text-2xl font-bold text-indigo-900 placeholder:text-indigo-200 bg-transparent border-0 outline-none focus:ring-0"
                />
              </div>

              {/* Content: editor of preview */}
              <div className="flex-1 px-6 pb-6 overflow-y-auto">
                {preview ? (
                  <div
                    className="prose max-w-none text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={n.placeholder}
                    className="w-full h-full min-h-[400px] text-sm text-indigo-800 bg-transparent border-0 outline-none focus:ring-0 resize-none leading-relaxed placeholder:text-indigo-200 font-mono"
                    spellCheck
                  />
                )}
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
