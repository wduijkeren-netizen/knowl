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
    { title: l.feat1title, desc: l.feat1desc, color: 'bg-gradient-to-br from-indigo-500 to-violet-600' },
    { title: l.feat2title, desc: l.feat2desc, color: 'bg-gradient-to-br from-violet-500 to-purple-600' },
  ]

  const secondaryFeatures = [
    { title: l.feat3title, desc: l.feat3desc },
    { title: l.feat4title, desc: l.feat4desc },
    { title: l.feat5title, desc: l.feat5desc },
    { title: l.feat6title, desc: l.feat6desc },
  ]

  const usps = [
    { title: l.usp1title, desc: l.usp1desc },
    { title: l.usp2title, desc: l.usp2desc },
    { title: l.usp3title, desc: l.usp3desc },
    { title: l.usp4title, desc: l.usp4desc },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold text-indigo-700 tracking-tight">Knowl</span>
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
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-indigo-100 shadow-xl py-2 z-20 min-w-[170px] max-w-[90vw]">
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
            <Link href="/leermomenten" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              {l.cta}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-indigo-200 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-violet-200 rounded-full blur-3xl opacity-25 pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-block bg-amber-50 text-amber-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 border border-amber-200 shadow-sm">
            {l.badge}
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-indigo-900 leading-tight">
            {l.h1a}
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              {l.h1b}
            </span>
          </h1>

          <p className="text-base md:text-lg text-indigo-500 mt-5 leading-relaxed max-w-lg mx-auto">
            {l.sub}
          </p>

          <p className="text-xs text-indigo-400 mt-4 font-medium">
            {l.proof}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link href="/leermomenten"
              className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 text-center">
              {l.cta}
            </Link>
            <Link href="/login"
              className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-bold text-base hover:bg-indigo-50 transition-colors border border-indigo-200 shadow-sm text-center">
              {l.login}
            </Link>
          </div>
        </div>

        {/* Preview kaarten */}
        <div className="relative max-w-4xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <h2 className="text-2xl md:text-3xl font-bold text-indigo-900">{l.featTitle}</h2>
          <p className="text-indigo-400 mt-2 text-sm md:text-base">{l.featSub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          {primaryFeatures.map(f => (
            <div key={f.title} className="rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all border border-indigo-100">
              <div className={`h-32 flex items-end px-6 pb-5 ${f.color}`}>
                <h3 className="text-lg font-bold text-white leading-tight">{f.title}</h3>
              </div>
              <div className="bg-white px-6 py-5">
                <p className="text-sm text-indigo-500 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {secondaryFeatures.map(f => (
            <div key={f.title} className="bg-white rounded-2xl border border-indigo-100 p-4 shadow-sm hover:shadow-md transition-all">
              <h3 className="text-sm font-semibold text-indigo-900">{f.title}</h3>
              <p className="text-xs text-indigo-400 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Over Knowl */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">{l.aboutTag}</span>
              <h2 className="text-2xl md:text-3xl font-bold text-indigo-900 mt-2 leading-tight whitespace-pre-line">
                {l.aboutTitle}
              </h2>
              <p className="text-indigo-600 mt-4 leading-relaxed text-sm md:text-base">{l.aboutP1}</p>
              <p className="text-indigo-500 mt-3 leading-relaxed text-sm md:text-base">{l.aboutP2}</p>

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
                <div key={item.title} className="bg-white rounded-2xl p-4 shadow-sm">
                  <p className="font-semibold text-indigo-900 text-sm">{item.title}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-indigo-900">{l.ctaTitle}</h2>
        <p className="text-indigo-400 mt-3 mb-2 text-sm md:text-base">{l.ctaSub}</p>
        <p className="text-xs text-indigo-300 mb-8">{l.ctaNote}</p>
        <Link href="/leermomenten"
          className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-4 rounded-2xl font-bold text-base hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
          {l.ctaBtn}
        </Link>
        <p className="text-xs text-indigo-300 mt-4">{l.ctaFooter}</p>
      </section>

      <footer className="border-t border-indigo-100 py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-sm text-indigo-300">{l.footerCopy}</p>
          <div className="flex gap-4 text-xs text-indigo-300">
            <Link href="/privacy" className="hover:text-indigo-500 transition-colors">Privacybeleid</Link>
            <span>·</span>
            <Link href="/voorwaarden" className="hover:text-indigo-500 transition-colors">Gebruiksvoorwaarden</Link>
            <span>·</span>
            <a href="mailto:myknowl@hotmail.com" className="hover:text-indigo-500 transition-colors">{l.contact}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
