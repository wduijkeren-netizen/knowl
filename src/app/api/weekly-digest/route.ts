import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Vercel cron calls this every Sunday at 08:00 UTC
// vercel.json: { "crons": [{ "path": "/api/weekly-digest", "schedule": "0 8 * * 0" }] }
export const dynamic = 'force-dynamic'

function weeklyEmailHtml(name: string, stats: {
  moments: number
  minutes: number
  streak: number
  topSubject: string | null
  exams: { title: string; date: string; daysLeft: number }[]
}) {
  const hours = Math.floor(stats.minutes / 60)
  const mins = stats.minutes % 60
  const timeStr = hours > 0 ? `${hours}u ${mins}m` : `${mins} min`
  const streakMsg = stats.streak >= 7 ? '🔥 Indrukwekkend!' : stats.streak >= 3 ? '🎯 Goed bezig!' : stats.streak > 0 ? '💪 Begin van iets moois!' : ''

  const examsHtml = stats.exams.length > 0 ? `
    <div style="background:#f0f4ff;border-radius:12px;padding:16px;margin:16px 0">
      <p style="font-weight:700;color:#1e1b4b;margin:0 0 10px">📅 Komende tentamens</p>
      ${stats.exams.map(e => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e0e7ff">
          <span style="color:#312e81;font-size:14px">${e.title}</span>
          <span style="color:${e.daysLeft <= 3 ? '#ef4444' : '#6366f1'};font-weight:700;font-size:14px">${e.daysLeft}d</span>
        </div>`).join('')}
    </div>` : ''

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8f7ff;margin:0;padding:24px">
<div style="max-width:520px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#6366f1,#7c3aed);border-radius:20px;padding:32px;text-align:center;color:white;margin-bottom:24px">
    <p style="font-size:13px;text-transform:uppercase;letter-spacing:2px;opacity:0.8;margin:0 0 8px">Weekoverzicht</p>
    <h1 style="font-size:26px;font-weight:800;margin:0 0 4px">Hoi ${name}!</h1>
    <p style="opacity:0.85;font-size:15px;margin:0">Hier is jouw studieoverzicht van deze week</p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="background:white;border-radius:16px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(99,102,241,0.1)">
      <p style="font-size:28px;font-weight:800;color:#4f46e5;margin:0">${stats.moments}</p>
      <p style="font-size:12px;color:#818cf8;margin:4px 0 0">momenten</p>
    </div>
    <div style="background:white;border-radius:16px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(99,102,241,0.1)">
      <p style="font-size:28px;font-weight:800;color:#4f46e5;margin:0">${timeStr}</p>
      <p style="font-size:12px;color:#818cf8;margin:4px 0 0">gestudeerd</p>
    </div>
    <div style="background:white;border-radius:16px;padding:16px;text-align:center;box-shadow:0 1px 4px rgba(99,102,241,0.1)">
      <p style="font-size:28px;font-weight:800;color:#f97316;margin:0">${stats.streak}🔥</p>
      <p style="font-size:12px;color:#818cf8;margin:4px 0 0">streak ${streakMsg}</p>
    </div>
  </div>

  ${stats.topSubject ? `<div style="background:white;border-radius:16px;padding:16px;margin-bottom:16px;box-shadow:0 1px 4px rgba(99,102,241,0.1)">
    <p style="color:#818cf8;font-size:12px;text-transform:uppercase;font-weight:600;margin:0 0 4px">Topvak deze week</p>
    <p style="color:#1e1b4b;font-size:18px;font-weight:700;margin:0">${stats.topSubject}</p>
  </div>` : ''}

  ${examsHtml}

  <div style="text-align:center;margin:24px 0">
    <a href="https://knowl.app/home" style="background:linear-gradient(135deg,#6366f1,#7c3aed);color:white;padding:14px 32px;border-radius:14px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
      Naar mijn dashboard →
    </a>
  </div>

  <p style="text-align:center;color:#a5b4fc;font-size:12px;margin-top:24px">
    Knowl · <a href="https://knowl.app/profiel" style="color:#818cf8">Uitschrijven voor weekmail</a>
  </p>
</div></body></html>`
}

export async function GET(req: Request) {
  // Vercel cron sends Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const resendKey = process.env.RESEND_API_KEY!

  if (!serviceKey || !resendKey) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Fetch all users with weekly digest opted in
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, voornaam, weekly_digest')
    .eq('weekly_digest', true)

  if (!profiles?.length) return NextResponse.json({ sent: 0 })

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  let sent = 0
  const errors: string[] = []

  for (const profile of profiles) {
    try {
      const { data: { user } } = await admin.auth.admin.getUserById(profile.id)
      if (!user?.email) continue

      const [{ data: moments }, { data: exams }] = await Promise.all([
        admin.from('learning_moments')
          .select('duration_minutes, learned_at, category')
          .eq('user_id', profile.id)
          .gte('learned_at', weekAgo),
        admin.from('agenda_events')
          .select('title, date')
          .eq('user_id', profile.id)
          .eq('type', 'exam')
          .gte('date', today)
          .order('date')
          .limit(3),
      ])

      const weekMoments = moments ?? []
      const totalMinutes = weekMoments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)

      // Streak calculation
      const { data: allMoments } = await admin.from('learning_moments')
        .select('learned_at').eq('user_id', profile.id).order('learned_at', { ascending: false })
      const days = Array.from(new Set((allMoments ?? []).map(m => m.learned_at))).sort().reverse()
      let streak = 0
      if (days.length) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
        if (days[0] === today || days[0] === yesterday) {
          streak = 1
          for (let i = 1; i < days.length; i++) {
            const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000
            if (Math.round(diff) === 1) streak++
            else break
          }
        }
      }

      const perCategory: Record<string, number> = {}
      weekMoments.forEach(m => {
        if (m.category) perCategory[m.category] = (perCategory[m.category] ?? 0) + (m.duration_minutes ?? 0)
      })
      const topSubject = Object.entries(perCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      const examList = (exams ?? []).map(e => ({
        title: e.title,
        date: e.date,
        daysLeft: Math.max(0, Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000)),
      }))

      const html = weeklyEmailHtml(profile.voornaam ?? 'Student', {
        moments: weekMoments.length,
        minutes: totalMinutes,
        streak,
        topSubject,
        exams: examList,
      })

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Knowl <noreply@knowl.app>',
          to: user.email,
          subject: `📊 Jouw studieweek — ${weekMoments.length} momenten, ${Math.floor(totalMinutes / 60)}u${totalMinutes % 60}m`,
          html,
        }),
      })

      if (res.ok) sent++
      else errors.push(`${user.email}: ${await res.text()}`)
    } catch (e) {
      errors.push(String(e))
    }
  }

  return NextResponse.json({ sent, errors })
}
