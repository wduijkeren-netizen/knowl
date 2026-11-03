'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AnimatePresence, motion, MotionConfig, animate, useInView, useMotionTemplate, useMotionValue,
  useScroll, useSpring, useTransform, type Variants,
} from 'framer-motion'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import t, { languages, type LangCode } from '@/lib/i18n/translations'
import { useGuest } from '@/lib/GuestContext'
import { createClient } from '@/lib/supabase/client'

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
}

const stagger = (delay = 0, gap = 0.08): Variants => ({
  hidden: {},
  show: { transition: { delayChildren: delay, staggerChildren: gap } },
})

const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.4 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 18 } },
}

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger(delay, 0.1)}
    >
      {children}
    </motion.div>
  )
}

function AnimatedWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <motion.span className={className} initial="hidden" animate="show" variants={stagger(delay, 0.07)}>
      {text.split(' ').map((word, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-1">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: '110%', rotate: 6 },
              show: { y: '0%', rotate: 0, transition: { duration: 0.8, ease } },
            }}
          >
            {word}{' '}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}

function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, { duration: 1.6, ease, onUpdate: v => setValue(Math.round(v)) })
    return () => controls.stop()
  }, [inView, to])

  return <p ref={ref} className={className}>{value.toLocaleString('nl-NL')}</p>
}

function TiltCard({ children, className, float = 0 }: { children: ReactNode; className?: string; float?: number }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 20 })

  return (
    <motion.div variants={fadeUp} style={{ perspective: 900 }}>
      <div className="animate-float motion-reduce:animate-none" style={{ animationDelay: `${float}s` }}>
        <motion.div
          className={className}
          style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
          whileHover={{ scale: 1.03 }}
          onMouseMove={e => {
            const r = e.currentTarget.getBoundingClientRect()
            x.set((e.clientX - r.left) / r.width - 0.5)
            y.set((e.clientY - r.top) / r.height - 0.5)
          }}
          onMouseLeave={() => { x.set(0); y.set(0) }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  )
}

type IconName = 'target' | 'trend' | 'cards' | 'web' | 'timer' | 'calendar' | 'chart' | 'flame' | 'lock' | 'check' | 'bell'

type Shape =
  | { t: 'path'; d: string }
  | { t: 'circle'; cx: number; cy: number; r: number }
  | { t: 'rect'; x: number; y: number; width: number; height: number; rx: number }

const ICONS: Record<IconName, Shape[]> = {
  target: [{ t: 'circle', cx: 12, cy: 12, r: 10 }, { t: 'circle', cx: 12, cy: 12, r: 6 }, { t: 'circle', cx: 12, cy: 12, r: 2 }],
  trend: [{ t: 'path', d: 'M22 7 13.5 15.5 8.5 10.5 2 17' }, { t: 'path', d: 'M16 7h6v6' }],
  cards: [{ t: 'path', d: 'm12 2 10 5-10 5L2 7Z' }, { t: 'path', d: 'm2 12 10 5 10-5' }, { t: 'path', d: 'm2 17 10 5 10-5' }],
  web: [{ t: 'circle', cx: 18, cy: 5, r: 3 }, { t: 'circle', cx: 6, cy: 12, r: 3 }, { t: 'circle', cx: 18, cy: 19, r: 3 }, { t: 'path', d: 'M8.6 13.5l6.8 4M15.4 6.5l-6.8 4' }],
  timer: [{ t: 'circle', cx: 12, cy: 14, r: 8 }, { t: 'path', d: 'M10 2h4M12 14l3-3' }],
  calendar: [{ t: 'rect', x: 3, y: 4, width: 18, height: 18, rx: 2 }, { t: 'path', d: 'M16 2v4M8 2v4M3 10h18' }],
  chart: [{ t: 'path', d: 'M3 3v18h18' }, { t: 'path', d: 'M8 17v-3M13 17V9M18 17V5' }],
  flame: [{ t: 'path', d: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z' }],
  lock: [{ t: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2 }, { t: 'path', d: 'M7 11V7a5 5 0 0 1 10 0v4' }],
  check: [{ t: 'path', d: 'M20 6 9 17l-5-5' }],
  bell: [{ t: 'path', d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }, { t: 'path', d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }],
}

function Icon({ name, className, strokeWidth = 2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ICONS[name].map((shape, i) => {
        const draw = {
          initial: { pathLength: 0, opacity: 0 },
          whileInView: { pathLength: 1, opacity: 1 },
          viewport: { once: true },
          transition: { duration: 0.9, ease, delay: 0.15 + i * 0.15 },
        }
        if (shape.t === 'circle') return <motion.circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} {...draw} />
        if (shape.t === 'rect') return <motion.rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...draw} />
        return <motion.path key={i} d={shape.d} {...draw} />
      })}
    </svg>
  )
}

type ShowcaseFeature = { title: string; desc: string; icon: IconName; gradient: string; demo: ReactNode }

function PrimaryFeatureCard({ title, desc, color, icon, Demo, index }: {
  title: string; desc: string; color: string; icon: IconName; Demo: () => JSX.Element; index: number
}) {
  const [replay, setReplay] = useState(0)
  const mx = useMotionValue(-300)
  const my = useMotionValue(-300)
  const glow = useMotionTemplate`radial-gradient(260px circle at ${mx}px ${my}px, rgba(255,255,255,0.28), transparent 70%)`

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, x: index === 0 ? -60 : 60 },
        show: { opacity: 1, x: 0, transition: { duration: 0.8, ease } },
      }}
      whileHover={{ y: -8 }}
      onMouseEnter={() => setReplay(r => r + 1)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set(e.clientX - r.left)
        my.set(e.clientY - r.top)
      }}
      onMouseLeave={() => { mx.set(-300); my.set(-300) }}
      className="relative rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-200/70 transition-shadow border border-indigo-100 group"
    >
      <div className={`relative overflow-hidden h-56 ${color}`}>
        <motion.div
          className="absolute -left-16 -bottom-24 w-64 h-64 rounded-full bg-white/10 blur-2xl"
          animate={{ x: [0, 40, 0], y: [0, -20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: index }}
        />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_75%)]" />
        <div className="absolute top-4 right-4 bottom-20 left-[30%] flex items-center justify-center">
          <Demo key={replay} />
        </div>
        <div className="absolute left-6 bottom-5 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm text-white flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
            <Icon name={icon} className="w-6 h-6" />
          </span>
          <h3 className="text-lg md:text-xl font-bold text-white leading-tight max-w-[9rem]">{title}</h3>
        </div>
      </div>
      <motion.div className="absolute inset-0 pointer-events-none" style={{ background: glow }} />
      <div className="relative bg-white px-6 py-5">
        <p className="text-sm text-indigo-500 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  )
}

