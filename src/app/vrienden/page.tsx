import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Vrienden from '@/components/Vrienden'

function computeStreak(dates: string[]): number {
  const unique = Array.from(new Set(dates)).sort().reverse()
  if (!unique.length) return 0
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (unique[0] !== today && unique[0] !== yesterday) return 0
  let count = 1
  for (let i = 1; i < unique.length; i++) {
    const diff = (new Date(unique[i - 1]).getTime() - new Date(unique[i]).getTime()) / 86400000
    if (Math.round(diff) === 1) count++
    else break
  }
  return count
}

export default async function VriendenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const monthStr = firstOfMonth.toISOString().split('T')[0]

  const [{ data: profile }, { data: friendships }] = await Promise.all([
    supabase.from('profiles').select('username, is_public').eq('id', user.id).maybeSingle(),
    supabase.from('friendships').select('following_id').eq('follower_id', user.id),
  ])

  const followingIds = (friendships ?? []).map(f => f.following_id)

  let followingStats: {
    id: string
    username: string | null
    voornaam: string | null
    streak: number
    hoursMonth: number
    momentsMonth: number
    isPublic: boolean
  }[] = []

  if (followingIds.length > 0) {
    const [{ data: profiles }, { data: moments }] = await Promise.all([
      supabase.from('profiles').select('id, username, voornaam, is_public').in('id', followingIds),
      supabase.from('learning_moments').select('user_id, learned_at, duration_minutes').in('user_id', followingIds),
    ])

    followingStats = (profiles ?? []).map(p => {
      const userMoments = (moments ?? []).filter(m => m.user_id === p.id)
      const monthMoments = userMoments.filter(m => m.learned_at >= monthStr)
      return {
        id: p.id,
        username: p.username,
        voornaam: p.voornaam,
        streak: computeStreak(userMoments.map(m => m.learned_at)),
        hoursMonth: Math.floor(monthMoments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0) / 60),
        momentsMonth: monthMoments.length,
        isPublic: p.is_public ?? false,
      }
    })
  }

  return (
    <Vrienden
      userId={user.id}
      following={followingStats}
      myUsername={profile?.username ?? null}
      myIsPublic={profile?.is_public ?? false}
    />
  )
}
