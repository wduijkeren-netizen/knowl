# Knowl — CLAUDE.md

## Over dit project

Knowl is een leertracker web-app. Gebruikers loggen "leermomenten" bij met titel, beschrijving, categorie en datum. Later komen statistieken: hoe vaak per week, per categorie, streaks.

## Gebruikersvoorkeuren

- De gebruiker kan geen code lezen — leg elke stap uit in gewone Nederlandse taal.
- Vraag altijd bevestiging voordat je grote wijzigingen maakt (nieuwe bestanden, database-aanpassingen, grote refactors).
- Werk stap voor stap, bouw niets vooruit tenzij de gebruiker dat vraagt.
- Geen technisch jargon zonder uitleg.

## Stack

- **Framework:** Next.js 14 met App Router
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase
- **Deploy:** Vercel
- **Taal:** TypeScript

## Architectuur

```
src/
  app/           → pagina's (App Router)
  components/    → herbruikbare UI-onderdelen
  lib/           → hulpfuncties, Supabase client
```

## Database (Supabase)

Tabellen:
- `profiles` — gebruikersprofielen (gekoppeld aan auth.users)
- `learning_moments` — losse leermomenten per gebruiker

## Afspraken

- Schrijf geen comments tenzij iets echt niet-voor-de-hand-liggend is.
- Geen onnodige abstracties — bouw alleen wat nu nodig is.
- Valideer alleen op systeemgrenzen (gebruikersinvoer, externe API's).
- Environment variables staan in `.env.local` (nooit committen).
