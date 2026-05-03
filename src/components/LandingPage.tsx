'use client'

import Link from 'next/link'

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
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold text-indigo-700 tracking-tight">Knowl</span>
          <div className="flex gap-2 items-center">
            <Link href="/login" className="text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors px-3 py-1.5">
              Log in
            </Link>
            <Link href="/leermomenten" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              Get started →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        {/* Achtergrond bollen */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-violet-200 rounded-full blur-3xl opacity-25 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-block bg-white text-indigo-600 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-indigo-100 shadow-sm">
            Free to use · No account required
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-indigo-900 leading-tight">
            Learn smarter.<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              Not harder.
            </span>
          </h1>

          <p className="text-base md:text-lg text-indigo-500 mt-5 leading-relaxed max-w-lg mx-auto">
            Track what you learn, how long you study, and whether you reach your goals — per subject, per day, per month.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/leermomenten"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 text-center">
              Start for free →
            </Link>
            <Link href="/login"
              className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-bold text-base hover:bg-indigo-50 transition-colors border border-indigo-200 shadow-sm text-center">
              Log in
            </Link>
          </div>
          <p className="text-xs text-indigo-300 mt-3">No account needed · Data saved after signing up</p>
        </div>

        {/* Preview kaarten */}
        <div className="relative max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 px-0">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5">
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

          <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5">
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

          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg p-5 text-white">
            <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Current streak</span>
            <p className="text-5xl font-bold mt-2">7</p>
            <p className="text-indigo-200 text-sm">days in a row</p>
            <div className="flex gap-1.5 mt-4">
              {[1,2,3,4,5,6,7].map(i => (
                <div key={i} className="flex-1 h-1.5 bg-white rounded-full opacity-90" />
              ))}
            </div>
            <p className="text-xs text-indigo-300 mt-2">Keep it up!</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-indigo-900">Everything you need to track what you learn</h2>
          <p className="text-indigo-400 mt-2 text-sm md:text-base">Built for students who are serious about their development.</p>
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

      {/* Stats */}
      <section className="bg-gradient-to-r from-indigo-600 to-violet-600 py-12">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-4 text-center text-white">
          <div>
            <p className="text-3xl md:text-4xl font-bold">9</p>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">Languages</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold">∞</p>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">Moments</p>
          </div>
          <div>
            <p className="text-3xl md:text-4xl font-bold">100%</p>
            <p className="text-indigo-200 text-xs md:text-sm mt-1">Free</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-900">Ready to start?</h2>
        <p className="text-indigo-400 mt-3 mb-8 text-sm md:text-base">Try Knowl for free — no account needed.</p>
        <Link href="/leermomenten"
          className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
          Open the portal →
        </Link>
      </section>

      <footer className="border-t border-indigo-100 py-6 text-center">
        <p className="text-sm text-indigo-300">© 2025 Knowl · Built for students</p>
      </footer>
    </div>
  )
}
