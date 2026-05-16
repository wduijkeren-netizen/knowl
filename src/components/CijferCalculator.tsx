'use client'

import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Cijfer = {
  id: string
  naam: string
  cijfer: string
  weging: string
}

type Vak = {
  id: string
  naam: string
  cijfers: Cijfer[]
  doelcijfer: string
  toekomstigeWeging: string
}

function uid() { return Math.random().toString(36).slice(2) }

function berekenGemiddelde(cijfers: Cijfer[]): number | null {
  const geldig = cijfers.filter(c => {
    const n = parseFloat(c.cijfer.replace(',', '.'))
    const w = parseFloat(c.weging.replace(',', '.'))
    return !isNaN(n) && !isNaN(w) && w > 0
  })
  if (geldig.length === 0) return null
  const totaalWeging = geldig.reduce((s, c) => s + parseFloat(c.weging.replace(',', '.')), 0)
  const gewogenSom = geldig.reduce((s, c) => s + parseFloat(c.cijfer.replace(',', '.')) * parseFloat(c.weging.replace(',', '.')), 0)
  return gewogenSom / totaalWeging
}

function berekenBenodigdCijfer(cijfers: Cijfer[], doel: number, toekomstigeWeging: number): number | null {
  const geldig = cijfers.filter(c => {
    const n = parseFloat(c.cijfer.replace(',', '.'))
    const w = parseFloat(c.weging.replace(',', '.'))
    return !isNaN(n) && !isNaN(w) && w > 0
  })
  const totaalHuidigeWeging = geldig.reduce((s, c) => s + parseFloat(c.weging.replace(',', '.')), 0)
  const gewogenSomHuidig = geldig.reduce((s, c) => s + parseFloat(c.cijfer.replace(',', '.')) * parseFloat(c.weging.replace(',', '.')), 0)
  const totaalWeging = totaalHuidigeWeging + toekomstigeWeging
  const benodigd = (doel * totaalWeging - gewogenSomHuidig) / toekomstigeWeging
  return benodigd
}

function BenodigdBadge({ benodigd, labels }: { benodigd: number | null; labels: { impossible: string; impossibleSub: string; achieved: string; achievedSub: string; needed: string } }) {
  if (benodigd === null) return null
  if (benodigd > 10) return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <span className="text-xl">😬</span>
      <div>
        <p className="text-sm font-semibold text-red-700">{labels.impossible}</p>
        <p className="text-xs text-red-400">{labels.impossibleSub.replace('{grade}', benodigd.toFixed(1))}</p>
      </div>
    </div>
  )
  if (benodigd < 1) return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <span className="text-xl">🎉</span>
      <div>
        <p className="text-sm font-semibold text-emerald-700">{labels.achieved}</p>
        <p className="text-xs text-emerald-500">{labels.achievedSub}</p>
      </div>
    </div>
  )
  const emoji = benodigd >= 8 ? '😰' : benodigd >= 5.5 ? '📚' : '😌'
  if (benodigd >= 8) return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-xs text-amber-400 uppercase tracking-wide font-semibold">{labels.needed}</p>
        <p className="text-3xl font-bold text-amber-700">{benodigd.toFixed(1)}</p>
      </div>
    </div>
  )
  if (benodigd >= 5.5) return (
    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-xs text-indigo-400 uppercase tracking-wide font-semibold">{labels.needed}</p>
        <p className="text-3xl font-bold text-indigo-700">{benodigd.toFixed(1)}</p>
      </div>
    </div>
  )
  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-xs text-emerald-400 uppercase tracking-wide font-semibold">{labels.needed}</p>
        <p className="text-3xl font-bold text-emerald-700">{benodigd.toFixed(1)}</p>
      </div>
    </div>
  )
}

