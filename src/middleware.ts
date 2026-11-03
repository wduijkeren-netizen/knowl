import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { HOMEPAGE_MARKDOWN, notFoundMarkdown } from '@/lib/agentContent'

// Routes die GEEN login vereisen
const PUBLIC_PATHS = ['/', '/login', '/leermomenten', '/resultaten', '/pomodoro', '/cijfers', '/privacy', '/voorwaarden', '/reset-wachtwoord', '/about', '/contact']
const PUBLIC_PREFIXES = ['/deel/', '/flashcards/deel/', '/flashcards/lid-worden/']

// Eerste deel van elk pad waarvoor een pagina bestaat in src/app. Alles daarbuiten krijgt een echte 404.
const KNOWN_SECTIONS = [
  'about', 'admin', 'agenda', 'api', 'cijfers', 'contact', 'deel', 'flashcards', 'home', 'leermomenten', 'login',
  'notities', 'pomodoro', 'privacy', 'profiel', 'reset-wachtwoord', 'resultaten', 'rooster', 'studielogboek',
  'vakken', 'voorwaarden', 'vrienden', 'week', 'woordweb', 'wrapped',
]

function wantsMarkdown(request: NextRequest) {
  return (request.headers.get('accept') ?? '').includes('text/markdown')
}

function markdown(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', Vary: 'Accept' },
  })
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const section = path.split('/')[1]

  if (path !== '/' && !KNOWN_SECTIONS.includes(section)) {
    if (wantsMarkdown(request)) return markdown(notFoundMarkdown(path), 404)
    return NextResponse.next()
  }

  if (path === '/' && wantsMarkdown(request)) return markdown(HOMEPAGE_MARKDOWN, 200)

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublic = PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some(p => path.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && path.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  if (user && path === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|json|txt|xml|woff2?)$).*)'],
}
