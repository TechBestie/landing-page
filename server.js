// TechBestie site server: serves the site and the small admin API.
// Development:  npm run dev                  (Vite with live reload)
// Production:   npm run build && npm start
// Configuration comes from environment variables; see .env.example.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SETTINGS } from './web/src/pricing-default.js'
import { connect } from './db.js'
import { verifyPassword } from './password.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(ROOT, 'dist')
const WEB = path.join(ROOT, 'web')

const env = process.env
const PROD = process.argv.includes('--prod') || env.NODE_ENV === 'production'
const PORT = Number(env.PORT) || 5183
const HOST = env.HOST || '0.0.0.0'
const UPLOADS = path.resolve(env.UPLOAD_DIR || path.join(ROOT, 'data', 'uploads'))
// Set when the app sits behind nginx: the client address is then read from X-Real-IP
// and HTTPS from X-Forwarded-Proto. Never set it when the port is reachable directly.
const TRUST_PROXY = env.TRUST_PROXY === '1'

const missing = ['DATABASE_URL', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH'].filter((k) => !env[k])
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}. See .env.example.`)
  process.exit(1)
}
const ADMIN = { username: env.ADMIN_USERNAME, hash: env.ADMIN_PASSWORD_HASH }

const CATEGORY_IDS = ['web', 'ai', 'security']
const STEP_ID = /^[a-z][a-z0-9_]{0,39}$/
const RATE_TTL = 6 * 3600_000
const MAX_LEADS_SHOWN = 500
const SESSION_HOURS = 8
const MAX_UPLOAD = 6 * 1024 * 1024
const MAX_SLIDES = 24
const IMAGE_URL = /^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

// The built site has no inline scripts, so scripts are limited to this origin.
// Vite's dev server injects inline styles and scripts, so this is production only.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  ...(PROD ? { 'Content-Security-Policy': CSP } : {}),
}

fs.mkdirSync(UPLOADS, { recursive: true })
const db = await connect(env.DATABASE_URL)

/* ---------- Sessions and throttling ---------- */

const attempts = new Map() // ip -> { count, resetAt }
const leadAttempts = new Map()

const safeEqual = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest()
  const y = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(x, y)
}

function clientIp(req) {
  const real = TRUST_PROXY && req.headers['x-real-ip']
  return typeof real === 'string' && real ? real : req.socket.remoteAddress
}

const isHttps = (req) => req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https')

function sessionToken(req) {
  const m = /(?:^|;\s*)tb_session=([a-f0-9]{64})/.exec(req.headers.cookie || '')
  return m ? m[1] : null
}

async function sessionOf(req) {
  const token = sessionToken(req)
  return token && (await db.hasSession(token)) ? token : null
}

function throttled(ip, map = attempts, windowMs = 60_000, max = 5) {
  const now = Date.now()
  const a = map.get(ip)
  if (!a || a.resetAt < now) {
    map.set(ip, { count: 1, resetAt: now + windowMs })
    return false
  }
  return ++a.count > max
}

// Forget expired throttle entries and sessions so neither grows forever.
const sweeper = setInterval(() => {
  const now = Date.now()
  for (const map of [attempts, leadAttempts]) for (const [ip, a] of map) if (a.resetAt < now) map.delete(ip)
  db.pruneSessions().catch((err) => console.error('Session cleanup failed:', err.message))
}, 10 * 60_000)
sweeper.unref()

/* ---------- Helpers ---------- */

function send(res, status, body, headers = {}) {
  const json = typeof body === 'object' && !Buffer.isBuffer(body)
  res.writeHead(status, { 'Content-Type': json ? 'application/json' : 'text/plain', 'Cache-Control': 'no-store', ...headers })
  res.end(json ? JSON.stringify(body) : body)
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new Error('too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readJsonBody(req, limit) {
  try {
    return JSON.parse((await readBody(req, limit)).toString('utf8'))
  } catch {
    return null
  }
}

const decode = (s) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return ''
  }
}

const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Text kept in both languages: { id, en }.
const both = (v, max) =>
  typeof v === 'string' ? { id: text(v, max), en: text(v, max) } : { id: text(v?.id, max), en: text(v?.en, max) }

const number = (v, min, max, fallback) => (Number.isFinite(v) && v >= min && v <= max ? v : fallback)

function cleanSettings(input) {
  const s = input && typeof input === 'object' ? input : {}
  // wa.me needs the international form, so a local 08... number becomes 628...
  const wa = String(s.wa ?? '').replace(/\D/g, '').replace(/^0/, '62')
  return {
    wa: wa.length >= 8 && wa.length <= 15 ? wa : '',
    range: number(s.range, 0, 0.5, DEFAULT_SETTINGS.range),
    ratesMode: s.ratesMode === 'manual' ? 'manual' : 'auto',
    manualRates: {
      USD: number(s.manualRates?.USD, 100, 1_000_000, DEFAULT_SETTINGS.manualRates.USD),
      AUD: number(s.manualRates?.AUD, 100, 1_000_000, DEFAULT_SETTINGS.manualRates.AUD),
    },
  }
}

// Returns the cleaned wizard, or a string saying what is wrong with it.
function cleanPricing(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'Pricing is missing.'
  const keys = Object.keys(input)
  if (!keys.includes('root') || keys.length > 30) return 'Pricing has no starting question.'
  const out = {}
  for (const key of keys) {
    const step = input[key]
    if (!STEP_ID.test(key) || !step || !Array.isArray(step.options)) return 'A question is malformed.'
    if (!step.options.length || step.options.length > 12) return 'Each question needs 1 to 12 options.'
    const seen = new Set()
    const options = []
    for (const o of step.options) {
      if (!o || !STEP_ID.test(o.id) || seen.has(o.id)) return 'An option is malformed.'
      seen.add(o.id)
      const title = both(o.title, 80)
      if (!title.id && !title.en) return 'Every option needs a title.'
      const opt = { id: o.id, title, desc: both(o.desc, 240) }
      if (typeof o.ico === 'string' && o.ico) opt.ico = [...o.ico].slice(0, 4).join('')
      if (key === 'root') opt.next = String(o.next)
      else if (o.price != null) opt.price = Math.round(number(o.price, 0, 1e10, 0))
      else opt.mult = number(o.mult, 0.1, 10, 1)
      options.push(opt)
    }
    out[key] = { title: both(step.title, 120), hint: both(step.hint, 200), multi: step.multi === true, options }
    if (step.optional === true) out[key].optional = true
    if (key !== 'root') out[key].next = String(step.next)
  }
  // Every path must reach the result without looping.
  for (const o of out.root.options) {
    let at = o.next
    for (let n = 0; at !== 'RESULT'; n++) {
      if (n > 30 || at === 'root' || !out[at]) return 'The question flow is broken.'
      at = out[at].next
    }
  }
  return out
}

function cleanProjects(input) {
  if (!Array.isArray(input) || !input.length || input.length > MAX_SLIDES) return null
  const out = []
  for (const p of input) {
    if (!p || typeof p !== 'object') return null
    const title = text(p.title, 60)
    if (!title) return null
    out.push({
      title,
      client: text(p.client, 60),
      category: CATEGORY_IDS.includes(p.category) ? p.category : 'web',
      sample: p.sample === true,
      summary: both(p.summary, 400),
      tags: Array.isArray(p.tags) ? p.tags.map((t) => text(t, 30)).filter(Boolean).slice(0, 8) : [],
      image: typeof p.image === 'string' && IMAGE_URL.test(p.image) ? p.image : '',
    })
  }
  return out
}

async function content() {
  const c = await db.get(['projects', 'pricing', 'settings'])
  return { projects: c.projects || null, pricing: c.pricing || null, settings: cleanSettings(c.settings) }
}

/* ---------- Exchange rates ---------- */

async function fetchRates() {
  const sources = [
    ['https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR,AUD', (d) => [d.rates, d.date]],
    ['https://open.er-api.com/v6/latest/USD', (d) => [d.rates, new Date(d.time_last_update_unix * 1000).toISOString().slice(0, 10)]],
  ]
  for (const [url, pick] of sources) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue
      const [r, date] = pick(await res.json())
      if (!(r?.IDR > 1000) || !(r?.AUD > 0.1)) continue
      return { rates: { USD: Math.round(r.IDR), AUD: Math.round(r.IDR / r.AUD) }, date, at: Date.now() }
    } catch {}
  }
  return null
}

let rateCache = null // { rates: { USD, AUD }, date, at }
let rateFetch = null // shared by requests that arrive while a fetch is running

async function liveRates() {
  if (!rateCache) rateCache = (await db.get(['rates'])).rates || null
  if (rateCache && Date.now() - rateCache.at < RATE_TTL) return rateCache
  rateFetch ||= fetchRates().finally(() => (rateFetch = null))
  const fresh = await rateFetch
  if (fresh) {
    rateCache = fresh
    await db.set({ rates: fresh })
  }
  return rateCache // may be stale or null when the services are unreachable
}

function imageType(buf) {
  if (buf.length > 8 && buf.readUInt32BE(0) === 0x89504e47) return 'png'
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

function serveFile(res, base, rel, cache) {
  const file = path.join(base, rel)
  if (!file.startsWith(base + path.sep)) return send(res, 403, 'Forbidden')
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found')
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': cache,
    })
    res.end(data)
  })
}

/* ---------- API ---------- */

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`

  // Requests that change something must come from this site. SameSite=Strict
  // already keeps the session cookie off cross-site requests; this also covers
  // the public lead form.
  if (req.method !== 'GET' && req.headers.origin) {
    let host = ''
    try {
      host = new URL(req.headers.origin).host
    } catch {}
    if (host !== req.headers.host) return send(res, 403, { error: 'Forbidden.' })
  }

  if (route === 'GET /api/health') {
    try {
      await db.ping()
      return send(res, 200, { ok: true })
    } catch {
      return send(res, 503, { ok: false })
    }
  }

  if (route === 'GET /api/content') return send(res, 200, await content())

  if (route === 'GET /api/rates') {
    const { settings } = await content()
    const live = settings.ratesMode === 'auto' ? await liveRates() : null
    if (live) return send(res, 200, { rates: live.rates, date: live.date, source: 'live' })
    return send(res, 200, { rates: settings.manualRates, date: '', source: 'manual' })
  }

  if (route === 'POST /api/lead') {
    if (throttled(clientIp(req), leadAttempts, 600_000, 5)) return send(res, 429, { error: 'Too many requests.' })
    const body = (await readJsonBody(req, 8192)) || {}
    // Filled only by bots (the field is hidden). Pretend it worked.
    if (body.website) return send(res, 200, { ok: true })
    const lead = {
      name: text(body.name, 80),
      contact: text(body.contact, 120),
      note: text(body.note, 1000),
      service: text(body.service, 100),
      summary: text(body.summary, 1500),
      estimate: text(body.estimate, 80),
      lang: body.lang === 'en' ? 'en' : 'id',
      currency: ['IDR', 'USD', 'AUD'].includes(body.currency) ? body.currency : 'IDR',
    }
    if (!lead.name || !lead.contact) return send(res, 400, { error: 'Name and contact are required.' })
    await db.addLead(lead)
    return send(res, 200, { ok: true })
  }

  if (route === 'GET /api/session') return send(res, 200, { admin: Boolean(await sessionOf(req)) })

  if (route === 'POST /api/login') {
    if (throttled(clientIp(req))) return send(res, 429, { error: 'Too many attempts. Wait a minute.' })
    const body = (await readJsonBody(req, 4096)) || {}
    // Both checks always run, so timing does not reveal which one failed.
    const userOk = safeEqual(body.username, ADMIN.username)
    const passOk = await verifyPassword(String(body.password ?? ''), ADMIN.hash)
    if (!userOk || !passOk) return send(res, 401, { error: 'Wrong username or password.' })
    const token = crypto.randomBytes(32).toString('hex')
    await db.createSession(token, SESSION_HOURS)
    return send(res, 200, { admin: true }, {
      'Set-Cookie': `tb_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${isHttps(req) ? '; Secure' : ''}`,
    })
  }

  if (route === 'POST /api/logout') {
    const token = sessionToken(req)
    if (token) await db.deleteSession(token)
    return send(res, 200, { admin: false }, { 'Set-Cookie': 'tb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' })
  }

  // Everything below changes content or shows leads and needs a login.
  if (!(await sessionOf(req))) return send(res, 401, { error: 'Please log in again.' })

  if (route === 'PUT /api/content') {
    const body = await readJsonBody(req, 400_000)
    if (!body || typeof body !== 'object') return send(res, 400, { error: 'Could not read the content.' })
    // Only the parts that were sent are replaced.
    const next = {}
    if ('projects' in body) {
      const projects = cleanProjects(body.projects)
      if (!projects) return send(res, 400, { error: 'Every slide needs a title.' })
      next.projects = projects
    }
    if ('pricing' in body) {
      const pricing = cleanPricing(body.pricing)
      if (typeof pricing === 'string') return send(res, 400, { error: pricing })
      next.pricing = pricing
    }
    if ('settings' in body) next.settings = cleanSettings(body.settings)
    await db.set(next)
    return send(res, 200, await content())
  }

  if (route === 'GET /api/leads') return send(res, 200, { leads: await db.leads(MAX_LEADS_SHOWN) })

  if (route === 'POST /api/upload') {
    let buf
    try {
      buf = await readBody(req, MAX_UPLOAD)
    } catch {
      return send(res, 413, { error: 'Picture is too large (6 MB maximum).' })
    }
    const type = imageType(buf)
    if (!type) return send(res, 415, { error: 'Only PNG, JPG or WebP pictures are accepted.' })
    const name = crypto.randomBytes(12).toString('hex') + '.' + type
    await fs.promises.writeFile(path.join(UPLOADS, name), buf)
    return send(res, 200, { url: '/uploads/' + name })
  }

  send(res, 404, { error: 'Not found' })
}