export default function CijferCalculator() {
  const { tr } = useLanguage()
  const c = tr.cijfers

  const [vakken, setVakken] = useState<Vak[]>(() => {
    try {
      const saved = localStorage.getItem('knowl_cijfers')
      if (saved) return JSON.parse(saved) as Vak[]
    } catch {}
    return [{ id: uid(), naam: '', doelcijfer: '6', toekomstigeWeging: '1', cijfers: [{ id: uid(), naam: '', cijfer: '', weging: '1' }] }]
  })

  useEffect(() => {
    try { localStorage.setItem('knowl_cijfers', JSON.stringify(vakken)) } catch {}
  }, [vakken])

  function addVak() {
    setVakken(v => [...v, { id: uid(), naam: '', doelcijfer: '6', toekomstigeWeging: '1', cijfers: [{ id: uid(), naam: '', cijfer: '', weging: '1' }] }])
  }

  function removeVak(id: string) {
    setVakken(v => v.filter(vak => vak.id !== id))
  }

  function updateVak(id: string, field: keyof Omit<Vak, 'id' | 'cijfers'>, value: string) {
    setVakken(v => v.map(vak => vak.id === id ? { ...vak, [field]: value } : vak))
  }

  function addCijfer(vakId: string) {
    setVakken(v => v.map(vak => vak.id === vakId
      ? { ...vak, cijfers: [...vak.cijfers, { id: uid(), naam: '', cijfer: '', weging: '1' }] }
      : vak))
  }

  function removeCijfer(vakId: string, cijferId: string) {
    setVakken(v => v.map(vak => vak.id === vakId
      ? { ...vak, cijfers: vak.cijfers.filter(c => c.id !== cijferId) }
      : vak))
  }

  function updateCijfer(vakId: string, cijferId: string, field: keyof Omit<Cijfer, 'id'>, value: string) {
    setVakken(v => v.map(vak => vak.id === vakId
      ? { ...vak, cijfers: vak.cijfers.map(ci => ci.id === cijferId ? { ...ci, [field]: value } : ci) }
      : vak))
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900">{c.title}</h1>
            <p className="text-sm text-indigo-400 mt-0.5">{c.subtitle}</p>
          </div>
          <button onClick={addVak}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all whitespace-nowrap">
            {c.addSubject}
          </button>
        </div>

        {vakken.map((vak, vi) => {
          const gem = berekenGemiddelde(vak.cijfers)
          const doel = parseFloat(vak.doelcijfer.replace(',', '.'))
          const toekomstig = parseFloat(vak.toekomstigeWeging.replace(',', '.'))
          const benodigd = !isNaN(doel) && !isNaN(toekomstig) && toekomstig > 0
            ? berekenBenodigdCijfer(vak.cijfers, doel, toekomstig)
            : null

          return (
            <div key={vak.id} className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center gap-3">
                <input
                  value={vak.naam}
                  onChange={e => updateVak(vak.id, 'naam', e.target.value)}
                  placeholder={c.subjectPlaceholder.replace('{n}', String(vi + 1))}
                  className="flex-1 min-w-0 bg-white/20 text-white placeholder-indigo-200 font-semibold rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:bg-white/30 transition-colors"
                />
                {gem !== null && (
                  <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center shrink-0">
                    <p className="text-xs text-indigo-200">{c.average}</p>
                    <p className="text-lg font-bold text-white">{gem.toFixed(1)}</p>
                  </div>
                )}
                {vakken.length > 1 && (
                  <button onClick={() => removeVak(vak.id)} className="text-white/50 hover:text-white transition-colors text-xl leading-none shrink-0">×</button>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wide px-1">
                    <span className="col-span-5 truncate">{c.colName}</span>
                    <span className="col-span-3 truncate">{c.colGrade}</span>
                    <span className="col-span-3 truncate">{c.colWeight}</span>
                    <span className="col-span-1" />
                  </div>
                  {vak.cijfers.map(ci => (
                    <div key={ci.id} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        value={ci.naam}
                        onChange={e => updateCijfer(vak.id, ci.id, 'naam', e.target.value)}
                        placeholder="bijv. SO H3"
                        className="col-span-5 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all min-w-0"
                      />
                      <input
                        value={ci.cijfer}
                        onChange={e => updateCijfer(vak.id, ci.id, 'cijfer', e.target.value)}
                        placeholder="7.5"
                        inputMode="decimal"
                        className="col-span-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-center min-w-0"
                      />
                      <input
                        value={ci.weging}
                        onChange={e => updateCijfer(vak.id, ci.id, 'weging', e.target.value)}
                        placeholder="1"
                        inputMode="decimal"
                        className="col-span-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-center min-w-0"
                      />
                      <button
                        onClick={() => removeCijfer(vak.id, ci.id)}
                        disabled={vak.cijfers.length === 1}
                        className="col-span-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-0 text-lg leading-none text-center">
                        ×
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addCijfer(vak.id)}
                    className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors mt-1">
                    {c.addGrade}
                  </button>
                </div>

                <div className="border-t border-indigo-50 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{c.sectionTitle}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{c.targetLabel}</label>
                      <input
                        value={vak.doelcijfer}
                        onChange={e => updateVak(vak.id, 'doelcijfer', e.target.value)}
                        placeholder="6.0"
                        inputMode="decimal"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1 truncate">{c.futureWeightLabel}</label>
                      <input
                        value={vak.toekomstigeWeging}
                        onChange={e => updateVak(vak.id, 'toekomstigeWeging', e.target.value)}
                        placeholder="1"
                        inputMode="decimal"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center font-semibold"
                      />
                    </div>
                  </div>
                  <BenodigdBadge benodigd={benodigd} labels={{ impossible: c.impossible, impossibleSub: c.impossibleSub, achieved: c.achieved, achievedSub: c.achievedSub, needed: c.needed }} />
                </div>

                {vak.cijfers.filter(ci => parseFloat(ci.cijfer.replace(',', '.')) > 0).length > 0 && (
                  <div className="border-t border-indigo-50 pt-4">
                    <div className="flex gap-3 flex-wrap">
                      {vak.cijfers
                        .filter(ci => parseFloat(ci.cijfer.replace(',', '.')) > 0)
                        .map(ci => {
                          const n = parseFloat(ci.cijfer.replace(',', '.'))
                          return (
                            <div key={ci.id} className={`rounded-xl px-3 py-2 text-center border ${
                              n >= 5.5 ? n >= 7 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                            }`}>
                              <p className={`text-lg font-bold ${n >= 5.5 ? n >= 7 ? 'text-emerald-600' : 'text-amber-600' : 'text-red-500'}`}>{n.toFixed(1)}</p>
                              {ci.naam && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[80px]">{ci.naam}</p>}
                              {parseFloat(ci.weging) !== 1 && <p className="text-xs text-gray-300">×{ci.weging}</p>}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div className="bg-indigo-50 rounded-2xl p-4 text-xs text-indigo-400 space-y-1">
          <p><span className="font-semibold text-indigo-600">{c.colWeight}:</span> {c.infoWeight}</p>
          <p><span className="font-semibold text-indigo-600">{c.infoDecimal.split(':')[0]}:</span>{c.infoDecimal.includes(':') ? c.infoDecimal.split(':').slice(1).join(':') : c.infoDecimal}</p>
          <p className="text-indigo-300">{c.infoNote}</p>
        </div>

        <div className="text-center">
          <Link href="/vakken" className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors">
            {c.subjectLink}
          </Link>
        </div>
      </main>
    </div>
  )
}
