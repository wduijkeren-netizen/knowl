'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import ToolBanner from '@/components/ToolBanner'
import FlipCard from '@/components/FlipCard'
import { createClient } from '@/lib/supabase/client'
import { useStudyTimer } from '@/lib/useStudyTimer'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  const { tr } = useLanguage()
  const fc = tr.flashcards

  const [queue, setQueue] = useState<Card[]>(cards)
  useEffect(() => { setQueue([...cards].sort(() => Math.random() - 0.5)) }, [cards])
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
          <h2 className="text-xl font-bold text-indigo-900">{fc.repeatEmpty}</h2>
          <p className="text-sm text-indigo-400">{fc.repeatEmptyBody}</p>
          <Link href={`/flashcards/${set.id}`} className="inline-block mt-2 text-sm text-indigo-600 hover:underline">← {fc.title}</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-5xl" />
      <ToolBanner
        variant="cards" width="max-w-5xl" backHref={`/flashcards/${set.id}`} backLabel={set.title} title={`${fc.repeat}: ${set.title}`}
        below={<span className="text-xs font-medium bg-white/15 border border-white/20 rounded-full px-3 py-1">{cards.length} / {totalCards} {fc.toRepeat}</span>}
      />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {done ? (
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-indigo-900">{fc.repeatDone}</h2>
            <p className="text-sm text-indigo-400">{fc.repeatEmptyBody}</p>
            <div className="flex justify-center gap-6 py-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-500">{correct}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fc.correct}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{cards.length - correct}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fc.learnMore}</p>
              </div>
            </div>
            <Link href="/flashcards" className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              {fc.title}
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

            <FlipCard
              cardKey={card.id}
              flipped={flipped}
              onToggle={() => setFlipped(f => !f)}
              backClassName="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100"
              front={
                <>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide mb-4">{fc.repeat}</p>
                  <p className="text-2xl font-bold text-indigo-950 dark:text-white break-words">{card.front}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">{fc.flip}</p>
                </>
              }
              back={
                <>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-4">{fc.answer}</p>
                  <p className="text-2xl font-bold text-indigo-950 dark:text-white break-words">{card.back}</p>
                </>
              }
            />

            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAnswer(false)}
                  className="bg-red-50 text-red-500 rounded-2xl py-5 text-sm font-semibold hover:bg-red-100 active:bg-red-100 transition-colors border border-red-100">
                  {fc.notKnown}
                </button>
                <button onClick={() => handleAnswer(true)}
                  className="bg-emerald-50 text-emerald-600 rounded-2xl py-5 text-sm font-semibold hover:bg-emerald-100 active:bg-emerald-100 transition-colors border border-emerald-100">
                  {fc.knownCorrect}
                </button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)}
                className="w-full bg-amber-100 text-amber-700 rounded-2xl py-4 text-sm font-semibold hover:bg-amber-200 transition-colors">
                {fc.showAnswer}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
