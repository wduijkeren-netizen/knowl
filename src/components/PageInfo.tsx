'use client'

import { useState, useRef, useEffect } from 'react'

export default function PageInfo({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-5 h-5 rounded-full text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
          open ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-400 hover:bg-indigo-200 hover:text-indigo-600'
        }`}
        aria-label="Uitleg"
      >
        ?
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 bg-white border border-indigo-100 rounded-2xl shadow-xl p-4 w-72 text-sm text-indigo-700 leading-relaxed">
          <p>{text}</p>
        </div>
      )}
    </div>
  )
}
