'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'

type Subject = { id: string; name: string }
type Props = { subjects: Subject[]; userId: string }

type ParsedCard = { front: string; back: string }

function parseImport(text: string): ParsedCard[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Tab first (Quizlet), then dash, then colon
      const tab = line.indexOf('\t')
      if (tab !== -1) return { front: line.slice(0, tab).trim(), back: line.slice(tab + 1).trim() }
      const dash = line.indexOf(' - ')
      if (dash !== -1) return { front: line.slice(0, dash).trim(), back: line.slice(dash + 3).trim() }
      const colon = line.indexOf(': ')
      if (colon !== -1) return { front: line.slice(0, colon).trim(), back: line.slice(colon + 2).trim() }
      return null
    })
    .filter((c): c is ParsedCard => c !== null && c.front.length > 0 && c.back.length > 0)
}

export default function FlashcardNieuw({ subjects, userId }: Props) {
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
    if (!title.trim()) { setError('Geef de set een naam.'); return }
    if (parsed.length === 0) { setError('Voeg minimaal één kaart toe.'); return }
    const invalid = parsed.some(c => !c.front.trim() || !c.back.trim())
    if (invalid) { setError('Alle kaarten moeten een voor- en achterkant hebben.'); return }

    setLoading(true)
    setError('')

    const { data: set, error: setErr } = await supabase
      .from('flashcard_sets')
      .insert({ title: title.trim(), vak: vak || null, user_id: userId })
      .select('id')
      .single()

    if (setErr || !set) { setError('Opslaan mislukt: ' + setErr?.message); setLoading(false); return }

    const { error: cardsErr } = await supabase.from('flashcards').insert(
      parsed.map(c => ({ set_id: set.id, user_id: userId, front: c.front.trim(), back: c.back.trim() }))
    )

    if (cardsErr) { setError('Kaarten opslaan mislukt: ' + cardsErr.message); setLoading(false); return }

    router.push(`/flashcards/${set.id}`)
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/flashcards" className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">← Terug</Link>
          <h1 className="text-2xl font-bold text-indigo-900">Nieuwe set</h1>
        </div>

        {/* Set info */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Naam van de set</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="bijv. Frans hoofdstuk 3"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Vak <span className="text-gray-400 font-normal">(optioneel)</span></label>
            <select value={vak} onChange={e => setVak(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white transition-all">
              <option value="">Geen vak</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Importeren */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-indigo-900 mb-0.5">Importeren</h2>
            <p className="text-sm text-indigo-400 mb-3">
              Plak woorden in het formaat <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-600 text-xs">woord - betekenis</span>, gebruik ook <span className="font-mono bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-600 text-xs">woord: betekenis</span> of tab (Quizlet). Één paar per regel.
            </p>
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
            Importeer {importText.trim() ? `(${parseImport(importText).length} kaarten herkend)` : ''}
          </button>
        </div>

        {/* Kaarten bewerken */}
        {parsed.length > 0 && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-semibold text-indigo-900">{parsed.length} kaarten</h2>
              <button onClick={addCard} className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">+ Kaart toevoegen</button>
            </div>
            {parsed.map((card, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input value={card.front} onChange={e => updateCard(i, 'front', e.target.value)}
                  placeholder="Voorkant (vraag)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                <input value={card.back} onChange={e => updateCard(i, 'back', e.target.value)}
                  placeholder="Achterkant (antwoord)"
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
                <button onClick={() => removeCard(i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none px-1">✕</button>
              </div>
            ))}
          </div>
        )}

        {parsed.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-6 text-center">
            <p className="text-sm text-indigo-300">Nog geen kaarten — importeer hierboven of voeg handmatig toe.</p>
            <button onClick={addCard} className="mt-3 text-sm text-indigo-500 hover:text-indigo-700 transition-colors font-medium">+ Kaart toevoegen</button>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-sm text-red-500">{error}</p></div>}

        {(parsed.length > 0 || title) && (
          <button onClick={handleSave} disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200">
            {loading ? 'Opslaan...' : `Set opslaan (${parsed.length} kaarten)`}
          </button>
        )}
      </main>
    </div>
  )
}