function GoalDemo() {
  const rings = [52, 38, 24]
  return (
    <svg viewBox="0 0 220 160" className="w-full h-full max-w-[260px] overflow-visible">
      {rings.map((r, i) => (
        <motion.circle
          key={r}
          cx={140}
          cy={80}
          r={r}
          fill="white"
          fillOpacity={0.06 + i * 0.05}
          stroke="white"
          strokeOpacity={0.5 + i * 0.2}
          strokeWidth={2}
          transform="rotate(-90 140 80)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease, delay: 0.1 + i * 0.15 }}
        />
      ))}
      <motion.circle
        cx={140} cy={80} r={9} fill="white"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.6 }}
        style={{ originX: '140px', originY: '80px' }}
      />
      <motion.circle
        cx={140} cy={80} fill="none" stroke="white" strokeWidth={2}
        initial={{ r: 9, opacity: 0 }}
        animate={{ r: [9, 70], opacity: [0.9, 0] }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: 1.25, repeat: Infinity, repeatDelay: 1.6 }}
      />
      <motion.g
        initial={{ x: -170, y: -60, opacity: 0 }}
        animate={{ x: 0, y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.5, 0, 0.75, 0], delay: 0.7 }}
      >
        <motion.g
          animate={{ rotate: [0, -6, 4, -2, 0] }}
          transition={{ duration: 0.6, delay: 1.25 }}
          style={{ originX: '140px', originY: '80px' }}
        >
          <line x1={140} y1={80} x2={86} y2={60} stroke="white" strokeWidth={3} strokeLinecap="round" />
          <path d="M140 80 L130.5 71 L127 80.5 Z" fill="white" />
          <path d="M90 61.5 L84.2 54 M90 61.5 L80.8 63.4 M97 64 L91.2 56.5 M97 64 L87.8 66" stroke="white" strokeWidth={2.5} strokeLinecap="round" />
        </motion.g>
      </motion.g>
      <motion.g
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5, ease }}
      >
        <rect x={6} y={8} width={74} height={30} rx={10} fill="white" fillOpacity={0.18} stroke="white" strokeOpacity={0.35} />
        <rect x={16} y={27} width={54} height={4} rx={2} fill="white" fillOpacity={0.25} />
        <motion.rect
          x={16} y={27} height={4} rx={2} fill="white"
          initial={{ width: 0 }} animate={{ width: 54 * 0.62 }}
          transition={{ duration: 1.2, ease, delay: 1.7 }}
        />
        <foreignObject x={14} y={9} width={60} height={18}>
          <CountUp to={62} className="text-[11px] font-bold text-white tabular-nums leading-[18px] after:content-['%']" />
        </foreignObject>
      </motion.g>
    </svg>
  )
}

const TREND_POINTS: [number, number][] = [[8, 120], [42, 104], [76, 110], [110, 80], [144, 86], [178, 50], [212, 28]]

function ProgressDemo() {
  const line = TREND_POINTS.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  const area = `${line} L212 150 L8 150 Z`
  const [lastX, lastY] = TREND_POINTS[TREND_POINTS.length - 1]

  return (
    <svg viewBox="0 0 220 160" className="w-full h-full max-w-[270px] overflow-visible">
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity={0.45} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </linearGradient>
      </defs>
      {[40, 80, 120].map(y => (
        <line key={y} x1={0} x2={220} y1={y} y2={y} stroke="white" strokeOpacity={0.15} strokeDasharray="3 5" />
      ))}
      <motion.path
        d={area}
        fill="url(#trend-fill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.3 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="white"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.2 }}
      />
      {TREND_POINTS.map(([x, y], i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={y}
          r={i === TREND_POINTS.length - 1 ? 6 : 4}
          fill="white"
          stroke="rgba(99,102,241,0.6)"
          strokeWidth={2}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.2 + (i / (TREND_POINTS.length - 1)) * 1.6 }}
          style={{ originX: `${x}px`, originY: `${y}px` }}
        />
      ))}
      <motion.circle
        cx={lastX} cy={lastY} fill="none" stroke="white" strokeWidth={2}
        initial={{ r: 6, opacity: 0 }}
        animate={{ r: [6, 22], opacity: [0.9, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: 1.9 }}
      />
      <motion.g
        initial={{ opacity: 0, y: 12, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 2 }}
        style={{ originX: `${lastX - 30}px`, originY: `${lastY - 24}px` }}
      >
        <rect x={lastX - 62} y={lastY - 40} width={50} height={24} rx={8} fill="white" />
        <text x={lastX - 37} y={lastY - 23.5} textAnchor="middle" fontSize={12} fontWeight={700} className="fill-violet-600">+18%</text>
      </motion.g>
    </svg>
  )
}

type Landing = typeof t.nl.landing

type PublicStats = { users: number }

const MIN_USERS_SHOWN = 50

function UsersBefore({ label }: { label: string }) {
  const [users, setUsers] = useState<number | null>(null)

  useEffect(() => {
    createClient().rpc('public_stats').then(({ data, error }) => {
      if (!error && data && (data as PublicStats).users >= MIN_USERS_SHOWN) setUsers((data as PublicStats).users)
    })
  }, [])

  if (users === null) return null

  return (
    <section className="px-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease }}
        className="relative max-w-xl mx-auto text-center py-10"
      >
        <motion.span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-40 rounded-full bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <CountUp
          to={users}
          className="relative text-7xl md:text-8xl font-bold tracking-tight tabular-nums bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent"
        />
        <p className="relative text-lg md:text-xl font-semibold text-indigo-900 mt-1">{label}</p>
      </motion.div>
    </section>
  )
}

const TRY_MINUTES = [15, 30, 45, 60]

