'use client'

import { useState, useEffect, useRef } from 'react'
import Nav from '@/components/Nav'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

type Mode = 'work' | 'break'

type Subject = { id: string; name: string }

type Props = {
  user: User | null
  subjects: Subject[]
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Herstel timer staat uit localStorage
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
        // Bereken resterende tijd (timer loopt niet door bij refresh)
        if (s.seconds !== undefined) setSeconds(s.seconds)
      }
    } catch {}
    setHydrated(true)
  }, [])

  // Sla timer staat op bij wijziging
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem('knowl_pomodoro', JSON.stringify({ mode, customWork, customBreak, seconds, completed, sessionMode }))
    } catch {}
  }, [mode, customWork, customBreak, seconds, completed, sessionMode, hydrated])

  // Post-session form state
  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionSubject, setSessionSubject] = useState('')
  const [sessionMinutes, setSessionMinutes] = useState('')
  const [sessionSaving, setSessionSaving] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const supabase = createClient()

  const config = {
    work:  { label: p.focus, color: 'text-indigo-700',  bg: 'from-indigo-600 to-violet-600', gradStart: '#6366f1', gradEnd: '#8b5cf6' },
    break: { label: p.break, color: 'text-emerald-700', bg: 'from-emerald-500 to-teal-500',  gradStart: '#10b981', gradEnd: '#14b8a6' },
  }

  const total = (mode === 'work' ? customWork : customBreak) * 60

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
                setSessionTitle('')
                setSessionSubject('')
                setSessionMinutes(String(customWork))
                setSessionSaved(false)
                setShowSessionForm(true)
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
    setMode(m)
    setRunning(false)
    setSeconds((m === 'work' ? customWork : customBreak) * 60)
  }

  function reset() {
    setRunning(false)
    setSeconds((mode === 'work' ? customWork : customBreak) * 60)
  }

  function applySettings() {
    setShowSettings(false)
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
    setSessionSaving(false)
    setSessionSaved(true)
    setTimeout(() => { setShowSessionForm(false); setSessionSaved(false) }, 1500)
  }

  const progress = ((total - seconds) / total) * 100
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  const c = config[mode]
  const circumference = 2 * Math.PI * 110

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />

      {/* Post-session modal */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-xl font-bold text-indigo-900">{p.sessionDone}</h2>
            </div>

            {sessionSaved ? (
              <p className="text-center text-emerald-500 font-semibold py-4">{p.sessionSaved} ✓</p>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium text-indigo-400 uppercase tracking-wide block mb-1">{p.sessionTitleLabel}</label>
                  <input
                    value={sessionTitle}
                    onChange={e => setSessionTitle(e.target.value)}
                    placeholder={p.sessionTitle}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    autoFocus
                  />
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
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                    {p.sessionSkip}
                  </button>
                  <button onClick={saveSessionMoment} disabled={sessionSaving || !sessionTitle.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    {sessionSaving ? '...' : p.sessionAdd}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto px-4 py-10 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-900">Pomodoro Timer</h1>
          <p className="text-sm text-indigo-400 mt-1">{p.subtitle}</p>
        </div>

        {/* Sessiemodus toggle */}
        {user && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-indigo-100 px-5 py-3">
            <div>
              <p className="text-sm font-medium text-indigo-800">{p.sessionMode}</p>
              <p className="text-xs text-indigo-400">Na elke sessie direct een leermoment invullen</p>
            </div>
            <button
              onClick={() => setSessionMode(s => !s)}
              className={`relative w-12 h-6 rounded-full transition-colors ${sessionMode ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${sessionMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        )}

        {/* Mode knoppen */}
        <div className="flex gap-2 bg-white rounded-2xl border border-indigo-100 p-2">
          {(['work', 'break'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === m ? `bg-gradient-to-r ${config[m].bg} text-white shadow-sm` : 'text-indigo-400 hover:text-indigo-600'}`}
            >
              {config[m].label}
            </button>
          ))}
        </div>

        {/* Cirkel timer */}
        <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-8 flex flex-col items-center gap-6">
          <div className="relative">
            <svg width="260" height="260" className="-rotate-90">
              <circle cx="130" cy="130" r="110" fill="none" stroke="#e0e7ff" strokeWidth="12" />
              <circle
                cx="130" cy="130" r="110"
                fill="none"
                stroke="url(#timerGrad)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * progress) / 100}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={c.gradStart} />
                  <stop offset="100%" stopColor={c.gradEnd} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-6xl font-bold tabular-nums ${c.color}`}>{mins}:{secs}</span>
              <span className="text-sm text-indigo-400 mt-1">{c.label}</span>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => setRunning(r => !r)}
              className={`flex-1 py-3 rounded-2xl font-semibold text-white text-sm transition-all shadow-sm bg-gradient-to-r ${c.bg} hover:opacity-90`}
            >
              {running ? p.pause : seconds === total ? p.start : p.resume}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 rounded-2xl text-sm font-medium text-indigo-400 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              {p.reset}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < (completed % 4) ? 'bg-indigo-500' : 'bg-indigo-100'}`} />
            ))}
            <span className="text-xs text-indigo-400 ml-1">{completed} {p.completed}</span>
          </div>
        </div>

        {/* Instellingen */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
          <button
            onClick={() => setShowSettings(s => !s)}
            className="w-full text-sm font-medium text-indigo-500 hover:text-indigo-700 flex justify-between items-center"
          >
            <span>{p.settings}</span>
            <span>{showSettings ? '▲' : '▼'}</span>
          </button>
          {showSettings && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-indigo-400 mb-1">{p.focusMin}</label>
                  <input type="number" min="1" max="60" value={customWork} onChange={e => setCustomWork(parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs text-indigo-400 mb-1">{p.breakMin}</label>
                  <input type="number" min="1" max="60" value={customBreak} onChange={e => setCustomBreak(parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <button onClick={applySettings} className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
                {p.apply}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
