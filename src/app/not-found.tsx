import Link from 'next/link'
import { AuroraHero } from '@/components/AuroraHero'

export default function NotFound() {
  return (
    <AuroraHero className="bg-[#f8f7ff] [--primary:theme(colors.indigo.500)] [--muted-foreground:theme(colors.violet.400)]">
      <div className="w-full max-w-sm px-4 text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-indigo-700 tracking-tight">Knowl</h1>
          <p className="text-indigo-400 mt-2 text-sm">Jouw persoonlijke leertracker</p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 p-8">
          <p className="text-6xl mb-4">🔍</p>
          <h2 className="text-xl font-semibold text-indigo-900 mb-2">Pagina niet gevonden</h2>
          <p className="text-sm text-gray-400 mb-6">
            Deze pagina bestaat niet of is verplaatst.
          </p>
          <Link
            href="/home"
            className="block w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm shadow-indigo-200"
          >
            Terug naar Home →
          </Link>
        </div>
      </div>
    </AuroraHero>
  )
}
