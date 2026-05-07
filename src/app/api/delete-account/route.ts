import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server niet correct geconfigureerd' }, { status: 500 })
  }

  // Verwijder gebruikersdata (voor de zekerheid, ook al zijn er cascades)
  await Promise.all([
    supabase.from('learning_moments').delete().eq('user_id', user.id),
    supabase.from('subjects').delete().eq('user_id', user.id),
    supabase.from('profiles').delete().eq('id', user.id),
  ])

  // Verwijder het auth-account via de admin client
  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
