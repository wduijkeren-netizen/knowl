'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Web = { id: string; title: string; vak: string | null; created_at: string }
type Props = { webs: Web[] }

export default function WoordwebOverzicht({ webs }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { tr } = useLanguage()
  const ww = tr.woordweb
  const [search, setSearch] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    await supabase.from('word_webs').delete().eq('id', id)
    setConfirmId(null)
    router.refresh()
  }

  const filtered = webs.filter(w =>
    w.title.toLowerCase().includes(search.toLowerCase()) ||
    (w.vak ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const groups: Record<string, Web[]> = {}
  for (const w of filtered) {
    const key = w.vak ?? ww.noVak
    if (!groups[key]) groups[key] = []
    groups[key].push(w)
  }
  const groupKeys = Object.keys(groups).sort((a, b) => a === ww.noVak ? 1 : b === ww.noVak ? -1 : a.localeCompare(b))

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      {confirmId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
            <h2 className="text-lg font-bold text-indigo-900">{ww.deleteTitle}</h2>
            <p className="text-sm text-gray-400">{ww.deleteBody}</p>
            <div className="flex gap-3 justify-center pt-2">
              <button onClick={() => setConfirmId(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors">
                {ww.cancel}
              </button>
              <button onClick={() => handleDelete(confirmId)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
                {ww.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-indigo-900">{ww.title}</h1><PageInfo text="Maak een visuele kaart van begrippen die met elkaar verbonden zijn. Handig voor het samenvatten van een hoofdstuk of het begrijpen van verbanden." /></div>
            <p className="text-sm text-indigo-400 mt-0.5">{ww.subtitle}</p>
          </div>
          <Link href="/woordweb/nieuw"
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm shadow-indigo-200">
            {ww.newWeb}
          </Link>
        </div>

        {webs.length > 0 && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={ww.searchPlaceholder}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
        )}

        {webs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center">
            <p className="text-4xl mb-3">🕸️</p>
            <p className="font-semibold text-indigo-900 mb-1">{ww.emptyTitle}</p>
            <p className="text-sm text-indigo-400 mb-5">{ww.emptyBody}</p>
            <Link href="/woordweb/nieuw" className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">{ww.emptyBtn}</Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
            <p className="text-indigo-300 text-sm">{ww.searchNoResults} &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupKeys.map(key => (
              <div key={key}>
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2 px-1">{key}</p>
                <div className="grid gap-3">
                  {groups[key].map(web => (
                    <div key={web.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5">
                      <div className="flex justify-between items-center gap-4">
                        <h2 className="font-semibold text-indigo-900">{web.title}</h2>
                        <div className="flex gap-2 shrink-0">
                          <Link href={`/woordweb/${web.id}`} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">{ww.open}</Link>
                          <button onClick={() => setConfirmId(web.id)} className="text-sm text-gray-300 hover:text-red-400 transition-colors px-1">✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
