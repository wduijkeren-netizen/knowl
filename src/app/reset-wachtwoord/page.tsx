'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AuroraHero } from '@/components/AuroraHero'

export default function ResetWachtwoordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('De wachtwoorden komen niet overeen.')
      return
    }
    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/home'), 2500)
    }
  }

  return (
    <AuroraHero className="bg-[#f8f7ff] [--primary:theme(colors.indigo.500)] [--muted-foreground:theme(colors.violet.400)]">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 tracking-tight">Knowl</h1>
          <p className="text-indigo-400 mt-2 text-sm">Jouw persoonlijke leertracker</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 p-8">
          <h2 className="text-lg font-semibold text-indigo-900 mb-1">Nieuw wachtwoord instellen</h2>
          <p className="text-sm text-gray-400 mb-6">Kies een nieuw wachtwoord voor je account.</p>

          {done ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-4 text-center">
              <p className="text-sm text-emerald-600 font-medium">Wachtwoord succesvol gewijzigd!</p>
              <p className="text-xs text-emerald-500 mt-1">Je wordt doorgestuurd naar Home…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Nieuw wachtwoord</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Herhaal wachtwoord</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 mt-2">
                {loading ? 'Opslaan...' : 'Wachtwoord opslaan'}
              </button>
            </form>
          )}
        </div>
      </div>
    </AuroraHero>
  )
}
