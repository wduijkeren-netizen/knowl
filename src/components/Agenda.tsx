'use client'

import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'

const LOCALE_MAP: Record<string, string> = {
  nl: 'nl-NL', en: 'en-GB', es: 'es-ES', pt: 'pt-PT',
  fr: 'fr-FR', de: 'de-DE', da: 'da-DK', sv: 'sv-SE', no: 'nb-NO',
}

type StudySession = {
  title: string
  category: string | null
  duration_minutes: number | null
  learned_at: string
}

type AgendaEvent = {
  id: string
  date: string
  type: 'exam' | 'planned'
  title: string
  subject: string
  time: string
}

type Props = {
  sessions: StudySession[]
  subjects: string[]
  events: AgendaEvent[]
  userId: string | null
}

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default function Agenda({ sessions, subjects, events: initialEvents, userId }: Props) {
  const { lang, tr } = useLanguage()
  const a = tr.agenda
  const locale = LOCALE_MAP[lang] ?? 'nl-NL'
  const supabase = createClient()

  const today = toDateStr(new Date())
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(today)
  const [events, setEvents] = useState<AgendaEvent[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(today)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<'exam' | 'planned'>('exam')
  const [formSubject, setFormSubject] = useState('')
  const [formTime, setFormTime] = useState('')
  const [saving, setSaving] = useState(false)

  const [copySource, setCopySource] = useState<StudySession | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyTargetDate, setCopyTargetDate] = useState(today)

  async function addEvent() {
    if (!formTitle.trim()) return
    setSaving(true)

    if (userId) {
      const { data, error } = await supabase
        .from('agenda_events')
        .insert({
          user_id: userId,
          date: formDate,
          type: formType,
          title: formTitle.trim(),
          subject: formSubject.trim(),
          time: formTime,
        })
        .select('id, date, type, title, subject, time')
        .single()

      if (!error && data) {
        setEvents(prev => [...prev, data as AgendaEvent])
      }
    } else {
      // Gast: alleen lokaal tonen (geen persistentie)
      const ev: AgendaEvent = {
        id: Date.now().toString(),
        date: formDate, type: formType,
        title: formTitle.trim(), subject: formSubject.trim(), time: formTime,
      }
      setEvents(prev => [...prev, ev])
    }

    setFormTitle(''); setFormSubject(''); setFormTime('')
    setShowForm(false)
    setSelectedDay(formDate)
    setSaving(false)
  }

  async function deleteEvent(id: string) {
    if (userId) {
      await supabase.from('agenda_events').delete().eq('id', id)
    }
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  function openCopyModal(session: StudySession) {
    setCopySource(session)
    setCopyTargetDate(today)
    setShowCopyModal(true)
  }

  async function confirmCopy() {
    if (!copySource) return
    setSaving(true)

    if (userId) {
      const { data, error } = await supabase
        .from('agenda_events')
        .insert({
          user_id: userId,
          date: copyTargetDate,
          type: 'planned',
          title: copySource.title,
          subject: copySource.category ?? '',
          time: '',
        })
        .select('id, date, type, title, subject, time')
        .single()

      if (!error && data) {
        setEvents(prev => [...prev, data as AgendaEvent])
      }
    } else {
      const ev: AgendaEvent = {
        id: Date.now().toString(),
        date: copyTargetDate, type: 'planned',
        title: copySource.title, subject: copySource.category ?? '', time: '',
      }
      setEvents(prev => [...prev, ev])
    }

    setShowCopyModal(false)
    setCopySource(null)
    setSelectedDay(copyTargetDate)
    setSaving(false)
  }

  // Build study data map
  const studyMap: Record<string, { minutes: number; sessions: StudySession[] }> = {}
  for (const s of sessions) {
    const d = s.learned_at
    if (!studyMap[d]) studyMap[d] = { minutes: 0, sessions: [] }
    studyMap[d].minutes += s.duration_minutes ?? 0
    studyMap[d].sessions.push(s)
  }

  // Calendar grid
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7

  const days: (string | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(toDateStr(new Date(year, month, d)))
  }
  while (days.length % 7 !== 0) days.push(null)

  const monthLabel = new Date(year, month, 1).toLocaleString(locale, { month: 'long', year: 'numeric' })
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date('2024-01-01')
    d.setDate(d.getDate() + i)
    return d.toLocaleString(locale, { weekday: 'short' })
  })

  const eventsOnSelected = selectedDay ? events.filter(e => e.date === selectedDay) : []
  const studyOnSelected = selectedDay ? studyMap[selectedDay] : undefined

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-indigo-900">{a.title}</h1><PageInfo text="Plan hier je toetsen en leermomenten in. Klik op een dag om details te zien of iets toe te voegen aan je studiekalender." /></div>
            <p className="text-sm text-indigo-400 mt-1">{a.subtitle}</p>
          </div>
          <button
            onClick={() => { setFormDate(selectedDay ?? today); setShowForm(true) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all">
            {a.addEvent}
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="text-white/70 hover:text-white transition-colors text-xl px-2">‹</button>
            <h2 className="font-semibold text-white capitalize">{monthLabel}</h2>
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="text-white/70 hover:text-white transition-colors text-xl px-2">›</button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {weekdayLabels.map(w => (
                <div key={w} className="text-center text-xs font-medium text-indigo-400 py-1">{w}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (!day) return <div key={i} />
                const isToday = day === today
                const isSelected = day === selectedDay
                const hasStudy = !!studyMap[day]
                const hasExam = events.some(e => e.date === day && e.type === 'exam')
                const hasPlanned = events.some(e => e.date === day && e.type === 'planned')

                return (
                  <button key={day} onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                      ${isSelected ? 'bg-indigo-600 text-white shadow-md' : isToday ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-indigo-50'}`}>
                    <span>{new Date(day + 'T12:00:00').getDate()}</span>
                    <div className="flex gap-0.5 mt-0.5">
                      {hasStudy && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />}
                      {hasExam && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-400'}`} />}
                      {hasPlanned && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-400'}`} />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-4 mt-4 pt-3 border-t border-indigo-50">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                {a.studied}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                {a.exam}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />
                {a.planned}
              </div>
            </div>
          </div>
        </div>

        {sessions.length === 0 && events.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-indigo-200 p-8 text-center">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-sm font-medium text-indigo-700">{a.selectDay}</p>
          </div>
        )}

        {/* Day detail */}
        {selectedDay && (
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-indigo-900">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                {selectedDay === today && (
                  <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{a.today}</span>
                )}
              </h3>
              <button onClick={() => { setFormDate(selectedDay); setShowForm(true) }}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1 rounded-lg transition-colors">
                {a.addEvent}
              </button>
            </div>

            {studyOnSelected && (
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">{a.studied}</p>
                <p className="text-sm font-bold text-emerald-800 mb-3">
                  {studyOnSelected.minutes} {a.minutesStudied} · {studyOnSelected.sessions.length} {a.sessions}
                </p>
                <div className="space-y-2">
                  {studyOnSelected.sessions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-emerald-800">{s.title}</p>
                        {s.category && <p className="text-xs text-emerald-500">{s.category}</p>}
                        {s.duration_minutes && <p className="text-xs text-emerald-400">{s.duration_minutes} min</p>}
                      </div>
                      <button onClick={() => openCopyModal(s)} title={a.copyTo}
                        className="text-xs text-indigo-400 hover:text-indigo-600 border border-indigo-200 rounded-lg px-2 py-1 transition-colors whitespace-nowrap">
                        {a.copyTo} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {eventsOnSelected.length > 0 ? (
              <div className="space-y-2">
                {eventsOnSelected
                  .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
                  .map(ev => (
                    <div key={ev.id} className={`flex justify-between items-start rounded-xl p-3 ${ev.type === 'exam' ? 'bg-red-50' : 'bg-violet-50'}`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ev.type === 'exam' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'}`}>
                            {ev.type === 'exam' ? a.exam : a.planned}
                          </span>
                          {ev.time && <span className="text-xs font-medium text-gray-500">🕐 {ev.time}</span>}
                          {ev.subject && <span className="text-xs text-gray-400">{ev.subject}</span>}
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-1">{ev.title}</p>
                      </div>
                      <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none ml-2">×</button>
                    </div>
                  ))}
              </div>
            ) : !studyOnSelected ? (
              <p className="text-sm text-indigo-300 text-center py-4">{a.noEvents}</p>
            ) : null}
          </div>
        )}

        {/* Add event modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="font-bold text-indigo-900 text-lg">{a.addEventTitle}</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.date}</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.time}</label>
                  <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.eventType}</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormType('exam')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${formType === 'exam' ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    {a.exam}
                  </button>
                  <button onClick={() => setFormType('planned')}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${formType === 'planned' ? 'bg-violet-100 text-violet-700' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                    {a.planned}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.eventName}</label>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder={a.eventNamePlaceholder} autoFocus
                  onKeyDown={e => e.key === 'Enter' && addEvent()}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.subject}</label>
                {subjects.length > 0 ? (
                  <select value={formSubject} onChange={e => setFormSubject(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    <option value="">— {a.subjectPlaceholder} —</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input type="text" value={formSubject} onChange={e => setFormSubject(e.target.value)}
                    placeholder={a.subjectPlaceholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                  {a.cancel}
                </button>
                <button onClick={addEvent} disabled={saving || !formTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? '...' : a.save}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Copy modal */}
        {showCopyModal && copySource && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="font-bold text-indigo-900 text-lg">{a.copyTitle}</h3>
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-sm font-medium text-indigo-800">{copySource.title}</p>
                {copySource.category && <p className="text-xs text-indigo-400 mt-0.5">{copySource.category}</p>}
                {copySource.duration_minutes && <p className="text-xs text-indigo-400">{copySource.duration_minutes} min</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.copyToDate}</label>
                <input type="date" value={copyTargetDate} onChange={e => setCopyTargetDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <p className="text-xs text-indigo-400">{a.copyNote}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowCopyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                  {a.cancel}
                </button>
                <button onClick={confirmCopy} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? '...' : a.copyConfirm}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
