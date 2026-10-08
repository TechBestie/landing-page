// Starts the real server against a real PostgreSQL database and exercises the API.
// Needs DATABASE_URL (a throwaway database: tables are emptied) and a built site (npm run build).
//   DATABASE_URL=postgres://... npm test

import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import pg from 'pg'
import { hashPassword, verifyPassword } from '../password.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const PORT = 20000 + Math.floor(Math.random() * 20000)
const BASE = `http://127.0.0.1:${PORT}`
const PASSWORD = 'correct horse battery staple'
let server
let uploads

const call = (url, opts = {}) => fetch(BASE + url, { redirect: 'manual', ...opts })
const json = (method, url, body, headers = {}) =>
  call(url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

async function login() {
  const res = await json('POST', '/api/login', { username: 'admin', password: PASSWORD }, { 'X-Real-IP': `10.0.0.${Math.floor(Math.random() * 250)}` })
  assert.equal(res.status, 200)
  return res.headers.get('set-cookie').split(';')[0]
}

before(async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL must be set')
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'index.html')), 'run npm run build first')
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  await pool.query('DROP TABLE IF EXISTS store, leads, sessions')
  await pool.end()

  uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'tb-uploads-'))
  server = spawn(process.execPath, ['server.js', '--prod'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      UPLOAD_DIR: uploads,
      TRUST_PROXY: '1',
      ADMIN_USERNAME: 'admin',
      ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => d.toString().includes('running at') && resolve())
    server.once('exit', (code) => reject(new Error(`server exited with ${code}`)))
  })
})

after(() => {
  server?.kill('SIGTERM')
  fs.rmSync(uploads, { recursive: true, force: true })
})

test('password hashing', async () => {
  const h = await hashPassword('a long enough password')
  assert.match(h, /^scrypt:\d+:\d+:\d+:[\w-]+:[\w-]+$/)
  assert.equal(await verifyPassword('a long enough password', h), true)
  assert.equal(await verifyPassword('wrong password', h), false)
  assert.equal(await verifyPassword('anything', 'not-a-hash'), false)
})

test('health check reports the database', async () => {
  const res = await call('/api/health')
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
})

test('pages are served with security headers', async () => {
  for (const url of ['/', '/admin']) {
    const res = await call(url)
    assert.equal(res.status, 200)
    assert.match(await res.text(), /<script type="module"/)
    assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/)
    assert.equal(res.headers.get('x-frame-options'), 'DENY')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
  }
})

test('server files are never served', async () => {
  for (const url of ['/.env', '/server.js', '/db.js', '/password.js', '/data/x', '/..%2fserver.js', '/uploads/..%2f..%2fserver.js']) {
    const res = await call(url)
    assert.ok([403, 404].includes(res.status), `${url} returned ${res.status}`)
  }
})

test('content starts empty with default settings', async () => {
  const body = await (await call('/api/content')).json()
  assert.equal(body.projects, null)
  assert.equal(body.pricing, null)
  assert.equal(body.settings.ratesMode, 'auto')
})

test('admin endpoints need a login', async () => {
  assert.equal((await call('/api/leads')).status, 401)
  assert.equal((await json('PUT', '/api/content', { settings: {} })).status, 401)
  assert.equal((await call('/api/upload', { method: 'POST', body: 'x' })).status, 401)
  const forged = await call('/api/leads', { headers: { Cookie: 'tb_session=' + 'a'.repeat(64) } })
  assert.equal(forged.status, 401)
})

test('login rejects wrong credentials and throttles', async () => {
  const ip = { 'X-Real-IP': '192.0.2.1' }
  for (let i = 0; i < 5; i++) assert.equal((await json('POST', '/api/login', { username: 'admin', password: 'nope' }, ip)).status, 401)
  assert.equal((await json('POST', '/api/login', { username: 'admin', password: PASSWORD }, ip)).status, 429)
  // A different client is not affected.
  assert.equal((await json('POST', '/api/login', { username: 'admin', password: PASSWORD }, { 'X-Real-IP': '192.0.2.2' })).status, 200)
})

