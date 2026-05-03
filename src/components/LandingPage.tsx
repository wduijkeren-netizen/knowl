'use client'

import Link from 'next/link'
import { AuroraHero } from '@/components/AuroraHero'

const features = [
  { icon: '📝', title: 'Log leermomenten', desc: 'Voeg in seconden bij wat je hebt geleerd — met vak, minuten en een samenvatting.' },
  { icon: '📊', title: 'Zie je voortgang', desc: 'Grafieken per vak laten zien hoe evenwichtig je de tijd verdeelt.' },
  { icon: '⏱', title: 'Pomodoro timer', desc: 'Focus in blokken van 25 minuten. Rust bewust, werk geconcentreerd.' },
  { icon: '🎯', title: 'Stel doelen', desc: 'Zet een deadline en doelminuten per vak. Knowl houdt de voortgang bij.' },
  { icon: '🔁', title: 'Spaced repetition', desc: 'Knowl herinnert je aan oude leermomenten zodat je het echt onthoudt.' },
  { icon: '🎁', title: 'Maandoverzicht', desc: 'Elke maand een overzicht van je topvak, streak en totale uren.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      {/* Navigatie */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-sm border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-indigo-700 tracking-tight">Knowl</span>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
              Inloggen
            </Link>
            <Link href="/leermomenten" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              Portaal →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <AuroraHero className="bg-[#f8f7ff] pt-16 [--primary:theme(colors.indigo.500)] [--muted-foreground:theme(colors.violet.400)]">
        <div className="text-center px-4 max-w-3xl mx-auto">
          <div className="inline-block bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-indigo-100">
            Gratis te gebruiken · Geen account vereist
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-indigo-900 leading-tight">
            Leer slimmer.<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Niet harder.
            </span>
          </h1>
          <p className="text-lg text-indigo-400 mt-6 leading-relaxed max-w-xl mx-auto">
            Knowl helpt je bijhouden wat je leert, hoe lang je studeert en of je je doelen haalt — per vak, per dag, per maand.
          </p>
          <div className="flex gap-4 justify-center mt-8 flex-wrap">
            <Link href="/leermomenten"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-semibold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
              Begin gratis →
            </Link>
            <Link href="/login"
              className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-semibold text-base hover:bg-indigo-50 transition-colors border border-indigo-100 shadow-sm">
              Inloggen
            </Link>
          </div>
          <p className="text-xs text-indigo-300 mt-4">Geen account nodig om te proberen · Data bewaard na aanmelden</p>
        </div>
      </AuroraHero>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-indigo-900">Alles wat je nodig hebt om bij te houden wat je leert</h2>
          <p className="text-indigo-400 mt-3">Gebouwd voor studenten die serieus bezig zijn met hun ontwikkeling.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-indigo-900 mb-1">{f.title}</h3>
              <p className="text-sm text-indigo-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistieken */}
      <section className="bg-gradient-to-r from-indigo-600 to-violet-600 py-16">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center text-white">
          <div>
            <p className="text-4xl font-bold">9</p>
            <p className="text-indigo-200 text-sm mt-1">Talen beschikbaar</p>
          </div>
          <div>
            <p className="text-4xl font-bold">∞</p>
            <p className="text-indigo-200 text-sm mt-1">Leermomenten</p>
          </div>
          <div>
            <p className="text-4xl font-bold">100%</p>
            <p className="text-indigo-200 text-sm mt-1">Gratis te proberen</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-indigo-900">Klaar om te beginnen?</h2>
        <p className="text-indigo-400 mt-3 mb-8">Probeer Knowl gratis — geen account nodig.</p>
        <Link href="/leermomenten"
          className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-2xl font-semibold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
          Open het portaal →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-indigo-100 py-8 text-center">
        <p className="text-sm text-indigo-300">© 2025 Knowl · Gebouwd voor studenten</p>
      </footer>
    </div>
  )
}
