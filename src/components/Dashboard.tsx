'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Nav from '@/components/Nav'
import type { User } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Moment = {
  id: string
  title: string
  description: string | null
  category: string | null
  learned_at: string
  duration_minutes: number | null
  photo_url: string | null
  is_public: boolean
  share_token: string
}

type Subject = { id: string; name: string }

type Props = {
  user: User
  moments: Moment[]
  subjects: Subject[]
  spacedMoment: Moment | null
}

const RATINGS_KEY = 'knowl_ratings'

function getRatings(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) ?? '{}') } catch { return {} }
}
function saveRating(id: string, stars: number) {
  const r = getRatings()
  r[id] = stars
  try { localStorage.setItem(RATINGS_KEY, JSON.stringify(r)) } catch {}
}

function exportCsv(moments: Moment[], ratings: Record<string, number>) {
  const header = ['Datum', 'Titel', 'Vak', 'Minuten', 'Beoordeling (1-5)', 'Samenvatting']
  const rows = moments.map(m => [
    m.learned_at,
    `"${(m.title ?? '').replace(/"/g, '""')}"`,
    m.category ?? '',
    m.duration_minutes ?? '',
    ratings[m.id] ?? '',
    `"${(m.description ?? '').replace(/"/g, '""')}"`,
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `knowl-leermomenten-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Dashboard({ user, moments: initialMoments, subjects, spacedMoment }: Props) {
  const { tr } = useLanguage()
  const d = tr.dashboard
  const r = tr.rating
  const h = tr.home
  const [moments, setMoments] = useState(initialMoments)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [learnedAt, setLearnedAt] = useState(new Date().toISOString().split('T')[0])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Moment>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const spacedKey = spacedMoment ? `knowl_spaced_dismissed_${spacedMoment.id}` : null
  const [showSpaced, setShowSpaced] = useState(false)
  useState(() => {
    if (!spacedKey) return
    try { if (!localStorage.getItem(spacedKey)) setShowSpaced(true) } catch {}
  })
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [duplicateSuccess, setDuplicateSuccess] = useState(false)

  // Rating modal state
  const [ratingMomentId, setRatingMomentId] = useState<string | null>(null)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingSaved, setRatingSaved] = useState(false)
  const [ratings, setRatings] = useState<Record<string, number>>(getRatings)

  const supabase = createClient()

  async function uploadPhoto(file: File, userId: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('moment-photos').upload(path, file)
    if (error) return null
    const { data } = supabase.storage.from('moment-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    let photo_url: string | null = null
    if (photoFile) photo_url = await uploadPhoto(photoFile, user.id)

    const { data, error } = await supabase
      .from('learning_moments')
      .insert({
        id: crypto.randomUUID(),
        title,
        description: description || null,
        category: category || null,
        learned_at: learnedAt,
        duration_minutes: duration ? parseInt(duration) : null,
        user_id: user.id,
        photo_url,
      })
      .select()
      .single()

    if (error) {
      setError(d.saveError + error.message)
    } else if (data) {
      setMoments([data, ...moments])
      setTitle('')
      setDescription('')
      setCategory('')
      setDuration('')
      setLearnedAt(new Date().toISOString().split('T')[0])
      setPhotoFile(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      // Show rating modal
      setRatingMomentId(data.id)
      setRatingSaved(false)
      setRatingHover(0)
    }
    setLoading(false)
  }

  function handleRate(stars: number) {
    if (!ratingMomentId) return
    saveRating(ratingMomentId, stars)
    setRatings(getRatings())
    setRatingSaved(true)
    setTimeout(() => { setRatingMomentId(null); setRatingSaved(false) }, 1200)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('learning_moments').delete().eq('id', id)
    if (error) alert(d.deleteError + error.message)
    else { setMoments(moments.filter(m => m.id !== id)); setConfirmDeleteId(null) }
  }

  function startEdit(moment: Moment) {
    setEditingId(moment.id)
    setEditData({
      title: moment.title,
      description: moment.description ?? '',
      category: moment.category ?? '',
      learned_at: moment.learned_at,
      duration_minutes: moment.duration_minutes,
    })
  }

  async function handleSaveEdit(id: string) {
    const { data, error } = await supabase
      .from('learning_moments')
      .update({
        title: editData.title,
        description: editData.description || null,
        category: editData.category || null,
        learned_at: editData.learned_at,
        duration_minutes: editData.duration_minutes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (!error && data) {
      setMoments(moments.map(m => m.id === id ? data : m))
      setEditingId(null)
    }
  }

  function duplicateMoment(moment: Moment) {
    setTitle(moment.title)
    setDescription(moment.description ?? '')
    setCategory(moment.category ?? '')
    setDuration(moment.duration_minutes ? String(moment.duration_minutes) : '')
    setLearnedAt(new Date().toISOString().split('T')[0])
    setDuplicateSuccess(true)
    setTimeout(() => setDuplicateSuccess(false), 3000)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleShare(moment: Moment) {
    const isPublic = !moment.is_public
    const { data } = await supabase
      .from('learning_moments')
      .update({ is_public: isPublic })
      .eq('id', moment.id)
      .select()
      .single()

    if (data) {
      setMoments(moments.map(m => m.id === moment.id ? data : m))
      if (isPublic) {
        const url = `${window.location.origin}/deel/${moment.share_token}`
        await navigator.clipboard.writeText(url)
        setCopiedId(moment.id)
        setTimeout(() => setCopiedId(null), 3000)
      }
    }
  }

  const totalMinutes = moments.reduce((sum, m) => sum + (m.duration_minutes ?? 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)

  const starLabels = r.labels

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      {/* Rating modal */}
      {ratingMomentId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center space-y-5">
            <div className="text-5xl mb-1">🎉</div>
            <h2 className="text-xl font-bold text-indigo-900">{r.title}</h2>
            <p className="text-sm text-indigo-500">{r.question}</p>

            {ratingSaved ? (
              <p className="text-emerald-500 font-semibold py-4">{r.saved} ✓</p>
            ) : (
              <>
                <div
                  className="flex justify-center gap-1 py-2 px-2"
                  onMouseLeave={() => setRatingHover(0)}
                >
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onMouseEnter={() => setRatingHover(star)}
                      onClick={() => handleRate(star)}
                      className="text-4xl px-1 transition-transform hover:scale-125 focus:outline-none leading-none"
                    >
                      {star <= ratingHover ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
                {ratingHover > 0 && (
                  <p className="text-xs text-indigo-400 -mt-2 text-center">{starLabels[ratingHover - 1]}</p>
                )}
                <button
                  onClick={() => setRatingMomentId(null)}
                  className="text-sm text-indigo-300 hover:text-indigo-500 transition-colors">
                  {r.skip}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Spaced repetition kaart */}
        {showSpaced && spacedMoment && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">{d.spacedTitle}</p>
                <p className="text-sm font-medium text-amber-900">{d.spacedSub} {spacedMoment.learned_at}:</p>
                <p className="font-bold text-amber-800 mt-1">{spacedMoment.title}</p>
                {spacedMoment.description && (
                  <p className="text-sm text-amber-700 mt-2 line-clamp-2">{spacedMoment.description}</p>
                )}
              </div>
              <button onClick={() => {
                setShowSpaced(false)
                if (spacedKey) try { localStorage.setItem(spacedKey, '1') } catch {}
              }} className="text-amber-400 hover:text-amber-600 text-lg ml-4">×</button>
            </div>
          </div>
        )}

        {/* Statistieken */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-3 sm:p-4">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide leading-tight">{d.momentsCount}</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-700 mt-1">{moments.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-3 sm:p-4">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide leading-tight">{d.minutesLearned}</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-700 mt-1">{totalMinutes}</p>
          </div>
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-3 sm:p-4">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide leading-tight">{d.inHours}</p>
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-indigo-700 mt-1">
              {totalHours}<span className="text-base sm:text-lg font-medium text-indigo-300">u</span>
            </p>
          </div>
        </div>

        {/* Formulier */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h2 className="font-semibold text-white">{d.newMoment}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{d.newMomentSub}</p>
          </div>

          <form onSubmit={handleAdd} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{d.title}</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder={d.titlePlaceholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{d.summary} <span className="text-gray-400 font-normal">{d.summaryOptional}</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={d.summaryPlaceholder}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{d.photo} <span className="text-gray-400 font-normal">{d.summaryOptional}</span></label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{d.subject}</label>
                {subjects.length > 0 ? (
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent bg-white transition-all"
                  >
                    <option value="">{d.chooseSubject}</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <Link href="/vakken" className="flex items-center justify-center w-full border border-dashed border-indigo-200 rounded-xl px-3 py-2.5 text-sm text-indigo-400 hover:text-indigo-600 hover:border-indigo-400 transition-colors">
                    {d.manageSubjects}
                  </Link>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{d.minutes}</label>
                <input
                  type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)}
                  placeholder={d.minutesPlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{d.date}</label>
                <input
                  type="date" value={learnedAt} onChange={e => setLearnedAt(e.target.value)} required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {duplicateSuccess && <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3"><p className="text-sm text-indigo-600 font-medium">{d.duplicateNote}</p></div>}
            {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-sm text-red-600">{error}</p></div>}
            {success && <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"><p className="text-sm text-emerald-600 font-medium">{d.saved}</p></div>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
            >
              {loading ? d.saving : d.add}
            </button>
          </form>
        </div>

        {/* Welkomstbanner voor nieuwe gebruikers */}
        {moments.length === 0 && (
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-bold">{h.welcome}</h2>
            <p className="text-indigo-200 text-sm mt-1 mb-4">{h.welcomeSub}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <Link href="/vakken" className="bg-white/10 hover:bg-white/20 transition-colors rounded-xl p-3 block">
                <p className="text-2xl font-bold">1</p>
                <p className="text-xs text-indigo-200 mt-0.5">{h.step1}</p>
                <p className="text-xs text-white/60 mt-1">{h.manage}</p>
              </Link>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-2xl font-bold">2</p>
                <p className="text-xs text-indigo-200 mt-0.5">{h.step2}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-2xl font-bold">3</p>
                <p className="text-xs text-indigo-200 mt-0.5">{h.step3}</p>
              </div>
            </div>
          </div>
        )}

        {/* Lijst */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-indigo-900">{d.recent}</h2>
            <div className="flex items-center gap-2">
              {moments.length > 0 && (
                <button
                  onClick={() => exportCsv(moments, ratings)}
                  className="text-xs text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors font-medium">
                  {r.exportCsv} ↓
                </button>
              )}
              <span className="text-xs text-indigo-400 bg-indigo-50 px-2.5 py-1 rounded-full">{moments.length} {d.total}</span>
            </div>
          </div>

          {/* Zoekbalk */}
          {moments.length > 0 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={d.search}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
          )}

          {!search && moments.length > 0 && (
            <p className="text-xs text-indigo-300">{d.lastFive}</p>
          )}

          {moments.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-10 text-center">
              <p className="text-indigo-300 text-sm">{d.empty}</p>
            </div>
          )}

          {search && moments.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.description?.toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
              <p className="text-indigo-300 text-sm">Geen resultaten voor &ldquo;{search}&rdquo;</p>
            </div>
          )}

          {(search
            ? moments.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.description?.toLowerCase().includes(search.toLowerCase()))
            : moments.slice(0, 5)
          ).map((moment) => (
            <div key={moment.id} className="bg-white rounded-2xl border border-indigo-50 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
              {moment.photo_url && (
                <img src={moment.photo_url} alt="Foto" className="w-full max-h-48 object-cover rounded-t-2xl" />
              )}
              <div className="p-5">
                {editingId === moment.id ? (
                  <div className="space-y-3">
                    <input value={editData.title ?? ''} onChange={e => setEditData({ ...editData, title: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <textarea value={editData.description ?? ''} onChange={e => setEditData({ ...editData, description: e.target.value })}
                      rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
                    <div className="grid grid-cols-3 gap-2">
                      <select value={editData.category ?? ''} onChange={e => setEditData({ ...editData, category: e.target.value })}
                        className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                        <option value="">{d.noSubject}</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                      <input type="number" value={editData.duration_minutes ?? ''} placeholder={d.minutes}
                        onChange={e => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) || null })}
                        className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                      <input type="date" value={editData.learned_at ?? ''}
                        onChange={e => setEditData({ ...editData, learned_at: e.target.value })}
                        className="border border-gray-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(moment.id)}
                        className="text-sm bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 transition-colors font-medium">{d.save}</button>
                      <button onClick={() => setEditingId(null)} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">{d.cancel}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="font-semibold text-indigo-900">{moment.title}</h3>
                        {ratings[moment.id] && (
                          <span className="text-xs text-amber-400">{'⭐'.repeat(ratings[moment.id])}</span>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 items-center flex-wrap justify-end">
                        <span className="text-xs text-indigo-300">{moment.learned_at}</span>
                        <button onClick={() => startEdit(moment)} className="text-xs text-gray-300 hover:text-indigo-500 transition-colors">{d.edit}</button>
                        <button onClick={() => duplicateMoment(moment)} className="text-xs text-gray-300 hover:text-indigo-500 transition-colors">{d.duplicate}</button>
                        <button onClick={() => handleShare(moment)}
                          className={`text-xs transition-colors ${moment.is_public ? 'text-emerald-500 hover:text-emerald-700' : 'text-gray-300 hover:text-indigo-500'}`}>
                          {copiedId === moment.id ? d.linkCopied : moment.is_public ? d.shared : d.share}
                        </button>
                        {confirmDeleteId === moment.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => handleDelete(moment.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">{d.confirmYes}</button>
                            <span className="text-xs text-gray-300">·</span>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:text-gray-600">{d.confirmNo}</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(moment.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">{d.delete}</button>
                        )}
                      </div>
                    </div>
                    {moment.description && (
                      <div className="mt-3 bg-indigo-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide mb-1">{d.summary}</p>
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
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
