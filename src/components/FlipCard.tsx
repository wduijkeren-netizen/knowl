'use client'

import type { ReactNode } from 'react'

const hidden = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' } as const

/**
 * Een kaart die omdraait. Elke nieuwe kaart krijgt een eigen sleutel, zodat hij direct met de voorkant
 * verschijnt. Zo zie je nooit even het antwoord van de volgende kaart terwijl de vorige terugdraait.
 */
export default function FlipCard({ cardKey, flipped, onToggle, front, back, backClassName = 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100' }: {
  cardKey: string
  flipped: boolean
  onToggle: () => void
  front: ReactNode
  back: ReactNode
  backClassName?: string
}) {
  return (
    <button type="button" onClick={onToggle} aria-label={flipped ? 'Toon de vraag' : 'Toon het antwoord'}
      className="block w-full text-left cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-3xl" style={{ perspective: '1200px' }}>
      <div key={cardKey} className="relative transition-transform duration-500 motion-reduce:transition-none"
        style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '260px' }}>
        <div className="absolute inset-0 bg-white rounded-3xl border border-indigo-100 shadow-md flex flex-col items-center justify-center p-8 text-center" style={hidden} aria-hidden={flipped}>
          {front}
        </div>
        <div className={`absolute inset-0 rounded-3xl border shadow-md flex flex-col items-center justify-center p-8 text-center ${backClassName}`}
          style={{ ...hidden, transform: 'rotateY(180deg)' }} aria-hidden={!flipped}>
          {back}
        </div>
      </div>
    </button>
  )
}
