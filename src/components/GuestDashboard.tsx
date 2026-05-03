'use client'

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'

type Moment = {
  id: string
  title: string
  description: string | null
  category: string | null
  learned_at: string
  duration_minutes: number | null
}

export default function GuestDashboard() {
  const [moments, setMoments] = useState<Moment[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [learnedAt, setLearnedAt] = useState(new Date().toISOString().split('T')[0])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setMoments([{
      id: crypto.randomUUID(),
      title,
      description: description || null,
      category: category || null,
      learned_at: learnedAt,
      duration_minutes: duration ? parseInt(duration) : null,
    }, ...moments])
    setTitle('')
    setDescription('')
    setCategory('')
    setDuration('')
    setLearnedAt(new Date().toISOString().split('T')[0])
  }

  function handleDelete(id: string) {
    setMoments(moments.filter(m => m.id !== id))
  }

  const totalMinutes = moments.reduce((sum, m) => sum + (m.duration_minutes ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Gastbanner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-start gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">Je gebruikt Knowl als gast</p>
            <p className="text-sm text-amber-600 mt-0.5">Alles wat je invult verdwijnt zodra je de pagina vernieuwt. <Link href="/login" className="underline font-medium hover:text-amber-800">Maak een gratis account aan</Link> om je data te bewaren.</p>
          </div>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Leermomenten</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{moments.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Minuten geleerd</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{totalMinutes}</p>
          </div>
        </div>

        {/* Formulier */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h2 className="font-semibold text-white">Nieuw leermoment</h2>
            <p className="text-indigo-200 text-sm mt-0.5">Wat heb je vandaag geleerd?</p>
          </div>
          <form onSubmit={handleAdd} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Titel</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="Wat heb je geleerd?"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Samenvatting <span className="text-gray-400 font-normal">(optioneel)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Vat samen wat je hebt geleerd..."
                rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Vak</label>
                <input value={category} onChange={e => setCategory(e.target.value)}
                  placeholder="bijv. Wiskunde"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Minuten</label>
                <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder="bijv. 45"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
                <input type="date" value={learnedAt} onChange={e => setLearnedAt(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm shadow-indigo-200">
              + Leermoment toevoegen
            </button>
          </form>
        </div>

        {/* Lijst */}
        <div className="space-y-3">
          <h2 className="font-semibold text-indigo-900">Leermomenten ({moments.length})</h2>
          {moments.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
              <p className="text-indigo-300 text-sm">Nog geen leermomenten. Voeg je eerste toe!</p>
            </div>
          )}
          {moments.map(moment => (
            <div key={moment.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm p-5">
              <div className="flex justify-between items-start gap-4">
                <h3 className="font-semibold text-indigo-900">{moment.title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-indigo-300">{moment.learned_at}</span>
                  <button onClick={() => handleDelete(moment.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">Verwijderen</button>
                </div>
              </div>
              {moment.description && (
                <div className="mt-3 bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">Samenvatting</p>
                  <p className="text-sm text-indigo-800 leading-relaxed">{moment.description}</p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                {moment.category && <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">{moment.category}</span>}
                {moment.duration_minutes && <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2.5 py-0.5 font-medium">{moment.duration_minutes} min</span>}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
