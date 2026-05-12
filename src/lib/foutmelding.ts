const vertalingen: Record<string, string> = {
  'Invalid login credentials': 'Ongeldig e-mailadres of wachtwoord.',
  'Email not confirmed': 'Bevestig eerst je e-mailadres via de link in je inbox.',
  'User already registered': 'Er bestaat al een account met dit e-mailadres.',
  'Password should be at least 6 characters': 'Je wachtwoord moet minimaal 6 tekens bevatten.',
  'Invalid email': 'Voer een geldig e-mailadres in.',
  'Email rate limit exceeded': 'Te veel verzoeken. Wacht even en probeer het opnieuw.',
  'User not found': 'Geen account gevonden met dit e-mailadres.',
  'New password should be different from the old password': 'Je nieuwe wachtwoord mag niet hetzelfde zijn als je oude wachtwoord.',
  'Auth session missing': 'Je sessie is verlopen. Log opnieuw in.',
  'JWT expired': 'Je sessie is verlopen. Log opnieuw in.',
  'duplicate key value violates unique constraint': 'Dit item bestaat al.',
  'violates row-level security policy': 'Je hebt geen toegang om dit op te slaan.',
  'Failed to fetch': 'Geen verbinding. Controleer je internetverbinding.',
}

export function vertaalFout(bericht: string | undefined): string {
  if (!bericht) return 'Er is een onbekende fout opgetreden.'
  for (const [eng, nl] of Object.entries(vertalingen)) {
    if (bericht.toLowerCase().includes(eng.toLowerCase())) return nl
  }
  return bericht
}
