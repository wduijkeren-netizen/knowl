import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

function renderMarkdown(text: string): string {
  if (!text.trim()) return '<p style="color:#a5b4fc;font-style:italic">Lege notitie</p>'
  const lines = text.split('\n')
  let html = ''
  let inUl = false
  let inOl = false

  const inline = (s: string) =>
    s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:#eef2ff;color:#4f46e5;padding:1px 4px;border-radius:4px;font-size:0.85em">$1</code>')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.match(/^[-*] /) && inUl) { html += '</ul>'; inUl = false }
    if (!trimmed.match(/^\d+\. /) && inOl) { html += '</ol>'; inOl = false }

    if (trimmed.startsWith('### ')) {
      html += `<h3 style="font-size:1rem;font-weight:700;color:#3730a3;margin:1rem 0 0.25rem">${inline(trimmed.slice(4))}</h3>`
    } else if (trimmed.startsWith('## ')) {
      html += `<h2 style="font-size:1.1rem;font-weight:700;color:#312e81;margin:1.25rem 0 0.4rem">${inline(trimmed.slice(3))}</h2>`
    } else if (trimmed.startsWith('# ')) {
      html += `<h1 style="font-size:1.3rem;font-weight:800;color:#1e1b4b;margin:1.5rem 0 0.5rem">${inline(trimmed.slice(2))}</h1>`
    } else if (trimmed.startsWith('> ')) {
      html += `<blockquote style="border-left:4px solid #a5b4fc;padding-left:12px;color:#6366f1;font-style:italic;margin:8px 0">${inline(trimmed.slice(2))}</blockquote>`
    } else if (trimmed.match(/^[-*] /)) {
      if (!inUl) { html += '<ul style="list-style:disc;padding-left:1.5rem;margin:8px 0">'; inUl = true }
      html += `<li style="margin:2px 0;color:#3730a3">${inline(trimmed.slice(2))}</li>`
    } else if (trimmed.match(/^\d+\. /)) {
      if (!inOl) { html += '<ol style="list-style:decimal;padding-left:1.5rem;margin:8px 0">'; inOl = true }
      html += `<li style="margin:2px 0;color:#3730a3">${inline(trimmed.replace(/^\d+\. /, ''))}</li>`
    } else if (!trimmed) {
      html += '<div style="height:8px"></div>'
    } else {
      html += `<p style="color:#3730a3;line-height:1.7;margin:4px 0">${inline(trimmed)}</p>`
    }
  }
  if (inUl) html += '</ul>'
  if (inOl) html += '</ol>'
  return html
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

  const wordCount = note.content?.trim() ? note.content.trim().split(/\s+/).length : 0
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
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                {note.subject && (
                  <span className="inline-block text-xs bg-white/20 text-white rounded-full px-3 py-1 mb-3 font-medium">{note.subject}</span>
                )}
                <h1 className="text-2xl font-bold text-white">{note.title || 'Naamloze notitie'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs text-indigo-200">{dateStr}</span>
              <span className="text-xs text-indigo-200">{wordCount} woorden</span>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-7">
            {note.content ? (
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(note.content) }}
              />
            ) : (
              <p className="text-indigo-300 italic text-sm">Geen inhoud.</p>
            )}
          </div>
        </div>

        {/* CTA */}
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
