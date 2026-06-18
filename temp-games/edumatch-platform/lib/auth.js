// Auth: password hashing (scrypt) + stateless HMAC tokens. Zero dependencies.
import crypto from 'node:crypto'
import { HttpError } from './util.js'

const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me'
const TOKEN_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}
function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function signToken(payload) {
  const body = b64url({ ...payload, exp: Date.now() + TOKEN_TTL })
  return body + '.' + sign(body)
}

export function verifyToken(token) {
  if (!token || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  if (sign(body) !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function getAuth(req) {
  const header = req.headers['authorization'] || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  return verifyToken(token)
}

export function requireAuth(req) {
  const auth = getAuth(req)
  if (!auth) throw new HttpError(401, 'Not authenticated')
  return auth
}

export function requireRole(req, ...roles) {
  const auth = requireAuth(req)
  if (!roles.includes(auth.role)) throw new HttpError(403, 'Forbidden: insufficient role')
  return auth
}
