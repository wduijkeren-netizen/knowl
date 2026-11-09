export type OwlMood = 'sleeping' | 'awake' | 'happy'

export default function Owl({ mood = 'awake', className = 'w-16 h-16', title }: { mood?: OwlMood; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d="M18 20 L14 9 L24 15" />
      <path d="M46 20 L50 9 L40 15" />
      <path d="M14 30 C14 18 22 13 32 13 C42 13 50 18 50 30 L50 42 C50 52 42 58 32 58 C22 58 14 52 14 42 Z" />
      <path d="M22 44 C24 49 28 51 32 51 C36 51 40 49 42 44" opacity={0.5} />
      <path d="M30 34 L32 37 L34 34" />
      {mood === 'sleeping' && (
        <>
          <path d="M19 28 C21 31 25 31 27 28" />
          <path d="M37 28 C39 31 43 31 45 28" />
          <path d="M50 8 H55 L50 13 H55" strokeWidth={1.5} />
        </>
      )}
      {mood === 'awake' && (
        <>
          <circle cx={23} cy={28} r={5} />
          <circle cx={41} cy={28} r={5} />
          <circle cx={23.5} cy={28.5} r={1.6} fill="currentColor" stroke="none" />
          <circle cx={41.5} cy={28.5} r={1.6} fill="currentColor" stroke="none" />
        </>
      )}
      {mood === 'happy' && (
        <>
          <path d="M19 30 C21 26 25 26 27 30" />
          <path d="M37 30 C39 26 43 26 45 30" />
          <path d="M8 22 L10 24 M8 24 L10 22" strokeWidth={1.5} />
          <path d="M55 23 L57 25 M55 25 L57 23" strokeWidth={1.5} />
        </>
      )}
    </svg>
  )
}
