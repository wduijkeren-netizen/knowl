'use client'

import Nav from '@/components/Nav'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type FriendStats = {
  id: string
  username: string | null
  voornaam: string | null
  streak: number
  hoursMonth: number
  momentsMonth: number
  isPublic: boolean
}

type Props = {
  userId: string
  following: FriendStats[]
  myUsername: string | null
  myIsPublic: boolean
}

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

export default function Vrienden({ userId, following, myUsername, myIsPublic }: Props) {
  const { tr } = useLanguage()
  const f = tr.friends
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState<FriendStats | null | 'not-found' | 'loading'>(null)
  const [friends, setFriends] = useState<FriendStats[]>(following)
  const [username, setUsername] = useState(myUsername ?? '')
  const [isPublic, setIsPublic] = useState(myIsPublic)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [unfollowing, setUnfollowing] = useState<string | null>(null)

  async function searchUser() {
    if (!search.trim()) return
    setSearchResult('loading')
    const { data } = await supabase
      .from('profiles')
      .select('id, username, voornaam, is_public')
      .eq('username', search.trim().toLowerCase())
      .eq('is_public', true)
      .maybeSingle()

    if (!data || data.id === userId) {
      setSearchResult('not-found')
      return
    }

    const firstOfMonth = new Date()
    firstOfMonth.setDate(1)
    const monthStr = firstOfMonth.toISOString().split('T')[0]

    const { data: moments } = await supabase
      .from('learning_moments')
      .select('learned_at, duration_minutes')
      .eq('user_id', data.id)

    const allDates = (moments ?? []).map(m => m.learned_at)
    const streak = computeStreak(allDates)
    const monthMoments = (moments ?? []).filter(m => m.learned_at >= monthStr)
    const hoursMonth = Math.floor(monthMoments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0) / 60)

    setSearchResult({
      id: data.id,
      username: data.username,
      voornaam: data.voornaam,
      streak,
      hoursMonth,
      momentsMonth: monthMoments.length,
      isPublic: data.is_public,
    })
  }

  async function follow(friend: FriendStats) {
    await supabase.from('friendships').insert({ follower_id: userId, following_id: friend.id })
    setFriends(prev => [...prev, friend])
    setSearchResult(null)
    setSearch('')
  }

  async function unfollow(friendId: string) {
    setUnfollowing(friendId)
    await supabase.from('friendships').delete().eq('follower_id', userId).eq('following_id', friendId)
    setFriends(prev => prev.filter(f => f.id !== friendId))
    setUnfollowing(null)
  }

  async function saveSettings() {
    const updates: Record<string, unknown> = { is_public: isPublic }
    if (username.trim()) updates.username = username.trim().toLowerCase()
    await supabase.from('profiles').update(updates).eq('id', userId)
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  const isAlreadyFollowing = (id: string) => friends.some(f => f.id === id)

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-indigo-900">{f.title}</h1>
          <p className="text-sm text-indigo-400 mt-1">{f.subtitle}</p>
        </div>

        {/* Profiel instellingen */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-indigo-900 border-l-4 border-indigo-300 pl-3">{f.setUsername}</h2>
          <p className="text-xs text-indigo-400">{f.usernameNote}</p>
          <div className="flex gap-2">
            <input
              value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
              placeholder={f.usernamePlaceholder}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setIsPublic(p => !p)}
                className={`w-10 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-indigo-500' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-indigo-800">{isPublic ? f.isPublic : f.isPrivate}</span>
            </label>
            <button
              onClick={saveSettings}
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors active:scale-95"
            >
              {settingsSaved ? f.saved : f.saveUsername}
            </button>
          </div>
          {isPublic && (
            <p className="text-xs text-indigo-400 bg-indigo-50 rounded-xl px-3 py-2">{f.makePublicSub}</p>
          )}
        </div>

        {/* Zoek een vriend */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-indigo-900 border-l-4 border-violet-300 pl-3">{f.following}</h2>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchUser()}
              placeholder={f.searchPlaceholder}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={searchUser}
              className="bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors active:scale-95"
            >
              {f.search}
            </button>
          </div>

          {searchResult === 'loading' && (
            <p className="text-sm text-indigo-400">...</p>
          )}
          {searchResult === 'not-found' && (
            <p className="text-sm text-red-400">{f.notFound}</p>
          )}
          {searchResult && searchResult !== 'loading' && searchResult !== 'not-found' && (
            <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-indigo-900">{searchResult.voornaam ?? searchResult.username}</p>
                <p className="text-xs text-indigo-400">@{searchResult.username} · {searchResult.streak} {f.streakLabel} · {searchResult.hoursMonth} {f.hoursMonth}</p>
              </div>
              {isAlreadyFollowing(searchResult.id) ? (
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl">{f.following} ✓</span>
              ) : (
                <button onClick={() => follow(searchResult as FriendStats)}
                  className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors active:scale-95">
                  {f.follow}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lijst vrienden */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
          <h2 className="font-semibold text-indigo-900 mb-4 border-l-4 border-emerald-300 pl-3">{f.following} ({friends.length})</h2>
          {friends.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-indigo-400 font-medium">{f.noFriends}</p>
              <p className="text-xs text-indigo-300">{f.noFriendsSub}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between py-3 border-b border-indigo-50 last:border-0 gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-indigo-900 truncate">{friend.voornaam ?? friend.username ?? '—'}</p>
                    {friend.username && <p className="text-xs text-indigo-400">@{friend.username}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-500">{friend.streak}</p>
                      <p className="text-xs text-indigo-300">{f.streakLabel}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-700">{friend.hoursMonth}u</p>
                      <p className="text-xs text-indigo-300">{f.hoursMonth.replace('uur ', '').replace('hours ', '').replace('horas ', '').replace('heures ', '').replace('stunden ', '').split(' ')[0]}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-violet-600">{friend.momentsMonth}</p>
                      <p className="text-xs text-indigo-300">{f.momentsMonth.split(' ')[0]}</p>
                    </div>
                    <button
                      onClick={() => unfollow(friend.id)}
                      disabled={unfollowing === friend.id}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      {f.unfollow}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
