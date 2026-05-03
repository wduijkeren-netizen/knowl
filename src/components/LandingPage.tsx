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
      <AuroraBackground className="pt-16">
        <div className="text-center px-4 max-w-3xl mx-auto relative z-10">
          <div className="inline-block bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-indigo-100">
            Free to use · No account required
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-indigo-900 leading-tight">
            Learn smarter.<br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Not harder.
            </span>
          </h1>
          <p className="text-lg text-indigo-500 mt-6 leading-relaxed max-w-xl mx-auto">
            Knowl helps you track what you learn, how long you study, and whether you reach your goals — per subject, per day, per month.
          </p>
          <div className="flex gap-4 justify-center mt-8 flex-wrap">
            <Link href="/leermomenten"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-semibold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
              Start for free →
            </Link>
            <Link href="/login"
              className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-semibold text-base hover:bg-indigo-50 transition-colors border border-indigo-100 shadow-sm">
              Log in
            </Link>
          </div>
          <p className="text-xs text-indigo-300 mt-4">No account needed to try · Data saved after signing up</p>
        </div>
      </AuroraBackground>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-indigo-900">Everything you need to track what you learn</h2>
          <p className="text-indigo-400 mt-3">Built for students who are serious about their development.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg mb-4" />
              <h3 className="font-semibold text-indigo-900 mb-1">{f.title}</h3>
              <p className="text-sm text-indigo-400 leading-relaxed">{f.desc}</p>
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
