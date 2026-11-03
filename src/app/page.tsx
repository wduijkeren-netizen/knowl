import LandingPage from '@/components/LandingPage'
import type { Metadata } from 'next'
import { CONTACT_EMAIL, SITE_URL, TIKTOK_URL } from '@/lib/agentContent'

export const metadata: Metadata = {
  title: 'Knowl — Gratis leertracker voor studenten',
  description: 'Knowl helpt studenten bij het bijhouden van leermomenten, doelen stellen per vak en voortgang zien. Gratis, geen account nodig om te starten. Probeer myknowl nu.',
  keywords: ['leertracker', 'studenten', 'leermomenten', 'studieplanner', 'knowl', 'myknowl', 'gratis', 'vakken bijhouden'],
  alternates: { canonical: '/' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Knowl',
      alternateName: 'myknowl',
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.png`,
      email: CONTACT_EMAIL,
      description: 'Knowl maakt een gratis leertracker voor scholieren en studenten.',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: CONTACT_EMAIL,
        url: `${SITE_URL}/contact`,
        availableLanguage: ['nl', 'en'],
      },
      sameAs: [TIKTOK_URL],
    },
    {
      '@type': 'WebApplication',
      name: 'Knowl',
      alternateName: 'myknowl',
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
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
    },
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
