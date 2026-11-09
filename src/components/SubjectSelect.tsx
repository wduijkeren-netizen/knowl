'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { NO_SUBJECT_COLOR } from '@/lib/subjectColors'

type Option = { value: string; label: string; color?: string }

export default function SubjectSelect({ value, onChange, options, colors, emptyLabel, label, className = '' }: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  colors: Record<string, string>
  emptyLabel: string
  label: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const dot = (o?: Option) => o ? (o.color ?? colors[o.value] ?? NO_SUBJECT_COLOR) : null

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="w-full flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {current && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot(current)! }} aria-hidden />}
        <span className={`flex-1 truncate ${current ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{current?.label ?? emptyLabel}</span>
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2} />
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="absolute z-30 mt-1 w-full min-w-[200px] max-h-64 overflow-y-auto bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
          <li>
            <button type="button" role="option" aria-selected={!value} onClick={() => { onChange(''); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5">
              <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" aria-hidden />
              <span className="flex-1 text-left">{emptyLabel}</span>
              {!value && <Check className="w-4 h-4 text-indigo-600" strokeWidth={2} />}
            </button>
          </li>
          {options.map(o => (
            <li key={o.value}>
              <button type="button" role="option" aria-selected={value === o.value} onClick={() => { onChange(o.value); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 hover:bg-indigo-50 dark:hover:bg-white/5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot(o)! }} aria-hidden />
                <span className="flex-1 text-left truncate" title={o.label}>{o.label}</span>
                {value === o.value && <Check className="w-4 h-4 text-indigo-600" strokeWidth={2} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
