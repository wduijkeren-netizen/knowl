'use client'

import KnowlSelect from '@/components/KnowlSelect'
import { currentTerm, termsOfYear, type SchoolTerm } from '@/lib/terms'

/** Eerst een schooljaar kiezen, daarna eventueel een trimester. Waarde: '' / 'alles', '2026-2027' of '2026-2027#2'. */
export default function PeriodPicker({ years, terms, today, value, onChange, allValue, allLabel, extra = [], label = 'Schooljaar', className = '' }: {
  years: string[]
  terms: SchoolTerm[]
  today: string
  value: string
  onChange: (value: string) => void
  allValue: string
  allLabel: string
  extra?: { value: string; label: string }[]
  label?: string
  className?: string
}) {
  const now = currentTerm(terms, today)
  const [year, term] = value.split('#')
  const isYear = years.includes(year)
  const started = isYear ? termsOfYear(terms, year).filter(t => t.starts_on <= today) : []

  const yearOptions = [
    ...years.map(y => ({ value: y, label: `Schooljaar ${y}` })),
    ...extra,
    { value: allValue, label: allLabel },
  ]
  const seg = (active: boolean) =>
    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${active ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <KnowlSelect value={isYear ? year : value} onChange={onChange} label={label} size="sm" className="w-52" options={yearOptions} />
      {started.length > 1 && (
        <div className="flex bg-indigo-50 rounded-xl p-1 overflow-x-auto max-w-full" role="group" aria-label={`Trimester in ${year}`}>
          <button type="button" onClick={() => onChange(year)} aria-pressed={!term} className={seg(!term)}>Heel jaar</button>
          {started.map(t => {
            const active = term === String(t.term)
            const current = year === now.year && t.term === now.term
            return (
              <button key={t.term} type="button" onClick={() => onChange(`${year}#${t.term}`)} aria-pressed={active} className={`${seg(active)} inline-flex items-center gap-1.5`}>
                Trimester {t.term}
                {current && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Huidig trimester" aria-label="(nu)" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