/* ---------- Server ---------- */

const server = http.createServer()
server.headersTimeout = 20_000
server.requestTimeout = 60_000

let vite = null
if (!PROD) {
  const { createServer } = await import('vite')
  // Vite may only read the site folder and installed packages, never the
  // server's own files (.env, data/).
  vite = await createServer({
    root: WEB,
    configFile: false,
    appType: 'spa',
    server: {
      middlewareMode: true,
      hmr: { server },
      fs: { strict: true, allow: [WEB, path.join(ROOT, 'node_modules')] },
    },
  })
}

server.on('request', (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v)
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/api/')) {
    return api(req, res, url).catch((err) => {
      console.error(err)
      if (!res.headersSent) send(res, 500, { error: 'Server error.' })
    })
  }
  if (url.pathname.startsWith('/uploads/')) {
    return serveFile(res, UPLOADS, decode(url.pathname.slice('/uploads/'.length)), 'public, max-age=31536000, immutable')
  }
  if (/\.env|\/data\/|server\.js|db\.js|password\.js/i.test(decode(url.pathname))) return send(res, 404, 'Not found')
  if (vite) return vite.middlewares(req, res)
  const page = url.pathname === '/' || ['/admin', '/admin/'].includes(url.pathname)
  const rel = page ? 'index.html' : decode(url.pathname.slice(1))
  serveFile(res, DIST, rel, rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
})

server.listen(PORT, HOST, () =>
  console.log(`TechBestie running at http://${HOST}:${PORT} (${PROD ? 'production' : 'development'})`))

// Docker sends SIGTERM on stop and redeploy: finish open requests, then close the pool.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    console.log(`${signal} received, shutting down`)
    clearInterval(sweeper)
    server.close(() => db.pool.end().finally(() => process.exit(0)))
    server.closeIdleConnections()
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
