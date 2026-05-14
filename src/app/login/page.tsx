'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuroraHero } from '@/components/AuroraHero'
import { vertaalFout } from '@/lib/foutmelding'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function LoginForm() {
  const searchParams = useSearchParams()
  const { tr } = useLanguage()
  const lg = tr.login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(searchParams.get('signup') === 'true')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    const redirect = searchParams.get('redirect') ?? '/home'

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}${redirect}` },
      })
      if (error) setError(vertaalFout(error.message))
      else setInfo(lg.confirmEmail)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(vertaalFout(error.message))
      else router.push(redirect)
    }

    setLoading(false)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail) return
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-wachtwoord`,
    })
    setForgotSent(true)
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-indigo-700 tracking-tight">Knowl</h1>
        <p className="text-indigo-400 mt-2 text-sm">{lg.tagline}</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 p-8">
        <h2 className="text-lg font-semibold text-indigo-900 mb-1">
          {isSignUp ? lg.signupTitle : lg.loginTitle}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {isSignUp ? lg.signupSub : lg.loginSub}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{lg.emailLabel ?? lg.email}</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder={lg.emailPlaceholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">{lg.passwordLabel ?? lg.password}</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
            />
          </div>

          {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-sm text-red-500">{error}</p></div>}
          {info && <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3"><p className="text-sm text-emerald-600">{info}</p></div>}

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl py-3 text-sm font-semibold hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all shadow-sm shadow-indigo-200 mt-2">
            {loading ? lg.loading : isSignUp ? lg.signupBtn : lg.loginBtn}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setInfo(''); setShowForgot(false) }}
            className="text-sm text-indigo-400 hover:text-indigo-600 transition-colors block w-full">
            {isSignUp ? lg.toLogin : lg.toSignup}
          </button>
          {!isSignUp && !showForgot && (
            <button onClick={() => setShowForgot(true)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              {lg.forgotPw}
            </button>
          )}
          {showForgot && !forgotSent && (
            <form onSubmit={handleForgot} className="space-y-2 pt-2">
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                placeholder={lg.emailPlaceholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <button type="submit" className="w-full bg-indigo-100 text-indigo-700 rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-200 transition-colors">
                {lg.sendReset}
              </button>
            </form>
          )}
          {forgotSent && (
            <p className="text-sm text-emerald-600 pt-1">{lg.resetSent}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <AuroraHero className="bg-[#f8f7ff] [--primary:theme(colors.indigo.500)] [--muted-foreground:theme(colors.violet.400)]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuroraHero>
  )
}
