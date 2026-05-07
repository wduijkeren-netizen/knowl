import Link from 'next/link'

export const metadata = { title: 'Gebruiksvoorwaarden — Knowl' }

const UPDATED = '7 mei 2025'
const EMAIL = 'info@knowl.app'

export default function VoorwaardenPage() {
  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <header className="bg-white border-b border-indigo-100 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-indigo-700 tracking-tight">Knowl</Link>
          <span className="text-indigo-200">/</span>
          <span className="text-sm text-indigo-400">Gebruiksvoorwaarden</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-indigo-900">Gebruiksvoorwaarden</h1>
          <p className="text-sm text-indigo-400 mt-2">Laatst bijgewerkt: {UPDATED}</p>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-5 text-sm text-indigo-700 border border-indigo-100">
          Door Knowl te gebruiken ga je akkoord met deze voorwaarden. Lees ze even door — het is een korte tekst.
        </div>

        <Section title="1. Over Knowl">
          <p>Knowl is een gratis webapplicatie voor het bijhouden van leeractiviteiten. Knowl is ontwikkeld en beheerd als individueel project. Voor vragen kun je contact opnemen via <a href={`mailto:${EMAIL}`} className="text-indigo-600 underline">{EMAIL}</a>.</p>
        </Section>

        <Section title="2. Je account">
          <ul className="list-disc list-inside space-y-1">
            <li>Je bent zelf verantwoordelijk voor de beveiliging van je account en wachtwoord</li>
            <li>Je mag één account aanmaken per persoon</li>
            <li>Je account is persoonlijk en niet overdraagbaar</li>
            <li>Gebruikers jonger dan 16 jaar hebben toestemming nodig van een ouder of voogd</li>
            <li>We behouden ons het recht voor accounts te verwijderen bij misbruik</li>
          </ul>
        </Section>

        <Section title="3. Toegestaan gebruik">
          <p>Knowl is bedoeld voor persoonlijk gebruik als leertracker. Je mag Knowl gebruiken om:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Je leeractiviteiten bij te houden en te analyseren</li>
            <li>Doelen te stellen en voortgang te monitoren</li>
            <li>Overzichten te delen met medestudenten (via de deel-functie)</li>
          </ul>
        </Section>

        <Section title="4. Verboden gebruik">
          <p>Het is niet toegestaan om:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>De applicatie te gebruiken voor commerciële doeleinden zonder toestemming</li>
            <li>Oneigenlijk of misleidend gebruik te maken van het platform</li>
            <li>Persoonsgegevens van anderen in te voeren zonder hun toestemming</li>
            <li>De applicatie of servers te overbelasten of aanvallen</li>
            <li>Te proberen toegang te krijgen tot data van andere gebruikers</li>
          </ul>
        </Section>

        <Section title="5. Jouw content">
          <p>De leermomenten, samenvattingen en andere inhoud die je invoert, zijn van jou. Door content te uploaden geef je Knowl toestemming om deze op te slaan en te verwerken om de dienst te leveren. Wij claimen geen eigendomsrechten op jouw leerdata.</p>
          <p className="mt-2">Je bent zelf verantwoordelijk voor de inhoud die je invoert. Voer geen persoonsgegevens van anderen in.</p>
        </Section>

        <Section title="6. Beschikbaarheid">
          <p>Knowl is een gratis dienst die wordt aangeboden zonder garanties op beschikbaarheid. We streven naar een zo hoog mogelijke uptime, maar kunnen onderhoud, storingen of tijdelijke onbeschikbaarheid niet uitsluiten. We zijn niet aansprakelijk voor verlies van data of inkomsten als gevolg van onbeschikbaarheid.</p>
        </Section>

        <Section title="7. Aansprakelijkheid">
          <p>Knowl wordt aangeboden &ldquo;as is&rdquo;, zonder enige garantie. De aansprakelijkheid van Knowl is beperkt tot gevallen van opzet of grove nalatigheid. Knowl is niet aansprakelijk voor:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Verlies van leerdata bij technische storingen</li>
            <li>Indirecte schade of gevolgschade</li>
            <li>Beslissingen die je neemt op basis van de statistieken in de app</li>
          </ul>
        </Section>

        <Section title="8. Intellectueel eigendom">
          <p>De applicatie Knowl, inclusief het ontwerp, de naam, de logo&apos;s en de broncode, zijn eigendom van de maker en worden beschermd door intellectueel eigendomsrecht. Het is niet toegestaan de applicatie te kopiëren, distribueren of op basis hiervan afgeleide werken te maken zonder schriftelijke toestemming.</p>
        </Section>

        <Section title="9. Wijzigingen in de dienst">
          <p>We behouden ons het recht voor de functionaliteit van Knowl aan te passen, functies toe te voegen of te verwijderen. Wezenlijke wijzigingen die jouw gebruik beïnvloeden, zullen we van tevoren communiceren via de app.</p>
        </Section>

        <Section title="10. Toepasselijk recht">
          <p>Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland.</p>
        </Section>

        <Section title="11. Contact">
          <p>Heb je vragen over deze voorwaarden? Stuur een e-mail naar <a href={`mailto:${EMAIL}`} className="text-indigo-600 underline">{EMAIL}</a>.</p>
        </Section>

        <div className="flex gap-4 pt-4 border-t border-indigo-100">
          <Link href="/" className="text-sm text-indigo-500 hover:text-indigo-700">← Terug naar Knowl</Link>
          <Link href="/privacy" className="text-sm text-indigo-500 hover:text-indigo-700">Privacybeleid →</Link>
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
