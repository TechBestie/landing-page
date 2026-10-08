// PostgreSQL storage: site content, leads, the exchange-rate cache and admin sessions.
// Tables are created on startup, so a fresh database only needs a user that owns it.

import crypto from 'node:crypto'
import pg from 'pg'

// Return timestamps as ISO strings, the same shape the JSON files used.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (v) => new Date(v).toISOString())

const SCHEMA = `
CREATE TABLE IF NOT EXISTS store (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leads (
  id         bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name       text NOT NULL,
  contact    text NOT NULL,
  note       text NOT NULL DEFAULT '',
  service    text NOT NULL DEFAULT '',
  summary    text NOT NULL DEFAULT '',
  estimate   text NOT NULL DEFAULT '',
  lang       text NOT NULL DEFAULT 'id',
  currency   text NOT NULL DEFAULT 'IDR'
);
CREATE INDEX IF NOT EXISTS leads_created_at ON leads (created_at DESC);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
`

// Sessions are stored as a hash, so a database dump cannot be used to log in.
const hash = (token) => crypto.createHash('sha256').update(token).digest('hex')

export async function connect(url) {
  const pool = new pg.Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30_000 })
  pool.on('error', (err) => console.error('Database connection error:', err.message))
  await pool.query(SCHEMA)

  return {
    pool,

    async ping() {
      await pool.query('SELECT 1')
    },

    // Returns { key: value } for the given keys that exist.
    async get(keys) {
      const { rows } = await pool.query('SELECT key, value FROM store WHERE key = ANY($1)', [keys])
      return Object.fromEntries(rows.map((r) => [r.key, r.value]))
    },

    // Saves several keys at once; all of them are written or none.
    async set(entries) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        for (const [key, value] of Object.entries(entries)) {
          await client.query(
            `INSERT INTO store (key, value, updated_at) VALUES ($1, $2, now())
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
            [key, JSON.stringify(value)]
          )
        }
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },

    async addLead(l) {
      await pool.query(
        `INSERT INTO leads (name, contact, note, service, summary, estimate, lang, currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [l.name, l.contact, l.note, l.service, l.summary, l.estimate, l.lang, l.currency]
      )
    },

    async leads(limit) {
      const { rows } = await pool.query(
        `SELECT created_at AS at, name, contact, note, service, summary, estimate, lang, currency
         FROM leads ORDER BY created_at DESC, id DESC LIMIT $1`,
        [limit]
      )
      return rows
    },

    async createSession(token, hours) {
      await pool.query(`INSERT INTO sessions (token_hash, expires_at) VALUES ($1, now() + make_interval(hours => $2))`, [
        hash(token),
        hours,
      ])
    },

    async hasSession(token) {
      const { rowCount } = await pool.query('SELECT 1 FROM sessions WHERE token_hash = $1 AND expires_at > now()', [hash(token)])
      return rowCount > 0
    },

    async deleteSession(token) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hash(token)])
    },

    async pruneSessions() {
      await pool.query('DELETE FROM sessions WHERE expires_at <= now()')
    },
  }
}
