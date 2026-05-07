'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'knowl_cookies_accepted'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {}
  }, [])

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto bg-indigo-900 text-white rounded-2xl shadow-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm leading-relaxed">
          <span className="font-semibold">🍪 Cookies</span>{' '}
          Knowl gebruikt alleen functionele cookies die nodig zijn voor inloggen. Geen tracking, geen reclame.{' '}
          <Link href="/privacy" className="underline text-indigo-300 hover:text-white transition-colors">
            Meer lezen
          </Link>
        </div>
        <button
          onClick={accept}
          className="shrink-0 bg-white text-indigo-900 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors whitespace-nowrap"
        >
          Begrepen
        </button>
      </div>
    </div>
  )
}
