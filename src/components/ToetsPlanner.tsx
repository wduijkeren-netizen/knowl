'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck, Check, ChevronDown, GraduationCap, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import SubjectSelect from '@/components/SubjectSelect'
import MomentForm, { type MomentPrefill } from '@/components/MomentForm'
import { createClient } from '@/lib/supabase/client'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import { MOMENT_TYPES, addDays, formatDay, formatMinutes, localDateStr, type MomentType } from '@/lib/studyStats'
import { PHASE_COLORS, WEEKDAY_SHORT, buildPlan, minutesByDayFor, studyDates, type StudyGoal } from '@/lib/examPlan'

type MomentRow = { category: string | null; duration_minutes: number | null; learned_at: string }

const HOUR_CHIPS = [4, 8, 12, 20]
const STATUS: Record<string, { label: string; cls: string }> = {
  op_schema: { label: 'Op schema', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:text-emerald-300' },
  achter: { label: 'Iets achter', cls: 'bg-orange-50 text-orange-800 border-orange-200 dark:text-orange-300' },
  klaar: { label: 'Doel gehaald', cls: 'bg-emerald-600 text-white border-emerald-600' },
  voorbij: { label: 'Geweest', cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:text-slate-300' },
}

type FormState = { subject: string; title: string; examDate: string; goal: string; hours: string; days: number[] }

export default function ToetsPlanner({ userId, goals: initialGoals, supported, subjects, allSubjects, moments: initialMoments }: {
  userId: string; goals: StudyGoal[]; supported: boolean; subjects: string[]; allSubjects: string[]; moments: MomentRow[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const today = localDateStr(new Date())
  const emptyForm: FormState = { subject: '', title: '', examDate: addDays(today, 14), goal: '', hours: '8', days: [0, 1, 2, 3, 4] }
  const [goals, setGoals] = useState(initialGoals)
  const [moments, setMoments] = useState(initialMoments)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [editing, setEditing] = useState<StudyGoal | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [openPlan, setOpenPlan] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<StudyGoal | null>(null)
  const [logFor, setLogFor] = useState<MomentPrefill | null>(null)
  const [showPast, setShowPast] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!menuId) return
    function onDown(e: MouseEvent) { if (!(e.target as HTMLElement).closest('[data-menu]')) setMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  const colors = useMemo(() => buildSubjectColors([...allSubjects, ...moments.map(m => m.category).filter((c): c is string => !!c)]), [allSubjects, moments])
  const pickable = Array.from(new Set([...subjects, ...(editing ? [editing.subject] : [])])).sort((a, b) => a.localeCompare(b))

  const minutes = Math.round((parseFloat(form.hours.replace(',', '.')) || 0) * 60)
  const startDate = editing?.start_date ?? today
  const previewDays = form.examDate > today ? studyDates(startDate < today ? today : startDate, addDays(form.examDate, -1), form.days).length : 0
  const preview = minutes > 0 && previewDays > 0 ? `Dat is ongeveer ${formatMinutes(Math.ceil(minutes / previewDays / 5) * 5)} per studiedag, verdeeld over ${previewDays} ${previewDays === 1 ? 'dag' : 'dagen'}.` : null

  const plans = goals.map(g => ({ goal: g, ...buildPlan(g, minutesByDayFor(moments, g.subject), today) }))
  const upcoming = plans.filter(p => p.goal.exam_date >= today)
  const past = plans.filter(p => p.goal.exam_date < today).reverse()

  function startEdit(g: StudyGoal) {
    setMenuId(null)
    setEditing(g)
    setForm({ subject: g.subject, title: g.title, examDate: g.exam_date, goal: g.goal ?? '', hours: String(Math.round((g.target_minutes / 60) * 10) / 10), days: g.study_days })
    setError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setEditing(null)
    setForm(emptyForm)
    setError('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject) { setError('Kies een vak.'); return }
    if (!form.title.trim()) { setError('Geef de toets een naam, bijvoorbeeld "Toets hoofdstuk 3".'); return }
    if (form.examDate <= today && !editing) { setError('Kies een toetsdatum na vandaag.'); return }
    if (minutes <= 0) { setError('Vul in hoeveel uur je wilt studeren.'); return }
    if (form.days.length === 0) { setError('Kies minstens één dag waarop je kunt studeren.'); return }
    setSaving(true)
    setError('')
    const values = { subject: form.subject, title: form.title.trim(), exam_date: form.examDate, goal: form.goal.trim() || null, target_minutes: minutes, study_days: form.days }

    if (editing) {
      const { data, error: err } = await supabase.from('study_goals').update(values).eq('id', editing.id).select().single()
      if (err || !data) { setSaving(false); setError('Opslaan lukte niet. Probeer het opnieuw.'); return }
      if (editing.agenda_event_id) {
        await supabase.from('agenda_events').update({ date: values.exam_date, title: values.title, subject: values.subject }).eq('id', editing.agenda_event_id)
      }
      setGoals(list => list.map(g => (g.id === editing.id ? data : g)).sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
      setSaving(false)
      cancelEdit()
      return
    }

    const { data: event } = await supabase.from('agenda_events')
      .insert({ user_id: userId, date: values.exam_date, type: 'exam', title: values.title, subject: values.subject, time: '' })
      .select('id').single()
    const { data, error: err } = await supabase.from('study_goals')
      .insert({ ...values, user_id: userId, start_date: today, agenda_event_id: event?.id ?? null }).select().single()
    setSaving(false)
    if (err || !data) {
      if (event?.id) await supabase.from('agenda_events').delete().eq('id', event.id)
      setError('Opslaan lukte niet. Probeer het opnieuw.')
      return
    }
    setGoals(list => [...list, data].sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
    setOpenPlan(data.id)
    setForm(emptyForm)
  }

  async function confirmDelete() {
    if (!deleting) return
    const { error: err } = await supabase.from('study_goals').delete().eq('id', deleting.id)
    if (err) { setError('Verwijderen lukte niet.'); setDeleting(null); return }
    if (deleting.agenda_event_id) await supabase.from('agenda_events').delete().eq('id', deleting.agenda_event_id)
    setGoals(list => list.filter(g => g.id !== deleting.id))
    setDeleting(null)
  }

  const chip = (active: boolean) => `text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-colors ${active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5'}`
  const fieldLabel = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5'
  const input = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400'

  function GoalCard({ p }: { p: (typeof plans)[number] }) {
    const g = p.goal
    const color = colors[g.subject] ?? NO_SUBJECT_COLOR
    const status = STATUS[p.status]
    const todayTask = p.today && p.today.planned > 0 ? p.today : null
    const open = openPlan === g.id
    return (
      <li className={`relative bg-white rounded-2xl border shadow-sm ${menuId === g.id ? 'z-20' : ''}`} style={{ borderColor: `${color}40` }}>
        <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: color }} aria-hidden />
        <div className="pl-5 pr-3 pt-4 pb-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />{g.subject}
              </p>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-0.5">{g.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                {formatDay(g.exam_date)} · {p.daysLeft > 1 ? `nog ${p.daysLeft} dagen` : p.daysLeft === 1 ? 'morgen' : p.daysLeft === 0 ? 'vandaag' : 'geweest'}
              </p>
            </div>
            <span className={`text-xs font-semibold rounded-full border px-2.5 py-1 shrink-0 ${status.cls}`}>{status.label}</span>
            <div className="relative shrink-0" data-menu>
              <button onClick={() => setMenuId(menuId === g.id ? null : g.id)} aria-label={`Acties voor ${g.title}`} aria-expanded={menuId === g.id}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-white/5"><MoreHorizontal className="w-4 h-4" strokeWidth={2} /></button>
              {menuId === g.id && (
                <div role="menu" className="absolute right-0 top-full mt-1 z-30 w-44 bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
                  <button role="menuitem" onClick={() => startEdit(g)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5"><Pencil className="w-4 h-4" strokeWidth={2} /> Aanpassen</button>
                  <button role="menuitem" onClick={() => { setMenuId(null); setDeleting(g) }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50"><Trash2 className="w-4 h-4" strokeWidth={2} /> Verwijderen</button>
                </div>
              )}
            </div>
          </div>

          {g.goal && (
            <p className="text-sm text-slate-800 dark:text-slate-100 bg-indigo-50/60 dark:bg-white/5 rounded-xl px-3 py-2">
              <span className="font-medium text-indigo-800 dark:text-indigo-300">Leerdoel: </span>{g.goal}
            </p>
          )}

          <div>
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-200 mb-1">
              <span>{formatMinutes(p.done)} van {formatMinutes(g.target_minutes)} gestudeerd</span>
              <span>{p.pct}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${p.pct}%`, backgroundColor: p.status === 'klaar' ? '#059669' : color }} />
            </div>
          </div>

          {p.status !== 'voorbij' && p.status !== 'klaar' && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-indigo-100 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                {todayTask ? (
                  <>
                    <p className="text-sm text-slate-900 dark:text-white">
                      <span className="font-semibold">Vandaag: {formatMinutes(todayTask.planned)}</span>{' '}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 align-middle" style={{ backgroundColor: `${PHASE_COLORS[todayTask.phase]}18`, color: PHASE_COLORS[todayTask.phase] }}>{MOMENT_TYPES[todayTask.phase]}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {todayTask.open === 0 ? 'Gedaan voor vandaag. Goed bezig!' : todayTask.done > 0 ? `Nog ${formatMinutes(todayTask.open)} te gaan.` : `Nog ${p.studyDaysLeft} studiedag${p.studyDaysLeft === 1 ? '' : 'en'} tot de toets.`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Vandaag geen studiedag.{p.nextDay ? ` Volgende: ${formatDay(p.nextDay.date)}, ${formatMinutes(p.perDay)} ${MOMENT_TYPES[p.nextDay.phase].toLowerCase()}.` : ''}
                  </p>
                )}
              </div>
              <button onClick={() => setLogFor({ nonce: Date.now(), category: g.subject, minutes: todayTask?.open || p.perDay || null, title: `${MOMENT_TYPES[(todayTask ?? p.nextDay)?.phase ?? 'new']} voor ${g.title}` })}
                className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl px-3.5 py-2 hover:bg-indigo-700 shrink-0">
                <Plus className="w-4 h-4" strokeWidth={2.5} /> Leermoment loggen
              </button>
            </div>
          )}

          <button onClick={() => setOpenPlan(open ? null : g.id)} aria-expanded={open} className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-900">
            {open ? 'Planning verbergen' : 'Bekijk planning'} <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
          </button>

          {open && (
            <div className="space-y-2">
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
                {p.plan.map(d => {
                  const isToday = d.date === today
                  const pastDay = d.date < today
                  const met = d.done > 0 && (pastDay || d.done >= d.planned)
                  return (
                    <li key={d.date} className={`rounded-lg border px-2 py-1.5 text-xs ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
                      style={{ borderColor: `${PHASE_COLORS[d.phase]}40`, backgroundColor: `${PHASE_COLORS[d.phase]}${pastDay ? '08' : '12'}` }}
                      aria-label={`${formatDay(d.date)}: ${MOMENT_TYPES[d.phase]}, ${pastDay ? `${formatMinutes(d.done)} gedaan` : `${formatMinutes(d.planned)} gepland`}`}>
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-semibold ${pastDay ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{formatDay(d.date).split(' ').slice(0, 2).join(' ')}</span>
                        {met && <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={3} />}
                      </div>
                      <div className="mt-0.5 tabular-nums text-slate-700 dark:text-slate-300">{pastDay ? (d.done ? formatMinutes(d.done) : '–') : formatMinutes(d.planned)}</div>
                    </li>
                  )
                })}
                <li className="rounded-lg border border-slate-300 bg-slate-900 text-white px-2 py-1.5 text-xs dark:bg-white dark:text-slate-900">
                  <div className="font-semibold">{formatDay(g.exam_date).split(' ').slice(0, 2).join(' ')}</div>
                  <div className="mt-0.5 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" strokeWidth={2} /> Toets</div>
                </li>
              </ol>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                {(['new', 'practice', 'review'] as MomentType[]).map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PHASE_COLORS[t] }} aria-hidden />{MOMENT_TYPES[t]}</span>
                ))}
                <span>Studiedagen: {g.study_days.map(d => WEEKDAY_SHORT[d]).join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-4xl" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-indigo-950 dark:text-white">Toetsplanner</h1>
            <PageInfo text="Vul in wanneer je toets is, wat je wilt kunnen en hoeveel tijd je ervoor wilt studeren. Knowl verdeelt die tijd over je studiedagen: eerst nieuwe stof, dan oefenen en de laatste dagen herhalen. Wat je logt bij het vak telt automatisch mee." />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {upcoming.length ? `${upcoming.length} ${upcoming.length === 1 ? 'toets' : 'toetsen'} gepland.` : 'Plan je volgende toets en weet elke dag wat je moet doen.'}
          </p>
        </header>

        {!supported && (
          <p className="text-sm text-slate-700 dark:text-slate-200 bg-white border border-amber-200 rounded-xl px-4 py-3">De toetsplanner is nog niet ingeschakeld in de database.</p>
        )}

        {supported && (
          <form ref={formRef} onSubmit={save} className="bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden scroll-mt-20">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center"><CalendarCheck className="w-4 h-4 text-white" strokeWidth={2} /></span>
              <div>
                <h2 className="text-base font-semibold text-white">{editing ? 'Toets aanpassen' : 'Nieuwe toets plannen'}</h2>
                <p className="text-sm text-white/85">Leerdoel, datum en hoeveel tijd je ervoor neemt</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className={fieldLabel}>Vak</span>
                  <SubjectSelect value={form.subject} onChange={v => setForm({ ...form, subject: v })} options={pickable.map(n => ({ value: n, label: n }))} colors={colors} emptyLabel="Kies een vak" label="Vak" />
                </div>
                <label className="block">
                  <span className={fieldLabel}>Datum van de toets</span>
                  <input type="date" value={form.examDate} min={editing ? undefined : addDays(today, 1)} onChange={e => setForm({ ...form, examDate: e.target.value })} className={input} />
                </label>
              </div>
              <label className="block">
                <span className={fieldLabel}>Welke toets?</span>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={80} placeholder="bijv. Toets hoofdstuk 3 en 4" className={input} />
              </label>
              <label className="block">
                <span className={fieldLabel}>Leerdoel <span className="font-normal text-slate-500">(niet verplicht)</span></span>
                <textarea value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} rows={3} maxLength={300}
                  placeholder="Wat wil je na het leren kunnen? bijv. De formules uit H3 zonder spiekbriefje toepassen" className={`${input} resize-none`} />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className={fieldLabel}>Hoeveel uur wil je ervoor studeren?</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {HOUR_CHIPS.map(h => <button key={h} type="button" onClick={() => setForm({ ...form, hours: String(h) })} aria-pressed={form.hours === String(h)} className={chip(form.hours === String(h))}>{h} uur</button>)}
                    <input value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} inputMode="decimal" aria-label="Aantal uur"
                      className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
                <div>
                  <span className={fieldLabel}>Op welke dagen kun je studeren?</span>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Studiedagen">
                    {WEEKDAY_SHORT.map((d, i) => (
                      <button key={d} type="button" aria-pressed={form.days.includes(i)} className={`${chip(form.days.includes(i))} w-10`}
                        onClick={() => setForm({ ...form, days: form.days.includes(i) ? form.days.filter(x => x !== i) : [...form.days, i].sort() })}>{d}</button>
                    ))}
                  </div>
                </div>
              </div>
              {preview && <p className="text-sm text-indigo-900 dark:text-indigo-200 bg-indigo-50 rounded-xl px-3.5 py-2.5">{preview} Eerst nieuwe stof, dan oefenen, de laatste twee dagen herhalen.</p>}
              {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
              <div className="flex justify-end gap-2">
                {editing && <button type="button" onClick={cancelEdit} className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl hover:bg-indigo-50">Annuleren</button>}
                <button disabled={saving} className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                  {editing ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
                  {saving ? 'Opslaan…' : editing ? 'Wijzigingen opslaan' : 'Planning maken'}
                </button>
              </div>
            </div>
          </form>
        )}

        {upcoming.length > 0 && (
          <section aria-label="Komende toetsen">
            <h2 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">Komende toetsen</h2>
            <ul className="space-y-3">{upcoming.map(p => <GoalCard key={p.goal.id} p={p} />)}</ul>
          </section>
        )}

        {supported && upcoming.length === 0 && (
          <div className="bg-white border border-dashed border-indigo-200 rounded-2xl p-8 text-center">
            <span className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><GraduationCap className="w-6 h-6" strokeWidth={2} /></span>
            <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">Nog geen toetsen gepland</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">Vul hierboven je eerste toets in. Je ziet dan meteen hoeveel je per dag moet doen.</p>
          </div>
        )}

        {past.length > 0 && (
          <section aria-label="Afgelopen toetsen">
            <button onClick={() => setShowPast(s => !s)} aria-expanded={showPast} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Afgelopen toetsen ({past.length}) <ChevronDown className={`w-4 h-4 transition-transform ${showPast ? 'rotate-180' : ''}`} strokeWidth={2} />
            </button>
            {showPast && <ul className="space-y-3">{past.map(p => <GoalCard key={p.goal.id} p={p} />)}</ul>}
          </section>
        )}
      </main>

      {logFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setLogFor(null)}>
          <div role="dialog" aria-modal="true" aria-label="Nieuw leermoment" className="w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <MomentForm userId={userId} subjects={pickable} colors={colors} variant="modal" prefill={logFor} onClose={() => setLogFor(null)}
              onSaved={m => { setMoments(list => [{ category: m.category ?? null, duration_minutes: m.duration_minutes, learned_at: m.learned_at }, ...list]); setLogFor(null) }} />
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={() => setDeleting(null)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-goal" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 id="del-goal" className="text-base font-semibold text-slate-900 dark:text-white">Toets verwijderen?</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">&lsquo;{deleting.title}&rsquo; en de planning worden verwijderd, ook uit je agenda. Je leermomenten blijven bewaard.</p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setDeleting(null)} autoFocus className="text-sm text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl hover:bg-indigo-50">Annuleren</button>
              <button onClick={confirmDelete} className="text-sm font-semibold bg-red-600 text-white rounded-xl px-4 py-2 hover:bg-red-700">Verwijderen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
