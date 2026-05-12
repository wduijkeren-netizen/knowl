'use client'

import Link from 'next/link'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Web = { id: string; title: string; vak: string | null; created_at: string }
type Props = { webs: Web[] }

export default function WoordwebOverzicht({ webs }: Props) {
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete(id: string) {
    if (!confirm('Woordweb verwijderen?')) return
    await supabase.from('word_webs').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">Woordwebben</h1>
            <p className="text-sm text-indigo-400 mt-0.5">Verbind begrippen visueel met elkaar</p>
          </div>
          <Link href="/woordweb/nieuw"
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm shadow-indigo-200">
            + Nieuw web
          </Link>
        </div>

        {webs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-12 text-center">
            <p className="text-4xl mb-3">🕸️</p>
            <p className="font-semibold text-indigo-900 mb-1">Nog geen woordwebben</p>
            <p className="text-sm text-indigo-400 mb-5">Maak een woordweb om begrippen visueel te verbinden.</p>
            <Link href="/woordweb/nieuw"
              className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
              Eerste web aanmaken
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {webs.map(web => (
              <div key={web.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <h2 className="font-semibold text-indigo-900">{web.title}</h2>
                    {web.vak && <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium mt-1.5 inline-block">{web.vak}</span>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/woordweb/${web.id}`}
                      className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                      Openen
                    </Link>
                    <button onClick={() => handleDelete(web.id)}
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