function TryIt({ l }: { l: Landing }) {
  const router = useRouter()
  const { logGuestEvent } = useGuest()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [shown, setShown] = useState<{ title: string; subject: string; minutes: number } | null>(null)

  function show(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setShown({ title: title.trim(), subject: subject.trim(), minutes })
    logGuestEvent('landing_try')
  }

  function save() {
    if (!shown) return
    try {
      const key = 'knowl_guest_moments'
      const existing = JSON.parse(localStorage.getItem(key) ?? '[]')
      localStorage.setItem(key, JSON.stringify([{
        id: crypto.randomUUID(),
        title: shown.title,
        description: null,
        category: shown.subject || null,
        learned_at: new Date().toISOString().split('T')[0],
        duration_minutes: shown.minutes,
      }, ...existing]))
    } catch {}
    logGuestEvent('landing_try_save')
    router.push('/leermomenten')
  }

  return (
    <section className="max-w-4xl mx-auto px-4 pt-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease }}
        className="relative rounded-3xl p-[2px] bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-violet-500 bg-[length:200%_auto] animate-[gradient-move_6s_linear_infinite] shadow-xl shadow-indigo-200/60"
      >
        <div className="rounded-[22px] bg-white p-6 md:p-8 grid md:grid-cols-2 gap-6 md:gap-8 items-center">
          <form onSubmit={show}>
            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">{l.tryTag}</span>
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mt-1">{l.tryTitle}</h2>
            <p className="text-sm text-indigo-400 mt-1">{l.trySub}</p>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={l.tryPlaceholder}
              maxLength={80}
              className="mt-5 w-full border border-indigo-100 bg-indigo-50/40 rounded-xl px-4 py-3 text-sm text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
            />
            <div className="grid grid-cols-[1fr_auto] gap-3 mt-3 items-end">
              <label className="block">
                <span className="block text-xs font-medium text-indigo-400 mb-1">{l.trySubject}</span>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder={l.trySubjectPlaceholder}
                  maxLength={30}
                  className="w-full border border-indigo-100 bg-indigo-50/40 rounded-xl px-3 py-2.5 text-sm text-indigo-900 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                />
              </label>
              <div>
                <span className="block text-xs font-medium text-indigo-400 mb-1">{l.tryMinutes}</span>
                <div className="relative flex bg-indigo-50 rounded-xl p-1">
                  {TRY_MINUTES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMinutes(m)}
                      className={`relative z-10 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${minutes === m ? 'text-white' : 'text-indigo-400 hover:text-indigo-600'}`}
                    >
                      {minutes === m && (
                        <motion.span layoutId="try-minutes" className="absolute inset-0 -z-10 rounded-lg bg-indigo-600" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                      )}
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              disabled={!title.trim()}
              className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-200 disabled:opacity-40 disabled:shadow-none transition-opacity"
            >
              {l.tryBtn}
            </motion.button>
            <p className="text-[11px] text-indigo-300 mt-2 text-center">{l.tryHint}</p>
          </form>

          <div className="relative h-full min-h-[220px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {shown ? (
                <motion.div
                  key={shown.title + shown.minutes + shown.subject}
                  className="relative w-full max-w-sm"
                  initial={{ opacity: 0, y: 40, rotate: -4, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -30, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                >
                  {Array.from({ length: 14 }).map((_, i) => {
                    const angle = (i / 14) * Math.PI * 2
                    return (
                      <motion.span
                        key={i}
                        className={`absolute left-1/2 top-1/2 w-2 h-2 rounded-full ${['bg-indigo-400', 'bg-fuchsia-400', 'bg-violet-400', 'bg-sky-400'][i % 4]}`}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{ x: Math.cos(angle) * 190, y: Math.sin(angle) * 130, opacity: 0, scale: 0.4 }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
                      />
                    )
                  })}
                  <div className="relative bg-white rounded-2xl border border-indigo-100 shadow-2xl shadow-indigo-200/70 p-5">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{shown.subject || 'Knowl'}</span>
                      <span className="text-xs text-indigo-300">{l.tryToday}</span>
                    </div>
                    <p className="font-bold text-indigo-900 break-words">{shown.title}</p>
                    <div className="flex gap-2 mt-3">
                      {shown.subject && <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">{shown.subject}</span>}
                      <span className="text-xs bg-violet-50 text-violet-600 rounded-full px-2.5 py-0.5 font-medium">{shown.minutes} min</span>
                    </div>
                  </div>
                  <motion.div
                    className="flex gap-2 mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.button
                      onClick={save}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-bold shadow-md shadow-indigo-200"
                    >
                      {l.trySave}
                    </motion.button>
                    <button
                      onClick={() => setShown(null)}
                      className="px-4 rounded-xl text-sm font-semibold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      {l.tryAgain}
                    </button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="ghost"
                  className="w-full max-w-sm rounded-2xl border-2 border-dashed border-indigo-100 p-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="flex justify-between mb-3">
                    <span className="h-3 w-16 rounded-full bg-indigo-50" />
                    <span className="h-3 w-10 rounded-full bg-indigo-50" />
                  </div>
                  <p className={`font-bold break-words ${title ? 'text-indigo-900' : 'text-indigo-200'}`}>
                    {title || l.tryPlaceholder}
                    <motion.span
                      className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </p>
                  <div className="flex gap-2 mt-3">
                    <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${subject ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-50/50 text-indigo-200'}`}>{subject || l.trySubject}</span>
                    <motion.span
                      key={minutes}
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="text-xs bg-violet-50 text-violet-600 rounded-full px-2.5 py-0.5 font-medium"
                    >
                      {minutes} min
                    </motion.span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

const APP_SCREENS = [
  { src: '/landing/app-leermoment.webp', url: 'myknowl.com/leermomenten', w: 1472, h: 934, cursor: { x: 50, y: 90 }, effect: 'saved' },
  { src: '/landing/app-resultaten.webp', url: 'myknowl.com/resultaten', w: 1472, h: 880, cursor: { x: 19, y: 45 }, effect: 'bar' },
  { src: '/landing/app-timer.webp', url: 'myknowl.com/pomodoro', w: 832, h: 868, cursor: { x: 39, y: 87 }, effect: 'timer' },
] as const

const APP_INTERVAL = 6
const CLICK_AT = 1.75

function SavedEffect({ label }: { label: string }) {
  return (
    <>
      <motion.rect
        x={50} y={797} width={1371} height={86} rx={22} fill="white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0] }}
        transition={{ duration: 0.5, delay: CLICK_AT }}
      />
      <motion.g
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: CLICK_AT + 0.25 }}
      >
        <rect x={436} y={185} width={600} height={92} rx={24} fill="#ecfdf5" stroke="#6ee7b7" strokeWidth={3} />
        <circle cx={496} cy={231} r={24} fill="#10b981" />
        <motion.path
          d="M484 231 l9 9 l17 -18"
          fill="none"
          stroke="white"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: CLICK_AT + 0.55 }}
        />
        <text x={540} y={242} fontSize={32} fontWeight={600} fill="#047857">{label}</text>
      </motion.g>
    </>
  )
}

function BarEffect() {
  return (
    <>
      <motion.rect
        x={176} y={270} width={201} height={500} rx={14} fill="white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0.18] }}
        transition={{ duration: 0.6, delay: CLICK_AT }}
      />
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 18, delay: CLICK_AT + 0.15 }}
        style={{ originX: '400px', originY: '360px' }}
      >
        <path d="M400 360 l-18 -14 v28 z" fill="white" />
        <rect x={398} y={300} width={300} height={124} rx={20} fill="white" stroke="#e0e7ff" strokeWidth={3} />
        <circle cx={438} cy={345} r={10} fill="#6366f1" />
        <text x={460} y={356} fontSize={32} fontWeight={600} fill="#312e81">Recht</text>
        <text x={428} y={402} fontSize={30} fill="#6366f1">180 min</text>
      </motion.g>
    </>
  )
}

