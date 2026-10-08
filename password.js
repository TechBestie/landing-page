// Admin password hashing with scrypt (built into Node, no extra package).
// Create a hash:  npm run hash-password
// Stored format:  scrypt:N:r:p:salt:key   (salt and key in base64url; no "$", so it is safe in .env files)

import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)
const PARAMS = { N: 2 ** 15, r: 8, p: 1 }
const KEY_LEN = 64
const maxmem = (N, r) => 256 * N * r // scrypt needs ~128*N*r bytes; Node's default limit is 32 MB

export async function hashPassword(password) {
  const { N, r, p } = PARAMS
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, KEY_LEN, { N, r, p, maxmem: maxmem(N, r) })
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join(':')
}

// A hash that cannot be parsed never matches; the work is still done so a
// failed login takes as long as a successful one.
const DUMMY = { N: PARAMS.N, r: PARAMS.r, p: PARAMS.p, salt: Buffer.alloc(16), key: Buffer.alloc(KEY_LEN) }

function parse(stored) {
  const [alg, N, r, p, salt, key] = String(stored).split(':')
  const parsed = { N: Number(N), r: Number(r), p: Number(p), salt: Buffer.from(salt || '', 'base64url'), key: Buffer.from(key || '', 'base64url') }
  const valid = alg === 'scrypt' && parsed.N >= 2 ** 14 && parsed.N <= 2 ** 20 && parsed.r >= 1 && parsed.r <= 32 && parsed.p >= 1 && parsed.p <= 4 && parsed.salt.length >= 16 && parsed.key.length === KEY_LEN
  return valid ? parsed : null
}

export async function verifyPassword(password, stored) {
  const h = parse(stored)
  const { N, r, p, salt, key } = h || DUMMY
  const actual = await scrypt(password, salt, KEY_LEN, { N, r, p, maxmem: maxmem(N, r) })
  return crypto.timingSafeEqual(actual, key) && h !== null
}

// npm run hash-password  (prompts without echoing)
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { createInterface } = await import('node:readline')
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  rl._writeToOutput = (s) => rl.output.write(s.includes('\n') || s.startsWith('Password') ? s : '')
  rl.question('Password (min 12 characters): ', async (pw) => {
    rl.close()
    if (pw.length < 12) {
      console.error('\nToo short.')
      process.exit(1)
    }
    console.log('\n' + (await hashPassword(pw)))
  })
}
