'use client'
import Glyph from '@/components/Glyph'
import { useMemo, useState } from 'react'
import { BookOpen, Plus, Upload, X } from 'lucide-react'
import KnowlSelect from '@/components/KnowlSelect'
import ToolBanner, { bannerButton } from '@/components/ToolBanner'
import { NO_SUBJECT_COLOR, buildSubjectColors } from '@/lib/subjectColors'
import { formatMinutes } from '@/lib/studyStats'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Slot = { id: string; day_of_week: number; start_time: string; end_time: string; label: string }

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

function getFreeBlocks(slots: Slot[], dayOfWeek: number) {
  const toStr = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`
  const daySlots = slots.filter(s => s.day_of_week === dayOfWeek)
  const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const blocks: { start: string; end: string; minutes: number }[] = []
  let cur = 480
  for (const s of sorted) {
    const ss = toMin(s.start_time), se = toMin(s.end_time)
    if (ss > cur + 29) blocks.push({ start: toStr(cur), end: toStr(ss), minutes: ss - cur })
    cur = Math.max(cur, se)
  }
  if (1320 > cur + 29) blocks.push({ start: toStr(cur), end: toStr(1320), minutes: 1320 - cur })
  return blocks.filter(b => b.minutes >= 30)
}

export default function Rooster({ initialSlots, userId }: { initialSlots: Slot[]; userId: string }) {
  const { tr } = useLanguage()
  const r = tr.rooster
  const supabase = createClient()
  const [slots, setSlots] = useState(initialSlots)
  const [formDay, setFormDay] = useState(0)
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('11:00')
  const [formLabel, setFormLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [icalText, setIcalText] = useState('')
  const [icalPreview, setIcalPreview] = useState<{day: number; start: string; end: string; label: string}[]>([])
  const [icalImporting, setIcalImporting] = useState(false)

  const days = [r.day0, r.day1, r.day2, r.day3, r.day4, r.day5, r.day6]
  const todayDow = (new Date().getDay() + 6) % 7
  const freeBlocks = getFreeBlocks(slots, todayDow)

  function parseIcal(text: string): {day: number; start: string; end: string; label: string}[] {
    const results: {day: number; start: string; end: string; label: string}[] = []
    const events = text.split('BEGIN:VEVENT').slice(1)
    for (const ev of events) {
      const startMatch = ev.match(/DTSTART[^:]*:(\d{8}T\d{6})/)
      const endMatch = ev.match(/DTEND[^:]*:(\d{8}T\d{6})/)
      const summaryMatch = ev.match(/SUMMARY:(.+)/)
      if (!startMatch || !endMatch || !summaryMatch) continue
      const toDate = (s: string) => new Date(s.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'))
      const start = toDate(startMatch[1])
      const end = toDate(endMatch[1])
      const label = summaryMatch[1].trim().replace(/\\n/g, ' ').replace(/\\,/g, ',')
      const toTime = (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      results.push({
        day: (start.getDay() + 6) % 7,
        start: toTime(start),
        end: toTime(end),
        label: label.slice(0, 60),
      })
    }
    const unique = results.filter((item, i, arr) =>
      arr.findIndex(x => x.day === item.day && x.start === item.start && x.label === item.label) === i
    )
    return unique.slice(0, 50)
  }

  const [error, setError] = useState('')
  const [showImport, setShowImport] = useState(false)
  const colors = useMemo(() => buildSubjectColors(Array.from(new Set(slots.map(x => x.label)))), [slots])
  const sortSlots = (list: Slot[]) => [...list].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
  const weekMinutes = slots.reduce((sum, x) => sum + Math.max(0, toMin(x.end_time) - toMin(x.start_time)), 0)
  const visibleDays = slots.some(x => x.day_of_week >= 5) ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4]

  async function addSlot(e?: React.FormEvent) {
    e?.preventDefault()
    if (!formLabel.trim()) { setError('Vul in welke les het is.'); return }
    if (!formStart || !formEnd || formStart >= formEnd) { setError('De eindtijd moet na de begintijd liggen.'); return }
    setSaving(true)
    setError('')
    const { data, error: err } = await supabase.from('schedule_slots').insert({
      user_id: userId, day_of_week: formDay, start_time: formStart, end_time: formEnd, label: formLabel.trim(),
    }).select('id, day_of_week, start_time, end_time, label').single()
    setSaving(false)
    if (err || !data) { setError('Opslaan lukte niet. Probeer het opnieuw.'); return }
    setSlots(list => sortSlots([...list, data as Slot]))
    setFormLabel('')
  }

  async function deleteSlot(id: string) {
    const { error: err } = await supabase.from('schedule_slots').delete().eq('id', id)
    if (err) { setError('Verwijderen lukte niet.'); return }
    setSlots(list => list.filter(x => x.id !== id))
  }

  async function importIcal() {
    setIcalImporting(true)
    setError('')
    const { data, error: err } = await supabase.from('schedule_slots')
      .insert(icalPreview.map(item => ({ user_id: userId, day_of_week: item.day, start_time: item.start, end_time: item.end, label: item.label })))
      .select('id, day_of_week, start_time, end_time, label')
    setIcalImporting(false)
    if (err || !data) { setError('Importeren lukte niet. Probeer het opnieuw.'); return }
    setSlots(list => sortSlots([...list, ...(data as Slot[])]))
    setIcalPreview([])
    setIcalText('')
    setShowImport(false)
  }

  const card = 'bg-white rounded-2xl border border-indigo-100 shadow-sm'
  const label = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5'
  const input = 'w-full border border-gray-200 bg-white rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400'

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav loggedIn width="max-w-6xl" />
      <ToolBanner
        variant="calendar" title={r.title}
        below={<span className="text-xs text-white/85">{slots.length ? `${slots.length} ${slots.length === 1 ? 'les' : 'lessen'} per week · ${formatMinutes(weekMinutes)}` : r.subtitle}</span>}
        actions={<button onClick={() => setShowImport(s => !s)} className={bannerButton}><Upload className="w-4 h-4" strokeWidth={2} /> <span className="hidden sm:inline">Importeren</span></button>}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        <div className="space-y-5">
          <form onSubmit={addSlot} className={`${card} overflow-hidden`}>
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center"><Plus className="w-4 h-4 text-white" strokeWidth={2.5} /></span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">Les toevoegen</h2>
                <p className="text-sm text-white/85">Elke week op hetzelfde moment</p>
              </div>
              <PageInfo dark text="Voer hier je lesrooster in. Knowl berekent welke tijd je vrij hebt op een dag, zodat je weet wanneer je kunt studeren." />
            </div>
            <div className="p-5 space-y-3">
              <label className="block"><span className={label}>{r.label}</span>
                <input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="bijv. Wiskunde" maxLength={60} className={input} />
              </label>
              <div><span className={label}>Dag</span>
                <KnowlSelect value={String(formDay)} onChange={v => setFormDay(Number(v))} label="Dag" options={days.map((d, i) => ({ value: String(i), label: d }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className={label}>{r.startTime}</span><input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className={input} /></label>
                <label className="block"><span className={label}>{r.endTime}</span><input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className={input} /></label>
              </div>
              {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
              <button disabled={saving} className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60">
                <Plus className="w-4 h-4" strokeWidth={2.5} /> {saving ? 'Opslaan…' : 'Les opslaan'}
              </button>
            </div>
          </form>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{r.freeBlocks}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Tussen 08:00 en 22:00, blokken van minstens 30 minuten</p>
            {freeBlocks.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-3">{r.noFreeBlocks}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {freeBlocks.map((b, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                    <span className="w-8 h-8 rounded-lg bg-white text-emerald-700 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4" strokeWidth={2} /></span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 tabular-nums">{b.start} – {b.end}</p>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300">{formatMinutes(b.minutes)} vrij</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5 min-w-0">
          {showImport && (
            <section className={`${card} p-5 space-y-4`}>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Importeer vanuit Magister of SOMtoday</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">Exporteer je rooster als .ics-bestand en upload het hier, of plak de inhoud.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 rounded-xl px-3 py-2 hover:bg-indigo-50">
                  <Upload className="w-4 h-4" strokeWidth={2} /> Bestand kiezen (.ics)
                  <input type="file" accept=".ics" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = ev => { const text = ev.target?.result as string; setIcalText(text); setIcalPreview(parseIcal(text)) }
                    reader.readAsText(file)
                  }} />
                </label>
                {icalText && <button onClick={() => { setIcalText(''); setIcalPreview([]) }} className="text-sm text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50">Wissen</button>}
              </div>
              <textarea value={icalText} onChange={e => { setIcalText(e.target.value); setIcalPreview(parseIcal(e.target.value)) }}
                placeholder="Of plak hier de inhoud van je .ics-bestand" rows={4} aria-label="Inhoud van het .ics-bestand"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none text-slate-700" />
              {icalPreview.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{icalPreview.length} lessen gevonden</p>
                  <ul className="max-h-48 overflow-y-auto space-y-1">
                    {icalPreview.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm rounded-lg bg-indigo-50 px-3 py-1.5">
                        <span className="text-xs text-slate-600 w-20 shrink-0">{days[item.day]}</span>
                        <span className="text-xs text-slate-600 tabular-nums">{item.start}–{item.end}</span>
                        <span className="font-medium text-slate-900 dark:text-white truncate">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={importIcal} disabled={icalImporting} className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
                    {icalImporting ? 'Importeren…' : `${icalPreview.length} lessen importeren`}
                  </button>
                </div>
              )}
            </section>
          )}

          <section className={`${card} p-4 sm:p-5`} aria-label="Weekrooster">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Je week</h2>
            {slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-indigo-200 p-8 text-center">
                <span className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Glyph name="calendar" className="w-6 h-6" /></span>
                <p className="text-sm font-medium text-slate-900 dark:text-white mt-2">{r.noSlots}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">Voeg links je eerste les toe, of importeer je rooster.</p>
              </div>
            ) : (
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${visibleDays.length === 7 ? 'xl:grid-cols-7' : 'xl:grid-cols-5'} gap-3`}>
                {visibleDays.map(di => {
                  const daySlots = slots.filter(x => x.day_of_week === di)
                  const isToday = di === todayDow
                  return (
                    <div key={di} className={`rounded-xl border p-2.5 min-w-0 ${isToday ? 'border-indigo-300 bg-indigo-50/60 dark:bg-white/5' : 'border-indigo-100'}`}>
                      <p className={`text-xs font-semibold mb-2 flex items-center justify-between ${isToday ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {days[di]}{isToday && <span className="text-[10px] font-semibold bg-indigo-600 text-white rounded-full px-1.5 py-0.5">vandaag</span>}
                      </p>
                      {daySlots.length === 0 ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">Vrij</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {daySlots.map(slot => {
                            const color = colors[slot.label] ?? NO_SUBJECT_COLOR
                            return (
                              <li key={slot.id} className="group relative rounded-lg border pl-2.5 pr-6 py-1.5" style={{ backgroundColor: `${color}14`, borderColor: `${color}40` }}>
                                <span className="absolute left-0 top-1 bottom-1 w-1 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={slot.label}>{slot.label}</p>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</p>
                                <button onClick={() => deleteSlot(slot.id)} aria-label={`${slot.label} op ${days[di]} verwijderen`}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-slate-500 hover:text-red-700 hover:bg-white sm:opacity-0 group-hover:opacity-100 focus:opacity-100">
                                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
