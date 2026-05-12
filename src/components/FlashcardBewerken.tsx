'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { vertaalFout } from '@/lib/foutmelding'

type Card = { id: string; front: string; back: string }
type Set = { id: string; title: string; vak: string | null }
type Subject = { id: string; name: string }
type Props = { set: Set; cards: Card[]; subjects: Subject[]; userId: string }

function uid() { return Math.random().toString(36).slice(2) }

export default function FlashcardBewerken({ set, cards: initialCards, subjects, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState(set.title)
  const [vak, setVak] = useState(set.vak ?? '')
  const [cards, setCards] = useState<(Card & { isNew?: boolean; deleted?: boolean })[]>(initialCards)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function updateCard(id: string, field: 'front' | 'back', value: string) {
    setCards(cs => cs.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  function addCard() {
    setCards(cs => [...cs, { id: uid(), front: '', back: '', isNew: true }])
  }

  function removeCard(id: string) {
    setCards(cs => cs.filter(c => c.id !== id))
  }

  async function handleSave() {
    if (!title.trim()) { setError('Geef de set een naam.'); return }
    const valid = cards.filter(c => c.front.trim() || c.back.trim())
    const invalid = valid.some(c => !c.front.trim() || !c.back.trim())
    if (invalid) { setError('Alle kaarten moeten een voor- en achterkant hebben.'); return }

    setSaving(true)
    setError('')

    // Update set titel en vak
    await supabase.from('flashcard_sets').update({ title: title.trim(), vak: vak || null }).eq('id', set.id)

    // Verwijder kaarten die weg zijn
    const removedIds = initialCards.filter(orig => !cards.find(c => c.id === orig.id)).map(c => c.id)
    if (removedIds.length > 0) {
      await supabase.from('flashcards').delete().in('id', removedIds)
    }

    // Voeg nieuwe kaarten toe
    const newCards = cards.filter(c => c.isNew && c.front.trim() && c.back.trim())
    if (newCards.length > 0) {
      await supabase.from('flashcards').insert(newCards.map(c => ({
        id: uid(), set_id: set.id, user_id: userId, front: c.front.trim(), back: c.back.trim()
      })))
    }

    // Update bestaande kaarten
    const existingCards = cards.filter(c => !c.isNew && c.front.trim() && c.back.trim())
    for (const c of existingCards) {
      await supabase.from('flashcards').update({ front: c.front.trim(), back: c.back.trim() }).eq('id', c.id)
    }

    setSaving(false)
    router.push(`/flashcards/${set.id}`)
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/flashcards/${set.id}`} className="text-indigo-400 hover:text-indigo-600 text-sm">← Terug</Link>
          <h1 className="text-2xl font-bold text-indigo-900">Set bewerken</h1>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Naam van de set</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Vak <span className="text-gray-400 font-normal">(optioneel)</span></label>
            <select value={vak} onChange={e => setVak(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">Geen vak</option>
              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-indigo-900">{cards.length} kaarten</h2>
            <button onClick={addCard} className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">+ Kaart toevoegen</button>
          </div>
          {cards.map((card) => (
            <div key={card.id} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <input value={card.front} onChange={e => updateCard(card.id, 'front', e.target.value)}
                placeholder="Voorkant (vraag)"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
              <input value={card.back} onChange={e => updateCard(card.id, 'back', e.target.value)}
                placeholder="Achterkant (antwoord)"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
              <button onClick={() => removeCard(card.id)}
                className="self-end sm:self-auto text-gray-300 hover:text-red-400 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-sm text-indigo-300 text-center py-4">Geen kaarten — voeg er een toe.</p>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-sm text-red-500">{vertaalFout(error)}</p></div>}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200">
          {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
        </button>
      </main>
    </div>
  )
}
