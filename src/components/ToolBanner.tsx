'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'

export type BannerMenuItem = { label: string; icon?: ReactNode; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean; divider?: boolean }

type Variant = 'web' | 'cards' | 'notes' | 'timer' | 'calendar'

function Decoration({ variant }: { variant: Variant }) {
  if (variant === 'timer') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <svg className="absolute -left-8 -top-10 w-52 h-52 opacity-20" viewBox="0 0 200 200" fill="none" stroke="white" strokeWidth="1.5">
          <circle cx="100" cy="100" r="62" fill="white" fillOpacity=".12" /><circle cx="100" cy="100" r="46" strokeDasharray="4 8" />
          <line x1="100" y1="100" x2="100" y2="64" strokeWidth="3" strokeLinecap="round" /><line x1="100" y1="100" x2="126" y2="112" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <svg className="absolute -right-10 -bottom-16 w-60 h-60 opacity-20" viewBox="0 0 220 220" fill="none" stroke="white" strokeWidth="1.5">
          <circle cx="110" cy="110" r="70" fill="white" fillOpacity=".12" /><path d="M110 40 A70 70 0 0 1 180 110" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  if (variant === 'calendar') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <svg className="absolute -left-4 -top-6 w-48 h-44 opacity-20" viewBox="0 0 200 180" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="35" y="40" width="110" height="100" rx="12" transform="rotate(-8 90 90)" fill="white" fillOpacity=".15" />
          <g transform="rotate(-8 90 90)">{[0, 1, 2, 3].map(c => [0, 1, 2].map(r => <rect key={`${c}${r}`} x={50 + c * 22} y={70 + r * 20} width="12" height="10" rx="2" fill="white" fillOpacity=".35" stroke="none" />))}</g>
        </svg>
        <svg className="absolute -right-6 -bottom-12 w-56 h-48 opacity-20" viewBox="0 0 220 190" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="70" y="40" width="110" height="100" rx="12" transform="rotate(10 125 90)" fill="white" fillOpacity=".15" />
          <line x1="95" y1="30" x2="95" y2="55" strokeWidth="4" strokeLinecap="round" /><line x1="150" y1="38" x2="148" y2="62" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  if (variant === 'notes') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <svg className="absolute -left-4 -top-6 w-48 h-44 opacity-20" viewBox="0 0 200 180" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="40" y="30" width="90" height="120" rx="10" transform="rotate(-10 85 90)" fill="white" fillOpacity=".15" />
          <line x1="58" y1="70" x2="112" y2="60" /><line x1="60" y1="88" x2="114" y2="78" /><line x1="62" y1="106" x2="100" y2="99" />
        </svg>
        <svg className="absolute -right-6 -bottom-12 w-56 h-48 opacity-20" viewBox="0 0 220 190" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="80" y="40" width="90" height="120" rx="10" transform="rotate(12 125 100)" fill="white" fillOpacity=".15" />
          <line x1="100" y1="80" x2="152" y2="90" /><line x1="98" y1="98" x2="150" y2="108" /><line x1="96" y1="116" x2="134" y2="123" />
        </svg>
      </div>
    )
  }
  if (variant === 'cards') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <svg className="absolute -left-4 -top-6 w-48 h-40 opacity-20" viewBox="0 0 200 160" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="30" y="40" width="70" height="48" rx="8" transform="rotate(-12 65 64)" fill="white" fillOpacity=".15" />
          <rect x="70" y="60" width="70" height="48" rx="8" transform="rotate(8 105 84)" fill="white" fillOpacity=".2" />
        </svg>
        <svg className="absolute -right-6 -bottom-8 w-56 h-44 opacity-20" viewBox="0 0 220 170" fill="none" stroke="white" strokeWidth="1.5">
          <rect x="60" y="40" width="80" height="54" rx="9" transform="rotate(10 100 67)" fill="white" fillOpacity=".15" />
          <rect x="110" y="70" width="80" height="54" rx="9" transform="rotate(-8 150 97)" fill="white" fillOpacity=".2" />
        </svg>
      </div>
    )
  }
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <svg className="absolute -left-6 -top-4 w-56 h-40 opacity-20" viewBox="0 0 220 160" fill="none" stroke="white" strokeWidth="1.5">
        <line x1="40" y1="40" x2="110" y2="80" /><line x1="110" y1="80" x2="180" y2="30" /><line x1="110" y1="80" x2="150" y2="140" /><line x1="40" y1="40" x2="30" y2="120" />
        <circle cx="40" cy="40" r="9" fill="white" fillOpacity=".25" /><circle cx="110" cy="80" r="13" fill="white" fillOpacity=".25" />
        <circle cx="180" cy="30" r="7" fill="white" fillOpacity=".25" /><circle cx="150" cy="140" r="8" fill="white" fillOpacity=".25" /><circle cx="30" cy="120" r="6" fill="white" fillOpacity=".25" />
      </svg>
      <svg className="absolute -right-4 -bottom-10 w-64 h-44 opacity-20" viewBox="0 0 240 170" fill="none" stroke="white" strokeWidth="1.5">
        <line x1="60" y1="60" x2="140" y2="40" /><line x1="140" y1="40" x2="210" y2="90" /><line x1="60" y1="60" x2="120" y2="130" /><line x1="140" y1="40" x2="120" y2="130" />
        <circle cx="60" cy="60" r="10" fill="white" fillOpacity=".25" /><circle cx="140" cy="40" r="8" fill="white" fillOpacity=".25" />
        <circle cx="210" cy="90" r="12" fill="white" fillOpacity=".25" /><circle cx="120" cy="130" r="9" fill="white" fillOpacity=".25" />
      </svg>
    </div>
  )
}

