'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Session = {
  id: string
  code: string
  host_id: string
  mode: string
  seconds: number
  running: boolean
  started_at: string | null
  custom_work: number
  custom_break: number
}

type Participant = { userId: string; name: string; joinedAt: number }

export default function GroepSession({
  initialSession, userId, userName, isHost
}: {
  initialSession: Session
  userId: string
  userName: string
  isHost: boolean
}) {
  const supabase = createClient()
  const [session, setSession] = useState(initialSession)
  const [timeLeft, setTimeLeft] = useState(initialSession.seconds)
  const [participants, setParticipants] = useState<Participant[]>([{ userId, name: userName, joinedAt: Date.now() }])
  const [copied, setCopied] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const workSeconds = (session.custom_work ?? 25) * 60
  const breakSeconds = (session.custom_break ?? 5) * 60
  const totalSeconds = session.mode === 'work' ? workSeconds : breakSeconds

  const computeTimeLeft = useCallback((s: Session) => {
    if (!s.running || !s.started_at) return s.seconds
    const elapsed = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000)
    return Math.max(0, s.seconds - elapsed)
  }, [])

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (session.running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(computeTimeLeft(session))
      }, 500)
    } else {
      setTimeLeft(session.seconds)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [session, computeTimeLeft])

  useEffect(() => {
    const channel = supabase
      .channel(`group-${session.code}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'group_sessions',
        filter: `code=eq.${session.code}`,
      }, (payload) => {
        const updated = payload.new as Session
        setSession(updated)
        setTimeLeft(computeTimeLeft(updated))
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string }>()
        const parts: Participant[] = Object.entries(state).map(([key, presences]) => ({
          userId: key,
          name: (presences as unknown as {name: string}[])[0]?.name ?? 'Student',
          joinedAt: Date.now(),
        }))
        setParticipants(parts)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: userName })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [session.code, userName, computeTimeLeft, supabase])

  async function updateSession(patch: Partial<Session>) {
    if (!isHost) return
    await supabase.from('group_sessions').update(patch).eq('code', session.code)
  }

  async function handleStart() {
    await updateSession({ running: true, started_at: new Date().toISOString() })
  }

  async function handlePause() {
    const remaining = computeTimeLeft(session)
    await updateSession({ running: false, seconds: remaining, started_at: null })
  }

  async function handleReset() {
    const secs = session.mode === 'work' ? workSeconds : breakSeconds
    await updateSession({ running: false, seconds: secs, started_at: null })
  }

  async function handleModeSwitch(mode: string) {
    const secs = mode === 'work' ? workSeconds : breakSeconds
    await updateSession({ running: false, mode, seconds: secs, started_at: null })
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0
  const isWork = session.mode === 'work'

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-md mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-indigo-900">Groepsstudie</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-indigo-400 tracking-widest">{session.code}</span>
              <button onClick={async () => {
                await navigator.clipboard.writeText(`${window.location.origin}/pomodoro/groep/${session.code}`)
                setCopied(true); setTimeout(() => setCopied(false), 2000)
              }} className="text-xs text-indigo-400 hover:text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg transition-colors">
                {copied ? '✓' : '🔗 Delen'}
              </button>
            </div>
          </div>
          {!isHost && <span className="text-xs bg-indigo-50 text-indigo-400 px-2.5 py-1 rounded-full">Deelnemer</span>}
          {isHost && <span className="text-xs bg-indigo-600 text-white px-2.5 py-1 rounded-full">Host</span>}
        </div>

        <div className="flex gap-2 bg-indigo-50 rounded-2xl p-1.5">
          {['work', 'break'].map(mode => (
            <button key={mode} onClick={() => isHost && handleModeSwitch(mode)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${session.mode === mode ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-400'} ${!isHost ? 'cursor-default' : ''}`}>
              {mode === 'work' ? '🎯 Focus' : '☕ Pauze'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-10 text-center space-y-4">
          <div className="relative w-48 h-48 mx-auto">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#e0e7ff" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none"
                stroke={isWork ? '#6366f1' : '#10b981'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-5xl font-bold text-indigo-900 tabular-nums">{mins}:{secs}</p>
              <p className="text-xs text-indigo-400 mt-1 uppercase tracking-wide">{isWork ? 'Focus' : 'Pauze'}</p>
            </div>
          </div>

          {isHost && (
            <div className="flex gap-3 justify-center">
              {!session.running ? (
                <button onClick={handleStart}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors active:scale-95">
                  ▶ Starten
                </button>
              ) : (
                <button onClick={handlePause}
                  className="bg-amber-100 text-amber-700 px-8 py-3 rounded-xl font-semibold hover:bg-amber-200 transition-colors active:scale-95">
                  ⏸ Pauzeren
                </button>
              )}
              <button onClick={handleReset}
                className="bg-indigo-50 text-indigo-500 px-4 py-3 rounded-xl font-semibold hover:bg-indigo-100 transition-colors active:scale-95">
                ↺
              </button>
            </div>
          )}
          {!isHost && (
            <p className="text-sm text-indigo-300">De host bedient de timer</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">👥 Deelnemers ({participants.length})</p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p, i) => (
              <span key={i} className={`text-sm px-3 py-1.5 rounded-xl font-medium ${p.userId === userId ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                {p.name} {p.userId === session.host_id ? '👑' : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/pomodoro" className="text-sm text-indigo-400 hover:text-indigo-600 transition-colors">
            ← Terug naar eigen timer
          </Link>
        </div>
      </main>
    </div>
  )
}
