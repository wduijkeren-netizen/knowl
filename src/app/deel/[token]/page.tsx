import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function DeelPage({ params }: { params: { token: string } }) {
  const supabase = await createClient()

  const { data: moment } = await supabase
    .from('learning_moments')
    .select('title, description, category, learned_at, duration_minutes, photo_url')
    .eq('share_token', params.token)
    .eq('is_public', true)
    .single()

  if (!moment) notFound()

  return (
    <div className="min-h-screen bg-[#f8f7ff] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold text-indigo-700">Knowl</span>
          <p className="text-sm text-indigo-400 mt-1">Gedeeld leermoment</p>
        </div>

        <div className="bg-white rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-100/50 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
            <h1 className="text-xl font-bold text-white">{moment.title}</h1>
            <div className="flex gap-3 mt-2">
              {moment.category && (
                <span className="text-xs bg-white/20 text-white rounded-full px-2.5 py-1">{moment.category}</span>
              )}
              {moment.duration_minutes && (
                <span className="text-xs bg-white/20 text-white rounded-full px-2.5 py-1">{moment.duration_minutes} min</span>
              )}
              <span className="text-xs text-indigo-200">{moment.learned_at}</span>
            </div>
          </div>

          {moment.photo_url && (
            <img src={moment.photo_url} alt="Foto" className="w-full max-h-64 object-cover" />
          )}

          {moment.description && (
            <div className="p-6">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-2">Samenvatting</p>
              <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">{moment.description}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-indigo-300 mt-6">
          Gemaakt met Knowl — jouw persoonlijke leertracker
        </p>
      </div>
    </div>
  )
}
