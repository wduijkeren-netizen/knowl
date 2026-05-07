'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { languages, type LangCode } from '@/lib/i18n/translations'

const features = [
  { title: 'Leermomenten bijhouden', desc: 'Log in seconden wat je hebt geleerd — met vak, minuten en een samenvatting.' },
  { title: 'Voortgang per vak', desc: 'Grafieken laten zien hoe je de tijd verdeelt over je vakken.' },
  { title: 'Pomodoro timer', desc: 'Focus in blokken van 25 minuten. Rust bewust, werk geconcentreerd.' },
  { title: 'Doelen stellen', desc: 'Stel een deadline en doelminuten per vak in. Knowl houdt je voortgang bij.' },
  { title: 'Gespreide herhaling', desc: 'Knowl herinnert je aan oude leermomenten zodat je de stof écht onthoudt.' },
  { title: 'Maandoverzicht', desc: 'Aan het einde van elke maand een overzicht van je topvak, streak en uren.' },
]

const colors = [
  'bg-gradient-to-br from-indigo-500 to-violet-600',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-amber-500 to-orange-500',
  'bg-gradient-to-br from-pink-500 to-rose-600',
]

export default function LandingPage() {
  const { lang, setLang } = useLanguage()
  const [showLang, setShowLang] = useState(false)
  const currentLang = languages.find(l => l.code === lang)

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold text-indigo-700 tracking-tight">Knowl</span>
          <div className="flex gap-2 items-center">
            {/* Taalswitch */}
            <div className="relative">
              <button onClick={() => setShowLang(s => !s)}
                className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-2.5 py-1.5 transition-colors">
                <span>{currentLang?.flag}</span>
                <span className="font-medium text-xs">{currentLang?.code.toUpperCase()}</span>
                <span className="text-xs opacity-60">▾</span>
              </button>
              {showLang && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLang(false)} />
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 z-20 min-w-[170px]">
                    {languages.map(l => (
                      <button key={l.code} onClick={() => { setLang(l.code as LangCode); setShowLang(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${lang === l.code ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}>
                        <span>{l.flag}</span><span>{l.label}</span>
                        {lang === l.code && <span className="ml-auto text-indigo-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link href="/login" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors px-3 py-1.5">
              Inloggen
            </Link>
            <Link href="/leermomenten" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              Start gratis →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-violet-200 rounded-full blur-3xl opacity-25 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-block bg-white text-indigo-600 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-indigo-100 shadow-sm">
            Gratis te gebruiken · Geen account nodig
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-indigo-900 leading-tight">
            Zie wat je écht leert.
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              Niet alleen wat je opschrijft.
            </span>
          </h1>

          <p className="text-base md:text-lg text-indigo-500 mt-5 leading-relaxed max-w-lg mx-auto">
            Knowl houdt bij wat je leert, hoe lang je studeert en of je je doelen haalt — per vak, per dag, per maand.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/leermomenten"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 text-center">
              Start gratis →
            </Link>
            <Link href="/login"
              className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-bold text-base hover:bg-indigo-50 transition-colors border border-indigo-200 shadow-sm text-center">
              Inloggen
            </Link>
          </div>
          <p className="text-xs text-indigo-300 mt-3">Geen account nodig · Data bewaard na aanmelden</p>
        </div>

        {/* Preview kaarten */}
        <div className="relative max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 px-0">

          {/* Kaart 1 — leermoment na college */}
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Na het college</span>
              <span className="text-xs text-indigo-300">vandaag</span>
            </div>
            <p className="font-bold text-indigo-900 text-sm">Statistiek H6 — normale verdeling</p>
            <p className="text-xs text-indigo-400 mt-2 leading-relaxed">Eindelijk snap ik het verschil tussen z-score en t-toets. Geoefend met tentamenvragen...</p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">Statistiek</span>
              <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2.5 py-0.5 font-medium">50 min</span>
            </div>
          </div>

          {/* Kaart 2 — tentamen countdown met doel */}
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">Tentamen over</span>
              <span className="text-xs font-bold text-red-400">8 dagen</span>
            </div>
            <p className="text-lg font-bold text-indigo-900 mt-1">Bedrijfseconomie</p>
            <div className="mt-3 h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full w-[62%] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
            </div>
            <p className="text-xs text-indigo-400 mt-1.5">620 / 1000 minuten — 62% van doel</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-indigo-700">14</p>
                <p className="text-xs text-indigo-400">sessies</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-violet-600">48</p>
                <p className="text-xs text-violet-400">min nodig/dag</p>
              </div>
            </div>
          </div>

          {/* Kaart 3 — streak */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg p-5 text-white">
            <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Studeerstreak</span>
            <p className="text-5xl font-bold mt-2">12</p>
            <p className="text-indigo-200 text-sm">dagen op rij gestudeerd</p>
            <div className="flex gap-1 mt-4 flex-wrap">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-md bg-white/30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-white opacity-90" />
                </div>
              ))}
            </div>
            <p className="text-xs text-indigo-300 mt-3">Beste week: 9u 40min · Topvak: Marketing</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-indigo-900">Alles wat je nodig hebt om bij te houden wat je leert</h2>
          <p className="text-indigo-400 mt-2 text-sm md:text-base">Gemaakt voor studenten die serieus zijn over hun ontwikkeling.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={f.title} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-indigo-100">
              <div className={`h-24 flex items-end px-5 pb-4 ${colors[i % colors.length]}`}>
                <h3 className="text-base font-bold text-white leading-tight">{f.title}</h3>
              </div>
              <div className="bg-white px-5 py-4">
                <p className="text-sm text-indigo-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Over Knowl */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">Over Knowl</span>
              <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mt-2 leading-tight">
                Gemaakt door een student,<br />voor studenten
              </h2>
              <p className="text-indigo-600 mt-4 leading-relaxed text-sm md:text-base">
                Knowl is ontstaan uit een simpel probleem: je werkt hard, maar weet aan het einde van de week niet meer wat je eigenlijk hebt geleerd. En je hebt geen idee of je genoeg doet voor dat ene vak.
              </p>
              <p className="text-indigo-500 mt-3 leading-relaxed text-sm md:text-base">
                Knowl geeft je inzicht — niet meer, niet minder. Geen fancy AI, geen abonnement, geen reclame. Gewoon een helder overzicht van wat je leert en hoe je groeit.
              </p>
              <div className="flex gap-4 mt-6 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-700">100%</p>
                  <p className="text-xs text-indigo-400">Gratis</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-700">9</p>
                  <p className="text-xs text-indigo-400">Talen</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-700">0</p>
                  <p className="text-xs text-indigo-400">Reclame</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { emoji: '🎯', title: 'Doelgericht', desc: 'Stel doelen per vak en zie dagelijks hoe dichtbij je bent.' },
                { emoji: '📊', title: 'Inzichtelijk', desc: 'Grafieken, streaks en weekoverzichten laten je exacte leerpatroon zien.' },
                { emoji: '🛡️', title: 'Motiverend', desc: 'Streakschilden, beoordelingen en mijlpalen houden je gemotiveerd.' },
                { emoji: '🔒', title: 'Jouw data', desc: 'Alles staat op jouw account. Exporteer wanneer je wilt.' },
              ].map(item => (
                <div key={item.title} className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm">
                  <span className="text-2xl shrink-0">{item.emoji}</span>
                  <div>
                    <p className="font-semibold text-indigo-900 text-sm">{item.title}</p>
                    <p className="text-xs text-indigo-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-r from-indigo-600 to-violet-600 py-12">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-4 text-center text-white">
          <div>
            <p className="text-3xl md:text-4xl font-bold">9</p>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">Talen</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold">∞</p>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">Momenten</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold">100%</p>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">Gratis</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-900">Klaar om te beginnen?</h2>
        <p className="text-indigo-400 mt-3 mb-8 text-sm md:text-base">Probeer Knowl gratis — geen account nodig.</p>
        <Link href="/leermomenten"
          className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
          Start gratis →
        </Link>
      </section>

      <footer className="border-t border-indigo-100 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm text-indigo-300">© 2025 Knowl · Gemaakt voor studenten</p>
          <div className="flex gap-4 text-xs text-indigo-300">
            <Link href="/privacy" className="hover:text-indigo-500 transition-colors">Privacybeleid</Link>
            <span>·</span>
            <Link href="/voorwaarden" className="hover:text-indigo-500 transition-colors">Gebruiksvoorwaarden</Link>
            <span>·</span>
            <a href="mailto:info@knowl.app" className="hover:text-indigo-500 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
