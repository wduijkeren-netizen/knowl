'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { languages, type LangCode } from '@/lib/i18n/translations'

export default function LandingPage() {
  const { lang, setLang, tr } = useLanguage()
  const [showLang, setShowLang] = useState(false)
  const currentLang = languages.find(l => l.code === lang)
  const l = tr.landing

  const primaryFeatures = [
    { title: l.feat1title, desc: l.feat1desc, color: 'bg-gradient-to-br from-indigo-500 to-violet-600', icon: '🎯' },
    { title: l.feat2title, desc: l.feat2desc, color: 'bg-gradient-to-br from-violet-500 to-indigo-600', icon: '📈' },
  ]

  const secondaryFeatures = [
    { title: l.feat3title, desc: l.feat3desc, icon: '🃏' },
    { title: l.feat4title, desc: l.feat4desc, icon: '🕸️' },
    { title: l.feat5title, desc: l.feat5desc, icon: '⏱️' },
    { title: l.feat6title, desc: l.feat6desc, icon: '📅' },
  ]

  const usps = [
    { title: l.usp1title, desc: l.usp1desc, icon: '🎯' },
    { title: l.usp2title, desc: l.usp2desc, icon: '📊' },
    { title: l.usp3title, desc: l.usp3desc, icon: '🔥' },
    { title: l.usp4title, desc: l.usp4desc, icon: '🔒' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-700 tracking-tight">Knowl</span>
            <span className="hidden sm:inline text-xs text-indigo-300 font-normal">leertracker</span>
          </div>
          <div className="flex gap-2 items-center">
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
                    {languages.map(lg => (
                      <button key={lg.code} onClick={() => { setLang(lg.code as LangCode); setShowLang(false) }}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${lang === lg.code ? 'text-indigo-700 font-semibold' : 'text-gray-600'}`}>
                        <span>{lg.flag}</span><span>{lg.label}</span>
                        {lang === lg.code && <span className="ml-auto text-indigo-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Link href="/login" className="hidden sm:block text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors px-3 py-1.5">
              {l.login}
            </Link>
            <Link href="/leermomenten" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm">
              {l.cta}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-200 rounded-full blur-3xl opacity-20 pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-violet-200 rounded-full blur-3xl opacity-20 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white text-indigo-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-indigo-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            {l.badge}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-indigo-900 leading-tight tracking-tight">
            {l.h1a}
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              {l.h1b}
            </span>
          </h1>

          <p className="text-base md:text-lg text-indigo-500 mt-5 leading-relaxed max-w-lg mx-auto">
            {l.sub}
          </p>

          <p className="text-xs text-indigo-400 mt-3 font-medium">
            {l.proof}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
            <Link href="/leermomenten"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all shadow-lg shadow-indigo-200/60 text-center">
              {l.cta}
            </Link>
            <Link href="/login"
              className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-bold text-base hover:bg-indigo-50 active:scale-95 transition-all border border-indigo-200 shadow-sm text-center">
              {l.login}
            </Link>
          </div>
        </div>

        {/* Preview kaarten */}
        <div className="relative max-w-4xl mx-auto mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5 hover:-translate-y-0.5 hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{l.card1tag}</span>
              <span className="text-xs text-indigo-300">{l.card1today}</span>
            </div>
            <p className="font-bold text-indigo-900 text-sm">{l.card1title}</p>
            <p className="text-xs text-indigo-400 mt-2 leading-relaxed">{l.card1body}</p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-2.5 py-0.5 font-medium">{l.card1sub1}</span>
              <span className="text-xs bg-violet-50 text-violet-600 rounded-full px-2.5 py-0.5 font-medium">{l.card1sub2}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-indigo-100 shadow-lg p-5 hover:-translate-y-0.5 hover:shadow-xl transition-all">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{l.card2tag}</span>
              <span className="text-xs font-bold text-red-400">{l.card2days}</span>
            </div>
            <p className="text-lg font-bold text-indigo-900 mt-1">{l.card2title}</p>
            <div className="mt-3 h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full w-[62%] bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
            </div>
            <p className="text-xs text-indigo-400 mt-1.5">{l.card2progress}</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-indigo-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-indigo-700">{l.card2stat1val}</p>
                <p className="text-xs text-indigo-400">{l.card2stat1lab}</p>
              </div>
              <div className="bg-violet-50 rounded-xl p-2.5 text-center">
                <p className="text-xl font-bold text-violet-600">{l.card2stat2val}</p>
                <p className="text-xs text-violet-500">{l.card2stat2lab}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg p-5 text-white hover:-translate-y-0.5 hover:shadow-xl transition-all">
            <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">{l.card3tag}</span>
            <p className="text-5xl font-bold mt-2">12</p>
            <p className="text-indigo-200 text-sm">{l.card3days}</p>
            <div className="flex gap-1 mt-4 flex-wrap">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-md bg-white/25 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-white/90" />
                </div>
              ))}
            </div>
            <p className="text-xs text-indigo-300 mt-3">{l.card3sub}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-indigo-900">{l.featTitle}</h2>
          <p className="text-indigo-400 mt-2 text-sm md:text-base">{l.featSub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {primaryFeatures.map(f => (
            <div key={f.title} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border border-indigo-100 group">
              <div className={`h-32 flex items-end px-6 pb-5 ${f.color}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="text-lg font-bold text-white leading-tight">{f.title}</h3>
                </div>
              </div>
              <div className="bg-white px-6 py-5">
                <p className="text-sm text-indigo-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {secondaryFeatures.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <span className="text-xl">{f.icon}</span>
              <h3 className="text-sm font-semibold text-indigo-900 mt-2">{f.title}</h3>
              <p className="text-xs text-indigo-400 mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Over Knowl */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">{l.aboutTag}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mt-2 leading-tight whitespace-pre-line">
                {l.aboutTitle}
              </h2>
              <p className="text-indigo-700 mt-4 leading-relaxed text-sm md:text-base">{l.aboutP1}</p>
              <p className="text-indigo-500 mt-3 leading-relaxed text-sm md:text-base">{l.aboutP2}</p>

              {/* Privacy statement */}
              <div className="mt-4 flex items-start gap-3 bg-white/70 rounded-2xl px-4 py-3 border border-indigo-100">
                <span className="text-emerald-500 mt-0.5 shrink-0 text-base">🔒</span>
                <p className="text-xs text-indigo-500 leading-relaxed">
                  <span className="font-semibold text-indigo-700">Jouw data is van jou.</span> Geen tracking, geen advertenties, geen verkoop aan derden. Download alles als CSV, verwijder je account wanneer je wilt.
                </p>
              </div>

              <div className="flex gap-6 mt-6 flex-wrap">
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{l.stat1val}</p>
                  <p className="text-xs text-indigo-400">{l.stat1lab}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{l.stat2val}</p>
                  <p className="text-xs text-indigo-400">{l.stat2lab}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700">{l.stat3val}</p>
                  <p className="text-xs text-indigo-400">{l.stat3lab}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {usps.map(item => (
                <div key={item.title} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-indigo-900 text-sm">{item.title}</p>
                    <p className="text-xs text-indigo-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl px-8 py-12 text-center shadow-xl shadow-indigo-200/60">
          <h2 className="text-2xl md:text-3xl font-bold text-white">{l.ctaTitle}</h2>
          <p className="text-indigo-200 mt-3 mb-2 text-sm md:text-base">{l.ctaSub}</p>
          <p className="text-xs text-indigo-300 mb-8">{l.ctaNote}</p>
          <Link href="/leermomenten"
            className="inline-block bg-white text-indigo-700 px-10 py-4 rounded-2xl font-bold text-base hover:bg-indigo-50 active:scale-95 transition-all shadow-lg">
            {l.ctaBtn}
          </Link>
          <p className="text-xs text-indigo-300 mt-5">{l.ctaFooter}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-indigo-100 py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <p className="text-base font-bold text-indigo-700">Knowl</p>
              <p className="text-xs text-indigo-400 mt-1">Leertracker voor studenten · myknowl.com</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-xs text-indigo-400">
              <div className="flex gap-4 flex-wrap">
                <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacybeleid</Link>
                <Link href="/voorwaarden" className="hover:text-indigo-600 transition-colors">Voorwaarden</Link>
                <a href="mailto:myknowl@hotmail.com" className="hover:text-indigo-600 transition-colors">{l.contact}</a>
              </div>
              <a href="https://www.tiktok.com/@myknowltiktok" target="_blank" rel="noopener noreferrer"
                className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 font-medium">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.96a8.27 8.27 0 004.84 1.55V7.07a4.85 4.85 0 01-1.07-.38z"/>
                </svg>
                TikTok
              </a>
            </div>
          </div>
          <p className="text-xs text-indigo-200 mt-6">{l.footerCopy}</p>
        </div>
      </footer>
    </div>
  )
}
