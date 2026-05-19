'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export default function QuickLog() {
  const { tr } = useLanguage()
  const d = tr.dashboard
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [duration, setDuration] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase.from('subjects').select('name').order('name').then(({ data: subs }) => {
        setSubjects((subs ?? []).map(s => s.name))
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!userId) return null

  async function handleSave() {
    if (!title.trim() || !userId) return
    setSaving(true)
    setSaveError(false)
    const { error } = await supabase.from('learning_moments').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      title: title.trim(),
      category: category || null,
      duration_minutes: duration ? Math.max(1, parseInt(duration) || 1) : null,
      learned_at: new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    if (error) {
      setSaveError(true)
      setTimeout(() => setSaveError(false), 3000)
      return
    }
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setOpen(false)
      setTitle('')
      setCategory('')
      setDuration('')
    }, 1200)
  }

  return (
    <>
      {/* Zwevende + knop — alleen mobiel */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl shadow-indigo-300/50 flex items-center justify-center text-3xl font-light hover:bg-indigo-700 active:scale-95 transition-all"
          aria-label="Snel loggen"
        >
          +
        </button>
      )}

      {/* Slide-up panel */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
          <div className="bg-white rounded-t-3xl px-6 pt-5 pb-10 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-indigo-900 text-lg">Snel loggen</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">✕</button>
            </div>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder={d.titlePlaceholder ?? 'Wat heb je geleerd?'}
              autoFocus
              className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-300 bg-gray-50 focus:bg-white transition-all"
            />

            <div className="flex gap-3">
              <div className="relative flex-1">
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full appearance-none border-2 border-gray-100 rounded-2xl px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-indigo-300 text-gray-700"
                >
                  <option value="">{d.chooseSubject ?? 'Vak (optioneel)'}</option>
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
              <input
                type="number" min="1"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="min"
                className="w-20 border-2 border-gray-100 rounded-2xl px-3 py-3 text-sm text-center bg-gray-50 focus:outline-none focus:border-indigo-300"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className={`w-full rounded-2xl py-4 font-bold text-sm disabled:opacity-50 transition-all active:scale-95 shadow-md ${saveError ? 'bg-red-500 text-white shadow-red-200' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-200'}`}
            >
              {saved ? '✓ Opgeslagen!' : saving ? 'Opslaan...' : saveError ? 'Mislukt — probeer opnieuw' : 'Opslaan'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
