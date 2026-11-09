'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatMinutes } from '@/lib/studyStats'

type Result = { id: string; title: string; category: string | null; learned_at: string; duration_minutes: number | null }

export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    const term = query.trim().replace(/[,()%*\\]/g, ' ').trim()
    if (!open || term.length < 2) { setResults([]); return }
    setLoading(true)
    const id = setTimeout(async () => {
      const { data } = await createClient()
        .from('learning_moments')
        .select('id, title, category, learned_at, duration_minutes')
        .or(`title.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`)
        .order('learned_at', { ascending: false })
        .limit(8)
      setResults(data ?? [])
      setLoading(false)
    }, 200)
    return () => clearTimeout(id)
  }, [query, open])

  if (!open || typeof document === 'undefined') return null

  function go() {
    onClose()
    router.push(`/leermomenten?zoek=${encodeURIComponent(query.trim())}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Zoek leermomenten"
        className="w-full max-w-lg bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-2xl border border-indigo-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      >
        <form onSubmit={e => { e.preventDefault(); if (query.trim()) go() }} className="flex items-center gap-3 px-4 border-b border-indigo-100">
          <Search className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Zoek in je leermomenten…"
            className="flex-1 py-3.5 text-sm bg-transparent border-0 focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-500"
          />
          <button type="button" onClick={onClose} aria-label="Sluiten" className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </form>

        <div className="max-h-80 overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-6 text-center">Typ minstens twee letters.</p>
          ) : loading && results.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-6 text-center">Zoeken…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-6 text-center">Geen leermomenten gevonden.</p>
          ) : (
            <ul className="py-1">
              {results.map(r => (
                <li key={r.id}>
                  <button onClick={go} className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 dark:hover:bg-white/5 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{r.title}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {new Date(`${r.learned_at}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {r.category ? ` · ${r.category}` : ''}
                      </span>
                    </span>
                    {r.duration_minutes ? <span className="text-xs text-slate-600 dark:text-slate-300 shrink-0">{formatMinutes(r.duration_minutes)}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-indigo-100">Enter toont alle resultaten bij Leermomenten · Esc sluit</p>
      </div>
    </div>,
    document.body
  )
}
