'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { useStudyTimer } from '@/lib/useStudyTimer'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Card = { id: string; front: string; back: string }
type Set = { id: string; title: string; vak: string | null }
type Props = { set: Set; cards: Card[] }

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?;:'"()\-]/g, '')
}

export default function FlashcardInvul({ set, cards: initialCards }: Props) {
  useStudyTimer('invuloefening', set.title)
  const { tr } = useLanguage()
  const fc = tr.flashcards

  const [cards] = useState(() => [...initialCards].sort(() => Math.random() - 0.5))
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [result, setResult] = useState<'correct' | 'bijna' | 'fout' | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const card = cards[index]

  function handleCheck() {
    if (!card || result) return
    const correct = normalize(card.back)
    const given = normalize(input)

    if (given === correct) {
      setResult('correct')
      setScore(s => s + 1)
    } else if (correct.includes(given) || given.includes(correct) || levenshtein(given, correct) <= 2) {
      setResult('bijna')
    } else {
      setResult('fout')
    }
  }

  function handleNext() {
    setInput('')
    setResult(null)
    if (index + 1 >= cards.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function restart() {
    setIndex(0)
    setInput('')
    setResult(null)
    setScore(0)
    setDone(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (done) {
    const pct = Math.round((score / cards.length) * 100)
    return (
      <div className="min-h-screen bg-[#f8f7ff]">
        <Nav />
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-center">
          <h1 className="text-xl font-bold text-indigo-900">{fc.fillDone}</h1>
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 space-y-4">
            <p className="text-5xl font-bold text-indigo-700">{pct}%</p>
            <p className="text-sm text-indigo-400">{score} / {cards.length} {fc.correct}</p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={restart} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">{fc.study}</button>
              <Link href={`/flashcards/${set.id}`} className="bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-200 transition-colors">{fc.back ?? '← Terug'}</Link>
            </div>
          </div>
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
            <Link href={`/flashcards/${set.id}`} className="text-indigo-400 hover:text-indigo-600 text-sm">← {fc.study}</Link>
            <h1 className="text-xl font-bold text-indigo-900 mt-1">{fc.fillTitle} — {set.title}</h1>
          </div>
          <span className="text-sm text-indigo-400">{index + 1} / {cards.length}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-indigo-100 rounded-full h-2">
            <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all"
              style={{ width: `${(index / cards.length) * 100}%` }} />
          </div>
          <span className="text-xs text-indigo-400 font-semibold">{score} goed</span>
        </div>

        <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 space-y-6">
          <div className="text-center">
            <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-3">{fc.question}</p>
            <p className="text-2xl font-bold text-indigo-900">{card.front}</p>
          </div>

          <div className="space-y-3">
            <input
              ref={inputRef}
              autoFocus
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { if (result) handleNext(); else handleCheck() } }}
              disabled={result !== null}
              placeholder={fc.typeAnswer}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                result === 'correct' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 focus:ring-emerald-400' :
                result === 'bijna' ? 'border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-400' :
                result === 'fout' ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-400' :
                'border-gray-200 focus:ring-indigo-400'
              }`}
            />

            {result === 'correct' && (
              <p className="text-sm text-emerald-600 font-medium text-center">{fc.correct}!</p>
            )}
            {result === 'bijna' && (
              <div className="text-center">
                <p className="text-sm text-amber-600 font-medium">{fc.almost}</p>
                <p className="text-sm font-bold text-amber-700 mt-1">{card.back}</p>
              </div>
            )}
            {result === 'fout' && (
              <div className="text-center">
                <p className="text-sm text-red-500 font-medium">{fc.wrong}</p>
                <p className="text-sm font-bold text-red-600 mt-1">{card.back}</p>
              </div>
            )}
          </div>

          {!result ? (
            <button onClick={handleCheck} disabled={!input.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 transition-all">
              {fc.checkBtn}
            </button>
          ) : (
            <button onClick={handleNext}
              className="w-full bg-indigo-100 text-indigo-700 rounded-xl py-3 text-sm font-semibold hover:bg-indigo-200 transition-colors">
              {index + 1 >= cards.length ? fc.seeResult : fc.nextBtn}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[a.length][b.length]
}
