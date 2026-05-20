import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { token: string } }) {
  const supabase = await createClient()
  const { data: note } = await supabase
    .from('notes')
    .select('title, content, subject')
    .eq('share_token', params.token)
    .eq('is_public', true)
    .maybeSingle()
  if (!note) return { title: 'Notitie — Knowl' }
  const plainText = note.content?.replace(/<[^>]*>/g, '').trim().slice(0, 160)
  return {
    title: `${note.title || 'Naamloze notitie'} — Knowl`,
    description: plainText || `Bekijk deze notitie${note.subject ? ` over ${note.subject}` : ''} gedeeld via Knowl.`,
  }
}

export default async function GedeeldeNotitie({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  const { data: note } = await supabase
    .from('notes')
    .select('id, title, content, subject, updated_at')
    .eq('share_token', params.token)
    .eq('is_public', true)
    .maybeSingle()

  if (!note) notFound()

  const wordCount = note.content?.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length ?? 0
  const dateStr = new Date(note.updated_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-lg font-bold text-indigo-700 tracking-tight">Knowl</span>
          <Link href="/login?signup=true" className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            Gratis account →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6">
            {note.subject && (
              <span className="inline-block text-xs bg-white/20 text-white rounded-full px-3 py-1 mb-3 font-medium">{note.subject}</span>
            )}
            <h1 className="text-2xl font-bold text-white">{note.title || 'Naamloze notitie'}</h1>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs text-indigo-200">{dateStr}</span>
              <span className="text-xs text-indigo-200">{wordCount} woorden</span>
            </div>
          </div>

          <div className="px-8 py-7 notes-editor">
            {note.content ? (
              <div dangerouslySetInnerHTML={{ __html: note.content }} />
            ) : (
              <p className="text-indigo-300 italic text-sm">Geen inhoud.</p>
            )}
          </div>
        </div>

        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-indigo-400">Gedeeld via Knowl — gratis leertracker voor studenten</p>
          <Link href="/login?signup=true"
            className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors">
            Maak jouw eigen notities →
          </Link>
        </div>
      </main>
    </div>
  )
}
