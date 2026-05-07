'use client'

import Nav from '@/components/Nav'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
}

type Props = {
  sessions: StudySession[]
}

const STORAGE_KEY = 'knowl_agenda_events'

function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

export default function Agenda({ sessions }: Props) {
  const { lang, tr } = useLanguage()
  const a = tr.agenda
  const locale = LOCALE_MAP[lang] ?? 'nl-NL'

  const today = toDateStr(new Date())
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(today)
  const [events, setEvents] = useState<AgendaEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(today)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<'exam' | 'planned'>('exam')
  const [formSubject, setFormSubject] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setEvents(JSON.parse(raw))
    } catch {}
  }, [])

  function saveEvents(next: AgendaEvent[]) {
    setEvents(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function addEvent() {
    if (!formTitle.trim()) return
    const ev: AgendaEvent = {
      id: Date.now().toString(),
      date: formDate,
      type: formType,
      title: formTitle.trim(),
      subject: formSubject.trim(),
    }
    saveEvents([...events, ev])
    setFormTitle('')
    setFormSubject('')
    setShowForm(false)
    setSelectedDay(formDate)
  }

  function deleteEvent(id: string) {
    saveEvents(events.filter(e => e.id !== id))
  }

  // Build study data map: date -> { minutes, sessions[] }
  const studyMap: Record<string, { minutes: number; titles: string[] }> = {}
  for (const s of sessions) {
    const d = s.learned_at
    if (!studyMap[d]) studyMap[d] = { minutes: 0, titles: [] }
    studyMap[d].minutes += s.duration_minutes ?? 0
    studyMap[d].titles.push(s.title)
  }

  // Calendar grid
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday-first: offset
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

  function prevMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">{a.title}</h1>
            <p className="text-sm text-indigo-400 mt-1">{a.subtitle}</p>
          </div>
          <button
            onClick={() => { setFormDate(selectedDay ?? today); setShowForm(true) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            {a.addEvent}
          </button>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
            <button onClick={prevMonth} className="text-white/70 hover:text-white transition-colors text-xl px-2">‹</button>
            <h2 className="font-semibold text-white capitalize">{monthLabel}</h2>
            <button onClick={nextMonth} className="text-white/70 hover:text-white transition-colors text-xl px-2">›</button>
          </div>

          <div className="p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {weekdayLabels.map(w => (
                <div key={w} className="text-center text-xs font-medium text-indigo-400 py-1">{w}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, i) => {
                if (!day) return <div key={i} />
                const isToday = day === today
                const isSelected = day === selectedDay
                const hasStudy = !!studyMap[day]
                const hasEvent = events.some(e => e.date === day)
                const hasExam = events.some(e => e.date === day && e.type === 'exam')

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all
                      ${isSelected ? 'bg-indigo-600 text-white shadow-md' : isToday ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-indigo-50'}
                    `}>
                    <span>{new Date(day + 'T12:00:00').getDate()}</span>
                    <div className="flex gap-0.5 mt-0.5">
                      {hasStudy && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />}
                      {hasExam && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-400'}`} />}
                      {hasEvent && !hasExam && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-400'}`} />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
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
              <button
                onClick={() => { setFormDate(selectedDay); setShowForm(true) }}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium border border-indigo-200 px-3 py-1 rounded-lg transition-colors">
                {a.addEvent}
              </button>
            </div>

            {/* Study sessions */}
            {studyOnSelected && (
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">{a.studied}</p>
                <p className="text-sm font-bold text-emerald-800">{studyOnSelected.minutes} {a.minutesStudied} · {studyOnSelected.titles.length} {a.sessions}</p>
                <ul className="mt-2 space-y-1">
                  {studyOnSelected.titles.map((t, i) => (
                    <li key={i} className="text-xs text-emerald-700">· {t}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Planned events */}
            {eventsOnSelected.length > 0 ? (
              <div className="space-y-2">
                {eventsOnSelected.map(ev => (
                  <div key={ev.id} className={`flex justify-between items-start rounded-xl p-3 ${ev.type === 'exam' ? 'bg-red-50' : 'bg-violet-50'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ev.type === 'exam' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'}`}>
                          {ev.type === 'exam' ? a.exam : a.planned}
                        </span>
                        {ev.subject && <span className="text-xs text-gray-400">{ev.subject}</span>}
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-1">{ev.title}</p>
                    </div>
                    <button onClick={() => deleteEvent(ev.id)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            ) : !studyOnSelected ? (
              <p className="text-sm text-indigo-300 text-center py-4">{a.noEvents}</p>
            ) : null}
          </div>
        )}

        {/* Add event form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="font-bold text-indigo-900 text-lg">{a.addEventTitle}</h3>

              <div>
                <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.date}</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
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
                  placeholder={a.eventNamePlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              <div>
                <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{a.subject}</label>
                <input type="text" value={formSubject} onChange={e => setFormSubject(e.target.value)}
                  placeholder={a.subjectPlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                  {a.cancel}
                </button>
                <button onClick={addEvent}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
                  {a.save}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
