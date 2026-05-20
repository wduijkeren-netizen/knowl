import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: { userId: string } }) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('voornaam')
    .eq('id', params.userId)
    .maybeSingle()
  const name = profile?.voornaam ?? 'Een student'
  return {
    title: `Studielogboek van ${name} — Knowl`,
    description: `Bekijk de studievoortgang van ${name}. Gemaakt met Knowl, de gratis leertracker voor studenten.`,
  }
}

export default async function StudielogboekPage({ params, searchParams }: {
  params: { userId: string }
  searchParams: { week?: string }
}) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('voornaam')
    .eq('id', params.userId)
    .maybeSingle()

  const weekStart = searchParams.week ?? new Date().toISOString().slice(0, 10)
  const weekDate = new Date(weekStart)
  const monday = new Date(weekDate)
  monday.setDate(weekDate.getDate() - ((weekDate.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const monStr = monday.toISOString().slice(0, 10)
  const sunStr = sunday.toISOString().slice(0, 10)

  const { data: moments } = await supabase
    .from('learning_moments')
    .select('id, title, description, category, learned_at, duration_minutes')
    .eq('user_id', params.userId)
    .eq('is_public', true)
    .gte('learned_at', monStr)
    .lte('learned_at', sunStr)
    .order('learned_at', { ascending: true })

  if (!moments) notFound()

  const totalMin = moments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const name = profile?.voornaam ?? 'Een student'

  const fmt = (d: Date) => `${d.getDate()} ${['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'][d.getMonth()]}`
  const weekLabel = `${fmt(monday)} – ${fmt(sunday)}`

  const byDay: Record<string, typeof moments> = {}
  for (const m of moments) {
    if (!byDay[m.learned_at]) byDay[m.learned_at] = []
    byDay[m.learned_at].push(m)
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <header className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-lg font-bold text-indigo-700 tracking-tight">Knowl</span>
          <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">
            Probeer zelf →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 text-white">
          <p className="text-indigo-200 text-sm font-medium uppercase tracking-widest mb-1">Studielogboek</p>
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className="text-indigo-200 mt-1">{weekLabel}</p>
          <div className="flex gap-6 mt-4">
            <div>
              <p className="text-3xl font-bold">{moments.length}</p>
              <p className="text-indigo-200 text-sm">leermomenten</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{Math.round(totalMin / 60 * 10) / 10}</p>
              <p className="text-indigo-200 text-sm">uur gestudeerd</p>
            </div>
          </div>
        </div>

        {Object.keys(byDay).length === 0 ? (
          <div className="bg-white rounded-2xl border border-indigo-100 p-10 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-indigo-400">Geen publieke leermomenten deze week.</p>
          </div>
        ) : (
          Object.entries(byDay).map(([date, dayMoments]) => {
            const d = new Date(date + 'T12:00:00')
            const dayLabel = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
            return (
              <div key={date} className="space-y-2">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide px-1">{dayLabel}</p>
                {dayMoments.map(m => (
                  <div key={m.id} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold text-indigo-900 leading-tight">{m.title}</p>
                      {m.duration_minutes && (
                        <span className="text-xs bg-indigo-50 text-indigo-500 rounded-full px-2.5 py-1 shrink-0 font-medium">{m.duration_minutes} min</span>
                      )}
                    </div>
                    {m.category && <p className="text-xs text-indigo-400 mt-1">{m.category}</p>}
                    {m.description && <p className="text-sm text-gray-500 mt-2 leading-relaxed">{m.description}</p>}
                  </div>
                ))}
              </div>
            )
          })
        )}

        <div className="text-center py-4">
          <p className="text-sm text-indigo-300">Gemaakt met Knowl — gratis leertracker voor studenten</p>
          <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium mt-1 inline-block">
            Probeer Knowl gratis →
          </Link>
        </div>
      </main>
    </div>
  )
}
