'use client'

import Glyph from '@/components/Glyph'
import { useState, useEffect, useRef } from 'react'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import ToolBanner from '@/components/ToolBanner'
import { Brain, Circle as CircleIcon, Coffee, Minus, Monitor, Pause, Play, RotateCcw, Settings2 } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { User } from '@supabase/supabase-js'
import MomentForm, { POMODORO_UNLOGGED_KEY } from '@/components/MomentForm'
import { buildSubjectColors } from '@/lib/subjectColors'

type Mode = 'work' | 'break'
type Style = 'circle' | 'minimal' | 'retro'
type Subject = { id: string; name: string }
type Props = { user: User | null; subjects: Subject[] }

function SessionDots({ completed, dark }: { completed: number; dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`w-3 h-3 rounded-full transition-all ${
          i < (completed % 4)
            ? dark ? 'bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)]' : 'bg-indigo-500'
            : dark ? 'bg-gray-700' : 'bg-indigo-100'
        }`} />
      ))}
      <span className={`text-xs ml-1 ${dark ? 'text-gray-500 font-mono' : 'text-indigo-400'}`}>{completed}</span>
    </div>
  )
}

export default function PomodoroTimer({ user, subjects }: Props) {
  const { tr } = useLanguage()
  const p = tr.pomodoro
  const [mode, setMode] = useState<Mode>('work')
  const [customWork, setCustomWork] = useState(25)
  const [customBreak, setCustomBreak] = useState(5)
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [sessionMode, setSessionMode] = useState(false)
  const [timerStyle, setTimerStyle] = useState<Style>('circle')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('knowl_pomodoro')
      if (saved) {
        const s = JSON.parse(saved)
        if (s.mode) setMode(s.mode)
        if (s.customWork) setCustomWork(s.customWork)
        if (s.customBreak) setCustomBreak(s.customBreak)
        if (s.completed) setCompleted(s.completed)
        if (s.sessionMode !== undefined) setSessionMode(s.sessionMode)
        if (s.seconds !== undefined) setSeconds(s.seconds)
        if (s.timerStyle) setTimerStyle(s.timerStyle)
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem('knowl_pomodoro', JSON.stringify({ mode, customWork, customBreak, seconds, completed, sessionMode, timerStyle }))
    } catch {}
  }, [mode, customWork, customBreak, seconds, completed, sessionMode, timerStyle, hydrated])

  const [showSessionForm, setShowSessionForm] = useState(false)

  const total = (mode === 'work' ? customWork : customBreak) * 60
  const progress = ((total - seconds) / total) * 100
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  const isWork = mode === 'work'
  const focusMode = running
  const retro = timerStyle === 'retro'

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            if (mode === 'work') {
              setCompleted(c => c + 1)
              try {
                const prev = JSON.parse(localStorage.getItem(POMODORO_UNLOGGED_KEY) ?? 'null') as { minutes: number; at: number } | null
                const fresh = prev && Date.now() - prev.at < 12 * 60 * 60 * 1000 ? prev.minutes : 0
                localStorage.setItem(POMODORO_UNLOGGED_KEY, JSON.stringify({ minutes: fresh + customWork, at: Date.now() }))
              } catch {}
              if (sessionMode && user) setShowSessionForm(true)
            }
            try {
              const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.connect(gain); gain.connect(ctx.destination)
              osc.frequency.value = 660
              gain.gain.setValueAtTime(0.3, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
              osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8)
            } catch {}
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current!)
    }
    return () => clearInterval(intervalRef.current!)
  }, [running, mode, sessionMode, customWork, user])

  function switchMode(m: Mode) {
    setMode(m); setRunning(false)
    setSeconds((m === 'work' ? customWork : customBreak) * 60)
  }

  function reset() {
    setRunning(false)
    setSeconds((mode === 'work' ? customWork : customBreak) * 60)
  }

  // Cirkel stijl
  const circumference = 2 * Math.PI * 110
  const gradStart = isWork ? '#6366f1' : '#10b981'
  const gradEnd = isWork ? '#8b5cf6' : '#14b8a6'

  const CircleTimer = (
    <div className={`flex flex-col items-center gap-6 transition-all duration-500 ${focusMode ? 'scale-110' : ''}`}>
      <div className="relative">
        <svg width="260" height="260" className="-rotate-90">
          <circle cx="130" cy="130" r="110" fill="none" stroke={isWork ? '#e0e7ff' : '#d1fae5'} strokeWidth="12" />
          <circle cx="130" cy="130" r="110" fill="none"
            stroke="url(#timerGrad)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * progress) / 100}
            className="transition-all duration-1000"
          />
          {running && (
            <circle cx="130" cy="130" r="110" fill="none"
              stroke={isWork ? '#818cf8' : '#34d399'} strokeWidth="2" strokeLinecap="round"
              strokeDasharray="4 20" opacity="0.4"
              className="animate-spin" style={{ animationDuration: '8s' }}
            />
          )}
          <defs>
            <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradStart} />
              <stop offset="100%" stopColor={gradEnd} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-6xl font-bold tabular-nums ${isWork ? 'text-indigo-700' : 'text-emerald-700'}`}>{mins}:{secs}</span>
          <span className={`text-sm mt-1 ${isWork ? 'text-indigo-400' : 'text-emerald-500'}`}>{isWork ? p.focus : p.break}</span>
        </div>
      </div>
      <SessionDots completed={completed} />
    </div>
  )

  // Minimaal stijl
  const MinimalTimer = (
    <div className={`flex flex-col items-center gap-8 transition-all duration-500 ${focusMode ? 'scale-110' : ''}`}>
      <div className="text-center">
        <div className={`font-mono font-bold tabular-nums transition-all duration-300 ${focusMode ? 'text-9xl' : 'text-8xl'} ${isWork ? 'text-indigo-900' : 'text-emerald-600'}`}>
          {mins}:{secs}
        </div>
        <div className={`text-sm font-medium mt-3 uppercase tracking-widest ${isWork ? 'text-indigo-400' : 'text-emerald-400'}`}>
          {isWork ? p.focus : p.break}
        </div>
        <div className="w-48 h-0.5 bg-gray-100 rounded-full mx-auto mt-4 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${isWork ? 'bg-indigo-400' : 'bg-emerald-400'}`}
            style={{ width: `${progress}%` }} />
        </div>
      </div>
      <SessionDots completed={completed} />
    </div>
  )

  // Retro stijl
  const RetroTimer = (
    <div className={`flex flex-col items-center gap-6 transition-all duration-500 ${focusMode ? 'scale-105' : ''}`}>
      <div className={`rounded-2xl px-10 py-8 border-2 ${isWork
        ? 'bg-gray-950 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.3)]'
        : 'bg-gray-950 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.3)]'}`}>
        <div className="text-center mb-2">
          <span className={`text-xs font-mono uppercase tracking-[0.3em] ${isWork ? 'text-indigo-400' : 'text-emerald-400'}`}>
            {isWork ? p.focus : p.break}
          </span>
        </div>
        <div className={`font-mono font-bold tabular-nums text-7xl tracking-widest transition-colors ${isWork
          ? running ? 'text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]' : 'text-indigo-600'
          : running ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'text-emerald-600'}`}>
          {mins}<span className={running ? 'animate-pulse' : ''}>:</span>{secs}
        </div>
        <div className="mt-5 flex gap-1 justify-center">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className={`w-2 h-3 rounded-sm transition-all duration-300 ${
              i < Math.floor(progress / 5)
                ? isWork ? 'bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.8)]' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]'
                : 'bg-gray-800'}`} />
          ))}
        </div>
      </div>
      <SessionDots completed={completed} dark />
    </div>
  )

  const timerViews: Record<Style, React.ReactNode> = { circle: CircleTimer, minimal: MinimalTimer, retro: RetroTimer }

  const btnStart = isWork ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90'
  const btnReset = focusMode ? 'bg-white/10 text-white hover:bg-white/20' : 'text-indigo-400 bg-indigo-50 hover:bg-indigo-100'

  const segment = (active: boolean) => `flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${active ? 'bg-white text-indigo-700 shadow-sm dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`
  const card = 'bg-white rounded-2xl border border-indigo-100 shadow-sm'
  const label = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5'
  const styles: { value: Style; label: string; icon: React.ReactNode }[] = [
    { value: 'circle', label: 'Cirkel', icon: <CircleIcon className="w-4 h-4" strokeWidth={2} /> },
    { value: 'minimal', label: 'Minimaal', icon: <Minus className="w-4 h-4" strokeWidth={2} /> },
    { value: 'retro', label: 'Retro', icon: <Monitor className="w-4 h-4" strokeWidth={2} /> },
  ]

  function applyMinutes(work: number, brk: number) {
    const w = Math.min(120, Math.max(1, work || 25))
    const b = Math.min(60, Math.max(1, brk || 5))
    setCustomWork(w)
    setCustomBreak(b)
    setRunning(false)
    setSeconds((mode === 'work' ? w : b) * 60)
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      focusMode ? (retro ? 'bg-gray-950' : isWork ? 'bg-indigo-950' : 'bg-emerald-950') : 'bg-[#f8f7ff]'
    }`}>
      {!focusMode && (
        <>
          <Nav loggedIn={user ? true : undefined} width="max-w-5xl" />
          <ToolBanner
            variant="timer" width="max-w-5xl" title={p.title ?? 'Timer'}
            below={<span className="text-xs text-white/85">{completed > 0 ? `${completed} ${completed === 1 ? 'focusblok' : 'focusblokken'} afgerond` : `Focus ${customWork} min · pauze ${customBreak} min`}</span>}
          />
        </>
      )}

      {showSessionForm && user && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={() => setShowSessionForm(false)}>
          <div className="w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
            <p className="text-center text-white font-semibold mb-3 inline-flex items-center justify-center gap-2 w-full"><Glyph name="celebrate" className="w-5 h-5" /> {p.sessionDone}</p>
            <MomentForm
              userId={user.id}
              subjects={subjects.map(s => s.name)}
              colors={buildSubjectColors(subjects.map(s => s.name))}
              variant="modal"
              initialMinutes={customWork}
              minutesFromPomodoro
              onClose={() => setShowSessionForm(false)}
              onSaved={() => setShowSessionForm(false)}
            />
          </div>
        </div>
      )}

      {focusMode ? (
        <main className="max-w-md mx-auto px-4 flex flex-col items-center justify-center min-h-screen">
          <div className="flex flex-col items-center p-8 w-full">
            {timerViews[timerStyle]}
            <div className="flex gap-3 w-full mt-6 max-w-xs">
              <button onClick={() => setRunning(false)} className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm shadow-sm ${btnStart}`}>
                <Pause className="w-4 h-4" strokeWidth={2.5} /> {p.pause}
              </button>
              <button onClick={reset} className={`px-5 py-3 rounded-2xl text-sm font-medium ${btnReset}`} aria-label={p.reset}><RotateCcw className="w-4 h-4" strokeWidth={2} /></button>
            </div>
            <p className={`text-xs mt-6 opacity-60 ${retro ? 'text-gray-400 font-mono' : 'text-white'}`}>Pauzeer om terug te keren</p>
          </div>
        </main>
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <section className={`${isWork ? card : 'bg-gradient-to-b from-emerald-50 to-white rounded-2xl border border-emerald-100 shadow-sm'} p-6 sm:p-8 flex flex-col items-center`} aria-label="Timer">
            <div className="flex bg-indigo-50 rounded-xl p-1 w-full max-w-xs mb-6" role="group" aria-label="Soort blok">
              {(['work', 'break'] as Mode[]).map(m => (
                <button key={m} onClick={() => switchMode(m)} aria-pressed={mode === m} className={segment(mode === m)}>
                  {m === 'work' ? <Brain className="w-4 h-4" strokeWidth={2} /> : <Coffee className="w-4 h-4" strokeWidth={2} />}
                  {m === 'work' ? p.focus : p.break}
                </button>
              ))}
            </div>
            <div className={retro ? 'w-full flex justify-center' : ''}>{timerViews[timerStyle]}</div>
            <div className="flex gap-3 w-full max-w-sm mt-7">
              <button onClick={() => setRunning(r => !r)} className={`flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm shadow-sm ${btnStart}`}>
                <Play className="w-4 h-4" strokeWidth={2.5} /> {seconds === total ? p.start : p.resume}
              </button>
              <button onClick={reset} className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100">
                <RotateCcw className="w-4 h-4" strokeWidth={2} /> {p.reset}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">Tijdens het focussen verdwijnt alles behalve de timer.</p>
          </section>

          <aside className="space-y-4">
            <div className={`${card} p-5 space-y-4`}>
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-600 dark:text-indigo-300" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{p.settings}</h2>
                <PageInfo text="Studeer in blokken van 25 minuten met 5 minuten pauze. Deze methode heet de Pomodoro-techniek en helpt je om geconcentreerd te blijven." />
              </div>
              <div>
                <span className={label}>{p.focusMin}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[25, 45, 50].map(m => (
                    <button key={m} onClick={() => applyMinutes(m, customBreak)} aria-pressed={customWork === m}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border ${customWork === m ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 text-slate-700 dark:text-slate-200 hover:bg-indigo-50'}`}>{m} min</button>
                  ))}
                  <input type="number" min="1" max="120" value={customWork} aria-label={p.focusMin}
                    onChange={e => applyMinutes(parseInt(e.target.value), customBreak)}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <span className={label}>{p.breakMin}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[5, 10, 15].map(m => (
                    <button key={m} onClick={() => applyMinutes(customWork, m)} aria-pressed={customBreak === m}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border ${customBreak === m ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 text-slate-700 dark:text-slate-200 hover:bg-emerald-50'}`}>{m} min</button>
                  ))}
                  <input type="number" min="1" max="60" value={customBreak} aria-label={p.breakMin}
                    onChange={e => applyMinutes(customWork, parseInt(e.target.value))}
                    className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <span className={label}>Weergave</span>
                <div className="flex bg-indigo-50 rounded-xl p-1" role="group" aria-label="Weergave">
                  {styles.map(st => (
                    <button key={st.value} onClick={() => setTimerStyle(st.value)} aria-pressed={timerStyle === st.value} className={segment(timerStyle === st.value)}>
                      {st.icon}<span className="hidden sm:inline lg:hidden xl:inline">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {user && (
              <div className={`${card} p-5 flex items-center justify-between gap-3`}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.sessionMode}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{p.sessionModeDesc}</p>
                </div>
                <button onClick={() => setSessionMode(s => !s)} role="switch" aria-checked={sessionMode} aria-label={p.sessionMode}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${sessionMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${sessionMode ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            )}

            <div className={`${card} p-5`}>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Vandaag</p>
              <div className="mt-2"><SessionDots completed={completed} /></div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">Na elk focusblok tel je je minuten op bij een leermoment.</p>
            </div>
          </aside>
        </main>
      )}
    </div>
  )
}
