'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import type { User } from '@supabase/supabase-js'

type Props = {
  user: User
  profile: { voornaam: string | null; achternaam: string | null }
}

export default function ProfielForm({ user, profile }: Props) {
  const [voornaam, setVoornaam] = useState(profile.voornaam ?? '')
  const [achternaam, setAchternaam] = useState(profile.achternaam ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!voornaam.trim()) return
    setSaving(true)
    setError('')
    setSaved(false)

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, voornaam: voornaam.trim(), achternaam: achternaam.trim() || null })

    if (error) setError('Kon profiel niet opslaan. Probeer opnieuw.')
    else setSaved(true)
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-lg mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">Profiel</h1>
          <p className="text-sm text-indigo-400 mt-1">Jouw persoonlijke gegevens</p>
        </div>

        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
            <h2 className="font-semibold text-white">Persoonsgegevens</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                E-mailadres
              </label>
              <input
                value={user.email ?? ''}
                disabled
                className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Je e-mailadres kan niet worden gewijzigd.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Voornaam <span className="text-red-400">*</span>
              </label>
              <input
                value={voornaam}
                onChange={e => setVoornaam(e.target.value)}
                required
                placeholder="bijv. Emma"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Achternaam <span className="text-gray-400 font-normal">(optioneel)</span>
              </label>
              <input
                value={achternaam}
                onChange={e => setAchternaam(e.target.value)}
                placeholder="bijv. de Vries"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
            {saved && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <p className="text-sm text-emerald-600">Profiel opgeslagen.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !voornaam.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
