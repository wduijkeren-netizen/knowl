'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Slot = { id: string; day_of_week: number; start_time: string; end_time: string; label: string }

function getFreeBlocks(slots: Slot[], dayOfWeek: number) {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
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

  const days = [r.day0, r.day1, r.day2, r.day3, r.day4, r.day5, r.day6]
  const todayDow = (new Date().getDay() + 6) % 7
  const freeBlocks = getFreeBlocks(slots, todayDow)

  async function addSlot() {
    if (!formLabel.trim() || !formStart || !formEnd || formStart >= formEnd) return
    setSaving(true)
    const { data, error } = await supabase.from('schedule_slots').insert({
      user_id: userId,
      day_of_week: formDay,
      start_time: formStart,
      end_time: formEnd,
      label: formLabel.trim(),
    }).select('id, day_of_week, start_time, end_time, label').single()
    if (!error && data) {
      setSlots(s => [...s, data as Slot].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
      setFormLabel('')
    }
    setSaving(false)
  }

  async function deleteSlot(id: string) {
    await supabase.from('schedule_slots').delete().eq('id', id)
    setSlots(s => s.filter(x => x.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{r.title}</h1>
          <p className="text-sm text-indigo-400 mt-0.5">{r.subtitle}</p>
        </div>

        {/* Add form */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
          <p className="text-sm font-semibold text-indigo-700">{r.addSlot}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dag</label>
              <select value={formDay} onChange={e => setFormDay(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{r.startTime}</label>
              <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{r.endTime}</label>
              <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{r.label}</label>
              <input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="Wiskunde"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
          <button onClick={addSlot} disabled={saving || !formLabel.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95">
            {saving ? '...' : r.save}
          </button>
        </div>

        {/* Week grid */}
        {slots.length === 0 ? (
          <div className="text-center py-8 text-indigo-300">{r.noSlots}</div>
        ) : (
          <div className="space-y-3">
            {days.map((day, di) => {
              const daySlots = slots.filter(s => s.day_of_week === di)
              if (daySlots.length === 0) return null
              return (
                <div key={di} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4">
                  <p className="text-sm font-semibold text-indigo-700 mb-2">{day}</p>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 text-sm">
                        <span className="font-medium text-indigo-800">{slot.label}</span>
                        <span className="text-indigo-400 text-xs">{slot.start_time}–{slot.end_time}</span>
                        <button onClick={() => deleteSlot(slot.id)} className="text-indigo-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Free blocks today */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-indigo-900">{r.freeBlocks}</h2>
          {freeBlocks.length === 0 ? (
            <p className="text-sm text-indigo-300">{r.noFreeBlocks}</p>
          ) : (
            <div className="space-y-2">
              {freeBlocks.map((b, i) => (
                <div key={i} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                  <div className="text-2xl">📖</div>
                  <div>
                    <p className="font-semibold text-sm text-emerald-800">{b.start} – {b.end}</p>
                    <p className="text-xs text-emerald-500">{b.minutes} {r.minFree}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
