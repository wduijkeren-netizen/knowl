'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export type SelectOption = { value: string; label: string }

export default function KnowlSelect({ value, onChange, options, label, className = '', size = 'md', id }: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label: string
  className?: string
  size?: 'sm' | 'md'
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const [focus, setFocus] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelectorAll<HTMLButtonElement>('[role=option]')[focus]?.focus()
  }, [open, focus])

  function toggle() {
    setFocus(Math.max(0, options.findIndex(o => o.value === value)))
    setOpen(o => !o)
  }

  function choose(v: string) {
    onChange(v)
    setOpen(false)
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); toggle(); return }
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(f => Math.min(options.length - 1, f + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(f => Math.max(0, f - 1)) }
    if (e.key === 'Tab') setOpen(false)
  }

  const pad = size === 'sm' ? 'px-3 py-1.5' : 'px-3.5 py-2.5'

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button type="button" id={id} onClick={toggle} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${current?.label ?? ''}`}
        className={`w-full flex items-center gap-2 ${pad} rounded-xl border bg-white text-left text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${open ? 'border-indigo-300 text-indigo-800 dark:text-white' : 'border-indigo-100 text-slate-900 dark:text-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50'}`}>
        <span className="flex-1 truncate">{current?.label ?? label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-indigo-500 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.25} />
      </button>
      {open && (
        <ul ref={listRef} role="listbox" aria-label={label}
          className="absolute z-40 mt-1.5 w-max min-w-full max-w-[90vw] max-h-72 overflow-y-auto bg-white rounded-xl border border-indigo-100 shadow-xl shadow-indigo-900/10 p-1">
          {options.map((o, i) => {
            const selected = o.value === value
            return (
              <li key={o.value}>
                <button type="button" role="option" aria-selected={selected} tabIndex={i === focus ? 0 : -1} onClick={() => choose(o.value)}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:bg-indigo-50 dark:focus:bg-white/5 hover:bg-indigo-50 dark:hover:bg-white/5 ${selected ? 'font-semibold text-indigo-700 dark:text-white' : 'text-slate-800 dark:text-slate-100'}`}>
                  <span className="flex-1 truncate">{o.label}</span>
                  {selected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0" strokeWidth={2.25} />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
