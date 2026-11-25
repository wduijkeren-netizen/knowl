'use client'

import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarPlus, ChevronLeft, ChevronRight, Clock, GraduationCap, Plus, X } from 'lucide-react'
import ToolBanner, { bannerButton } from '@/components/ToolBanner'
import SubjectSelect from '@/components/SubjectSelect'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import { formatMinutes } from '@/lib/studyStats'
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
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState('')
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3000); return () => clearTimeout(t) }, [toast])

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

      if (error || !data) { setSaving(false); setFormError('Opslaan lukte niet. Probeer het opnieuw.'); return }
      setEvents(prev => [...prev, data as AgendaEvent])
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
      const { error } = await supabase.from('agenda_events').delete().eq('id', id)
      if (error) { setToast('Verwijderen lukte niet.'); return }
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

      if (error || !data) { setSaving(false); setToast('Inplannen lukte niet. Probeer het opnieuw.'); return }
      setEvents(prev => [...prev, data as AgendaEvent])
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

  const colors = useMemo(() => buildSubjectColors([...subjects, ...events.map(e => e.subject).filter(Boolean)]), [subjects, events])
  const upcomingExams = events.filter(e => e.type === 'exam' && e.date >= today).sort((x, y) => x.date.localeCompare(y.date))
  const nextExam = upcomingExams[0]
  const daysUntil = (d: string) => Math.round((new Date(`${d}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000)
  const card = 'bg-white rounded-2xl border border-indigo-100 shadow-sm'
  const label = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5'
  const input = 'w-full border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400'
  const openForm = (date: string) => { setFormDate(date); setFormError(''); setShowForm(true) }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn={userId ? true : undefined} width="max-w-6xl" />
      <ToolBanner
        variant="calendar" title={a.title}
        below={<span className="text-xs text-white/85">{nextExam ? `Volgende toets: ${nextExam.title}, ${daysUntil(nextExam.date) === 0 ? 'vandaag' : daysUntil(nextExam.date) === 1 ? 'morgen' : `over ${daysUntil(nextExam.date)} dagen`}` : a.subtitle}</span>}
        actions={<button onClick={() => openForm(selectedDay ?? today)} className={bannerButton}><Plus className="w-4 h-4" strokeWidth={2.5} /> <span className="hidden sm:inline">Toevoegen</span></button>}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
        <section className={`${card} p-4 sm:p-5`} aria-label="Kalender">
          <div className="flex items-center justify-between gap-2 mb-4">
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Vorige maand"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-indigo-100 text-slate-700 dark:text-slate-200 hover:bg-indigo-50"><ChevronLeft className="w-4 h-4" strokeWidth={2} /></button>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white capitalize">{monthLabel}</h2>
              <PageInfo text="Plan hier je toetsen en studiemomenten. Klik op een dag om te zien wat je hebt gedaan en wat er gepland staat." />
            </div>
            <button onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Volgende maand"
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-indigo-100 text-slate-700 dark:text-slate-200 hover:bg-indigo-50"><ChevronRight className="w-4 h-4" strokeWidth={2} /></button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {weekdayLabels.map(w => <div key={w} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1 capitalize">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              if (!day) return <div key={i} />
              const isToday = day === today
              const isSelected = day === selectedDay
              const dayEvents = events.filter(e => e.date === day)
              const hasStudy = !!studyMap[day]
              return (
                <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={isSelected}
                  aria-label={`${new Date(day + 'T12:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'long' })}${dayEvents.length ? `, ${dayEvents.length} gepland` : ''}${hasStudy ? ', gestudeerd' : ''}`}
                  className={`relative min-h-[3.25rem] sm:min-h-[4.25rem] rounded-xl p-1 sm:p-1.5 flex flex-col items-center sm:items-stretch text-sm transition-colors border ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : isToday ? 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:text-white' : 'border-transparent text-slate-800 dark:text-slate-100 hover:bg-indigo-50'}`}>
                  <span className={`text-xs sm:text-sm font-semibold sm:text-left ${isToday && !isSelected ? 'text-indigo-700 dark:text-indigo-200' : ''}`}>{new Date(day + 'T12:00:00').getDate()}</span>
                  <span className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                    {dayEvents.slice(0, 2).map(ev => (
                      <span key={ev.id} className={`truncate text-[10px] leading-tight rounded px-1 py-0.5 text-left font-medium ${isSelected ? 'bg-white/20 text-white' : ev.type === 'exam' ? 'bg-red-100 text-red-800' : 'bg-violet-100 text-violet-800'}`}>{ev.title}</span>
                    ))}
                    {dayEvents.length > 2 && <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>+{dayEvents.length - 2}</span>}
                  </span>
                  <span className="flex sm:hidden gap-0.5 mt-1">
                    {dayEvents.some(e => e.type === 'exam') && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />}
                    {dayEvents.some(e => e.type === 'planned') && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-violet-500'}`} />}
                  </span>
                  {hasStudy && <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} aria-hidden />}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-indigo-100 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{a.studied}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />{a.exam}</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500" />{a.planned}</span>
          </div>
        </section>

        <aside className="space-y-5">
          {selectedDay && (
            <section className={`${card} p-5 space-y-4`} aria-label="Geselecteerde dag">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white first-letter:uppercase">
                    {new Date(selectedDay + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  {selectedDay === today && <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">{a.today}</span>}
                </div>
                <button onClick={() => openForm(selectedDay)} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-50 shrink-0">
                  <CalendarPlus className="w-3.5 h-3.5" strokeWidth={2} /> Toevoegen
                </button>
              </div>

              {eventsOnSelected.length > 0 && (
                <ul className="space-y-2">
                  {[...eventsOnSelected].sort((x, y) => (x.time || '99:99').localeCompare(y.time || '99:99')).map(ev => {
                    const color = ev.subject ? colors[ev.subject] ?? NO_SUBJECT_COLOR : NO_SUBJECT_COLOR
                    return (
                      <li key={ev.id} className="relative rounded-xl border pl-4 pr-9 py-2.5" style={{ backgroundColor: `${color}10`, borderColor: `${color}33` }}>
                        <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${ev.type === 'exam' ? 'bg-red-500' : 'bg-violet-500'}`} aria-hidden />
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className={`inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5 ${ev.type === 'exam' ? 'bg-red-100 text-red-800' : 'bg-violet-100 text-violet-800'}`}>
                            {ev.type === 'exam' ? <GraduationCap className="w-3 h-3" strokeWidth={2.5} /> : <CalendarPlus className="w-3 h-3" strokeWidth={2.5} />}{ev.type === 'exam' ? a.exam : a.planned}
                          </span>
                          {ev.time && <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200"><Clock className="w-3 h-3" strokeWidth={2} />{ev.time.slice(0, 5)}</span>}
                          {ev.subject && <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />{ev.subject}</span>}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{ev.title}</p>
                        <button onClick={() => deleteEvent(ev.id)} aria-label={`${ev.title} verwijderen`}
                          className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-red-700 hover:bg-white"><X className="w-3.5 h-3.5" strokeWidth={2.5} /></button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {studyOnSelected && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{a.studied}: {formatMinutes(studyOnSelected.minutes)} · {studyOnSelected.sessions.length} {studyOnSelected.sessions.length === 1 ? 'leermoment' : a.sessions}</p>
                  <ul className="mt-2 space-y-1.5">
                    {studyOnSelected.sessions.map((x, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{x.title}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">{[x.category, x.duration_minutes ? formatMinutes(x.duration_minutes) : null].filter(Boolean).join(' · ')}</p>
                        </div>
                        <button onClick={() => openCopyModal(x)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50 shrink-0">
                          {a.copyTo} <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {eventsOnSelected.length === 0 && !studyOnSelected && <p className="text-sm text-slate-600 dark:text-slate-300 text-center py-3">{a.noEvents}</p>}
            </section>
          )}

          <section className={`${card} p-5`} aria-label="Komende toetsen">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Komende toetsen</h3>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Nog geen toetsen gepland.</p>
            ) : (
              <ul className="mt-2 divide-y divide-indigo-50 dark:divide-white/5">
                {upcomingExams.slice(0, 5).map(ev => (
                  <li key={ev.id}>
                    <button onClick={() => { setSelectedDay(ev.date); const d = new Date(ev.date + 'T12:00:00'); setViewDate(new Date(d.getFullYear(), d.getMonth(), 1)) }}
                      className="w-full flex items-center gap-3 py-2 text-left hover:bg-indigo-50/50 rounded-lg px-1">
                      <span className="w-10 text-center shrink-0">
                        <span className="block text-[10px] uppercase font-semibold text-red-700">{new Date(ev.date + 'T12:00:00').toLocaleDateString(locale, { month: 'short' })}</span>
                        <span className="block text-lg font-bold text-slate-900 dark:text-white leading-none">{new Date(ev.date + 'T12:00:00').getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{ev.title}</span>
                        <span className="block text-xs text-slate-600 dark:text-slate-300">{ev.subject ? `${ev.subject} · ` : ''}{daysUntil(ev.date) === 0 ? 'vandaag' : daysUntil(ev.date) === 1 ? 'morgen' : `over ${daysUntil(ev.date)} dagen`}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <form role="dialog" aria-modal="true" aria-labelledby="agenda-form" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); addEvent() }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center justify-between">
              <h3 id="agenda-form" className="text-base font-semibold text-white">{a.addEventTitle}</h3>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Sluiten" className="p-1.5 rounded-lg text-white/90 hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <span className={label}>{a.eventType}</span>
                <div className="flex bg-indigo-50 rounded-xl p-1" role="group" aria-label={a.eventType}>
                  {(['exam', 'planned'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setFormType(t)} aria-pressed={formType === t}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ${formType === t ? 'bg-white shadow-sm ' + (t === 'exam' ? 'text-red-700' : 'text-violet-700') : 'text-slate-600 dark:text-slate-300'}`}>
                      {t === 'exam' ? <GraduationCap className="w-4 h-4" strokeWidth={2} /> : <CalendarPlus className="w-4 h-4" strokeWidth={2} />}{t === 'exam' ? a.exam : a.planned}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block"><span className={label}>{a.eventName}</span>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={a.eventNamePlaceholder} autoFocus maxLength={80} className={input} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={label}>{a.date}</span><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className={input} /></label>
                <label className="block"><span className={label}>{a.time}</span><input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className={input} /></label>
              </div>
              <div>
                <span className={label}>{a.subject}</span>
                <SubjectSelect value={formSubject} onChange={setFormSubject} options={subjects.map(x => ({ value: x, label: x }))} colors={colors} emptyLabel="Geen vak" label={a.subject} />
              </div>
              {formType === 'exam' && userId && <p className="text-xs text-slate-600 dark:text-slate-300">Tip: wil je ook een studieplanning voor deze toets? Gebruik de <a href="/toetsen" className="font-semibold text-indigo-700 dark:text-indigo-300 underline">Toetsplanner</a>.</p>}
              {formError && <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl hover:bg-indigo-50">{a.cancel}</button>
                <button disabled={saving || !formTitle.trim()} className="text-sm font-semibold bg-indigo-600 text-white rounded-xl px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Opslaan…' : a.save}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showCopyModal && copySource && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowCopyModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="copy-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 id="copy-title" className="text-base font-semibold text-slate-900 dark:text-white">{a.copyTitle}</h3>
            <div className="rounded-xl bg-indigo-50 p-3">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{copySource.title}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{[copySource.category, copySource.duration_minutes ? formatMinutes(copySource.duration_minutes) : null].filter(Boolean).join(' · ')}</p>
            </div>
            <label className="block"><span className={label}>{a.copyToDate}</span>
              <input type="date" value={copyTargetDate} onChange={e => setCopyTargetDate(e.target.value)} className={input} />
            </label>
            <p className="text-xs text-slate-600 dark:text-slate-300">{a.copyNote}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCopyModal(false)} className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl hover:bg-indigo-50">{a.cancel}</button>
              <button onClick={confirmCopy} disabled={saving} className="text-sm font-semibold bg-indigo-600 text-white rounded-xl px-5 py-2.5 hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Bezig…' : a.copyConfirm}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-5 flex justify-center pointer-events-none z-50" role="status">
          <span className="bg-slate-900 text-white text-sm font-medium rounded-xl px-4 py-2.5 shadow-lg">{toast}</span>
        </div>
      )}
    </div>
  )
}
