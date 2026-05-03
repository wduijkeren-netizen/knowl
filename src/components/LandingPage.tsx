'use client'

import Link from 'next/link'
import { AuroraBackground } from '@/components/AuroraBackground'

const features = [
  { title: 'Log learning moments', desc: 'Add what you learned in seconds — with subject, minutes, and a summary.' },
  { title: 'Track your progress', desc: 'Charts per subject show how evenly you distribute your study time.' },
  { title: 'Pomodoro timer', desc: 'Focus in 25-minute blocks. Rest deliberately, work with concentration.' },
  { title: 'Set goals', desc: 'Set a deadline and target minutes per subject. Knowl tracks your progress.' },
  { title: 'Spaced repetition', desc: 'Knowl reminds you of past learning moments so you actually retain them.' },
  { title: 'Monthly overview', desc: 'Every month a recap of your top subject, streak, and total hours.' },
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
  return (
    <div className="min-h-screen bg-white">
      {/* Navigatie */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-sm border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-indigo-700 tracking-tight">Knowl</span>
          <div className="flex gap-3 items-center">
            <Link href="/login" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
              Log in
            </Link>
            <Link href="/leermomenten" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              Get started →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero met Aurora */}
      <AuroraBackground className="pt-16 min-h-screen">
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center pb-32 md:pb-0">

          {/* Badge */}
          <div className="inline-block bg-white/80 backdrop-blur-sm text-indigo-600 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-indigo-100 shadow-sm">
            Free to use · No account required
          </div>

          {/* Heading */}
          <h1 className="text-6xl md:text-7xl font-bold text-indigo-900 leading-[1.1] text-center max-w-3xl">
            Learn smarter.
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              Not harder.
            </span>
          </h1>

          <p className="text-xl text-indigo-500 mt-6 leading-relaxed max-w-lg text-center">
            Track what you learn, how long you study, and whether you reach your goals.
          </p>

          {/* CTA knoppen */}
          <div className="flex gap-4 justify-center mt-10 flex-wrap">
            <Link href="/leermomenten"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-9 py-4 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-xl shadow-indigo-300">
              Start for free →
            </Link>
            <Link href="/login"
              className="bg-white/80 backdrop-blur-sm text-indigo-600 px-9 py-4 rounded-2xl font-bold text-base hover:bg-white transition-colors border border-indigo-100 shadow-sm">
              Log in
            </Link>
          </div>

          <p className="text-xs text-indigo-300 mt-4">No account needed · Data saved after signing up</p>

          {/* Preview kaarten */}
          <div className="mt-16 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kaart 1 — leermoment */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-indigo-100 shadow-lg p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">New moment</span>
                <span className="text-xs text-indigo-300">today</span>
              </div>
              <p className="font-bold text-indigo-900 text-sm">Understanding case law interpretation</p>
              <p className="text-xs text-indigo-400 mt-2 leading-relaxed">Studied how courts apply precedent in civil cases...</p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">Law</span>
                <span className="text-xs bg-violet-50 text-violet-500 rounded-full px-2.5 py-0.5 font-medium">45 min</span>
              </div>
            </div>

            {/* Kaart 2 — statistieken */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-indigo-100 shadow-lg p-5">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">This month</span>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <p className="text-3xl font-bold text-indigo-700">24</p>
                  <p className="text-xs text-indigo-400">moments</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-indigo-700">18<span className="text-lg text-indigo-300">h</span></p>
                  <p className="text-xs text-indigo-400">studied</p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-indigo-100 rounded-full overflow-hidden">
                <div className="h-full w-3/4 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
              </div>
              <p className="text-xs text-indigo-400 mt-1">75% of monthly goal</p>
            </div>

            {/* Kaart 3 — streak */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg p-5 text-white">
              <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Current streak</span>
              <p className="text-6xl font-bold mt-2">7</p>
              <p className="text-indigo-200 text-sm">days in a row</p>
              <div className="flex gap-1.5 mt-4">
                {[1,2,3,4,5,6,7].map(i => (
                  <div key={i} className="flex-1 h-1.5 bg-white rounded-full opacity-90" />
                ))}
              </div>
              <p className="text-xs text-indigo-300 mt-2">Keep it up!</p>
            </div>
          </div>

        </div>
      </AuroraBackground>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-indigo-900">Everything you need to track what you learn</h2>
          <p className="text-indigo-400 mt-3">Built for students who are serious about their development.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={f.title} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-indigo-100">
              <div className={`h-32 flex items-end px-6 pb-4 ${colors[i % colors.length]}`}>
                <h3 className="text-lg font-bold text-white leading-tight">{f.title}</h3>
              </div>
              <div className="bg-white px-6 py-4">
                <p className="text-sm text-indigo-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gradient-to-r from-indigo-600 to-violet-600 py-16">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center text-white">
          <div>
            <p className="text-4xl font-bold">9</p>
            <p className="text-indigo-200 text-sm mt-1">Languages available</p>
          </div>
          <div>
            <p className="text-4xl font-bold">∞</p>
            <p className="text-indigo-200 text-sm mt-1">Learning moments</p>
          </div>
          <div>
            <p className="text-4xl font-bold">100%</p>
            <p className="text-indigo-200 text-sm mt-1">Free to try</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-indigo-900">Ready to start?</h2>
        <p className="text-indigo-400 mt-3 mb-8">Try Knowl for free — no account needed.</p>
        <Link href="/leermomenten"
          className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-2xl font-semibold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
          Open the portal →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-indigo-100 py-8 text-center">
        <p className="text-sm text-indigo-300">© 2025 Knowl · Built for students</p>
      </footer>
    </div>
  )
}
