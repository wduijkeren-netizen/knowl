'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'
import { useStudyTimer } from '@/lib/useStudyTimer'

type Card = { id: string; front: string; back: string }
type SR = { interval_days: number; ease: number; due_date: string }
type Set = { id: string; title: string; vak: string | null }

type Props = {
  set: Set
  cards: Card[]
  srMap: Record<string, SR>
  userId: string
  totalCards: number
}

function nextSR(sr: SR | undefined, correct: boolean): { interval_days: number; ease: number; due_date: string } {
  const interval = sr?.interval_days ?? 0
  const ease = sr?.ease ?? 2.5

  let newInterval: number
  let newEase: number

  if (!correct) {
    newInterval = 1
    newEase = Math.max(1.3, ease - 0.2)
  } else {
    if (interval <= 1) newInterval = 3
    else if (interval <= 3) newInterval = 7
    else newInterval = Math.round(interval * ease)
    newEase = Math.min(3.0, ease + 0.05)
  }

  const due = new Date()
  due.setDate(due.getDate() + newInterval)
  return { interval_days: newInterval, ease: newEase, due_date: due.toISOString().split('T')[0] }
}

export default function FlashcardHerhalen({ set, cards, srMap, userId, totalCards }: Props) {
  const supabase = createClient()
  const { save: saveTimer } = useStudyTimer('flashcards-sr', set.title)

  const [queue, setQueue] = useState<Card[]>(() => [...cards].sort(() => Math.random() - 0.5))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [correct, setCorrect] = useState(0)

  const card = queue[index]

  async function handleAnswer(didKnow: boolean) {
    if (!card) return
    const sr = srMap[card.id]
    const newSR = nextSR(sr, didKnow)

    await supabase.from('flashcard_sr').upsert({
      user_id: userId,
      card_id: card.id,
      ...newSR,
    }, { onConflict: 'user_id,card_id' })

    if (didKnow) setCorrect(c => c + 1)

    // Kaart fout? Achteraan de rij zetten
    if (!didKnow) {
      setQueue(q => [...q, card])
    }

    setFlipped(false)
    if (index + 1 >= queue.length) {
      await saveTimer()
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f7ff]">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-indigo-900">Alles herhaald voor vandaag</h2>
          <p className="text-sm text-indigo-400">Je hebt alle kaarten die aan de beurt waren doorgenomen. Kom morgen terug voor de volgende herhaling.</p>
          <Link href={`/flashcards/${set.id}`} className="inline-block mt-2 text-sm text-indigo-600 hover:underline">← Terug naar de set</Link>
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
            <h1 className="text-xl font-bold text-indigo-900 mt-1">Herhalen — {set.title}</h1>
          </div>
          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-3 py-1 font-medium">
            {cards.length} van {totalCards} kaarten te herhalen
          </span>
        </div>

        {done ? (
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-indigo-900">Herhaling voltooid</h2>
            <p className="text-sm text-indigo-400">Knowl onthoudt welke kaarten je moeilijk vindt en toont die de volgende keer eerder.</p>
            <div className="flex justify-center gap-6 py-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-500">{correct}</p>
                <p className="text-xs text-gray-400 mt-0.5">Correct</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{cards.length - correct}</p>
                <p className="text-xs text-gray-400 mt-0.5">Nog te leren</p>
              </div>
            </div>
            <Link href="/flashcards" className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Naar overzicht
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-indigo-100 rounded-full h-2">
                <div className="bg-gradient-to-r from-amber-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(index / queue.length) * 100}%` }} />
              </div>
              <span className="text-sm text-indigo-400 whitespace-nowrap">{index + 1} / {queue.length}</span>
            </div>

            <div onClick={() => setFlipped(f => !f)} className="cursor-pointer select-none" style={{ perspective: '1000px' }}>
              <div className="relative transition-transform duration-500"
                style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '240px' }}>
                <div className="absolute inset-0 bg-white rounded-3xl border border-indigo-100 shadow-md flex flex-col items-center justify-center p-8 text-center"
                  style={{ backfaceVisibility: 'hidden' }}>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-4">Herhaling</p>
                  <p className="text-2xl font-bold text-indigo-900">{card.front}</p>
                  <p className="text-xs text-indigo-300 mt-6">Klik om om te draaien</p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100 shadow-md flex flex-col items-center justify-center p-8 text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-4">Antwoord</p>
                  <p className="text-2xl font-bold text-indigo-900">{card.back}</p>
                </div>
              </div>
            </div>

            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAnswer(false)}
                  className="bg-red-50 text-red-500 rounded-2xl py-4 text-sm font-semibold hover:bg-red-100 transition-colors border border-red-100">
                  Nog niet gekend
                </button>
                <button onClick={() => handleAnswer(true)}
                  className="bg-emerald-50 text-emerald-600 rounded-2xl py-4 text-sm font-semibold hover:bg-emerald-100 transition-colors border border-emerald-100">
                  Correct gekend
                </button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)}
                className="w-full bg-amber-100 text-amber-700 rounded-2xl py-4 text-sm font-semibold hover:bg-amber-200 transition-colors">
                Toon antwoord
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
