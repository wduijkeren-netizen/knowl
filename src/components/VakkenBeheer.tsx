'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Subject = {
  id: string
  name: string
  goal_minutes: number | null
  goal_date: string | null
  recurring_type: string | null
  recurring_goal_minutes: number | null
}

type Props = {
  user: User | null
  subjects: Subject[]
  momentCounts: Record<string, number>
  minutesPerSubject: Record<string, number>
  minutesThisPeriod: Record<string, number>
}

const recurringLabels: Record<string, string> = {
  daily: 'Per dag',
  weekly: 'Per week',
  monthly: 'Per maand',
}

export default function VakkenBeheer({ user, subjects: initialSubjects, momentCounts = {}, minutesPerSubject = {}, minutesThisPeriod = {} }: Props) {
  const { tr } = useLanguage()
  const s = tr.subjects
  const [subjects, setSubjects] = useState(initialSubjects)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [goalMinutes, setGoalMinutes] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [recurringType, setRecurringType] = useState('')
  const [recurringGoalMinutes, setRecurringGoalMinutes] = useState('')
  const supabase = createClient()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('subjects')
      .insert({ id: crypto.randomUUID(), name: name.trim(), user_id: user.id })
      .select()
      .single()
    if (!error && data) {
      setSubjects([...subjects, data].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
    }
    setLoading(false)
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    await supabase.from('subjects').delete().eq('id', id)
    setSubjects(subjects.filter(s => s.id !== id))
  }

  function startGoalEdit(subject: Subject, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditingGoal(subject.id)
    setGoalMinutes(subject.goal_minutes ? String(subject.goal_minutes) : '')
    setGoalDate(subject.goal_date ?? '')
    setRecurringType(subject.recurring_type ?? '')
    setRecurringGoalMinutes(subject.recurring_goal_minutes ? String(subject.recurring_goal_minutes) : '')
  }

  async function saveGoal(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const { data, error } = await supabase
      .from('subjects')
      .update({
        goal_minutes: goalMinutes ? parseInt(goalMinutes) : null,
        goal_date: goalDate || null,
        recurring_type: recurringType || null,
        recurring_goal_minutes: recurringGoalMinutes ? parseInt(recurringGoalMinutes) : null,
      })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setSubjects(subjects.map(s => s.id === id ? data : s))
      setEditingGoal(null)
    }
  }

  function daysLeft(dateStr: string) {
    return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{s.title}</h1>
          <p className="text-sm text-indigo-400 mt-1">{s.subtitle}</p>
        </div>

        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800">Je bekijkt Knowl als gast</p>
            <p className="text-sm text-amber-600 mt-0.5">Log in om vakken aan te maken en je voortgang bij te houden. <Link href="/login?signup=true" className="underline font-medium hover:text-amber-800">Maak een gratis account aan</Link></p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h2 className="font-semibold text-white">{s.addTitle}</h2>
          </div>
          <form onSubmit={handleAdd} className="p-6">
            <div className="flex gap-3">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={s.placeholder}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
              >
                {s.addBtn}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-indigo-900">{s.yourSubjects}</h2>
            <span className="text-xs text-indigo-400 bg-indigo-50 px-2.5 py-1 rounded-full">{subjects.length} {s.subjects}</span>
          </div>

          {subjects.length === 0 && (
            <div className="text-center py-8">
              <p className="text-indigo-300 text-sm">{s.empty}</p>
            </div>
          )}

          <ul className="space-y-3">
            {subjects.map(subject => {
              const done = minutesPerSubject[subject.name] ?? 0
              const goal = subject.goal_minutes
              const progress = goal ? Math.min(100, Math.round((done / goal) * 100)) : null
              const days = subject.goal_date ? daysLeft(subject.goal_date) : null
              const periodDone = minutesThisPeriod[subject.name] ?? 0
              const recurringGoal = subject.recurring_goal_minutes
              const recurringProgress = recurringGoal ? Math.min(100, Math.round((periodDone / recurringGoal) * 100)) : null

              return (
                <li key={subject.id} className="rounded-2xl border border-indigo-50 overflow-hidden">
                  {/* Vak-rij */}
                  <div className="group">
                    <Link
                      href={`/vakken/${encodeURIComponent(subject.name)}`}
                      className="flex items-center justify-between gap-3 py-3 px-4 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></div>
                        <span className="text-sm font-medium text-indigo-900">{subject.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-indigo-300">
                          {(() => { const count = momentCounts[subject.name] ?? 0; return `${count} ${count === 1 ? s.moment : s.moments}` })()}
                        </span>
                        <span className="text-indigo-300 group-hover:text-indigo-500 transition-colors">→</span>
                      </div>
                    </Link>

                    {/* Acties — altijd zichtbaar onder de rij */}
                    <div className="flex gap-3 px-4 pb-3">
                      <button
                        onClick={(e) => startGoalEdit(subject, e)}
                        className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors underline underline-offset-2"
                      >
                        Doel instellen
                      </button>
                      <button
                        onClick={(e) => handleDelete(subject.id, e)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                      >
                        {s.delete}
                      </button>
                    </div>
                  </div>

                  {/* Doel bewerken */}
                  {editingGoal === subject.id && (
                    <div className="px-4 pb-4 pt-2 bg-indigo-50 border-t border-indigo-100 space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Eenmalig doel</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-indigo-500 mb-1">Doelminuten</label>
                            <input
                              type="number"
                              value={goalMinutes}
                              onChange={e => setGoalMinutes(e.target.value)}
                              placeholder="bijv. 1800"
                              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-indigo-500 mb-1">Deadline</label>
                            <input
                              type="date"
                              value={goalDate}
                              onChange={e => setGoalDate(e.target.value)}
                              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Terugkerend doel</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-indigo-500 mb-1">Periode</label>
                            <select
                              value={recurringType}
                              onChange={e => setRecurringType(e.target.value)}
                              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            >
                              <option value="">Geen</option>
                              <option value="daily">Per dag</option>
                              <option value="weekly">Per week</option>
                              <option value="monthly">Per maand</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-indigo-500 mb-1">Minuten</label>
                            <input
                              type="number"
                              value={recurringGoalMinutes}
                              onChange={e => setRecurringGoalMinutes(e.target.value)}
                              placeholder="bijv. 60"
                              className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => saveGoal(subject.id, e)}
                          className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-1.5 hover:bg-indigo-700 transition-colors font-medium"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingGoal(null) }}
                          className="text-sm text-indigo-400 hover:text-indigo-600 px-3 py-1.5"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Voortgangsbalken */}
                  {(progress !== null || recurringProgress !== null) && editingGoal !== subject.id && (
                    <div className="px-4 pb-3 space-y-2">
                      {progress !== null && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-indigo-400">Totaal: {done} / {goal} min</span>
                            <div className="flex items-center gap-2">
                              {days !== null && (
                                <span className={`text-xs font-medium ${days < 7 ? 'text-red-400' : days < 14 ? 'text-amber-400' : 'text-emerald-500'}`}>
                                  {days > 0 ? `nog ${days} dagen` : days === 0 ? 'vandaag!' : 'verlopen'}
                                </span>
                              )}
                              <span className="text-xs font-bold text-indigo-600">{progress}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {recurringProgress !== null && subject.recurring_type && (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-violet-400">{recurringLabels[subject.recurring_type]}: {periodDone} / {recurringGoal} min</span>
                            <span className="text-xs font-bold text-violet-600">{recurringProgress}%</span>
                          </div>
                          <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${recurringProgress >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`}
                              style={{ width: `${recurringProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </main>
    </div>
  )
}
