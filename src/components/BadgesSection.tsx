'use client'

import { useState, useEffect } from 'react'
import { ALL_BADGES, computeMaxStreak, type BadgeData, type BadgeRarity } from '@/lib/badges'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Props = {
  moments: { learned_at: string; duration_minutes: number | null }[]
  subjectCount: number
  flashcardsSR: number
  hasWordweb: boolean
}

function rarityStyle(rarity: BadgeRarity, earned: boolean): string {
  if (!earned) return 'border-gray-200 bg-gray-50 opacity-40 grayscale'
  switch (rarity) {
    case 'common': return 'border-indigo-200 bg-indigo-50'
    case 'rare': return 'border-violet-200 bg-violet-50'
    case 'epic': return 'border-amber-200 bg-amber-50'
    case 'legendary': return 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50'
  }
}

function rarityLabel(rarity: BadgeRarity, tr: { rarityCommon: string; rarityRare: string; rarityEpic: string; rarityLegendary: string }): string {
  switch (rarity) {
    case 'common': return tr.rarityCommon
    case 'rare': return tr.rarityRare
    case 'epic': return tr.rarityEpic
    case 'legendary': return tr.rarityLegendary
  }
}

export default function BadgesSection({ moments, subjectCount, flashcardsSR, hasWordweb }: Props) {
  const { tr } = useLanguage()
  const b = tr.badges
  const [pomodoroCompleted, setPomodoroCompleted] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('knowl_pomodoro')
      if (raw) {
        const parsed = JSON.parse(raw)
        setPomodoroCompleted(typeof parsed?.completed === 'number' ? parsed.completed : 0)
      }
    } catch {}
  }, [])

  const maxStreak = computeMaxStreak(moments)
  const totalMinutes = moments.reduce((s, m) => s + (m.duration_minutes ?? 0), 0)
  const totalMoments = moments.length
  const hasEarlyMoment = moments.some(m => {
    const hour = new Date(m.learned_at).getHours()
    return hour < 8
  })
  const hasLateMoment = moments.some(m => {
    const hour = new Date(m.learned_at).getHours()
    return hour >= 23
  })

  const data: BadgeData = {
    totalMoments,
    totalMinutes,
    maxStreak,
    pomodoroCompleted,
    flashcardsSR,
    subjectCount,
    hasEarlyMoment,
    hasLateMoment,
    hasWordweb,
  }

  const earnedIds = new Set(ALL_BADGES.filter(badge => badge.check(data)).map(b => b.id))
  const earned = earnedIds.size
  const total = ALL_BADGES.length

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-indigo-900">{b.title}</h2>
          <p className="text-xs text-indigo-400 mt-0.5">{b.subtitle}</p>
        </div>
        <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {earned} {b.progress} {total} {b.earned}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {ALL_BADGES.map(badge => {
          const isEarned = earnedIds.has(badge.id)
          return (
            <div
              key={badge.id}
              className={`relative rounded-xl border p-3 flex flex-col items-center text-center gap-1 ${rarityStyle(badge.rarity, isEarned)}`}
            >
              {isEarned && (
                <span className="absolute top-1.5 right-1.5 text-xs text-emerald-500 font-bold">✓</span>
              )}
              <span className="text-3xl">{badge.emoji}</span>
              <p className="text-sm font-semibold text-indigo-900 leading-tight">{badge.title}</p>
              <p className="text-xs text-gray-500 leading-tight">{badge.desc}</p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${
                badge.rarity === 'legendary' ? 'bg-yellow-100 text-yellow-700' :
                badge.rarity === 'epic' ? 'bg-amber-100 text-amber-700' :
                badge.rarity === 'rare' ? 'bg-violet-100 text-violet-700' :
                'bg-indigo-100 text-indigo-600'
              }`}>
                {rarityLabel(badge.rarity, b)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