test('session cookie is Secure only over HTTPS', async () => {
  const plain = await json('POST', '/api/login', { username: 'admin', password: PASSWORD }, { 'X-Real-IP': '192.0.2.3' })
  assert.doesNotMatch(plain.headers.get('set-cookie'), /Secure/)
  const https = await json('POST', '/api/login', { username: 'admin', password: PASSWORD }, { 'X-Real-IP': '192.0.2.4', 'X-Forwarded-Proto': 'https' })
  assert.match(https.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Path=\/; Max-Age=\d+; Secure/)
})

test('admin saves content and settings', async () => {
  const cookie = await login()
  const res = await json('PUT', '/api/content', {
    settings: { wa: '081234567890', range: 0.2, ratesMode: 'manual', manualRates: { USD: 16000, AUD: 10500 } },
    projects: [{ title: 'Project', client: 'Client', category: 'ai', summary: { id: 'Halo', en: 'Hello' }, image: 'javascript:alert(1)' }],
  }, { Cookie: cookie })
  assert.equal(res.status, 200)
  const saved = await (await call('/api/content')).json()
  assert.equal(saved.settings.wa, '6281234567890')
  assert.equal(saved.projects[0].category, 'ai')
  assert.equal(saved.projects[0].image, '')
  const rates = await (await call('/api/rates')).json()
  assert.deepEqual(rates, { rates: { USD: 16000, AUD: 10500 }, date: '', source: 'manual' })

  const bad = await json('PUT', '/api/content', { projects: [{ title: '' }] }, { Cookie: cookie })
  assert.equal(bad.status, 400)
})

test('cross-site writes are refused', async () => {
  const cookie = await login()
  const res = await json('PUT', '/api/content', { settings: {} }, { Cookie: cookie, Origin: 'https://evil.example' })
  assert.equal(res.status, 403)
  const lead = await json('POST', '/api/lead', { name: 'x', contact: 'y' }, { Origin: 'https://evil.example' })
  assert.equal(lead.status, 403)
})

test('leads are stored, bots are dropped, and spam is throttled', async () => {
  const ip = { 'X-Real-IP': '198.51.100.7', Origin: BASE }
  assert.equal((await json('POST', '/api/lead', { name: 'Budi', contact: '0812', note: 'Halo', currency: 'XXX' }, ip)).status, 200)
  assert.equal((await json('POST', '/api/lead', { name: 'Bot', contact: 'bot', website: 'http://spam' }, ip)).status, 200)
  assert.equal((await json('POST', '/api/lead', { name: '', contact: '' }, ip)).status, 400)
  await json('POST', '/api/lead', { name: 'a', contact: 'b' }, ip)
  await json('POST', '/api/lead', { name: 'a', contact: 'b' }, ip)
  assert.equal((await json('POST', '/api/lead', { name: 'a', contact: 'b' }, ip)).status, 429)

  const { leads } = await (await call('/api/leads', { headers: { Cookie: await login() } })).json()
  assert.ok(!leads.some((l) => l.name === 'Bot'))
  const budi = leads.find((l) => l.name === 'Budi')
  assert.equal(budi.currency, 'IDR')
  assert.match(budi.at, /^\d{4}-\d\d-\d\dT/)
})

test('uploads accept real images only', async () => {
  const cookie = await login()
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
  const ok = await call('/api/upload', { method: 'POST', headers: { Cookie: cookie }, body: png })
  assert.equal(ok.status, 200)
  const { url } = await ok.json()
  assert.match(url, /^\/uploads\/[a-f0-9]{24}\.png$/)
  const file = await call(url)
  assert.equal(file.status, 200)
  assert.equal(file.headers.get('content-type'), 'image/png')

  const html = await call('/api/upload', { method: 'POST', headers: { Cookie: cookie }, body: '<script>alert(1)</script>' })
  assert.equal(html.status, 415)
})

test('logout ends the session', async () => {
  const cookie = await login()
  assert.equal((await call('/api/leads', { headers: { Cookie: cookie } })).status, 200)
  await call('/api/logout', { method: 'POST', headers: { Cookie: cookie } })
  assert.equal((await call('/api/leads', { headers: { Cookie: cookie } })).status, 401)
})
