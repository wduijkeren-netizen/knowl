'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

type Card = { id: string; front: string; back: string }
type Set = { id: string; title: string; vak: string | null }
type Props = { set: Set; cards: Card[] }

type Question = {
  card: Card
  options: string[]
  correct: string
}

function buildQuestions(cards: Card[]): Question[] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5)
  return shuffled.map(card => {
    const wrong = cards
      .filter(c => c.id !== card.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(c => c.back)
    const options = [...wrong, card.back].sort(() => Math.random() - 0.5)
    return { card, options, correct: card.back }
  })
}

export default function FlashcardQuiz({ set, cards }: Props) {
  const questions = useMemo(() => buildQuestions(cards), [cards])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = questions[index]

  function handleAnswer(option: string) {
    if (selected !== null) return
    setSelected(option)
    if (option === q.correct) setScore(s => s + 1)

    setTimeout(() => {
      setSelected(null)
      if (index + 1 >= questions.length) {
        setDone(true)
      } else {
        setIndex(i => i + 1)
      }
    }, 1000)
  }

  function restart() {
    setIndex(0)
    setSelected(null)
    setScore(0)
    setDone(false)
  }

  const pct = Math.round((score / questions.length) * 100)

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/flashcards/${set.id}`} className="text-indigo-400 hover:text-indigo-600 transition-colors text-sm">← Studeren</Link>
            <h1 className="text-xl font-bold text-indigo-900 mt-1">Quiz — {set.title}</h1>
          </div>
        </div>

        {done ? (
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 text-center space-y-4">
            <p className="text-5xl">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚'}</p>
            <h2 className="text-xl font-bold text-indigo-900">Quiz afgerond!</h2>
            <div>
              <p className="text-5xl font-bold text-indigo-700">{pct}%</p>
              <p className="text-sm text-indigo-400 mt-1">{score} van de {questions.length} goed</p>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={restart}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
                Opnieuw
              </button>
              <Link href={`/flashcards/${set.id}`}
                className="bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-200 transition-colors">
                Terug naar studeren
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Voortgang */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-indigo-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(index / questions.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-indigo-400 whitespace-nowrap">{index + 1} / {questions.length}</span>
            </div>

            {/* Vraag */}
            <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 text-center">
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide mb-3">Wat is de betekenis van?</p>
              <p className="text-2xl font-bold text-indigo-900">{q.card.front}</p>
            </div>

            {/* Antwoordopties */}
            <div className="grid grid-cols-1 gap-3">
              {q.options.map(option => {
                let style = 'bg-white border-indigo-100 text-indigo-800 hover:border-indigo-300 hover:shadow-sm'
                if (selected !== null) {
                  if (option === q.correct) style = 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  else if (option === selected) style = 'bg-red-50 border-red-300 text-red-600'
                  else style = 'bg-white border-indigo-100 text-indigo-300'
                }
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border text-sm font-medium transition-all ${style}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between text-xs text-indigo-300">
              <span>Score: {score} goed</span>
              <span>{questions.length - index - 1} vragen over</span>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
