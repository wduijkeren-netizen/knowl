'use client'

import Link from 'next/link'
import { AuroraHero } from '@/components/AuroraHero'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Props = { set: { id: string; title: string; vak: string | null }; token: string }

export default function LidWordenForm({ set, token }: Props) {
  const { tr } = useLanguage()
  const inv = tr.invite
  const loginUrl = `/login?redirect=/flashcards/lid-worden/${token}`

  return (
    <AuroraHero className="bg-[#f8f7ff] [--primary:theme(colors.indigo.500)] [--muted-foreground:theme(colors.violet.400)]">
      <div className="w-full max-w-sm px-4 text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 tracking-tight">Knowl</h1>
          <p className="text-indigo-400 mt-2 text-sm">{inv.tagline}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 p-8 space-y-4">
          <h2 className="text-lg font-semibold text-indigo-900">{inv.invited}</h2>
          <p className="text-sm text-gray-500">
            {inv.invitedBody}{' '}
            <span className="font-semibold text-indigo-700">{set.title}</span>
            {set.vak ? ` (${set.vak})` : ''}.
          </p>
          <p className="text-sm text-gray-400">{inv.invitedLogin}</p>
          <Link href={loginUrl}
            className="block w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm shadow-indigo-200">
            {inv.loginBtn}
          </Link>
        </div>
      </div>
    </AuroraHero>
  )
}