function TimerEffect() {
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setRunning(true), CLICK_AT * 1000)
    return () => clearTimeout(id)
  }, [])

  useEffect(() => {
    if (!running) return
    setSeconds(s => s - 1)
    const id = setInterval(() => setSeconds(s => s - 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <>
      <motion.circle
        cx={416} cy={325} r={220} fill="none" stroke="#6366f1" strokeWidth={24} strokeLinecap="round"
        transform="rotate(-90 416 325)"
        initial={{ pathLength: 1, opacity: 0 }}
        animate={running ? { pathLength: 0.93, opacity: 1 } : undefined}
        transition={{ pathLength: { duration: 4, ease: 'linear' }, opacity: { duration: 0.3 } }}
      />
      {running && (
        <>
          <rect x={235} y={238} width={362} height={116} fill="white" />
          <motion.text
            key={seconds}
            x={416} y={338} textAnchor="middle" fontSize={118} fontWeight={700} fill="#4338ca"
            initial={{ opacity: 0.4, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px' }}
          >
            {mm}:{ss}
          </motion.text>
          <motion.circle
            cx={336} cy={650} r={12} fill="#6366f1"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.rect
            x={66} y={715} width={519} height={86} rx={26} fill="#4338ca"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <text x={325} y={770} textAnchor="middle" fontSize={30} fontWeight={600} fill="white">Pauze</text>
        </>
      )}
    </>
  )
}

function AppPreview({ l }: { l: Landing }) {
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-120px' })
  const tabs = [l.appTab1, l.appTab2, l.appTab3]
  const screen = APP_SCREENS[active]

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const tilt = useTransform(scrollYProgress, [0, 1], [18, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.88, 1])

  useEffect(() => {
    if (hovered || !inView) return
    const id = setTimeout(() => setActive(a => (a + 1) % APP_SCREENS.length), APP_INTERVAL * 1000)
    return () => clearTimeout(id)
  }, [active, hovered, inView])

  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <Reveal className="text-center mb-8">
        <motion.span variants={fadeUp} className="block text-xs font-semibold text-indigo-500 uppercase tracking-widest">{l.appTag}</motion.span>
        <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-indigo-900 mt-1">{l.appTitle}</motion.h2>
        <motion.p variants={fadeUp} className="text-indigo-400 mt-2 text-sm md:text-base">{l.appSub}</motion.p>
      </Reveal>

      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`relative px-4 py-2 rounded-full text-sm font-semibold transition-colors ${active === i ? 'text-white' : 'text-indigo-500 hover:text-indigo-700 bg-indigo-50'}`}
          >
            {active === i && (
              <motion.span layoutId="app-tab" className="absolute inset-0 rounded-full bg-indigo-600 overflow-hidden" transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
                {!hovered && inView && (
                  <motion.span
                    key={`p${active}`}
                    className="absolute inset-y-0 left-0 bg-white/20"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: APP_INTERVAL, ease: 'linear' }}
                  />
                )}
              </motion.span>
            )}
            <span className="relative">{tab}</span>
          </button>
        ))}
      </div>

      <div ref={ref} style={{ perspective: 1400 }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <motion.div
          style={{ rotateX: tilt, scale }}
          className="relative mx-auto max-w-4xl rounded-2xl bg-white border border-indigo-100 shadow-2xl shadow-indigo-300/40 overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-indigo-50 bg-indigo-50/40">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-300" />
              <span className="w-3 h-3 rounded-full bg-amber-300" />
              <span className="w-3 h-3 rounded-full bg-emerald-300" />
            </div>
            <div className="flex-1 flex justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={screen.url}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="text-xs text-indigo-400 bg-white border border-indigo-100 rounded-lg px-4 py-1 font-medium"
                >
                  {screen.url}
                </motion.span>
              </AnimatePresence>
            </div>
            <span className="w-12" />
          </div>

          <div className="relative aspect-[16/10] bg-[#f8f7ff] flex items-center justify-center p-4 md:p-8 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={screen.src}
                className="relative h-full max-w-full"
                style={{ aspectRatio: screen.w / screen.h }}
                initial={{ opacity: 0, x: 80, scale: 0.96, filter: 'blur(8px)' }}
                animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -80, scale: 0.96, filter: 'blur(8px)' }}
                transition={{ duration: 0.6, ease }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screen.src} alt={tabs[active]} className="w-full h-full object-contain drop-shadow-xl" draggable={false} />
                <svg viewBox={`0 0 ${screen.w} ${screen.h}`} className="absolute inset-0 w-full h-full pointer-events-none">
                  {screen.effect === 'saved' && <SavedEffect label={l.appSaved} />}
                  {screen.effect === 'bar' && <BarEffect />}
                  {screen.effect === 'timer' && <TimerEffect />}
                </svg>
                <motion.div
                  className="absolute z-10 pointer-events-none"
                  initial={{ left: '85%', top: '20%', opacity: 0 }}
                  animate={{ left: `${screen.cursor.x}%`, top: `${screen.cursor.y}%`, opacity: 1 }}
                  transition={{ duration: 1.1, ease, delay: 0.5 }}
                >
                  <motion.span
                    className="absolute -left-4 -top-4 w-8 h-8 rounded-full bg-indigo-500/30"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.8], opacity: [0.8, 0] }}
                    transition={{ duration: 0.6, delay: CLICK_AT }}
                  />
                  <motion.svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 drop-shadow-md"
                    animate={{ scale: [1, 0.8, 1] }}
                    transition={{ duration: 0.25, delay: CLICK_AT - 0.05 }}
                  >
                    <path d="M4 2 L4 20 L9 15 L12.5 22 L15.5 20.5 L12 13.5 L19 13.5 Z" fill="#1e1b4b" stroke="white" strokeWidth={1.5} strokeLinejoin="round" />
                  </motion.svg>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Faq({ l }: { l: Landing }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <Reveal className="text-center mb-8">
        <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-indigo-900">{l.faqTitle}</motion.h2>
      </Reveal>
      <Reveal className="space-y-3">
        {l.faq.map((item, i) => {
          const isOpen = open === i
          return (
            <motion.div
              key={item.q}
              variants={fadeUp}
              className={`rounded-2xl border transition-colors ${isOpen ? 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50' : 'border-indigo-100 bg-white hover:border-indigo-200'}`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-4 text-left px-5 py-4"
              >
                <span className="flex-1 font-semibold text-indigo-900 text-sm md:text-base">{item.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0, backgroundColor: isOpen ? '#4f46e5' : '#eef2ff', color: isOpen ? '#ffffff' : '#4f46e5' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease }}
                    className="overflow-hidden"
                  >
                    <motion.p
                      initial={{ y: -8 }}
                      animate={{ y: 0 }}
                      className="px-5 pb-5 text-sm text-indigo-600 leading-relaxed"
                    >
                      {item.a}
                    </motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </Reveal>
    </section>
  )
}

const SHOWCASE_INTERVAL = 5

function FeatureShowcase({ features }: { features: ShowcaseFeature[] }) {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-100px' })

  useEffect(() => {
    if (paused || !inView) return
    const id = setTimeout(() => setActive(a => (a + 1) % features.length), SHOWCASE_INTERVAL * 1000)
    return () => clearTimeout(id)
  }, [active, paused, inView, features.length])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="flex flex-col gap-3 h-[680px] md:h-[620px]"
    >
      {features.map((f, i) => {
        const isActive = i === active
        return (
          <motion.div
            key={f.title}
            role="button"
            tabIndex={0}
            aria-expanded={isActive}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            animate={{ flexGrow: isActive ? 5 : 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 24 }}
            style={{ flexBasis: 0 }}
            className={`relative min-w-0 min-h-0 overflow-hidden rounded-3xl cursor-pointer border outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 ${
              isActive ? 'border-transparent shadow-2xl shadow-indigo-300/50' : 'border-transparent shadow-md hover:shadow-xl hover:brightness-110 transition-[box-shadow,filter]'
            }`}
          >
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${f.gradient}`}
              initial={{ clipPath: 'inset(0 100% 0 0 round 24px)' }}
              whileInView={{ clipPath: 'inset(0 0% 0 0 round 24px)' }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease, delay: 0.2 + i * 0.12 }}
            />
            {isActive && (
              <motion.div
                className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none"
                initial={{ x: '0%' }}
                animate={{ x: '600%' }}
                transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.2 }}
              />
            )}

            <AnimatePresence initial={false}>
              {isActive ? (
                <motion.div
                  key="open"
                  className="absolute inset-0 p-6 md:p-8 grid md:grid-cols-2 gap-4 md:gap-6 items-center text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.4 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <div className="self-start md:self-center">
                    <motion.span
                      className="inline-flex w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/15 border border-white/25 items-center justify-center"
                      initial={{ scale: 0, rotate: -40 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.25 }}
                    >
                      <Icon name={f.icon} className="w-6 h-6 md:w-7 md:h-7" />
                    </motion.span>
                    <motion.h3
                      className="text-xl md:text-3xl font-bold mt-3 leading-tight"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease, delay: 0.3 }}
                    >
                      {f.title}
                    </motion.h3>
                    <motion.p
                      className="text-sm md:text-base text-white/80 mt-2 leading-relaxed max-w-xs"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, ease, delay: 0.4 }}
                    >
                      {f.desc}
                    </motion.p>
                  </div>
                  <motion.div
                    className="h-full max-h-[260px] min-h-[180px] flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.35 }}
                  >
                    {f.demo}
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="closed"
                  className="absolute inset-0 flex items-center gap-4 px-6 md:px-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.15 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                >
                  <span className="text-xs font-bold text-white/60 tabular-nums">0{i + 1}</span>
                  <h3 className="text-base md:text-lg font-semibold text-white whitespace-nowrap">
                    {f.title}
                  </h3>
                  <motion.span
                    className="ml-auto text-white/90"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                  >
                    <Icon name={f.icon} className="w-5 h-5" />
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>

            {isActive && !paused && inView && (
              <motion.div
                key={`progress-${active}`}
                className="absolute bottom-0 left-0 h-1 bg-white/70"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: SHOWCASE_INTERVAL, ease: 'linear' }}
              />
            )}
          </motion.div>
        )
      })}
    </motion.div>
  )
}

function FlashcardDemo() {
  return (
    <div className="relative w-44 h-32 md:w-52 md:h-36" style={{ perspective: 800 }}>
      <motion.div
        className="absolute inset-0 rounded-2xl bg-white/20 border border-white/30"
        initial={{ rotate: 0 }}
        animate={{ rotate: -8, x: -14, y: 8 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.4 }}
      />
      <motion.div
        className="absolute inset-0 rounded-2xl bg-white/30 border border-white/40"
        initial={{ rotate: 0 }}
        animate={{ rotate: 6, x: 12, y: 4 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.5 }}
      />
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: [0, 0, 180, 180, 360] }}
        transition={{ duration: 4, times: [0, 0.3, 0.45, 0.85, 1], repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      >
        <div className="absolute inset-0 rounded-2xl bg-white shadow-xl flex items-center justify-center text-3xl md:text-4xl font-bold text-indigo-700" style={{ backfaceVisibility: 'hidden' }}>
          H₂O
        </div>
        <div
          className="absolute inset-0 rounded-2xl bg-emerald-50 shadow-xl flex flex-col items-center justify-center text-emerald-600"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <Icon name="check" className="w-12 h-12" strokeWidth={3} />
        </div>
      </motion.div>
    </div>
  )
}

const WEB_NODES = [
  { x: 40, y: 40 }, { x: 200, y: 32 }, { x: 222, y: 112 },
  { x: 170, y: 168 }, { x: 52, y: 150 }, { x: 18, y: 96 },
]

function WoordwebDemo() {
  return (
    <svg viewBox="0 0 240 190" className="w-full max-w-[280px] h-auto overflow-visible">
      {WEB_NODES.map((n, i) => (
        <motion.path
          key={`l${i}`}
          d={`M120 95 L${n.x} ${n.y}`}
          stroke="white"
          strokeOpacity={0.7}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.4 + i * 0.12, ease }}
        />
      ))}
      <motion.path
        d="M40 40 L18 96 M200 32 L222 112"
        stroke="white"
        strokeOpacity={0.35}
        strokeWidth={1.5}
        strokeDasharray="4 4"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 1.3 }}
      />
      {WEB_NODES.map((n, i) => (
        <motion.g key={`n${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14, delay: 0.7 + i * 0.12 }} style={{ originX: `${n.x}px`, originY: `${n.y}px` }}>
          <motion.circle
            cx={n.x}
            cy={n.y}
            r={i % 2 ? 11 : 14}
            fill="white"
            fillOpacity={0.9}
            animate={{ cy: [n.y, n.y - 4, n.y] }}
            transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.g>
      ))}
      <motion.circle cx={120} cy={95} r={26} fill="white" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 }} style={{ originX: '120px', originY: '95px' }} />
      <motion.circle
        cx={120}
        cy={95}
        r={26}
        fill="none"
        stroke="white"
        strokeWidth={2}
        animate={{ r: [26, 44], opacity: [0.8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
      />
      <circle cx={120} cy={95} r={9} className="fill-violet-500" />
    </svg>
  )
}

function PomodoroDemo() {
  const [minutes, setMinutes] = useState(25)

  useEffect(() => {
    const id = setInterval(() => setMinutes(m => (m <= 0 ? 25 : m - 1)), 220)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative w-40 h-40 md:w-48 md:h-48">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx={60} cy={60} r={52} fill="none" stroke="white" strokeOpacity={0.2} strokeWidth={8} />
        <motion.circle
          cx={60}
          cy={60}
          r={52}
          fill="none"
          stroke="white"
          strokeWidth={8}
          strokeLinecap="round"
          animate={{ pathLength: minutes / 25 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-4xl md:text-5xl font-bold tabular-nums">{String(minutes).padStart(2, '0')}:00</span>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2, 3].map(i => (
            <motion.span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-white"
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }}
            />
          ))}
        </div>
      </div>
      <motion.span
        className="absolute -top-1 -right-1 text-white"
        animate={{ rotate: [-12, 12, -12] }}
        transition={{ duration: 0.4, repeat: Infinity }}
      >
        <Icon name="bell" className="w-7 h-7" />
      </motion.span>
    </div>
  )
}

const MONTH_BARS = [40, 65, 30, 85, 55, 100, 70]

function MonthDemo() {
  return (
    <div className="w-full max-w-[280px]">
      <div className="flex items-end gap-2 h-32 md:h-40">
        {MONTH_BARS.map((h, i) => (
          <div key={i} className="relative flex-1 h-full flex items-end">
            <motion.div
              className={`w-full rounded-t-lg ${h === 100 ? 'bg-white' : 'bg-white/40'}`}
              initial={{ height: '0%' }}
              animate={{ height: `${h}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.4 + i * 0.08 }}
            />
            {h === 100 && (
              <motion.span
                className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-sky-600 text-xs font-bold flex items-center justify-center"
                initial={{ scale: 0, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10, delay: 1.2 }}
              >
                1
              </motion.span>
            )}
          </div>
        ))}
      </div>
      <motion.div
        className="mt-3 flex items-center justify-center gap-2 bg-white/20 rounded-2xl py-2 text-white"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
      >
        <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }}><Icon name="flame" className="w-5 h-5" /></motion.span>
        <CountUp to={21} className="text-xl font-bold tabular-nums" />
      </motion.div>
    </div>
  )
}

export default function LandingPage() {
  const { lang, setLang, tr } = useLanguage()
  const [showLang, setShowLang] = useState(false)
  const { logGuestEvent } = useGuest()
  const currentLang = languages.find(l => l.code === lang)
  const l = { ...t.nl.landing, ...tr.landing }

  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroTextY = useTransform(heroScroll, [0, 1], [0, 120])
  const heroTextOpacity = useTransform(heroScroll, [0, 0.7], [1, 0])
  const cardsY = useTransform(heroScroll, [0, 1], [0, -60])
  const blobY1 = useTransform(heroScroll, [0, 1], [0, 200])
  const blobY2 = useTransform(heroScroll, [0, 1], [0, 320])

  const mouseX = useMotionValue(-500)
  const mouseY = useMotionValue(-500)
  const spotlight = useMotionTemplate`radial-gradient(500px circle at ${mouseX}px ${mouseY}px, rgba(129,140,248,0.18), transparent 70%)`

  const primaryFeatures = [
    { title: l.feat1title, desc: l.feat1desc, color: 'bg-gradient-to-br from-indigo-500 to-violet-600', icon: 'target' as IconName, Demo: GoalDemo },
    { title: l.feat2title, desc: l.feat2desc, color: 'bg-gradient-to-br from-violet-500 to-indigo-600', icon: 'trend' as IconName, Demo: ProgressDemo },
  ]

  const secondaryFeatures: ShowcaseFeature[] = [
    { title: l.feat3title, desc: l.feat3desc, icon: 'cards', gradient: 'from-indigo-500 to-violet-600', demo: <FlashcardDemo /> },
    { title: l.feat4title, desc: l.feat4desc, icon: 'web', gradient: 'from-violet-500 to-fuchsia-500', demo: <WoordwebDemo /> },
    { title: l.feat5title, desc: l.feat5desc, icon: 'timer', gradient: 'from-rose-500 to-orange-400', demo: <PomodoroDemo /> },
    { title: l.feat6title, desc: l.feat6desc, icon: 'calendar', gradient: 'from-sky-500 to-indigo-600', demo: <MonthDemo /> },
  ]

  const usps = [
    { title: l.usp1title, desc: l.usp1desc, icon: 'target' as IconName },
    { title: l.usp2title, desc: l.usp2desc, icon: 'chart' as IconName },
    { title: l.usp3title, desc: l.usp3desc, icon: 'flame' as IconName },
    { title: l.usp4title, desc: l.usp4desc, icon: 'lock' as IconName },
  ]

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-white overflow-x-clip">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 z-30 origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-400"
        style={{ scaleX: progress }}
      />

      {/* Nav */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-md border-b border-indigo-100"
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.05 }}>
            <span className="text-xl font-bold text-indigo-700 tracking-tight">Knowl</span>
            <span className="hidden sm:inline text-xs text-indigo-300 font-normal">leertracker</span>
          </motion.div>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <button onClick={() => setShowLang(s => !s)}
                className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors">
                <span>{currentLang?.flag}</span>
                <span className="font-medium text-xs">{currentLang?.code.toUpperCase()}</span>
                <motion.span className="text-xs opacity-60" animate={{ rotate: showLang ? 180 : 0 }}>▾</motion.span>
              </button>
              {showLang && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLang(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 z-20 min-w-[170px] origin-top-right"
                  >
                    {languages.map(lg => (
                      <button key={lg.code} onClick={() => { setLang(lg.code as LangCode); setShowLang(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${lang === lg.code ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}>
                        <span>{lg.flag}</span><span>{lg.label}</span>
                        {lang === lg.code && <span className="ml-auto text-indigo-400">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </div>
            <Link href="/login" onClick={() => logGuestEvent('signup_click')} className="hidden sm:block text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors px-3 py-1.5">
              {l.login}
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/leermomenten" className="block text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                {l.cta}
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative pt-28 pb-20 px-4 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white"
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect()
          mouseX.set(e.clientX - r.left)
          mouseY.set(e.clientY - r.top)
        }}
      >
        <motion.div className="absolute inset-0 pointer-events-none" style={{ background: spotlight }} />
        <motion.div
          style={{ y: blobY1 }}
          animate={{ x: [0, 60, -40, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-10 left-[10%] w-80 h-80 bg-indigo-300 rounded-full blur-3xl opacity-30 pointer-events-none"
        />
        <motion.div
          style={{ y: blobY2 }}
          animate={{ x: [0, -70, 30, 0], scale: [1, 0.85, 1.15, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-24 right-[10%] w-72 h-72 bg-violet-300 rounded-full blur-3xl opacity-30 pointer-events-none"
        />
        <motion.div
          animate={{ x: [0, 40, -60, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-64 left-1/2 w-64 h-64 bg-fuchsia-200 rounded-full blur-3xl opacity-25 pointer-events-none"
        />

        <motion.div className="relative max-w-3xl mx-auto text-center" style={{ y: heroTextY, opacity: heroTextOpacity }}>
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="inline-flex items-center gap-2 bg-white text-indigo-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-indigo-200 shadow-sm"
          >
            <span className="relative flex w-2 h-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
            </span>
            {l.badge}
          </motion.div>

          <h1 key={lang} className="text-4xl md:text-6xl font-bold text-indigo-900 leading-tight tracking-tight">
            <AnimatedWords text={l.h1a} delay={0.3} />
            <br />
            <motion.span
              className="inline-block bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600 bg-[length:200%_auto] bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', backgroundPosition: ['0% 50%', '200% 50%'] }}
              transition={{
                opacity: { duration: 0.8, delay: 0.7 },
                y: { duration: 0.8, delay: 0.7, ease },
                filter: { duration: 0.8, delay: 0.7 },
                backgroundPosition: { duration: 6, repeat: Infinity, ease: 'linear' },
              }}
            >
              {l.h1b}
            </motion.span>
          </h1>

          <motion.div initial="hidden" animate="show" variants={stagger(1, 0.12)}>
            <motion.p variants={fadeUp} className="text-base md:text-lg text-indigo-500 mt-5 leading-relaxed max-w-lg mx-auto">
              {l.sub}
            </motion.p>

            <motion.p variants={fadeUp} className="text-xs text-indigo-400 mt-3 font-medium">
              {l.proof}
            </motion.p>

            <motion.div variants={stagger(0, 0.08)} className="flex flex-wrap justify-center gap-2 mt-2">
              {l.audience.map(a => (
                <motion.span
                  key={a}
                  variants={popIn}
                  whileHover={{ y: -2, scale: 1.05 }}
                  className="text-xs font-semibold text-indigo-600 bg-white border border-indigo-100 rounded-full px-3 py-1 shadow-sm"
                >
                  {a}
                </motion.span>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }} className="relative group">
                <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 blur-lg opacity-40 group-hover:opacity-70 transition-opacity" />
                <Link href="/leermomenten"
                  className="relative block overflow-hidden bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-bold text-base shadow-lg shadow-indigo-200/60 text-center">
                  <motion.span
                    className="absolute inset-y-0 -left-1/2 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                    animate={{ x: ['0%', '450%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                  />
                  <span className="relative">{l.cta}</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
                <Link href="/login" onClick={() => logGuestEvent('signup_click')}
                  className="block bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-bold text-base hover:bg-indigo-50 transition-colors border border-indigo-200 shadow-sm text-center">
                  {l.login}
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Preview kaarten */}
        <motion.div
          style={{ y: cardsY }}
          initial="hidden"
          animate="show"
          variants={stagger(1.3, 0.15)}
          className="relative max-w-4xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <TiltCard float={0} className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5 hover:shadow-2xl transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{l.card1tag}</span>
              <span className="text-xs text-indigo-300">{l.card1today}</span>
            </div>
            <p className="font-bold text-indigo-900 text-sm">{l.card1title}</p>
            <p className="text-xs text-indigo-400 mt-2 leading-relaxed">{l.card1body}</p>
            <motion.div className="flex gap-2 mt-3" variants={stagger(0.4, 0.15)}>
              <motion.span variants={popIn} className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">{l.card1sub1}</motion.span>
              <motion.span variants={popIn} className="text-xs bg-violet-50 text-violet-600 rounded-full px-2.5 py-0.5 font-medium">{l.card1sub2}</motion.span>
            </motion.div>
          </TiltCard>

          <TiltCard float={0.8} className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5 hover:shadow-2xl transition-shadow">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{l.card2tag}</span>
              <span className="text-xs font-bold text-red-400">{l.card2days}</span>
            </div>
            <p className="text-lg font-bold text-indigo-900 mt-1">{l.card2title}</p>
            <div className="mt-3 h-2 bg-indigo-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '62%' }}
                transition={{ duration: 1.6, delay: 1.9, ease }}
              />
            </div>
            <p className="text-xs text-indigo-400 mt-1.5">{l.card2progress}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-indigo-700">{l.card2stat1val}</p>
                <p className="text-xs text-indigo-400">{l.card2stat1lab}</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-violet-600">{l.card2stat2val}</p>
                <p className="text-xs text-violet-500">{l.card2stat2lab}</p>
              </div>
            </div>
          </TiltCard>

          <TiltCard float={1.6} className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg p-5 text-white hover:shadow-2xl transition-shadow">
            <motion.div
              className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="relative text-xs font-semibold text-indigo-200 uppercase tracking-wide">{l.card3tag}</span>
            <div className="relative flex items-center gap-2">
              <CountUp to={12} className="text-5xl font-bold mt-2 tabular-nums" />
              <motion.span
                className="mt-2 text-orange-300"
                animate={{ rotate: [-6, 6, -6], scale: [1, 1.15, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon name="flame" className="w-8 h-8" />
              </motion.span>
            </div>
            <p className="relative text-indigo-200 text-sm">{l.card3days}</p>
            <motion.div className="relative flex gap-1 mt-4 flex-wrap" variants={stagger(0.6, 0.07)}>
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div key={i} variants={popIn} className="w-5 h-5 rounded-md bg-white/25 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-white/90" />
                </motion.div>
              ))}
            </motion.div>
            <p className="relative text-xs text-indigo-300 mt-3">{l.card3sub}</p>
          </TiltCard>
        </motion.div>
      </section>

      <TryIt l={l} />

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <Reveal className="text-center mb-10">
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-indigo-900">{l.featTitle}</motion.h2>
          <motion.p variants={fadeUp} className="text-indigo-400 mt-2 text-sm md:text-base">{l.featSub}</motion.p>
        </Reveal>

        <Reveal className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {primaryFeatures.map((f, i) => (
            <PrimaryFeatureCard key={f.title} index={i} {...f} />
          ))}
        </Reveal>

        <FeatureShowcase features={secondaryFeatures} />
      </section>

      <AppPreview l={l} />

      <UsersBefore label={l.statUsers} />

      {/* Over Knowl */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease }}
          className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-8 md:p-12"
        >
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <Reveal>
              <motion.span variants={fadeUp} className="block text-xs font-semibold text-indigo-500 uppercase tracking-widest">{l.aboutTag}</motion.span>
              <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-indigo-900 mt-2 leading-tight whitespace-pre-line">
                {l.aboutTitle}
              </motion.h2>
              <motion.p variants={fadeUp} className="text-indigo-700 mt-4 leading-relaxed text-sm md:text-base">{l.aboutP1}</motion.p>
              <motion.p variants={fadeUp} className="text-indigo-500 mt-3 leading-relaxed text-sm md:text-base">{l.aboutP2}</motion.p>

              {/* Privacy statement */}
              <motion.div variants={fadeUp} className="mt-4 flex items-start gap-3 bg-white/70 rounded-2xl px-4 py-3 border border-indigo-100">
                <span className="text-emerald-500 mt-0.5 shrink-0"><Icon name="lock" className="w-4 h-4" /></span>
                <p className="text-xs text-indigo-500 leading-relaxed">
                  <span className="font-semibold text-indigo-700">Privacy.</span> Knowl toont geen advertenties en ik verkoop niets door aan anderen.
                </p>
              </motion.div>

              <motion.div variants={stagger(0, 0.12)} className="flex gap-6 mt-6 flex-wrap">
                {[[l.stat1val, l.stat1lab], [l.stat2val, l.stat2lab], [l.stat3val, l.stat3lab]].map(([val, lab]) => (
                  <motion.div key={lab} variants={popIn}>
                    <p className="text-2xl font-bold text-indigo-700">{val}</p>
                    <p className="text-xs text-indigo-400">{lab}</p>
                  </motion.div>
                ))}
              </motion.div>
            </Reveal>

            <Reveal className="space-y-3" delay={0.2}>
              {usps.map(item => (
                <motion.div
                  key={item.title}
                  variants={{
                    hidden: { opacity: 0, x: 50 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.6, ease } },
                  }}
                  whileHover={{ x: 6, scale: 1.02 }}
                  className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3"
                >
                  <span className="shrink-0 w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Icon name={item.icon} className="w-5 h-5" /></span>
                  <div>
                    <p className="font-semibold text-indigo-900 text-sm">{item.title}</p>
                    <p className="text-xs text-indigo-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </Reveal>
          </div>
        </motion.div>
      </section>

      <Faq l={l} />

      {/* CTA */}
      <section className="px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease }}
          className="relative overflow-hidden max-w-3xl mx-auto bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl px-8 py-12 text-center shadow-xl shadow-indigo-200/60"
        >
          <motion.div
            className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-fuchsia-400/30 blur-3xl"
            animate={{ x: [0, 200, 0], y: [0, 80, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-sky-400/25 blur-3xl"
            animate={{ x: [0, -200, 0], y: [0, -60, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold text-white">{l.ctaTitle}</h2>
            <p className="text-indigo-200 mt-3 mb-2 text-sm md:text-base">{l.ctaSub}</p>
            <p className="text-xs text-indigo-300 mb-8">{l.ctaNote}</p>
            <motion.div
              className="inline-block"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/leermomenten"
                className="inline-block bg-white text-indigo-700 px-10 py-4 rounded-2xl font-bold text-base hover:bg-indigo-50 transition-colors shadow-lg">
                {l.ctaBtn}
              </Link>
            </motion.div>
            <p className="text-xs text-indigo-300 mt-5">{l.ctaFooter}</p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-indigo-100 py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-base font-bold text-indigo-700">Knowl</p>
              <p className="text-xs text-indigo-400 mt-1">Leertracker voor studenten · myknowl.com</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-xs text-indigo-400">
              <div className="flex gap-4 flex-wrap">
                <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacybeleid</Link>
                <Link href="/voorwaarden" className="hover:text-indigo-600 transition-colors">Voorwaarden</Link>
                <a href="mailto:myknowl@hotmail.com" className="hover:text-indigo-600 transition-colors">{l.contact}</a>
              </div>
              <a href="https://www.tiktok.com/@myknowltiktok" target="_blank" rel="noopener noreferrer"
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 font-medium">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.96a8.27 8.27 0 004.84 1.55V7.07a4.85 4.85 0 01-1.07-.38z"/>
                </svg>
                TikTok
              </a>
            </div>
          </div>
          <p className="text-xs text-indigo-200 mt-6">{l.footerCopy}</p>
        </div>
      </footer>
    </div>
    </MotionConfig>
  )
}
