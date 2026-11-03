// Draai tegen een lopende server: BASE_URL=http://localhost:3000 npm run test:agents
import { test } from 'node:test'
import assert from 'node:assert/strict'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const get = (path, accept = 'text/html') => fetch(BASE + path, { headers: { Accept: accept }, redirect: 'manual' })
const varyHasAccept = res => (res.headers.get('vary') ?? '').split(',').map(v => v.trim().toLowerCase()).includes('accept')
const textOf = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

test('onbekend pad geeft een echte 404 met HTML', async () => {
  const res = await get('/deze-pagina-bestaat-niet')
  assert.equal(res.status, 404)
  assert.match(res.headers.get('content-type'), /text\/html/)
})

test('onbekend pad geeft een 404 met Markdown als daarom gevraagd wordt', async () => {
  const res = await get('/deze-pagina-bestaat-niet', 'text/markdown')
  assert.equal(res.status, 404)
  assert.match(res.headers.get('content-type'), /^text\/markdown/)
  const body = await res.text()
  assert.ok(body.length >= 20)
  assert.match(body, /sitemap\.xml/)
  assert.match(body, /llms\.txt/)
})

test('bestaande pagina\'s geven geen 404', async () => {
  for (const path of ['/', '/login', '/leermomenten', '/resultaten', '/pomodoro', '/cijfers', '/privacy', '/voorwaarden', '/about', '/contact']) {
    const res = await get(path)
    assert.equal(res.status, 200, path)
  }
})

test('beveiligde pagina stuurt bezoekers zonder account nog steeds naar inloggen', async () => {
  for (const path of ['/vakken', '/home', '/flashcards', '/profiel']) {
    const res = await get(path)
    assert.equal(res.status, 307, path)
    assert.match(res.headers.get('location'), /\/login$/, path)
  }
})

test('homepage geeft Markdown bij Accept: text/markdown', async () => {
  const res = await get('/', 'text/markdown')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /^text\/markdown/)
  assert.ok(varyHasAccept(res), res.headers.get('vary'))
  const body = await res.text()
  assert.match(body, /^# Knowl/)
})

// Next.js overschrijft Vary op gerenderde pagina's; de middleware kiest vóór de cache al tussen Markdown en HTML.
test('homepage geeft gewoon HTML bij Accept: text/html', async () => {
  const res = await get('/', 'text/html')
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/html/)
  assert.match(await res.text(), /<h1/)
})

test('homepage heeft canonical, lang, og:image, og:type en Organization-gegevens', async () => {
  const html = await (await get('/')).text()
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.myknowl\.com"/)
  assert.match(html, /<html lang="nl"/)
  assert.match(html, /<meta property="og:image"/)
  assert.match(html, /<meta property="og:type" content="website"/)
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])
  const org = ld['@graph'].find(n => n['@type'] === 'Organization')
  assert.ok(org)
  assert.equal(org.contactPoint.contactType, 'customer support')
  assert.ok(org.contactPoint.email)
})

test('llms.txt bestaat en heeft een "When to use"-sectie', async () => {
  const res = await get('/llms.txt', 'text/plain')
  assert.equal(res.status, 200)
  const body = await res.text()
  assert.match(body, /^# Knowl\n\n> /)
  assert.match(body, /## When to use Knowl/)
})

test('Over Knowl, Contact en Privacy hebben minstens 500 tekens tekst zonder JavaScript', async () => {
  for (const path of ['/about', '/contact', '/privacy']) {
    const text = textOf(await (await get(path)).text())
    assert.ok(text.length >= 500, `${path}: ${text.length} tekens`)
  }
})

test('inlogpagina heeft tekst in de HTML zonder JavaScript', async () => {
  const text = textOf(await (await get('/login')).text())
  assert.ok(text.length >= 200, `${text.length} tekens`)
})

test('sitemap en robots gebruiken www.myknowl.com en noemen de nieuwe pagina\'s', async () => {
  const sitemap = await (await get('/sitemap.xml', 'application/xml')).text()
  assert.match(sitemap, /https:\/\/www\.myknowl\.com\/about/)
  assert.match(sitemap, /https:\/\/www\.myknowl\.com\/contact/)
  const robots = await (await get('/robots.txt', 'text/plain')).text()
  assert.match(robots, /Sitemap: https:\/\/www\.myknowl\.com\/sitemap\.xml/)
})
