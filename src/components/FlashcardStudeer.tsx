'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

type Card = { id: string; front: string; back: string }
type Set = { id: string; title: string; vak: string | null }
type Props = { set: Set; cards: Card[] }

export default function FlashcardStudeer({ set, cards: initialCards }: Props) {
  const [cards] = useState(() => [...initialCards].sort(() => Math.random() - 0.5))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<string[]>([])
  const [unknown, setUnknown] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const card = cards[index]

  function next(didKnow: boolean) {
    if (didKnow) setKnown(k => [...k, card.id])
    else setUnknown(u => [...u, card.id])

    setFlipped(false)
    if (index + 1 >= cards.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  function restart() {
    setIndex(0)
    setFlipped(false)
    setKnown([])
    setUnknown([])
    setDone(false)
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f7ff]">
        <Nav />
        <main className="max-w-3xl mx-auto px-4 py-8 text-center">
          <p className="text-indigo-400">Deze set heeft nog geen kaarten.</p>
          <Link href="/flashcards" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">← Terug naar overzicht</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/flashcards" className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">← Terug</Link>
            <h1 className="text-xl font-bold text-indigo-900 mt-1">{set.title}</h1>
          </div>
          <Link href={`/flashcards/${set.id}/quiz`}
            className="text-sm bg-violet-100 text-violet-700 px-3 py-2 rounded-xl font-medium hover:bg-violet-200 transition-colors">
            Quiz starten →
          </Link>
        </div>

        {done ? (
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 text-center space-y-4">
            <p className="text-5xl">🎉</p>
            <h2 className="text-xl font-bold text-indigo-900">Klaar!</h2>
            <div className="flex justify-center gap-6 py-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-500">{known.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Geweten</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{unknown.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Nog oefenen</p>
              </div>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={restart}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Opnieuw
              </button>
              <Link href={`/flashcards/${set.id}/quiz`}
                className="bg-violet-100 text-violet-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-200 transition-colors">
                Quiz proberen
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Voortgangsbalk */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-indigo-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(index / cards.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-indigo-400 whitespace-nowrap">{index + 1} / {cards.length}</span>
            </div>

            {/* Kaart */}
            <div
              onClick={() => setFlipped(f => !f)}
              className="cursor-pointer select-none"
              style={{ perspective: '1000px' }}
            >
              <div
                className="relative transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  minHeight: '240px',
                }}
              >
                {/* Voorkant */}
                <div
                  className="absolute inset-0 bg-white rounded-3xl border border-indigo-100 shadow-md flex flex-col items-center justify-center p-8 text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-4">Vraag</p>
                  <p className="text-2xl font-bold text-indigo-900">{card.front}</p>
                  <p className="text-xs text-indigo-300 mt-6">Klik om om te draaien</p>
                </div>

                {/* Achterkant */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl border border-indigo-100 shadow-md flex flex-col items-center justify-center p-8 text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-4">Antwoord</p>
                  <p className="text-2xl font-bold text-indigo-900">{card.back}</p>
                </div>
              </div>
            </div>

            {/* Knoppen */}
            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => next(false)}
                  className="bg-red-50 text-red-500 rounded-2xl py-4 text-sm font-semibold hover:bg-red-100 transition-colors border border-red-100">
                  ✕ Wist ik niet
                </button>
                <button onClick={() => next(true)}
                  className="bg-emerald-50 text-emerald-600 rounded-2xl py-4 text-sm font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100">
                  ✓ Wist ik het
                </button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)}
                className="w-full bg-indigo-100 text-indigo-700 rounded-2xl py-4 text-sm font-semibold hover:bg-indigo-200 transition-colors">
                Omdraaien
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
