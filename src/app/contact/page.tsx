import Link from 'next/link'
import { CONTACT_EMAIL, TIKTOK_URL } from '@/lib/agentContent'

export const metadata = {
  title: 'Contact',
  description: 'Neem contact op met Knowl voor vragen, ideeën, fouten in de app of verzoeken over je gegevens.',
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <header className="bg-white border-b border-indigo-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-indigo-700 tracking-tight">Knowl</Link>
          <span className="text-indigo-200">/</span>
          <span className="text-sm text-indigo-400">Contact</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Contact</h1>
          <p className="text-sm text-indigo-400 mt-2">Vragen over Knowl? Zo bereik je ons.</p>
        </div>

        <Section title="E-mail">
          <p>De snelste manier om Knowl te bereiken is per e-mail: <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">{CONTACT_EMAIL}</a>. Je mail wordt persoonlijk gelezen en beantwoord.</p>
        </Section>

        <Section title="Iets werkt niet">
          <p>Vermeld in je mail op welke pagina het gebeurde, wat je deed en wat je verwachtte. Gebruik je een telefoon, zet er dan bij welk toestel en welke browser. Een schermafbeelding helpt ook.</p>
        </Section>

        <Section title="Vragen over je gegevens">
          <p>Wil je weten welke gegevens Knowl van je bewaart, iets laten aanpassen of je account laten verwijderen? Je kunt je account zelf verwijderen in je profiel, en je gegevens downloaden als CSV. Lukt dat niet, mail dan naar het adres hierboven. In het <Link href="/privacy" className="text-indigo-600 underline">privacybeleid</Link> staat welke rechten je hebt.</p>
        </Section>

        <Section title="Ideeën en feedback">
          <p>Mis je iets in Knowl of heb je een idee om het beter te maken? Mail het gerust. Knowl wordt gebouwd op basis van wat studenten nodig hebben.</p>
        </Section>

        <Section title="Social media">
          <p>Knowl staat op TikTok: <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">@myknowltiktok</a>.</p>
        </Section>

        <div className="flex gap-4 pt-4 border-t border-indigo-100">
          <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-700">← Terug naar Knowl</Link>
          <Link href="/about" className="text-sm text-indigo-500 hover:text-indigo-700">Over Knowl →</Link>
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
