'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { useGuest } from '@/lib/GuestContext'

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
  const { logGuestEvent } = useGuest()
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
  const [linkCopied, setLinkCopied] = useState(false)

  const shareUrl = 'https://myknowl.com'
  const shareMessage = 'Hé! Ik gebruik Knowl om bij te houden wat ik leer. Gratis en makkelijk — probeer het zelf ook: https://myknowl.com'

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
    logGuestEvent('share_click', { method: 'copy' })
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
    logGuestEvent('share_click', { method: 'whatsapp' })
  }

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
    if (!title.trim()) return
    const durationMin = duration ? Math.max(1, parseInt(duration) || 1) : null
    setMoments(prev => [{
      id: crypto.randomUUID(),
      title: title.trim(), description: description || null,
      category: category || null,
      learned_at: learnedAt,
      duration_minutes: durationMin,
    }, ...prev])
    setTitle(''); setDescription(''); setCategory(''); setDuration('')
    setLearnedAt(new Date().toISOString().split('T')[0])
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
    logGuestEvent('add_moment', { category: category || null, duration_minutes: durationMin })
  }

  function handleDelete(id: string) {
    setMoments(moments.filter(m => m.id !== id))
    setConfirmDeleteId(null)
    logGuestEvent('delete_moment')
  }

  function startEdit(moment: Moment) {
    setEditingId(moment.id)
    setEditData({ title: moment.title, description: moment.description ?? '', category: moment.category ?? '', learned_at: moment.learned_at, duration_minutes: moment.duration_minutes })
  }

  function handleSaveEdit(id: string) {
    if (!editData.title?.trim()) return
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
          <Link href="/login?signup=true" onClick={() => logGuestEvent('signup_click')}
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

        {/* Tell a friend */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-indigo-900 text-sm">Vind je Knowl handig?</p>
            <p className="text-xs text-indigo-400 mt-0.5">Deel het met een vriend — ook gratis, geen account nodig om te starten.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-[#20b857] active:scale-95 transition-all">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.555 4.118 1.528 5.845L0 24l6.335-1.508A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 01-5.001-1.37l-.36-.214-3.727.887.902-3.63-.235-.374A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all border ${linkCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
              {linkCopied ? '✓ Gekopieerd!' : 'Link kopiëren'}
            </button>
          </div>
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
                    <input type="number" min="1" value={editData.duration_minutes ?? ''} placeholder={d.minutes}
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
              <Link href="/login?signup=true" onClick={() => logGuestEvent('signup_click')}
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
