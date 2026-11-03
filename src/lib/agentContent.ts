export const SITE_URL = 'https://www.myknowl.com'
export const CONTACT_EMAIL = 'myknowl@hotmail.com'
export const TIKTOK_URL = 'https://www.tiktok.com/@myknowltiktok'

export const HOMEPAGE_MARKDOWN = `# Knowl: gratis leertracker voor studenten

Knowl (${SITE_URL}) is een gratis webapp waarmee scholieren en studenten bijhouden wat ze leren, hoe lang ze studeren en of ze op schema liggen voor hun toetsen en tentamens. De app is in het Nederlands en werkt in de browser op telefoon en laptop.

## Wat je met Knowl doet

- **Leermomenten loggen**: na het studeren noteer je wat je deed, bij welk vak en hoeveel minuten.
- **Doelen per vak**: kies een tentamendatum en een aantal minuten; Knowl rekent uit hoeveel je per dag moet studeren.
- **Resultaten**: grafieken laten zien hoe je je tijd over vakken en weekdagen verdeelt.
- **Flashcards en quizzen**: maak sets of importeer woordenlijsten om te herhalen.
- **Woordwebben**: zet begrippen in een mindmap.
- **Pomodoro-timer**: studeer in blokken van 25 minuten, ook samen met vrienden.
- **Maandoverzicht**: aan het eind van de maand zie je je topvak en je streak.
- **Cijferberekening**: reken uit welk cijfer je nog nodig hebt.

## Kosten en account

Knowl is gratis en heeft geen reclame. Je kunt beginnen zonder account via ${SITE_URL}/leermomenten. Met een gratis account (${SITE_URL}/login) worden je gegevens bewaard en kun je alle functies gebruiken.

## Meer informatie

- Over Knowl: ${SITE_URL}/about
- Contact: ${SITE_URL}/contact (${CONTACT_EMAIL})
- Privacybeleid: ${SITE_URL}/privacy
- Voorwaarden: ${SITE_URL}/voorwaarden
- Instructies voor AI-agents: ${SITE_URL}/llms.txt
- Sitemap: ${SITE_URL}/sitemap.xml
`

export function notFoundMarkdown(path: string) {
  return `# 404: pagina niet gevonden

De pagina \`${path}\` bestaat niet op Knowl (${SITE_URL}).

Bekijk de sitemap op ${SITE_URL}/sitemap.xml voor alle openbare pagina's, of lees ${SITE_URL}/llms.txt voor een overzicht van Knowl en wanneer je het kunt gebruiken.
`
}
