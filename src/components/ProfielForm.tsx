'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Nav from '@/components/Nav'
import PageInfo from '@/components/PageInfo'
import type { User } from '@supabase/supabase-js'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import DagelijkseHerinnering from '@/components/DagelijkseHerinnering'
import BadgesSection from '@/components/BadgesSection'

type Profile = {
  voornaam?: string | null
  achternaam?: string | null
  telefoonnummer?: string | null
  geboortedatum?: string | null
  postcode?: string | null
  stad?: string | null
}

type Props = {
  user: User
  profile: Profile
  moments: { learned_at: string; duration_minutes: number | null; created_at?: string | null }[]
  subjectCount: number
  flashcardsSR: number
  hasWordweb: boolean
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">
        {label}
        {required
          ? <span className="text-red-400 ml-1">*</span>
          : <span className="text-gray-400 font-normal ml-1">(optioneel)</span>
        }
      </label>
      {children}
    </div>
  )
}

export default function ProfielForm({ user, profile, moments, subjectCount, flashcardsSR, hasWordweb }: Props) {
  const { tr } = useLanguage()
  const p = tr.profile
  const [voornaam, setVoornaam] = useState(profile.voornaam ?? '')
  const [achternaam, setAchternaam] = useState(profile.achternaam ?? '')
  const [telefoonnummer, setTelefoonnummer] = useState(profile.telefoonnummer ?? '')
  const [geboortedatum, setGeboortedatum] = useState(profile.geboortedatum ?? '')
  const [postcode, setPostcode] = useState(profile.postcode ?? '')
  const [stad, setStad] = useState(profile.stad ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!voornaam.trim()) return
    setSaving(true)
    setError('')
    setSaved(false)

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      voornaam: voornaam.trim(),
      achternaam: achternaam.trim() || null,
      telefoonnummer: telefoonnummer.trim() || null,
      geboortedatum: geboortedatum || null,
      postcode: postcode.trim() || null,
      stad: stad.trim() || null,
      updated_at: new Date().toISOString(),
    })

    if (error) setError(p.error)
    else setSaved(true)
    setSaving(false)
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/delete-account', { method: 'DELETE' })
    if (res.ok) {
      await supabase.auth.signOut()
      window.location.href = '/'
    } else {
      setDeleting(false)
      setDeleteConfirm(false)
      setError('Kon account niet verwijderen. Probeer het later opnieuw.')
    }
  }

  const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all'

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-lg mx-auto px-4 py-10 space-y-8">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-bold text-indigo-900">{p.title}</h1><PageInfo text="Jouw accountgegevens en de badges die je hebt verdiend. Badges verdien je automatisch door Knowl te gebruiken — streaks, uren, flashcards en meer." /></div>
          <p className="text-sm text-indigo-400 mt-1">{p.subtitle}</p>
        </div>

        <BadgesSection moments={moments} subjectCount={subjectCount} flashcardsSR={flashcardsSR} hasWordweb={hasWordweb} />

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Account */}
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
              <h2 className="font-semibold text-white">{p.account}</h2>
            </div>
            <div className="p-6">
              <Field label="E-mailadres">
                <input
                  value={user.email ?? ''}
                  disabled
                  className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">{p.emailNote}</p>
              </Field>
            </div>
          </div>

          {/* Persoonsgegevens */}
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4">
              <h2 className="font-semibold text-white">{p.personalInfo}</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={p.firstName} required>
                  <input
                    value={voornaam}
                    onChange={e => setVoornaam(e.target.value)}
                    required
                    placeholder="Emma"
                    className={inputClass}
                  />
                </Field>
                <Field label={p.lastName}>
                  <input
                    value={achternaam}
                    onChange={e => setAchternaam(e.target.value)}
                    placeholder="de Vries"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label={p.phone}>
                <input
                  type="tel"
                  value={telefoonnummer}
                  onChange={e => setTelefoonnummer(e.target.value)}
                  placeholder="+31 6 12345678"
                  className={inputClass}
                />
              </Field>

              <Field label={p.birthdate}>
                <input
                  type="date"
                  value={geboortedatum}
                  onChange={e => setGeboortedatum(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {/* Adres */}
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
              <h2 className="font-semibold text-white">{p.address}</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={p.postcode}>
                  <input
                    value={postcode}
                    onChange={e => setPostcode(e.target.value)}
                    placeholder="1234 AB"
                    className={inputClass}
                  />
                </Field>
                <Field label="Stad">
                  <input
                    value={stad}
                    onChange={e => setStad(e.target.value)}
                    placeholder="Amsterdam"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          {saved && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
              <p className="text-sm text-emerald-600">{p.saved}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !voornaam.trim()}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200"
          >
            {saving ? p.saving : p.save}
          </button>
        </form>

        <DagelijkseHerinnering />

        {/* Account verwijderen */}
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-red-700">Account verwijderen</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Als je je account verwijdert, worden al je leermomenten, vakken en profielgegevens permanent gewist. Dit kan niet ongedaan worden gemaakt.
          </p>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-4 py-2 rounded-xl transition-colors font-medium"
            >
              Account verwijderen
            </button>
          ) : (
            <div className="bg-red-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-red-700">Weet je het zeker? Dit verwijdert alles permanent.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Bezig...' : 'Ja, verwijder alles'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="flex gap-4 text-xs text-indigo-300 justify-center pb-4">
          <a href="/privacy" className="hover:text-indigo-500 transition-colors">Privacybeleid</a>
          <span>·</span>
          <a href="/voorwaarden" className="hover:text-indigo-500 transition-colors">Gebruiksvoorwaarden</a>
        </div>
      </main>
    </div>
  )
}
