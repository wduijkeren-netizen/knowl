'use client'

import { useState, useEffect, useRef } from 'react'
import Nav from '@/components/Nav'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

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
  const [showSettings, setShowSettings] = useState(false)
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
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionSubject, setSessionSubject] = useState('')
  const [sessionMinutes, setSessionMinutes] = useState('')
  const [sessionSaving, setSessionSaving] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const supabase = createClient()

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
              if (sessionMode && user) {
                setSessionTitle(''); setSessionSubject('')
                setSessionMinutes(String(customWork))
                setSessionSaved(false); setShowSessionForm(true)
              }
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

  async function saveSessionMoment() {
    if (!sessionTitle.trim() || !user) return
    setSessionSaving(true)
    await supabase.from('learning_moments').insert({
      id: crypto.randomUUID(),
      title: sessionTitle.trim(),
      category: sessionSubject || null,
      duration_minutes: parseInt(sessionMinutes) || null,
      learned_at: new Date().toISOString().split('T')[0],
      user_id: user.id,
    })
    setSessionSaving(false); setSessionSaved(true)
    setTimeout(() => { setShowSessionForm(false); setSessionSaved(false) }, 1500)
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

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      focusMode ? (retro ? 'bg-gray-950' : isWork ? 'bg-indigo-950' : 'bg-emerald-950') : 'bg-[#f8f7ff]'
    }`}>
      <div className={`transition-all duration-500 ${focusMode ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : 'opacity-100'}`}>
        <Nav />
      </div>

      {showSessionForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-5">
            <div className="text-center"><div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-bold text-indigo-900">{p.sessionDone}</h2>
            </div>
            {sessionSaved ? (
              <p className="text-center text-emerald-500 font-semibold py-4">{p.sessionSaved} ✓</p>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{p.sessionTitleLabel}</label>
                  <input value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} placeholder={p.sessionTitle} autoFocus
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{p.sessionSubject}</label>
                    {subjects.length > 0 ? (
                      <select value={sessionSubject} onChange={e => setSessionSubject(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                        <option value="">—</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={sessionSubject} onChange={e => setSessionSubject(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{p.sessionMinutes}</label>
                    <input type="number" value={sessionMinutes} onChange={e => setSessionMinutes(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowSessionForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50">{p.sessionSkip}</button>
                  <button onClick={saveSessionMoment} disabled={sessionSaving || !sessionTitle.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                    {sessionSaving ? '...' : p.sessionAdd}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className={`max-w-md mx-auto px-4 space-y-6 transition-all duration-500 ${
        focusMode ? 'flex flex-col items-center justify-center min-h-screen py-0' : 'py-10'
      }`}>
        {!focusMode && (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-indigo-900">{p.title ?? 'Pomodoro Timer'}</h1>
            <p className="text-sm text-indigo-400 mt-1">{p.subtitle}</p>
          </div>
        )}

        {!focusMode && (
          <div className="flex gap-2 justify-center">
            {([['circle', '◯', 'Cirkel'], ['minimal', '—', 'Minimaal'], ['retro', '▪︎', 'Retro']] as [Style, string, string][]).map(([s, icon, label]) => (
              <button key={s} onClick={() => setTimerStyle(s)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                  timerStyle === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-400 border-indigo-100 hover:border-indigo-300 hover:text-indigo-600'
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {!focusMode && user && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-indigo-100 px-5 py-3">
            <div>
              <p className="text-sm font-medium text-indigo-800">{p.sessionMode}</p>
              <p className="text-xs text-indigo-400">{p.sessionModeDesc}</p>
            </div>
            <button onClick={() => setSessionMode(s => !s)}
              className={`relative w-12 h-6 rounded-full transition-colors ${sessionMode ? 'bg-indigo-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${sessionMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        )}

        {!focusMode && (
          <div className={`flex gap-2 rounded-2xl border p-2 ${retro ? 'bg-gray-900 border-gray-800' : 'bg-white border-indigo-100'}`}>
            {(['work', 'break'] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === m
                    ? m === 'work' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                    : retro ? 'text-gray-500 hover:text-gray-300' : 'text-indigo-400 hover:text-indigo-600'
                }`}>
                {m === 'work' ? p.focus : p.break}
              </button>
            ))}
          </div>
        )}

        <div className={`flex flex-col items-center ${retro && !focusMode ? 'bg-transparent' : focusMode ? '' : 'bg-white rounded-3xl border border-indigo-100 shadow-sm'} p-8`}>
          {timerViews[timerStyle]}
          <div className={`flex gap-3 w-full mt-6 ${focusMode ? 'max-w-xs' : ''}`}>
            <button onClick={() => setRunning(r => !r)} className={`flex-1 py-3 rounded-2xl font-semibold text-sm transition-all shadow-sm ${btnStart}`}>
              {running ? p.pause : seconds === total ? p.start : p.resume}
            </button>
            <button onClick={reset} className={`px-5 py-3 rounded-2xl text-sm font-medium transition-colors ${btnReset}`}>
              {p.reset}
            </button>
          </div>
          {focusMode && (
            <p className={`text-xs mt-6 opacity-40 ${retro ? 'text-gray-400 font-mono' : 'text-white'}`}>
              Pauzeer om terug te keren
            </p>
          )}
        </div>

        {!focusMode && (
          <div className={`rounded-2xl border shadow-sm p-5 ${retro ? 'bg-gray-900 border-gray-800' : 'bg-white border-indigo-100'}`}>
            <button onClick={() => setShowSettings(s => !s)}
              className={`w-full text-sm font-medium flex justify-between items-center ${retro ? 'text-gray-400 hover:text-gray-200' : 'text-indigo-500 hover:text-indigo-700'}`}>
              <span>{p.settings}</span><span>{showSettings ? '▲' : '▼'}</span>
            </button>
            {showSettings && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs mb-1 ${retro ? 'text-gray-500 font-mono' : 'text-indigo-400'}`}>{p.focusMin}</label>
                    <input type="number" min="1" max="60" value={customWork} onChange={e => setCustomWork(parseInt(e.target.value))}
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${retro ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-200'}`} />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${retro ? 'text-gray-500 font-mono' : 'text-indigo-400'}`}>{p.breakMin}</label>
                    <input type="number" min="1" max="60" value={customBreak} onChange={e => setCustomBreak(parseInt(e.target.value))}
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${retro ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-200'}`} />
                  </div>
                </div>
                <button onClick={() => { setShowSettings(false); setRunning(false); setSeconds((mode === 'work' ? customWork : customBreak) * 60) }}
                  className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
                  {p.apply}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
