'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const STORAGE_KEY = 'knowl_onboarded'

const STEPS = [
  {
    icon: '📚',
    color: 'from-indigo-600 to-violet-600',
    href: '/vakken',
    actionKey: 'step1title' as const,
    subKey: 'step1sub' as const,
  },
  {
    icon: '✏️',
    color: 'from-violet-600 to-purple-600',
    href: '/leermomenten',
    actionKey: 'step2title' as const,
    subKey: 'step2sub' as const,
  },
  {
    icon: '📈',
    color: 'from-emerald-500 to-teal-600',
    href: '/resultaten',
    actionKey: 'step3title' as const,
    subKey: 'step3sub' as const,
  },
]

export default function OnboardingWizard({ isNewUser }: { isNewUser: boolean }) {
  const { tr } = useLanguage()
  const o = tr.onboarding
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isNewUser) return
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) setVisible(true)
    } catch {}
  }, [isNewUser])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${current.color} p-8 text-center text-white`}>
          <div className="text-5xl mb-3">{current.icon}</div>
          <h2 className="text-xl font-bold">{step === 0 ? o.welcome : o[current.actionKey]}</h2>
          <p className="text-white/80 text-sm mt-2">
            {step === 0 ? o.welcomeSub : o[current.subKey]}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 pt-5 px-8">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === step ? 'w-8 bg-indigo-600' : 'w-2 bg-indigo-100'}`} />
          ))}
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-indigo-300 mt-2">{o.step} {step + 1} {o.of} {STEPS.length}</p>

        {/* Content: show step detail for steps 1-3 */}
        {step > 0 && (
          <div className="px-8 py-4">
            <div className="bg-indigo-50 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-indigo-800">{o[current.actionKey]}</p>
              <p className="text-xs text-indigo-500 mt-1">{o[current.subKey]}</p>
              <Link
                href={current.href}
                onClick={isLast ? dismiss : undefined}
                className="inline-block mt-3 text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                {isLast ? o.done : `→ ${o[current.actionKey]}`}
              </Link>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 px-8 pb-8 pt-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              {o.prev}
            </button>
          )}
          {step === 0 && (
            <button
              onClick={dismiss}
              className="text-sm text-indigo-300 hover:text-indigo-500 transition-colors px-2"
            >
              {o.skip}
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              {o.next}
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              {o.done}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
