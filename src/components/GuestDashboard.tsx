'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
  const { tr } = useLanguage()
  const g = tr.guest
  const d = tr.dashboard
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
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setMoments(JSON.parse(saved))
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(moments)) } catch {}
  }, [moments, loaded])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setMoments(prev => [{
      id: crypto.randomUUID(),
      title, description: description || null,
      category: category || null,
      learned_at: learnedAt,
      duration_minutes: duration ? parseInt(duration) : null,
    }, ...prev])
    setTitle(''); setDescription(''); setCategory(''); setDuration('')
    setLearnedAt(new Date().toISOString().split('T')[0])
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
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
  const totalHours = Math.floor(totalMinutes / 60)
  const filtered = search
    ? moments.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || (m.description ?? '').toLowerCase().includes(search.toLowerCase()))
    : moments

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      {/* Preview banner — altijd zichtbaar */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0">VOORBEELD</span>
            <p className="text-sm text-indigo-100">{d.guestBanner}</p>
          </div>
          <Link href="/login?signup=true"
            className="shrink-0 bg-white text-indigo-700 px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-indigo-50 active:scale-95 transition-all whitespace-nowrap">
            {d.guestBannerBtn}
          </Link>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Statistieken — zelfde als echte dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{d.momentsCount}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{moments.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{d.minutesLearned}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{totalMinutes}<span className="text-xl text-indigo-300">m</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 col-span-2 md:col-span-1">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{d.inHours}</p>
            <p className="text-4xl font-bold text-indigo-700 mt-2">{totalHours}<span className="text-xl text-indigo-300">u</span></p>
          </div>
        </div>

        {/* Snelkoppelingen — zelfde sfeer als echte HomePage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/resultaten', label: tr.nav.results, icon: '📊' },
            { href: '/pomodoro', label: tr.nav.timer, icon: '⏱️' },
            { href: '/flashcards', label: tr.nav.flashcards ?? 'Flashcards', icon: '🃏' },
            { href: '/login?signup=true', label: tr.nav.loginBtn, icon: '👤' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all text-center">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs font-semibold text-indigo-700">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Formulier — identiek aan echte dashboard */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h2 className="font-semibold text-white">{d.newMoment}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{d.newMomentSub}</p>
          </div>
          <form onSubmit={handleAdd} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{d.title}</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                placeholder={d.titlePlaceholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{d.summary} <span className="text-gray-400 font-normal">{d.summaryOptional}</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder={d.summaryPlaceholder}
                rows={3} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{d.subject}</label>
                <input value={category} onChange={e => setCategory(e.target.value)}
                  placeholder={d.chooseSubject}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{d.minutes}</label>
                <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder={d.minutesPlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{d.date}</label>
                <input type="date" value={learnedAt} onChange={e => setLearnedAt(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-emerald-500 text-lg shrink-0">✓</span>
                <p className="text-sm text-emerald-700 font-medium">{d.saved}</p>
              </div>
            )}

            <button type="submit"
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all shadow-sm shadow-indigo-200">
              {d.add}
            </button>
          </form>
        </div>

        {/* Lijst */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-indigo-900">{d.recent} ({moments.length})</h2>
          </div>

          {moments.length > 0 && (
            <div className="relative">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={d.search}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}

          {moments.length === 0 && (
            <div className="bg-white rounded-2xl border border-indigo-100 p-10 text-center space-y-2">
              <p className="text-5xl">🌱</p>
              <p className="text-indigo-900 font-semibold">{d.empty}</p>
              <p className="text-indigo-400 text-sm">Vul het formulier hierboven in — het duurt 30 seconden.</p>
            </div>
          )}

          {filtered.map(moment => (
            <div key={moment.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md hover:border-indigo-100 hover:-translate-y-0.5 transition-all p-5">
              {editingId === moment.id ? (
                <div className="space-y-3">
                  <input value={editData.title ?? ''} onChange={e => setEditData({ ...editData, title: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <textarea value={editData.description ?? ''} onChange={e => setEditData({ ...editData, description: e.target.value })}
                    rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                  <div className="grid grid-cols-3 gap-2">
                    <input value={editData.category ?? ''} onChange={e => setEditData({ ...editData, category: e.target.value })}
                      placeholder={d.subject} className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="number" value={editData.duration_minutes ?? ''} placeholder={d.minutes}
                      onChange={e => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) || null })}
                      className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input type="date" value={editData.learned_at ?? ''}
                      onChange={e => setEditData({ ...editData, learned_at: e.target.value })}
                      className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(moment.id)}
                      className="text-sm bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 transition-colors font-medium">{g.save}</button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">{g.cancel}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-semibold text-indigo-900">{moment.title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-indigo-300">{moment.learned_at}</span>
                      <button onClick={() => startEdit(moment)} className="text-xs text-gray-300 hover:text-indigo-500 transition-colors">{d.edit}</button>
                      {confirmDeleteId === moment.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => handleDelete(moment.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">{d.confirmYes}</button>
                          <span className="text-xs text-gray-300">·</span>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600">{d.confirmNo}</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(moment.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">{g.delete}</button>
                      )}
                    </div>
                  </div>
                  {moment.description && (
                    <div className="mt-3 bg-indigo-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">{g.summary}</p>
                      <p className="text-sm text-indigo-800 leading-relaxed">{moment.description}</p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    {moment.category && <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">{moment.category}</span>}
                    {moment.duration_minutes && <span className="text-xs bg-violet-50 text-violet-600 rounded-full px-2.5 py-0.5 font-medium">{moment.duration_minutes} min</span>}
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Onderaan CTA als ze al momenten hebben */}
          {moments.length >= 2 && (
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-5 text-white text-center">
              <p className="font-bold text-base">{d.guestBannerBtn} →</p>
              <p className="text-indigo-200 text-xs mt-1 mb-4">{d.guestBannerSub}</p>
              <Link href="/login?signup=true"
                className="inline-block bg-white text-indigo-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-50 active:scale-95 transition-all">
                {d.guestBannerBtn}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
