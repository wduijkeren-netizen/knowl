'use client'

import { UNKNOWN_YEAR } from '@/lib/schoolYear'

type Props = {
  years: string[]
  active: string
  onChange: (year: string) => void
  unknownLabel: string
}

export default function SchoolYearTabs({ years, active, onChange, unknownLabel }: Props) {
  if (years.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
      {years.map(year => (
        <button
          key={year}
          onClick={() => onChange(year)}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            active === year
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'bg-white border-indigo-200 text-indigo-500 hover:bg-indigo-50'
          }`}
        >
          {year === UNKNOWN_YEAR ? unknownLabel : year}
        </button>
      ))}
    </div>
  )
}
