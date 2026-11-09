import type { ReactNode } from 'react'

const GLYPHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  'check-circle': <><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12.3l2.4 2.4 4.6-4.9" /></>,
  close: <path d="M7 7l10 10M17 7L7 17" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="M15.5 15.5L20 20" /></>,
  inbox: <><path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13h4.5l1 2h5l1-2H20" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></>,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></>,
  celebrate: <><path d="M5 19.5l3.6-10.2 6.6 6.6z" /><path d="M13.5 5c.6 1.1.3 2.2-.6 2.9M17.5 9.2l2-.9M16 3.8v2.1M19.8 13.4l-1.6.3" /></>,
  books: <><rect x="4" y="5" width="4" height="14" rx="1" /><rect x="9.5" y="5" width="4" height="14" rx="1" /><path d="M15 6.4l3.6-1 3.4 13.3-3.6 1z" /></>,
  book: <><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" /><path d="M12 6.5v13" /></>,
  star: <path d="M12 3.8l2.5 5.2 5.7.6-4.3 3.8 1.2 5.6L12 16.1 6.9 19l1.2-5.6-4.3-3.8 5.7-.6z" />,
  pen: <><path d="M15.5 4.5l4 4L9 19H5v-4z" /><path d="M13.5 6.5l4 4" /></>,
  camera: <><rect x="3.5" y="7" width="17" height="12" rx="2.5" /><circle cx="12" cy="13" r="3.5" /><path d="M8.5 7L10 4.5h4L15.5 7" /></>,
  paperclip: <path d="M15.5 7.5l-6.3 6.3a2 2 0 0 0 2.8 2.8l6.6-6.6a4 4 0 0 0-5.7-5.7L6.3 11a6 6 0 0 0 8.5 8.5l5-5" />,
  sparkle: <path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8zM18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />,
  chart: <><path d="M4 20h16" /><rect x="6" y="12" width="3" height="6" rx=".5" /><rect x="10.5" y="8" width="3" height="10" rx=".5" /><rect x="15" y="5" width="3" height="13" rx=".5" /></>,
  sprout: <><path d="M12 20v-8" /><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 14.5c0-3 2.5-5 6-5 0 3-2.5 5-6 5z" /></>,
  bulb: <><path d="M9.5 18h5M10.5 21h3" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" /></>,
  users: <><circle cx="9" cy="9" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="16.5" cy="10" r="2.5" /><path d="M15.5 15a4.5 4.5 0 0 1 5 4" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></>,
  cup: <><path d="M5 8h11v4.5a5.5 5.5 0 0 1-11 0z" /><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8.5 3.5c0 1 1 1 1 2M12.5 3.5c0 1 1 1 1 2M4 21h14" /></>,
  pause: <path d="M9 6v12M15 6v12" />,
  crown: <path d="M4 17l1.5-9 4.5 4 2-6 2 6 4.5-4 1.5 9z" />,
  cookie: <><circle cx="12" cy="12" r="8.5" /><path d="M9 9.5h.01M14.5 11h.01M10.5 15h.01M15 15.5h.01" strokeWidth={2.6} /></>,
  folder: <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  trash: <path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 12.5h8L17 7" />,
  web: <><circle cx="12" cy="12" r="2.2" /><circle cx="5" cy="6" r="1.8" /><circle cx="19" cy="6" r="1.8" /><circle cx="6" cy="18.5" r="1.8" /><circle cx="18.5" cy="18" r="1.8" /><path d="M10.3 10.6L6.4 7.2M13.7 10.6l3.9-3.4M10.4 13.5l-3.2 3.7M13.6 13.4l3.6 3.4" /></>,
  flame: <path d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-3.4-2.4-5.6-3.6-8.3-.4 2-1.5 3-2.6 3.4.2-2.6-.6-5-2.8-6.9 0 3.4-4 5.6-4 10.2C5.5 18.4 8.1 21 12 21z" />,
  gem: <><path d="M7 4h10l3.5 5L12 20.5 3.5 9z" /><path d="M3.5 9h17M9.5 4L8 9l4 11.5L16 9l-1.5-5" /></>,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  cap: <><path d="M2.5 9.5L12 5l9.5 4.5L12 14z" /><path d="M6.5 11.5V16c3 2.5 8 2.5 11 0v-4.5M21.5 9.5v5" /></>,
  sunrise: <path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v3M4.9 10.9l1.6 1.6M19.1 10.9l-1.6 1.6M2.5 14.5h2M19.5 14.5h2" />,
  moon: <path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z" />,
  map: <><path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" /><path d="M9 4.5v13M15 6.5v13" /></>,
  alert: <><path d="M12 4l9 15.5H3z" /><path d="M12 10v4M12 17h.01" /></>,
  cards: <><rect x="4.5" y="4.5" width="11" height="15" rx="2" /><path d="M15.5 7.5l3 .8-3.2 12-6-1.6" /></>,
  connect: <path d="M5 12h14M8 9l-3 3 3 3M16 9l3 3-3 3" />,
} satisfies Record<string, ReactNode>

export type GlyphName = keyof typeof GLYPHS

/** Eigen Knowl-tekens: lijniconen in plaats van emoji. Erven de tekstkleur. */
export default function Glyph({ name, className = 'w-5 h-5', strokeWidth = 1.8, filled = false, label }: {
  name: GlyphName; className?: string; strokeWidth?: number; filled?: boolean; label?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {GLYPHS[name]}
    </svg>
  )
}
