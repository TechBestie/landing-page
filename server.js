// TechBestie site server: serves the site and the small admin API.
// Development:  node server.js            (Vite with live reload)
// Production:   npm run build && node server.js --prod
// Zero dependencies beyond Vite, which is only loaded in development.

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { DEFAULT_SETTINGS } from './web/src/pricing-default.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DATA = path.join(ROOT, 'data')
const UPLOADS = path.join(DATA, 'uploads')
const CONTENT = path.join(DATA, 'content.json')
const DIST = path.join(ROOT, 'dist')
const WEB = path.join(ROOT, 'web')

const args = process.argv.slice(2)
const PROD = args.includes('--prod')
const PORT = Number(args[args.indexOf('--port') + 1]) || Number(process.env.PORT) || 5183

// Admin login. Edit admin.config.json to change it, then restart the server.
const ADMIN_FILE = path.join(ROOT, 'admin.config.json')
if (!fs.existsSync(ADMIN_FILE)) {
  console.error('admin.config.json is missing. Copy admin.config.example.json to admin.config.json and set a password.')
  process.exit(1)
}
const ADMIN = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'))

const LEADS = path.join(DATA, 'leads.json')
const RATES = path.join(DATA, 'rates.json')
const CATEGORY_IDS = ['web', 'ai', 'security']
const STEP_ID = /^[a-z][a-z0-9_]{0,39}$/
const RATE_TTL = 6 * 3600_000
const MAX_LEADS = 1000
const SESSION_HOURS = 8
const MAX_UPLOAD = 6 * 1024 * 1024
const MAX_SLIDES = 24
const IMAGE_URL = /^\/uploads\/[a-f0-9]{24}\.(png|jpg|webp)$/
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

fs.mkdirSync(UPLOADS, { recursive: true })

/* ---------- Sessions and login throttling ---------- */

const sessions = new Map() // token -> expiry time
const attempts = new Map() // ip -> { count, resetAt }
const leadAttempts = new Map()

const safeEqual = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest()
  const y = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(x, y)
}

function sessionOf(req) {
  const m = /(?:^|;\s*)tb_session=([a-f0-9]{64})/.exec(req.headers.cookie || '')
  if (!m) return null
  const expiry = sessions.get(m[1])
  if (!expiry || expiry < Date.now()) {
    sessions.delete(m[1])
    return null
  }
  return m[1]
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

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file, value) {
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2))
  fs.renameSync(tmp, file)
}

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

/* ---------- Exchange rates ---------- */

let rateCache = readJson(RATES, null) // { rates: { USD, AUD }, date, at }

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

async function liveRates() {
  if (rateCache && Date.now() - rateCache.at < RATE_TTL) return rateCache
  const fresh = await fetchRates()
  if (fresh) {
    rateCache = fresh
    writeJson(RATES, fresh)
  }
  return rateCache // may be stale or null when the services are unreachable
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
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(data)
  })
}

/* ---------- API ---------- */

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`

  if (route === 'GET /api/content') {
    const c = readJson(CONTENT, {})
    return send(res, 200, { projects: c.projects || null, pricing: c.pricing || null, settings: cleanSettings(c.settings) })
  }

  if (route === 'GET /api/rates') {
    const settings = cleanSettings(readJson(CONTENT, {}).settings)
    const live = settings.ratesMode === 'auto' ? await liveRates() : null
    if (live) return send(res, 200, { rates: live.rates, date: live.date, source: 'live' })
    return send(res, 200, { rates: settings.manualRates, date: '', source: 'manual' })
  }

  if (route === 'POST /api/lead') {
    if (throttled(req.socket.remoteAddress, leadAttempts, 600_000, 5)) return send(res, 429, { error: 'Too many requests.' })
    let body = {}
    try {
      body = JSON.parse((await readBody(req, 8192)).toString('utf8'))
    } catch {}
    const lead = {
      at: new Date().toISOString(),
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
    writeJson(LEADS, [...readJson(LEADS, []), lead].slice(-MAX_LEADS))
    return send(res, 200, { ok: true })
  }

  if (route === 'GET /api/session') return send(res, 200, { admin: Boolean(sessionOf(req)) })

  if (route === 'POST /api/login') {
    if (throttled(req.socket.remoteAddress)) return send(res, 429, { error: 'Too many attempts. Wait a minute.' })
    let body = {}
    try {
      body = JSON.parse((await readBody(req, 4096)).toString('utf8'))
    } catch {}
    const ok = safeEqual(body.username, ADMIN.username) & safeEqual(body.password, ADMIN.password)
    if (!ok) return send(res, 401, { error: 'Wrong username or password.' })
    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, Date.now() + SESSION_HOURS * 3600_000)
    return send(res, 200, { admin: true }, {
      'Set-Cookie': `tb_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${PROD ? '; Secure' : ''}`,
    })
  }

  if (route === 'POST /api/logout') {
    const token = sessionOf(req)
    if (token) sessions.delete(token)
    return send(res, 200, { admin: false }, { 'Set-Cookie': 'tb_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' })
  }

  // Everything below changes content and needs a login.
  if (!sessionOf(req)) return send(res, 401, { error: 'Please log in again.' })

  if (route === 'PUT /api/content') {
    let body
    try {
      body = JSON.parse((await readBody(req, 400_000)).toString('utf8'))
    } catch {
      return send(res, 400, { error: 'Could not read the content.' })
    }
    // Only the parts that were sent are replaced.
    const next = readJson(CONTENT, {})
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
    writeJson(CONTENT, next)
    return send(res, 200, { projects: next.projects || null, pricing: next.pricing || null, settings: cleanSettings(next.settings) })
  }

  if (route === 'GET /api/leads') return send(res, 200, { leads: readJson(LEADS, []).reverse() })

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
    fs.writeFileSync(path.join(UPLOADS, name), buf)
    return send(res, 200, { url: '/uploads/' + name })
  }

  send(res, 404, { error: 'Not found' })
}

/* ---------- Server ---------- */

const server = http.createServer()
let vite = null
if (!PROD) {
  const { createServer } = await import('vite')
  // Vite may only read the site folder and installed packages, never the
  // server's own files (admin.config.json, data/).
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
  if (/admin\.config|\/data\/|server\.js/i.test(decode(url.pathname))) return send(res, 404, 'Not found')
  if (vite) return vite.middlewares(req, res)
  const page = url.pathname === '/' || ['/admin', '/admin/'].includes(url.pathname)
  const rel = page ? 'index.html' : decode(url.pathname.slice(1))
  serveFile(res, DIST, rel, rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'no-cache')
})

server.listen(PORT, () => console.log(`TechBestie running at http://localhost:${PORT} (${PROD ? 'production' : 'development'})`))
