import LandingPage from '@/components/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowl — Gratis leertracker voor studenten',
  description: 'Knowl helpt studenten bij het bijhouden van leermomenten, doelen stellen per vak en voortgang zien. Gratis, geen account nodig om te starten. Probeer myknowl nu.',
  keywords: ['leertracker', 'studenten', 'leermomenten', 'studieplanner', 'knowl', 'myknowl', 'gratis', 'vakken bijhouden'],
  alternates: { canonical: 'https://myknowl.com' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Knowl',
  alternateName: 'myknowl',
  url: 'https://myknowl.com',
  description: 'Gratis leertracker voor studenten. Log leermomenten, stel doelen per vak en volg je voortgang.',
  applicationCategory: 'EducationApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
  inLanguage: ['nl', 'en', 'de', 'fr', 'es', 'pt', 'da', 'sv', 'no'],
  featureList: [
    'Leermomenten bijhouden',
    'Doelen stellen per vak',
    'Studiestatistieken en grafieken',
    'Pomodoro timer',
    'Maandoverzicht',
    'Agenda met toetsen',
    'Streak bijhouden',
    'CSV export',
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