/** Kleurrijke kop voor woordwebben en flashcards: terug links, titel in het midden, acties rechts. */
export default function ToolBanner({ backHref, onBack, backLabel = '', backMobileOnly = false, title, below, actions, menu = [], variant = 'web', width = 'max-w-6xl' }: {
  backHref?: string
  onBack?: () => void
  backMobileOnly?: boolean
  backLabel?: string
  title: ReactNode
  below?: ReactNode
  actions?: ReactNode
  menu?: BannerMenuItem[]
  variant?: Variant
  width?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const backCls = `${backMobileOnly ? 'sm:invisible ' : ''}justify-self-start inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 transition-colors max-w-full`
  const itemCls = (danger?: boolean) => `w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left disabled:opacity-50 ${danger ? 'font-medium text-red-700 dark:text-red-300 hover:bg-red-50' : 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-white/5'}`

  return (
    <div className="relative z-20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-sm">
      <Decoration variant={variant} />
      <div className={`relative ${width} mx-auto px-4 py-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_minmax(0,30rem)_1fr] items-center gap-x-3 gap-y-3`}>
        {onBack ? (
          <button onClick={onBack} className={backCls}><ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2} /> <span className="truncate">{backLabel}</span></button>
        ) : backHref ? (
          <Link href={backHref} className={backCls}><ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={2} /> <span className="truncate">{backLabel}</span></Link>
        ) : <span aria-hidden />}

        <div className="col-span-2 order-last sm:order-none sm:col-span-1 flex flex-col items-center gap-2 min-w-0 text-center">
          {typeof title === 'string' ? <h1 className="w-full text-xl md:text-2xl font-bold text-white truncate">{title}</h1> : title}
          {below}
        </div>

        <div className="justify-self-end flex items-center gap-2">
          {actions}
          {menu.length > 0 && (
            <div ref={ref} className="relative">
              <button onClick={() => setOpen(o => !o)} aria-label="Meer opties" aria-expanded={open} aria-haspopup="menu"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
              </button>
              {open && (
                <div role="menu" className="absolute right-0 top-full mt-1.5 z-40 w-60 bg-white rounded-xl border border-indigo-100 shadow-xl py-1">
                  {menu.map((m, i) => (
                    <div key={i}>
                      {m.divider && <div className="my-1 border-t border-indigo-100" role="separator" />}
                      {m.href ? (
                        <Link role="menuitem" href={m.href} onClick={() => setOpen(false)} className={itemCls(m.danger)}>{m.icon}{m.label}</Link>
                      ) : (
                        <button role="menuitem" disabled={m.disabled} onClick={() => { setOpen(false); m.onClick?.() }} className={itemCls(m.danger)}>{m.icon}{m.label}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const bannerButton = 'inline-flex items-center gap-1.5 bg-white text-indigo-700 text-sm font-semibold px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors'
export const bannerTitleInput = 'w-full bg-transparent text-center text-xl md:text-2xl font-bold text-white placeholder:text-white/60 border-b-2 border-white/25 hover:border-white/50 focus:border-white focus:outline-none px-2 py-1 transition-colors'
