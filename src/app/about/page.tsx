import Link from 'next/link'
import { CONTACT_EMAIL } from '@/lib/agentContent'

export const metadata = {
  title: 'Over Knowl',
  description: 'Waarom Knowl bestaat, voor wie het is en wat je ermee kunt. Een gratis leertracker voor studenten, zonder reclame.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <header className="bg-white border-b border-indigo-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-indigo-700 tracking-tight">Knowl</Link>
          <span className="text-indigo-200">/</span>
          <span className="text-sm text-indigo-400">Over Knowl</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Over Knowl</h1>
          <p className="text-sm text-indigo-400 mt-2">Een gratis leertracker voor scholieren en studenten</p>
        </div>

        <Section title="Waarom Knowl bestaat">
          <p>Knowl is begonnen op een notitieblok. Ik hield daarin bij wat ik leerde en hoe lang ik studeerde, maar of ik genoeg deed voor mijn tentamens, kon ik er niet uit halen. Een app die dat wel kon, vond ik niet. Dus heb ik Knowl zelf gebouwd, als individueel project.</p>
        </Section>

        <Section title="Wat je met Knowl doet">
          <p>Na het studeren schrijf je een leermoment op: wat je deed, bij welk vak en hoeveel minuten. Per vak kun je een doel instellen, bijvoorbeeld 1000 minuten voor een tentamen op een bepaalde datum. Knowl rekent dan uit hoeveel je per dag nog moet studeren. In de resultaten zie je aan welke vakken en op welke dagen je je tijd besteedt.</p>
          <p className="mt-2">Daarnaast zitten er flashcards, woordwebben, een pomodoro-timer, een cijferberekening en een maandoverzicht in. Je gebruikt wat je nodig hebt.</p>
        </Section>

        <Section title="Voor wie">
          <p>Knowl is gemaakt voor de middelbare school, het mbo, het hbo en de universiteit. De app is in het Nederlands en werkt in de browser op je telefoon en laptop.</p>
        </Section>

        <Section title="Gratis en zonder reclame">
          <p>Knowl is gratis. Er is geen betaalde versie, er staat geen reclame in en gegevens worden niet verkocht. Je kunt zonder account beginnen; maak je later een account aan, dan neem je je leermomenten mee. Hoe er met je gegevens wordt omgegaan, lees je in het <Link href="/privacy" className="text-indigo-600 underline">privacybeleid</Link>.</p>
        </Section>

        <Section title="Contact">
          <p>Vragen, ideeën of iets gevonden dat niet werkt? Mail naar <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">{CONTACT_EMAIL}</a> of kijk op de <Link href="/contact" className="text-indigo-600 underline">contactpagina</Link>.</p>
        </Section>

        <div className="flex gap-4 pt-4 border-t border-indigo-100">
          <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-700">← Terug naar Knowl</Link>
          <Link href="/contact" className="text-sm text-indigo-500 hover:text-indigo-700">Contact →</Link>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-3">
      <h2 className="text-lg font-bold text-indigo-900">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}
