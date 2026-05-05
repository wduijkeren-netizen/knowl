'use client'

import { useState, useEffect } from 'react'
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

const STORAGE_KEY = 'knowl_guest_moments'

export default function GuestDashboard() {
  const [moments, setMoments] = useState<Moment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [learnedAt, setLearnedAt] = useState(new Date().toISOString().split('T')[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Moment>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setMoments(JSON.parse(saved))
    } catch {}
    setLoaded(true)
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(moments))
    } catch {}
  }, [moments, loaded])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setMoments(prev => [{
      id: crypto.randomUUID(),
      title,
      description: description || null,
      category: category || null,
      learned_at: learnedAt,
      duration_minutes: duration ? parseInt(duration) : null,
    }, ...prev])
    setTitle('')
    setDescription('')
    setCategory('')
    setDuration('')
    setLearnedAt(new Date().toISOString().split('T')[0])
  }

  function handleDelete(id: string) {
    setMoments(moments.filter(m => m.id !== id))
    setConfirmDeleteId(null)
  }

  function startEdit(moment: Moment) {
    setEditingId(moment.id)
    setEditData({ title: moment.title, description: moment.description ?? '', category: moment.category ?? '', learned_at: moment.learned_at, duration_minutes: moment.duration_minutes })
  }

  function handleSaveEdit(id: string) {
    setMoments(moments.map(m => m.id === id ? { ...m, ...editData } as Moment : m))
    setEditingId(null)
  }

  const totalMinutes = moments.reduce((sum, m) => sum + (m.duration_minutes ?? 0), 0)
  const filtered = search
    ? moments.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.description?.toLowerCase().includes(search.toLowerCase()))
    : moments

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Account-prompt — alleen tonen als ze al iets hebben ingevuld */}
        {moments.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 flex justify-between items-center gap-4">
            <p className="text-sm text-indigo-600">
              Je hebt {moments.length} {moments.length === 1 ? 'moment' : 'momenten'} opgeslagen in je browser.{' '}
              <Link href="/login?signup=true" className="font-semibold underline hover:text-indigo-800">
                Maak een gratis account aan
              </Link>{' '}
              om ze permanent te bewaren.
            </p>
          </div>
        )}

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
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-indigo-900">Leermomenten ({moments.length})</h2>
          </div>

          {moments.length > 0 && (
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Zoeken..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
          )}

          {moments.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
              <p className="text-indigo-300 text-sm">Nog geen leermomenten. Voeg je eerste toe!</p>
              <p className="text-indigo-200 text-xs mt-2">Je data wordt opgeslagen in je browser — ook na vernieuwen.</p>
            </div>
          )}

          {filtered.map(moment => (
            <div key={moment.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm p-5">
              {editingId === moment.id ? (
                <div className="space-y-3">
                  <input value={editData.title ?? ''} onChange={e => setEditData({ ...editData, title: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <textarea value={editData.description ?? ''} onChange={e => setEditData({ ...editData, description: e.target.value })}
                    rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                  <div className="grid grid-cols-3 gap-2">
                    <input value={editData.category ?? ''} onChange={e => setEditData({ ...editData, category: e.target.value })}
                      placeholder="Vak" className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="number" value={editData.duration_minutes ?? ''} placeholder="Min"
                      onChange={e => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) || null })}
                      className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="date" value={editData.learned_at ?? ''}
                      onChange={e => setEditData({ ...editData, learned_at: e.target.value })}
                      className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(moment.id)}
                      className="text-sm bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 transition-colors font-medium">Opslaan</button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">Annuleren</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-indigo-900">{moment.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-indigo-300">{moment.learned_at}</span>
                      <button onClick={() => startEdit(moment)} className="text-xs text-gray-300 hover:text-indigo-500 transition-colors">Wijzigen</button>
                      {confirmDeleteId === moment.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => handleDelete(moment.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Ja</button>
                          <span className="text-xs text-gray-300">·</span>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600">Nee</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(moment.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">Verwijderen</button>
                      )}
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
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
