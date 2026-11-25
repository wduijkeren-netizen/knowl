'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

const WIDTH = 288
const GAP = 8
const MARGIN = 16

/** Uitlegknopje met een ballon die altijd bovenop alles staat en binnen het scherm blijft. */
export default function PageInfo({ text, dark = false }: { text: string; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(WIDTH, vw - MARGIN * 2)
    const left = Math.min(Math.max(r.left, MARGIN), vw - width - MARGIN)
    const height = popupRef.current?.offsetHeight ?? 120
    const below = r.bottom + GAP
    const top = below + height > vh - MARGIN && r.top - GAP - height > MARGIN ? r.top - GAP - height : below
    setPos({ left, top, width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    const id = requestAnimationFrame(place)
    return () => cancelAnimationFrame(id)
  }, [open, place])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || popupRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`w-5 h-5 rounded-full text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
          dark
            ? open ? 'bg-white text-indigo-600' : 'bg-white/20 text-white hover:bg-white/40'
            : open ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 hover:text-indigo-800'
        }`}
        aria-label="Uitleg"
      >
        ?
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          role="tooltip"
          style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999, width: pos?.width ?? WIDTH }}
          className="z-[100] bg-white border border-indigo-100 rounded-2xl shadow-xl p-4 text-sm text-slate-700 dark:text-slate-200 leading-relaxed"
        >
          <p>{text}</p>
        </div>,
        document.body,
      )}
    </span>
  )
}
