'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Set = { id: string; title: string; vak: string | null; created_at: string; share_token: string; is_public: boolean; edit_token?: string }

type Props = {
  sets: Set[]
  countMap: Record<string, number>
  dueMap: Record<string, number>
  memberSets: Set[]
}

function getProgress(setId: string): number {
  try {
    const raw = localStorage.getItem(`knowl_fc_progress_${setId}`)
    if (!raw) return -1
    const { known, total } = JSON.parse(raw)
    return total > 0 ? Math.round((known / total) * 100) : 0
  } catch { return -1 }
}

export default function FlashcardOverzicht({ sets: initialSets, countMap, dueMap, memberSets }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [sets, setSets] = useState(initialSets)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [inviteCopiedId, setInviteCopiedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const map: Record<string, number> = {}
    for (const s of initialSets) map[s.id] = getProgress(s.id)
    setProgress(map)
  }, [initialSets])

  async function handleDelete(id: string) {
    if (!confirm('Set verwijderen? Dit kan niet ongedaan worden.')) return
    await supabase.from('flashcard_sets').delete().eq('id', id)
    router.refresh()
  }

  async function handleShare(set: Set) {
    const isPublic = !set.is_public
    const { data } = await supabase.from('flashcard_sets').update({ is_public: isPublic }).eq('id', set.id).select().single()
    if (!data) return
    setSets(s => s.map(x => x.id === set.id ? { ...x, is_public: isPublic } : x))
    if (isPublic) {
      await navigator.clipboard.writeText(`${window.location.origin}/flashcards/deel/${set.share_token}`)
      setCopiedId(set.id)
      setTimeout(() => setCopiedId(null), 3000)
    }
  }

  const filtered = sets.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.vak ?? '').toLowerCase().includes(search.toLowerCase())
  )

  // Groepeer per vak
  const groups: Record<string, Set[]> = {}
  for (const s of filtered) {
    const key = s.vak ?? '— Geen vak'
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }
  const groupKeys = Object.keys(groups).sort((a, b) => a === '— Geen vak' ? 1 : b === '— Geen vak' ? -1 : a.localeCompare(b))

  function renderSet(set: Set) {
    const pct = progress[set.id] ?? -1
    return (
      <div key={set.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-indigo-900">{set.title}</h2>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2.5 py-0.5 font-medium">{countMap[set.id] ?? 0} kaarten</span>
              {(dueMap[set.id] ?? 0) > 0 && (
                <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2.5 py-0.5 font-medium">
                  {dueMap[set.id]} te herhalen
                </span>
              )}
              {set.is_public && <span className="text-xs bg-emerald-50 text-emerald-600 rounded-full px-2.5 py-0.5 font-medium">Gedeeld</span>}
            </div>
            {pct >= 0 && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-indigo-400">Voortgang</span>
                  <span className="text-xs font-semibold text-indigo-600">{pct}%</span>
                </div>
                <div className="w-full bg-indigo-100 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            {(dueMap[set.id] ?? 0) > 0 && (
              <Link href={`/flashcards/${set.id}/herhalen`} className="text-sm bg-amber-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-amber-600 transition-colors">
                Herhalen
              </Link>
            )}
            <Link href={`/flashcards/${set.id}`} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">Studeren</Link>
            {(countMap[set.id] ?? 0) >= 2 && (
              <Link href={`/flashcards/${set.id}/quiz`} className="text-sm bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-200 transition-colors">Quiz</Link>
            )}
            <button onClick={() => handleShare(set)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${set.is_public ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {copiedId === set.id ? 'Gekopieerd!' : set.is_public ? 'Gedeeld ✓' : 'Delen'}
            </button>
            {set.edit_token && (
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(`${window.location.origin}/flashcards/lid-worden/${set.edit_token}`)
                  setInviteCopiedId(set.id)
                  setTimeout(() => setInviteCopiedId(null), 3000)
                }}
                className="text-sm bg-indigo-50 text-indigo-500 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors">
                {inviteCopiedId === set.id ? 'Link gekopieerd!' : 'Uitnodigen'}
              </button>
            )}
            <button onClick={() => handleDelete(set.id)} className="text-sm text-gray-300 hover:text-red-400 transition-colors px-1">✕</button>
          </div>
        </div>
      </div>
    )
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

        {sets.length > 0 && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek op naam of vak..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
        )}

        {sets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center">
            <p className="text-4xl mb-3">🃏</p>
            <p className="font-semibold text-indigo-900 mb-1">Nog geen flashcard-sets</p>
            <p className="text-sm text-indigo-400 mb-5">Maak je eerste set aan en importeer woorden of begrippen.</p>
            <Link href="/flashcards/nieuw" className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">Eerste set aanmaken</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
            <p className="text-indigo-300 text-sm">Geen sets gevonden voor &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupKeys.map(key => (
              <div key={key}>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2 px-1">{key}</p>
                <div className="grid gap-3">{groups[key].map(renderSet)}</div>
              </div>
            ))}
          </div>
        )}
        {memberSets.length > 0 && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2 px-1">Gedeeld met mij</p>
              <div className="grid gap-3">
                {memberSets.map(set => (
                  <div key={set.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm p-5">
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <h2 className="font-semibold text-indigo-900">{set.title}</h2>
                        {set.vak && <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium mt-1.5 inline-block">{set.vak}</span>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/flashcards/${set.id}`} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                          Studeren
                        </Link>
                        {(countMap[set.id] ?? 0) >= 2 && (
                          <Link href={`/flashcards/${set.id}/quiz`} className="text-sm bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg font-medium hover:bg-violet-200 transition-colors">
                            Quiz
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
