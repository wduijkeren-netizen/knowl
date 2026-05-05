'use client'

import { useState, useEffect, useRef } from 'react'
import Nav from '@/components/Nav'

type Mode = 'work' | 'break'

export default function PomodoroTimer() {
  const [mode, setMode] = useState<Mode>('work')
  const [customWork, setCustomWork] = useState(25)
  const [customBreak, setCustomBreak] = useState(5)
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const config = {
    work:  { label: 'Focus',  color: 'text-indigo-700',  bg: 'from-indigo-600 to-violet-600', gradStart: '#6366f1', gradEnd: '#8b5cf6' },
    break: { label: 'Pauze',  color: 'text-emerald-700', bg: 'from-emerald-500 to-teal-500',  gradStart: '#10b981', gradEnd: '#14b8a6' },
  }

  const total = (mode === 'work' ? customWork : customBreak) * 60

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            if (mode === 'work') setCompleted(c => c + 1)
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
  }, [running, mode])

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

  const progress = ((total - seconds) / total) * 100
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')
  const c = config[mode]
  const circumference = 2 * Math.PI * 110

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-md mx-auto px-4 py-10 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-900">Pomodoro Timer</h1>
          <p className="text-sm text-indigo-400 mt-1">Focus in blokken, rust bewust</p>
        </div>

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
              {running ? 'Pauzeren' : seconds === total ? 'Starten' : 'Hervatten'}
            </button>
            <button
              onClick={reset}
              className="px-5 py-3 rounded-2xl text-sm font-medium text-indigo-400 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < (completed % 4) ? 'bg-indigo-500' : 'bg-indigo-100'}`} />
            ))}
            <span className="text-xs text-indigo-400 ml-1">{completed} voltooid</span>
          </div>
        </div>

        {/* Instellingen */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5">
          <button
            onClick={() => setShowSettings(s => !s)}
            className="w-full text-sm font-medium text-indigo-500 hover:text-indigo-700 flex justify-between items-center"
          >
            <span>Tijden aanpassen</span>
            <span>{showSettings ? '▲' : '▼'}</span>
          </button>
          {showSettings && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-indigo-400 mb-1">Focus (minuten)</label>
                  <input type="number" min="1" max="60" value={customWork} onChange={e => setCustomWork(parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs text-indigo-400 mb-1">Pauze (minuten)</label>
                  <input type="number" min="1" max="60" value={customBreak} onChange={e => setCustomBreak(parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <button onClick={applySettings} className="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 transition-colors">
                Toepassen
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
