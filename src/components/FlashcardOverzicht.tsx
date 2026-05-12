'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Set = { id: string; title: string; vak: string | null; created_at: string }

type Props = {
  sets: Set[]
  countMap: Record<string, number>
}

export default function FlashcardOverzicht({ sets, countMap }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete(id: string) {
    if (!confirm('Set verwijderen? Dit kan niet ongedaan worden.')) return
    await supabase.from('flashcard_sets').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">Flashcards</h1>
            <p className="text-sm text-indigo-400 mt-0.5">Leer woorden, begrippen en meer</p>
          </div>
          <Link href="/flashcards/nieuw"
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm shadow-indigo-200">
            + Nieuwe set
          </Link>
        </div>

        {sets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center">
            <p className="text-4xl mb-3">🃏</p>
            <p className="font-semibold text-indigo-900 mb-1">Nog geen flashcard-sets</p>
            <p className="text-sm text-indigo-400 mb-5">Maak je eerste set aan en importeer woorden of begrippen.</p>
            <Link href="/flashcards/nieuw"
              className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Eerste set aanmaken
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {sets.map(set => (
              <div key={set.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h2 className="font-semibold text-indigo-900">{set.title}</h2>
                    <div className="flex gap-2 mt-1.5">
                      {set.vak && <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">{set.vak}</span>}
                      <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2.5 py-0.5 font-medium">
                        {countMap[set.id] ?? 0} kaarten
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/flashcards/${set.id}`}
                      className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                      Studeren
                    </Link>
                    {(countMap[set.id] ?? 0) >= 2 && (
                      <Link href={`/flashcards/${set.id}/quiz`}
                        className="text-sm bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-200 transition-colors">
                        Quiz
                      </Link>
                    )}
                    <button onClick={() => handleDelete(set.id)}
                      className="text-sm text-gray-300 hover:text-red-400 transition-colors px-1">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
