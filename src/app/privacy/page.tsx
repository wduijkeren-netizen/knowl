import Link from 'next/link'

export const metadata = { title: 'Privacybeleid — Knowl' }

const UPDATED = '7 mei 2025'
const EMAIL = 'myknowl@hotmail.com'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <header className="bg-white border-b border-indigo-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-indigo-700 tracking-tight">Knowl</Link>
          <span className="text-indigo-200">/</span>
          <span className="text-sm text-indigo-400">Privacybeleid</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Privacybeleid</h1>
          <p className="text-sm text-indigo-400 mt-2">Laatst bijgewerkt: {UPDATED}</p>
        </div>

        <Section title="1. Wie zijn wij?">
          <p>Knowl is een persoonlijke leertracker-applicatie die is ontwikkeld als individueel project. Knowl helpt studenten bij het bijhouden van hun leeractiviteiten, vakken, doelen en voortgang.</p>
          <p className="mt-2">Voor vragen over privacy kun je contact opnemen via: <a href={`mailto:${EMAIL}`} className="text-indigo-600 underline">{EMAIL}</a></p>
        </Section>

        <Section title="2. Welke gegevens verwerken wij?">
          <p className="font-medium text-gray-700 mb-2">Wij verwerken de volgende persoonsgegevens:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>Accountgegevens:</strong> e-mailadres en wachtwoord (versleuteld opgeslagen via Supabase Auth)</li>
            <li><strong>Profielgegevens:</strong> voornaam, achternaam, telefoonnummer, geboortedatum, postcode en stad (optioneel, door jouzelf ingevuld)</li>
            <li><strong>Leergegevens:</strong> leermomenten (titel, samenvatting, vak, minuten, datum, eventueel foto), vakken en studicdoelen</li>
            <li><strong>Technische gegevens:</strong> IP-adres en paginabezoeken (via Vercel hosting, worden niet langer dan 30 dagen bewaard)</li>
          </ul>
          <p className="mt-2 text-sm text-gray-500">Beoordelingen en agendagegevens worden alleen lokaal in je browser opgeslagen (localStorage) en worden niet naar onze servers verstuurd.</p>
        </Section>

        <Section title="3. Waarom verwerken wij deze gegevens?">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-indigo-50">
                <th className="text-left p-3 rounded-tl-lg font-medium text-indigo-700">Doel</th>
                <th className="text-left p-3 rounded-tr-lg font-medium text-indigo-700">Grondslag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {[
                ['Inloggen en accountbeheer', 'Uitvoering overeenkomst'],
                ['Opslaan van leermomenten en vakken', 'Uitvoering overeenkomst'],
                ['Tonen van statistieken en voortgang', 'Uitvoering overeenkomst'],
                ['Profielgegevens personalisatie', 'Toestemming (optioneel)'],
                ['Beveiliging en misbruikpreventie', 'Gerechtvaardigd belang'],
              ].map(([doel, grondslag]) => (
                <tr key={doel} className="hover:bg-indigo-50/50">
                  <td className="p-3 text-gray-700">{doel}</td>
                  <td className="p-3 text-gray-500">{grondslag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="4. Hoe lang bewaren wij je gegevens?">
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Accountgegevens en leerdata: zolang je account actief is</li>
            <li>Na verwijdering van je account: alle gegevens worden binnen 30 dagen permanent verwijderd</li>
            <li>Technische logs van Vercel: maximaal 30 dagen</li>
          </ul>
        </Section>

        <Section title="5. Delen wij gegevens met derden?">
          <p>Wij delen je gegevens uitsluitend met de volgende dienstverleners, die uitsluitend in opdracht van Knowl handelen:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 mt-2">
            <li><strong>Supabase (supabase.com)</strong> — database en authenticatie, servers in de EU (Frankfurt)</li>
            <li><strong>Vercel (vercel.com)</strong> — hosting en edge-netwerk, servers in de EU</li>
          </ul>
          <p className="mt-2">Wij verkopen je gegevens nooit aan derden. Wij gebruiken geen advertentie-netwerken.</p>
        </Section>

        <Section title="6. Beveiliging">
          <p>Knowl neemt de beveiliging van je gegevens serieus:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 mt-2">
            <li>Alle communicatie verloopt via HTTPS/TLS-versleuteling</li>
            <li>Wachtwoorden worden nooit in leesbare vorm opgeslagen (bcrypt via Supabase Auth)</li>
            <li>Databasetoegang is beveiligd met Row Level Security (alleen jij ziet jouw data)</li>
            <li>Foto&apos;s worden opgeslagen in een afgeschermd Supabase Storage-bucket</li>
          </ul>
        </Section>

        <Section title="7. Jouw rechten (AVG/GDPR)">
          <p>Onder de Algemene Verordening Gegevensbescherming (AVG) heb je de volgende rechten:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 mt-2">
            <li><strong>Recht op inzage:</strong> je kunt opvragen welke gegevens wij van jou hebben</li>
            <li><strong>Recht op rectificatie:</strong> onjuiste gegevens kun je zelf aanpassen via je profiel</li>
            <li><strong>Recht op verwijdering:</strong> je kunt je account en alle bijbehorende data verwijderen via je profiel</li>
            <li><strong>Recht op dataportabiliteit:</strong> je kunt je leerdata downloaden als CSV-bestand via de leermomenten-pagina</li>
            <li><strong>Recht op bezwaar:</strong> je kunt bezwaar maken tegen verwerking door ons te contacteren</li>
          </ul>
          <p className="mt-3">Voor het uitoefenen van je rechten kun je contact opnemen via <a href={`mailto:${EMAIL}`} className="text-indigo-600 underline">{EMAIL}</a>. Wij reageren binnen 30 dagen.</p>
          <p className="mt-2 text-sm text-gray-500">Heb je een klacht? Je kunt die indienen bij de <a href="https://www.autoriteitpersoonsgegevens.nl" className="text-indigo-600 underline" target="_blank" rel="noopener noreferrer">Autoriteit Persoonsgegevens</a>.</p>
        </Section>

        <Section title="8. Minderjarigen">
          <p>Knowl is gericht op studenten vanaf 10 jaar. Gebruikers jonger dan 16 jaar dienen toestemming te hebben van een ouder of voogd. Wij verzamelen geen gegevens van kinderen jonger dan 10 jaar. Als je denkt dat een minderjarige zonder toestemming een account heeft aangemaakt, neem dan contact met ons op.</p>
        </Section>

        <Section title="9. Cookies">
          <p>Knowl gebruikt alleen functionele cookies die noodzakelijk zijn voor de werking van de app (inloggen en sessiebeheer via Supabase). Er worden geen tracking- of marketingcookies gebruikt. Je kunt cookies uitschakelen in je browserinstellingen, maar dan werkt inloggen niet meer.</p>
        </Section>

        <Section title="10. Wijzigingen">
          <p>Wij kunnen dit privacybeleid aanpassen. Wezenlijke wijzigingen worden gecommuniceerd via de app of per e-mail. De datum bovenaan dit document geeft aan wanneer het beleid voor het laatst is bijgewerkt.</p>
        </Section>

        <div className="flex gap-4 pt-4 border-t border-indigo-100">
          <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-700">← Terug naar Knowl</Link>
          <Link href="/voorwaarden" className="text-sm text-indigo-500 hover:text-indigo-700">Gebruiksvoorwaarden →</Link>
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
