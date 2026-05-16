import { Resend } from 'npm:resend@4.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

function buildUrl(tokenHash: string, type: string, redirectTo: string): string {
  return `${SUPABASE_URL}/auth/v1/verify?token=${tokenHash}&type=${type}&redirect_to=${redirectTo}`
}

function btn(url: string, text: string): string {
  return `<a href="${url}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">${text}</a>`
}

function wrap(emoji: string, title: string, body: string, btnHtml: string, footer: string): string {
  return `<div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f8f7ff;border-radius:16px;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:-0.5px;">Knowl</span>
  </div>
  <div style="background:white;border-radius:16px;padding:32px;border:1px solid #e0e7ff;">
    <p style="font-size:32px;margin:0 0 8px;">${emoji}</p>
    <h1 style="font-size:22px;font-weight:700;color:#1e1b4b;margin:0 0 8px;">${title}</h1>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">${body}</p>
    ${btnHtml}
    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f0f0f0;">
      <p style="color:#a5b4fc;font-size:13px;margin:0;">Gratis · Geen abonnement · Jouw data</p>
    </div>
  </div>
  <p style="text-align:center;color:#d1d5db;font-size:12px;margin-top:20px;">${footer}</p>
</div>`
}

function getTemplate(type: string, url: string): { subject: string; html: string } {
  switch (type) {
    case 'signup':
      return {
        subject: 'Bevestig je account — Knowl',
        html: wrap('🎉', 'Welkom bij Knowl!',
          'Nog één stap — bevestig je e-mailadres en dan kun je beginnen met het bijhouden van wat je leert.',
          btn(url, 'Account activeren →'),
          'Heb je geen account aangemaakt? Dan kun je dit bericht negeren.')
      }
    case 'recovery':
      return {
        subject: 'Wachtwoord opnieuw instellen — Knowl',
        html: wrap('🔒', 'Wachtwoord opnieuw instellen',
          'Geen zorgen — het overkomt iedereen. Klik op de knop hieronder om een nieuw wachtwoord in te stellen. De link is 24 uur geldig.',
          btn(url, 'Nieuw wachtwoord instellen →'),
          'Heb je dit niet aangevraagd? Dan hoef je niets te doen — je wachtwoord blijft ongewijzigd.')
      }
    case 'invite':
      return {
        subject: 'Je bent uitgenodigd voor Knowl',
        html: wrap('👋', 'Je bent uitgenodigd!',
          'Iemand heeft je uitgenodigd voor Knowl — de leertracker die bijhoudt wat je studeert, hoe lang je bezig bent en of je je doelen haalt.',
          btn(url, 'Uitnodiging accepteren →'),
          'Verwacht je deze uitnodiging niet? Dan kun je dit bericht negeren.')
      }
    case 'magiclink':
      return {
        subject: 'Jouw inloglink — Knowl',
        html: wrap('🔑', 'Jouw inloglink staat klaar',
          'Klik op de knop hieronder om direct in te loggen. Geen wachtwoord nodig — de link is eenmalig geldig en verloopt na 24 uur.',
          btn(url, 'Direct inloggen →'),
          'Heb je dit niet aangevraagd? Dan kun je dit bericht veilig negeren.')
      }
    case 'email_change':
      return {
        subject: 'Bevestig je nieuwe e-mailadres — Knowl',
        html: wrap('📬', 'Nieuw e-mailadres bevestigen',
          'Je hebt een nieuw e-mailadres ingesteld voor je Knowl-account. Klik hieronder om het te bevestigen — daarna is de wijziging actief.',
          btn(url, 'E-mailadres bevestigen →'),
          'Heb je dit niet zelf gedaan? Neem contact op via myknowl@hotmail.com.')
      }
    case 'reauthentication':
      return {
        subject: 'Bevestig je identiteit — Knowl',
        html: wrap('🛡️', 'Even bevestigen dat jij het bent',
          'Je probeert iets te wijzigen in je account. Voor je veiligheid vragen we je om dit even te bevestigen.',
          btn(url, 'Identiteit bevestigen →'),
          'Heb je dit niet zelf gestart? Neem contact op via myknowl@hotmail.com.')
      }
    default:
      return {
        subject: 'Actie vereist — Knowl',
        html: wrap('📧', 'Actie vereist',
          'Klik op de knop hieronder om door te gaan.',
          btn(url, 'Doorgaan →'),
          '')
      }
  }
}

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json()
    const { user, email_data } = payload

    const confirmUrl = buildUrl(
      email_data.token_hash,
      email_data.email_action_type,
      email_data.redirect_to
    )

    const { subject, html } = getTemplate(email_data.email_action_type, confirmUrl)

    const { error } = await resend.emails.send({
      from: 'Knowl <onboarding@resend.dev>',
      to: user.email,
      subject,
      html,
    })

    if (error) {
      return new Response(JSON.stringify({ error }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
