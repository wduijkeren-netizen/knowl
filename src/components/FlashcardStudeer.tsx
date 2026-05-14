'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { useStudyTimer } from '@/lib/useStudyTimer'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Card = { id: string; front: string; back: string }
type Set = { id: string; title: string; vak: string | null }
type Props = { set: Set; cards: Card[]; srMap: Record<string, number> }

function getProgress(setId: string): number {
  try {
    const raw = localStorage.getItem(`knowl_fc_progress_${setId}`)
    if (!raw) return -1
    const { known, total } = JSON.parse(raw)
    return total > 0 ? Math.round((known / total) * 100) : 0
  } catch { return -1 }
}

function saveProgress(setId: string, known: number, total: number) {
  try { localStorage.setItem(`knowl_fc_progress_${setId}`, JSON.stringify({ known, total })) } catch {}
}

export default function FlashcardStudeer({ set, cards: initialCards, srMap }: Props) {
  const { tr } = useLanguage()
  const fc = tr.flashcards

  function sterkte(interval: number | undefined): { label: string; kleur: string } {
    if (interval === undefined) return { label: fc.strengthNew, kleur: 'bg-gray-300' }
    if (interval < 4) return { label: fc.strengthLearning, kleur: 'bg-amber-400' }
    if (interval < 14) return { label: fc.strengthOk, kleur: 'bg-blue-400' }
    return { label: fc.strengthGood, kleur: 'bg-emerald-400' }
  }

  const [cards] = useState(() => [...initialCards].sort(() => Math.random() - 0.5))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<string[]>([])
  const [unknown, setUnknown] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [prevPct, setPrevPct] = useState(-1)

  useStudyTimer('flashcards', set.title)
  useEffect(() => { setPrevPct(getProgress(set.id)) }, [set.id])

  // Sla voortgang op bij navigeren weg (halverwege stoppen)
  useEffect(() => {
    return () => {
      if (known.length > 0 || unknown.length > 0) {
        saveProgress(set.id, known.length, known.length + unknown.length)
      }
    }
  }, [known, unknown, set.id])

  const card = cards[index]

  function next(didKnow: boolean) {
    const newKnown = didKnow ? [...known, card.id] : known
    if (didKnow) setKnown(newKnown)
    else setUnknown(u => [...u, card.id])

    setFlipped(false)
    if (index + 1 >= cards.length) {
      saveProgress(set.id, newKnown.length, cards.length)
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
          <p className="text-indigo-400">{fc.noCards}</p>
          <Link href="/flashcards" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">{fc.backToOverview}</Link>
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
            <Link href="/flashcards" className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">← {fc.title}</Link>
            <h1 className="text-xl font-bold text-indigo-900 mt-1">{set.title}</h1>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link href={`/flashcards/${set.id}/bewerken`}
              className="text-sm bg-gray-100 text-gray-500 px-3 py-2 rounded-xl font-medium hover:bg-gray-200 transition-colors">
              {fc.edit}
            </Link>
            <Link href={`/flashcards/${set.id}/invuloefening`}
              className="text-sm bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl font-medium hover:bg-indigo-100 transition-colors">
              {fc.fill}
            </Link>
            <Link href={`/flashcards/${set.id}/quiz`}
              className="text-sm bg-violet-100 text-violet-700 px-3 py-2 rounded-xl font-medium hover:bg-violet-200 transition-colors">
              {fc.quiz}
            </Link>
          </div>
        </div>

        {done ? (
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 text-center space-y-4">
            <p className="text-5xl">🎉</p>
            <h2 className="text-xl font-bold text-indigo-900">{fc.done}</h2>
            <div className="flex justify-center gap-6 py-2">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-500">{known.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fc.knew}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{unknown.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fc.learnMore}</p>
              </div>
            </div>
            {prevPct >= 0 && (
              <p className="text-xs text-indigo-400">
                {prevPct}% → {Math.round((known.length / cards.length) * 100)}%
              </p>
            )}
            <div className="flex gap-3 justify-center pt-2 flex-wrap">
              <button onClick={restart}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                {fc.study}
              </button>
              <Link href={`/flashcards/${set.id}/quiz`}
                className="bg-violet-100 text-violet-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-200 transition-colors">
                {fc.quiz}
              </Link>
              <button onClick={() => { saveProgress(set.id, 0, 0); restart() }}
                className="bg-gray-100 text-gray-500 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                {fc.resetProgress}
              </button>
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
                  <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-4">{fc.question}</p>
                  <p className="text-2xl font-bold text-indigo-900">{card.front}</p>
                  <p className="text-xs text-indigo-300 mt-6">{fc.flip}</p>
                  {(() => { const s = sterkte(srMap[card.id]); return (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.kleur}`} />
                      <span className="text-xs text-indigo-300">{s.label}</span>
                    </div>
                  ) })()}
                </div>

                {/* Achterkant */}
                <div
                  className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl border border-indigo-100 shadow-md flex flex-col items-center justify-center p-8 text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-4">{fc.answer}</p>
                  <p className="text-2xl font-bold text-indigo-900">{card.back}</p>
                </div>
              </div>
            </div>

            {/* Knoppen */}
            {flipped ? (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => next(false)}
                  className="bg-red-50 text-red-500 rounded-2xl py-5 text-sm font-semibold hover:bg-red-100 active:bg-red-100 transition-colors border border-red-100">
                  {fc.didNotKnow}
                </button>
                <button onClick={() => next(true)}
                  className="bg-emerald-50 text-emerald-600 rounded-2xl py-5 text-sm font-semibold hover:bg-emerald-100 active:bg-emerald-100 transition-colors border border-emerald-100">
                  {fc.knew}
                </button>
              </div>
            ) : (
              <button onClick={() => setFlipped(true)}
                className="w-full bg-indigo-100 text-indigo-700 rounded-2xl py-4 text-sm font-semibold hover:bg-indigo-200 transition-colors">
                {fc.flipBtn}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
