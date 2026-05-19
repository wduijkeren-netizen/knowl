'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const STORAGE_KEY = 'knowl_onboarded_v2'

type Step = {
  icon: string
  gradient: string
  title: string
  sub: string
  href?: string
  btnLabel?: string
  tip?: string
}

export default function OnboardingWizard({ isNewUser }: { isNewUser: boolean }) {
  const { tr } = useLanguage()
  const o = tr.onboarding
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isNewUser) return
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {}
  }, [isNewUser])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  const steps: Step[] = [
    {
      icon: '👋',
      gradient: 'from-indigo-600 to-violet-600',
      title: o.welcome,
      sub: o.welcomeSub,
      tip: 'Knowl helpt je slimmer studeren door je voortgang bij te houden.',
    },
    {
      icon: '📚',
      gradient: 'from-violet-600 to-purple-600',
      title: o.step1title,
      sub: o.step1sub,
      href: '/vakken',
      btnLabel: 'Vakken aanmaken →',
      tip: 'Bijv. Wiskunde, Economie, Engels. Alles wordt per vak bijgehouden.',
    },
    {
      icon: '✏️',
      gradient: 'from-indigo-500 to-blue-600',
      title: o.step2title,
      sub: o.step2sub,
      href: '/leermomenten',
      btnLabel: 'Leermoment toevoegen →',
      tip: 'Vul in wat je hebt geleerd, hoe lang en welk vak. Dat is alles.',
    },
    {
      icon: '📝',
      gradient: 'from-teal-500 to-emerald-600',
      title: 'Maak notities',
      sub: 'Schrijf samenvattingen en aantekeningen per vak, zoals in Apple Notes.',
      href: '/notities',
      btnLabel: 'Naar notities →',
      tip: 'Ctrl+B voor vet, Ctrl+I voor cursief. Tijd wordt automatisch bijgehouden.',
    },
    {
      icon: '⏱️',
      gradient: 'from-orange-500 to-amber-500',
      title: 'Gebruik de Pomodoro timer',
      sub: 'Studeer in blokken van 25 minuten met pauzes. Bewezen effectief.',
      href: '/pomodoro',
      btnLabel: 'Timer starten →',
      tip: 'Start een sessie en het leermoment wordt automatisch voorgesteld.',
    },
    {
      icon: '📊',
      gradient: 'from-emerald-500 to-teal-600',
      title: o.step3title,
      sub: o.step3sub,
      href: '/resultaten',
      btnLabel: 'Resultaten bekijken →',
      tip: 'Na een paar momenten zie je grafieken, streaks en je topvak.',
    },
  ]

  const current = steps[step]
  const isFirst = step === 0
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-br ${current.gradient} p-7 text-center text-white relative`}>
          <button onClick={dismiss} className="absolute top-4 right-4 text-white/60 hover:text-white text-xl leading-none transition-colors">✕</button>
          <div className="text-5xl mb-3">{current.icon}</div>
          <h2 className="text-xl font-bold">{current.title}</h2>
          <p className="text-white/80 text-sm mt-2 leading-relaxed">{current.sub}</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-300 ${i <= step ? 'bg-indigo-500' : 'bg-indigo-100'}`} />
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Tip */}
          {current.tip && (
            <div className="bg-indigo-50 rounded-2xl px-4 py-3 flex gap-2.5 items-start">
              <span className="text-indigo-400 text-sm mt-0.5">💡</span>
              <p className="text-sm text-indigo-700">{current.tip}</p>
            </div>
          )}

          {/* Action button */}
          {current.href && !isLast && (
            <Link href={current.href}
              className="flex items-center justify-center w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-2xl hover:bg-indigo-700 transition-colors active:scale-95">
              {current.btnLabel}
            </Link>
          )}
          {current.href && isLast && (
            <Link href={current.href} onClick={dismiss}
              className="flex items-center justify-center w-full bg-indigo-600 text-white text-sm font-semibold py-3 rounded-2xl hover:bg-indigo-700 transition-colors active:scale-95">
              {current.btnLabel}
            </Link>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            {!isFirst ? (
              <button onClick={() => setStep(s => s - 1)}
                className="text-sm text-indigo-400 hover:text-indigo-600 px-3 py-2 rounded-xl transition-colors">
                ← {o.prev.replace(' ←', '').replace('← ', '')}
              </button>
            ) : (
              <button onClick={dismiss} className="text-sm text-indigo-300 hover:text-indigo-500 px-3 py-2 rounded-xl transition-colors">
                {o.skip}
              </button>
            )}

            <span className="text-xs text-indigo-300">{step + 1} / {steps.length}</span>

            {!isLast ? (
              <button onClick={() => setStep(s => s + 1)}
                className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-indigo-700 transition-colors active:scale-95">
                {o.next.replace(' →', '')} →
              </button>
            ) : (
              <button onClick={dismiss}
                className="bg-emerald-600 text-white text-sm font-semibold px-5 py-2 rounded-xl hover:bg-emerald-700 transition-colors active:scale-95">
                {o.done}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
