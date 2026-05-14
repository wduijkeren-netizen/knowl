'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { vertaalFout } from '@/lib/foutmelding'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Subject = { id: string; name: string }
type Props = { subjects: Subject[]; userId: string }

type ParsedCard = { front: string; back: string }

function parseImport(text: string): ParsedCard[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Tab (Quizlet-export)
      const tab = line.indexOf('\t')
      if (tab !== -1) return { front: line.slice(0, tab).trim(), back: line.slice(tab + 1).trim() }
      // Dash met spatie op minstens één kant: "huis - house", "huis- house", "huis -house"
      const dashMatch = line.match(/^(.+?)\s*[-–]\s+(.+)$/) ?? line.match(/^(.+?)\s+[-–]\s*(.+)$/)
      if (dashMatch) return { front: dashMatch[1].trim(), back: dashMatch[2].trim() }
      // Komma-gescheiden CSV: "huis,house"
      const comma = line.indexOf(',')
      if (comma !== -1) return { front: line.slice(0, comma).trim(), back: line.slice(comma + 1).trim() }
      // Dubbele punt: "huis: house"
      const colon = line.indexOf(': ')
      if (colon !== -1) return { front: line.slice(0, colon).trim(), back: line.slice(colon + 2).trim() }
      return null
    })
    .filter((c): c is ParsedCard => c !== null && c.front.length > 0 && c.back.length > 0)
}

export default function FlashcardNieuw({ subjects, userId }: Props) {
  const { tr } = useLanguage()
  const fc = tr.flashcards
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [vak, setVak] = useState('')
  const [importText, setImportText] = useState('')
  const [parsed, setParsed] = useState<ParsedCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleImport() {
    const cards = parseImport(importText)
    setParsed(cards)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'docx') {
      const mammoth = (await import('mammoth')).default
      const buffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ arrayBuffer: buffer })
      setImportText(result.value)
      setParsed(parseImport(result.value))
      return
    }

    if (ext === 'pdf') {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      let fullText = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ')
        fullText += pageText + '\n'
      }
      setImportText(fullText)
      setParsed(parseImport(fullText))
      return
    }

    // .txt, .csv en andere tekstbestanden
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setImportText(text)
      setParsed(parseImport(text))
    }
    reader.readAsText(file)
  }

  function updateCard(i: number, field: 'front' | 'back', value: string) {
    setParsed(cards => cards.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function removeCard(i: number) {
    setParsed(cards => cards.filter((_, idx) => idx !== i))
  }

  function addCard() {
    setParsed(cards => [...cards, { front: '', back: '' }])
  }

  async function handleSave() {
    if (!title.trim()) { setError(fc.errorName); return }
    if (parsed.length === 0) { setError(fc.errorMinCard); return }
    const invalid = parsed.some(c => !c.front.trim() || !c.back.trim())
    if (invalid) { setError(fc.errorCardComplete); return }

    setLoading(true)
    setError('')

    const { data: set, error: setErr } = await supabase
      .from('flashcard_sets')
      .insert({ title: title.trim(), vak: vak || null, user_id: userId })
      .select('id')
      .single()

    if (setErr || !set) { setError(vertaalFout(setErr?.message)); setLoading(false); return }

    const { error: cardsErr } = await supabase.from('flashcards').insert(
      parsed.map(c => ({ set_id: set.id, user_id: userId, front: c.front.trim(), back: c.back.trim() }))
    )

    if (cardsErr) { setError(vertaalFout(cardsErr.message)); setLoading(false); return }

    router.push(`/flashcards/${set.id}`)
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/flashcards" className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">{fc.back}</Link>
          <h1 className="text-2xl font-bold text-indigo-900">{fc.newSetTitle}</h1>
        </div>

        {/* Set info */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{fc.setNameLabel}</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder={fc.setNamePlaceholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{fc.vakLabel} <span className="text-gray-400 font-normal">({fc.vakOptional})</span></label>
            <select value={vak} onChange={e => setVak(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-all">
              <option value="">{fc.noVakOption}</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Importeren */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-indigo-900 mb-0.5">{fc.importTitle}</h2>
            <p className="text-sm text-indigo-400 mb-3">
              Plak woorden of upload een bestand. Ondersteunde formaten: <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-600 text-xs">huis - house</span>, <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-600 text-xs">huis- house</span>, <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-600 text-xs">huis,house</span>, tab (Quizlet). Één paar per regel.
            </p>
            <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              {fc.uploadBtn}
              <input type="file" accept=".txt,.csv,.docx,.pdf" onChange={handleFile} className="hidden" />
            </label>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={"huis - house\nfiets - bicycle\nappel - apple"}
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all resize-none"
            />
          </div>
          <button onClick={handleImport}
            className="bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-200 transition-colors">
            {fc.importBtn}{importText.trim() ? ` (${parseImport(importText).length} ${fc.cardsCount})` : ''}
          </button>
        </div>

        {/* Kaarten bewerken */}
        {parsed.length > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-semibold text-indigo-900">{parsed.length} {fc.cardsCount}</h2>
              <button onClick={addCard} className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">{fc.addCard}</button>
            </div>
            {parsed.map((card, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <input value={card.front} onChange={e => updateCard(i, 'front', e.target.value)}
                  placeholder={fc.frontPlaceholder}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                <input value={card.back} onChange={e => updateCard(i, 'back', e.target.value)}
                  placeholder={fc.backPlaceholder}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                <button onClick={() => removeCard(i)} className="self-end sm:self-auto text-gray-300 hover:text-red-400 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
              </div>
            ))}
          </div>
        )}

        {parsed.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-6 text-center">
            <p className="text-sm text-indigo-300">{fc.noCardsNew}</p>
            <button onClick={addCard} className="mt-3 text-sm text-indigo-500 hover:text-indigo-700 transition-colors font-medium">{fc.addCard}</button>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-sm text-red-500">{error}</p></div>}

        {(parsed.length > 0 || title) && (
          <button onClick={handleSave} disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200">
            {loading ? fc.saving : `${fc.saveSet} (${parsed.length})`}
          </button>
        )}
      </main>
    </div>
  )
}
