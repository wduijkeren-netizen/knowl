'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import { createClient } from '@/lib/supabase/client'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function GroepCreate({ userId }: { userId: string; userName: string }) {
  const [loading, setLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function createSession() {
    setLoading(true)
    const code = generateCode()
    const { error } = await supabase.from('group_sessions').insert({
      code,
      host_id: userId,
      mode: 'work',
      seconds: 1500,
      running: false,
    })
    if (error) { setError('Kon sessie niet aanmaken.'); setLoading(false); return }
    router.push(`/pomodoro/groep/${code}`)
  }

  async function joinSession() {
    if (!joinCode.trim()) return
    const code = joinCode.trim().toUpperCase()
    const { data } = await supabase.from('group_sessions').select('code').eq('code', code).maybeSingle()
    if (!data) { setError('Code niet gevonden.'); return }
    router.push(`/pomodoro/groep/${code}`)
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-md mx-auto px-4 py-16 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-5xl">👥</p>
          <h1 className="text-2xl font-bold text-indigo-900">Groepsstudie</h1>
          <p className="text-indigo-400">Studeer samen met vrienden in dezelfde Pomodoro-sessie.</p>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <button onClick={createSession} disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-2xl font-bold text-base hover:opacity-90 disabled:opacity-50 transition-all active:scale-95">
            {loading ? 'Aanmaken...' : '🚀 Nieuwe sessie starten'}
          </button>
          <p className="text-center text-sm text-indigo-300">— of —</p>
          <div className="space-y-2">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Voer code in (bijv. KWFL)"
              maxLength={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-bold tracking-widest text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase"
            />
            <button onClick={joinSession} disabled={joinCode.length < 4}
              className="w-full bg-indigo-100 text-indigo-700 py-3 rounded-xl font-semibold hover:bg-indigo-200 disabled:opacity-50 transition-colors">
              Deelnemen →
            </button>
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>

        <p className="text-center text-xs text-indigo-300">
          De host kan de timer bedienen. Deelnemers zien dezelfde timer.
        </p>
      </main>
    </div>
  )
}
