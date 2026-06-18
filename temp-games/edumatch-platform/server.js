// EduMatch platform server — zero external dependencies (Node 22+ built-ins only).
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, seed, logEvent } from './lib/db.js'
import { uid, now, sendJSON, readBody, HttpError } from './lib/util.js'
import { hashPassword, verifyPassword, signToken, requireAuth, requireRole, getAuth } from './lib/auth.js'
import { generateWords, extractWords } from './lib/ai.js'
import { PLANS, planFor, setPlan, startCheckout, aiUsage } from './lib/billing.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(__dirname, 'public')
const PORT = process.env.PORT || 3000
seed()

/* ----------------------------- helpers ----------------------------- */
const orgById = (id) => db.prepare('SELECT * FROM orgs WHERE id=?').get(id)
const userPublic = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, orgId: u.org_id })
function orgPublic(o) {
  if (!o) return null
  const plan = planFor(o)
  const aiTrials = plan.aiTrials || 0
  const aiUsed = aiUsage(o.id)
  return { id: o.id, name: o.name, logo: o.logo, theme: { primary: o.theme_primary, accent: o.theme_accent, mode: o.theme_mode },
    plan: o.plan, planStatus: o.plan_status, limits: { maxSets: plan.maxSets, maxStudents: plan.maxStudents, ai: plan.ai, aiTrials, aiUsed, aiRemaining: plan.ai ? null : Math.max(0, aiTrials - aiUsed) } }
}
function setWithWords(s) {
  const words = db.prepare('SELECT id,term,answer,hint,position FROM words WHERE set_id=? ORDER BY position').all(s.id)
  return { id: s.id, name: s.name, icon: s.icon, fromLang: s.from_lang, toLang: s.to_lang, ownerId: s.owner_user_id, words }
}

/* ----------------------------- API routes ----------------------------- */
const routes = []
const add = (method, pattern, handler) => routes.push({ method, parts: pattern.split('/').filter(Boolean), handler })
function match(method, urlPath) {
  const segs = urlPath.split('/').filter(Boolean)
  for (const r of routes) {
    if (r.method !== method || r.parts.length !== segs.length) continue
    const params = {}
    let ok = true
    for (let i = 0; i < r.parts.length; i++) {
      if (r.parts[i].startsWith(':')) params[r.parts[i].slice(1)] = decodeURIComponent(segs[i])
      else if (r.parts[i] !== segs[i]) { ok = false; break }
    }
    if (ok) return { handler: r.handler, params }
  }
  return null
}

/* ---- Auth ---- */
add('POST', '/api/auth/register', async (req) => {
  // Registers a new ORG + its owner (a teacher or business account)
  const { orgName, name, email, password } = await readBody(req)
  if (!orgName || !name || !email || !password) throw new HttpError(400, 'Missing fields')
  const mail = String(email).toLowerCase()
  if (db.prepare('SELECT id FROM users WHERE email=?').get(mail)) throw new HttpError(409, 'Email already in use')
  const orgId = uid('org_')
  const trialEnds = new Date(Date.now() + 14 * 864e5).toISOString()
  db.prepare('INSERT INTO orgs (id,name,plan,plan_status,trial_ends,created_at) VALUES (?,?,?,?,?,?)')
    .run(orgId, orgName, 'free', 'trialing', trialEnds, now())
  const { hash, salt } = hashPassword(password)
  const userId = uid('u_')
  db.prepare('INSERT INTO users (id,org_id,role,name,email,pass_hash,salt,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(userId, orgId, 'owner', name, mail, hash, salt, now())
  logEvent('org_registered', { orgId, userId })
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId)
  return { token: signToken({ uid: userId, role: 'owner', orgId }), user: userPublic(user), org: orgPublic(orgById(orgId)) }
})

add('POST', '/api/auth/login', async (req) => {
  const { email, password } = await readBody(req)
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(String(email || '').toLowerCase())
  if (!user || !verifyPassword(password, user.salt, user.pass_hash)) throw new HttpError(401, 'Invalid email or password')
  logEvent('login', { orgId: user.org_id, userId: user.id })
  return { token: signToken({ uid: user.id, role: user.role, orgId: user.org_id }), user: userPublic(user), org: orgPublic(orgById(user.org_id)) }
})

add('GET', '/api/me', async (req) => {
  const auth = requireAuth(req)
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(auth.uid)
  if (!user) throw new HttpError(401, 'Unknown user')
  return { user: userPublic(user), org: orgPublic(orgById(user.org_id)) }
})

/* ---- Org branding (logo + theme) ---- */
add('PUT', '/api/org', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const { name, logo, theme } = await readBody(req)
  const o = orgById(auth.orgId)
  if (!o) throw new HttpError(404, 'Org not found')
  db.prepare('UPDATE orgs SET name=COALESCE(?,name), logo=COALESCE(?,logo), theme_primary=COALESCE(?,theme_primary), theme_accent=COALESCE(?,theme_accent), theme_mode=COALESCE(?,theme_mode) WHERE id=?')
    .run(name ?? null, logo ?? null, theme?.primary ?? null, theme?.accent ?? null, theme?.mode ?? null, o.id)
  logEvent('branding_updated', { orgId: o.id, userId: auth.uid })
  return { org: orgPublic(orgById(o.id)) }
})

/* ---- Sets ---- */
add('GET', '/api/sets', async (req) => {
  const auth = requireAuth(req)
  const sets = db.prepare('SELECT * FROM sets WHERE org_id=? ORDER BY created_at DESC').all(auth.orgId)
  return { sets: sets.map(setWithWords) }
})
add('GET', '/api/sets/:id', async (req, params) => {
  requireAuth(req)
  const s = db.prepare('SELECT * FROM sets WHERE id=?').get(params.id)
  if (!s) throw new HttpError(404, 'Set not found')
  return { set: setWithWords(s) }
})
add('POST', '/api/sets', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const org = orgById(auth.orgId)
  const count = db.prepare('SELECT COUNT(*) c FROM sets WHERE org_id=?').get(org.id).c
  if (count >= planFor(org).maxSets) throw new HttpError(402, 'Set limit reached for your plan. Upgrade to add more.')
  const { name, icon, fromLang, toLang, words } = await readBody(req)
  if (!name) throw new HttpError(400, 'Set name required')
  const setId = uid('set_')
  db.prepare('INSERT INTO sets (id,org_id,owner_user_id,name,icon,from_lang,to_lang,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(setId, org.id, auth.uid, name, icon || '📘', fromLang || 'en', toLang || 'fr', now())
  ;(words || []).forEach((w, i) => {
    if (w.term && w.answer) db.prepare('INSERT INTO words (id,set_id,term,answer,hint,position) VALUES (?,?,?,?,?,?)').run(uid('w_'), setId, w.term, w.answer, w.hint || '', i)
  })
  logEvent('set_created', { orgId: org.id, userId: auth.uid, meta: { setId } })
  return { set: setWithWords(db.prepare('SELECT * FROM sets WHERE id=?').get(setId)) }
})
add('PUT', '/api/sets/:id', async (req, params) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const s = db.prepare('SELECT * FROM sets WHERE id=? AND org_id=?').get(params.id, auth.orgId)
  if (!s) throw new HttpError(404, 'Set not found')
  const { name, icon, fromLang, toLang, words } = await readBody(req)
  db.prepare('UPDATE sets SET name=COALESCE(?,name), icon=COALESCE(?,icon), from_lang=COALESCE(?,from_lang), to_lang=COALESCE(?,to_lang) WHERE id=?')
    .run(name ?? null, icon ?? null, fromLang ?? null, toLang ?? null, s.id)
  if (Array.isArray(words)) {
    db.prepare('DELETE FROM words WHERE set_id=?').run(s.id)
    words.forEach((w, i) => { if (w.term && w.answer) db.prepare('INSERT INTO words (id,set_id,term,answer,hint,position) VALUES (?,?,?,?,?,?)').run(uid('w_'), s.id, w.term, w.answer, w.hint || '', i) })
  }
  return { set: setWithWords(db.prepare('SELECT * FROM sets WHERE id=?').get(s.id)) }
})
add('DELETE', '/api/sets/:id', async (req, params) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const s = db.prepare('SELECT * FROM sets WHERE id=? AND org_id=?').get(params.id, auth.orgId)
  if (!s) throw new HttpError(404, 'Set not found')
  db.prepare('DELETE FROM words WHERE set_id=?').run(s.id)
  db.prepare('DELETE FROM sets WHERE id=?').run(s.id)
  return { ok: true }
})

/* ---- AI auto-fill + lesson extraction ---- */
function checkAiQuota(org) {
  const plan = planFor(org)
  if (plan.ai) return { unlimited: true, remaining: null }
  const used = aiUsage(org.id)
  const trials = plan.aiTrials || 0
  if (used >= trials) throw new HttpError(402, `You've used all ${trials} free AI generations. Upgrade to Pro for unlimited AI auto-fill.`)
  return { unlimited: false, remaining: trials - used - 1 }
}
add('POST', '/api/ai/generate', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const org = orgById(auth.orgId)
  const quota = checkAiQuota(org)
  const { topic, count, fromLang, toLang } = await readBody(req)
  if (!topic) throw new HttpError(400, 'Topic required')
  const result = await generateWords({ topic, count, fromLang, toLang })
  logEvent('ai_generate', { orgId: org.id, userId: auth.uid, meta: { topic, source: result.source } })
  return { ...result, aiRemaining: quota.remaining }
})
add('POST', '/api/ai/extract', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const org = orgById(auth.orgId)
  const quota = checkAiQuota(org)
  const { text, count, fromLang, toLang } = await readBody(req)
  if (!text || String(text).trim().length < 10) throw new HttpError(400, 'Provide some lesson text to extract from')
  const result = await extractWords({ text, count, fromLang, toLang })
  logEvent('ai_extract', { orgId: org.id, userId: auth.uid, meta: { source: result.source } })
  return { ...result, aiRemaining: quota.remaining }
})

/* ---- Students & classes (teacher/business interface) ---- */
add('GET', '/api/students', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const students = db.prepare("SELECT id,name,email,created_at FROM users WHERE org_id=? AND role='student' ORDER BY created_at DESC").all(auth.orgId)
  return { students }
})
add('POST', '/api/students', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const org = orgById(auth.orgId)
  const count = db.prepare("SELECT COUNT(*) c FROM users WHERE org_id=? AND role='student'").get(org.id).c
  if (count >= planFor(org).maxStudents) throw new HttpError(402, 'Student limit reached for your plan. Upgrade to add more.')
  const { name, email, password } = await readBody(req)
  if (!name || !email || !password) throw new HttpError(400, 'Missing fields')
  const mail = String(email).toLowerCase()
  if (db.prepare('SELECT id FROM users WHERE email=?').get(mail)) throw new HttpError(409, 'Email already in use')
  const { hash, salt } = hashPassword(password)
  const id = uid('u_')
  db.prepare('INSERT INTO users (id,org_id,role,name,email,pass_hash,salt,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, org.id, 'student', name, mail, hash, salt, now())
  logEvent('student_added', { orgId: org.id, userId: auth.uid, meta: { studentId: id } })
  return { student: { id, name, email: mail } }
})
add('DELETE', '/api/students/:id', async (req, params) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const s = db.prepare("SELECT * FROM users WHERE id=? AND org_id=? AND role='student'").get(params.id, auth.orgId)
  if (!s) throw new HttpError(404, 'Student not found')
  db.prepare('DELETE FROM users WHERE id=?').run(s.id)
  return { ok: true }
})

/* ---- Results / progress ---- */
add('POST', '/api/results', async (req) => {
  const auth = requireAuth(req)
  const { setId, mode, score, total, correct, durationS } = await readBody(req)
  db.prepare('INSERT INTO results (id,org_id,user_id,set_id,mode,score,total,correct,duration_s,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(uid('res_'), auth.orgId, auth.uid, setId || null, mode || null, score | 0, total | 0, correct | 0, durationS | 0, now())
  logEvent('game_played', { orgId: auth.orgId, userId: auth.uid, meta: { mode, score } })
  return { ok: true }
})
add('GET', '/api/results', async (req) => {
  const auth = requireAuth(req)
  // teachers/owners see whole org; students see only themselves
  const rows = (auth.role === 'student')
    ? db.prepare('SELECT * FROM results WHERE user_id=? ORDER BY created_at DESC LIMIT 200').all(auth.uid)
    : db.prepare('SELECT r.*, u.name as user_name FROM results r JOIN users u ON u.id=r.user_id WHERE r.org_id=? ORDER BY r.created_at DESC LIMIT 500').all(auth.orgId)
  return { results: rows }
})

/* ---- Student view: assigned sets ---- */
add('GET', '/api/my/assignments', async (req) => {
  const auth = requireAuth(req)
  const rows = db.prepare(`
    SELECT DISTINCT s.* FROM assignments a
    JOIN enrollments e ON e.class_id=a.class_id
    JOIN sets s ON s.id=a.set_id
    WHERE e.student_id=?`).all(auth.uid)
  // fall back: if no assignments, show all org sets
  const sets = rows.length ? rows : db.prepare('SELECT * FROM sets WHERE org_id=?').all(auth.orgId)
  return { sets: sets.map(setWithWords) }
})

/* ---- Courses / lessons ---- */
const coursePublic = (c) => ({ id: c.id, title: c.title, icon: c.icon, content: c.content, fromLang: c.from_lang, toLang: c.to_lang, ownerId: c.owner_user_id, createdAt: c.created_at })
add('GET', '/api/courses', async (req) => {
  const auth = requireAuth(req)
  const rows = db.prepare('SELECT * FROM courses WHERE org_id=? ORDER BY created_at DESC').all(auth.orgId)
  return { courses: rows.map(coursePublic) }
})
add('GET', '/api/courses/:id', async (req, params) => {
  requireAuth(req)
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(params.id)
  if (!c) throw new HttpError(404, 'Course not found')
  return { course: coursePublic(c) }
})
add('POST', '/api/courses', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const { title, icon, content, fromLang, toLang } = await readBody(req)
  if (!title) throw new HttpError(400, 'Course title required')
  const id = uid('crs_')
  db.prepare('INSERT INTO courses (id,org_id,owner_user_id,title,icon,content,from_lang,to_lang,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, auth.orgId, auth.uid, title, icon || '📖', content || '', fromLang || 'en', toLang || 'fr', now())
  logEvent('course_created', { orgId: auth.orgId, userId: auth.uid, meta: { courseId: id } })
  return { course: coursePublic(db.prepare('SELECT * FROM courses WHERE id=?').get(id)) }
})
add('PUT', '/api/courses/:id', async (req, params) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const c = db.prepare('SELECT * FROM courses WHERE id=? AND org_id=?').get(params.id, auth.orgId)
  if (!c) throw new HttpError(404, 'Course not found')
  const { title, icon, content, fromLang, toLang } = await readBody(req)
  db.prepare('UPDATE courses SET title=COALESCE(?,title), icon=COALESCE(?,icon), content=COALESCE(?,content), from_lang=COALESCE(?,from_lang), to_lang=COALESCE(?,to_lang) WHERE id=?')
    .run(title ?? null, icon ?? null, content ?? null, fromLang ?? null, toLang ?? null, c.id)
  return { course: coursePublic(db.prepare('SELECT * FROM courses WHERE id=?').get(c.id)) }
})
add('DELETE', '/api/courses/:id', async (req, params) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const c = db.prepare('SELECT * FROM courses WHERE id=? AND org_id=?').get(params.id, auth.orgId)
  if (!c) throw new HttpError(404, 'Course not found')
  db.prepare('DELETE FROM courses WHERE id=?').run(c.id)
  return { ok: true }
})
add('POST', '/api/courses/:id/extract', async (req, params) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const org = orgById(auth.orgId)
  const c = db.prepare('SELECT * FROM courses WHERE id=? AND org_id=?').get(params.id, org.id)
  if (!c) throw new HttpError(404, 'Course not found')
  const quota = checkAiQuota(org)
  let body = {}; try { body = await readBody(req) } catch { body = {} }
  const result = await extractWords({ text: c.content, count: body.count || 10, fromLang: c.from_lang, toLang: c.to_lang })
  logEvent('ai_extract', { orgId: org.id, userId: auth.uid, meta: { courseId: c.id, source: result.source } })
  return { ...result, course: coursePublic(c), aiRemaining: quota.remaining }
})

/* ---- Billing / subscription ---- */
add('GET', '/api/billing/plans', async () => ({ plans: PLANS }))
add('POST', '/api/billing/subscribe', async (req) => {
  const auth = requireRole(req, 'owner', 'teacher')
  const { plan } = await readBody(req)
  const org = orgById(auth.orgId)
  const result = await startCheckout(org, plan)
  return { result, org: orgPublic(orgById(org.id)) }
})

/* ---- Platform admin (the owner: YOU) ---- */
add('GET', '/api/admin/overview', async (req) => {
  requireRole(req, 'superadmin')
  const orgs = db.prepare('SELECT * FROM orgs ORDER BY created_at DESC').all().map((o) => {
    const users = db.prepare('SELECT COUNT(*) c FROM users WHERE org_id=?').get(o.id).c
    const students = db.prepare("SELECT COUNT(*) c FROM users WHERE org_id=? AND role='student'").get(o.id).c
    const sets = db.prepare('SELECT COUNT(*) c FROM sets WHERE org_id=?').get(o.id).c
    const games = db.prepare('SELECT COUNT(*) c FROM results WHERE org_id=?').get(o.id).c
    const lastActive = db.prepare('SELECT MAX(created_at) m FROM events WHERE org_id=?').get(o.id).m
    return { ...orgPublic(o), counts: { users, students, sets, games }, lastActive }
  })
  const totals = {
    orgs: orgs.length,
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    sets: db.prepare('SELECT COUNT(*) c FROM sets').get().c,
    gamesPlayed: db.prepare('SELECT COUNT(*) c FROM results').get().c,
    paying: orgs.filter((o) => o.plan !== 'free').length,
    mrr: orgs.reduce((sum, o) => sum + (PLANS[o.plan]?.price || 0), 0),
  }
  const recent = db.prepare('SELECT * FROM events ORDER BY created_at DESC LIMIT 50').all()
  return { totals, orgs, recent }
})
add('POST', '/api/admin/org/:id/plan', async (req, params) => {
  requireRole(req, 'superadmin')
  const { plan, status } = await readBody(req)
  setPlan(params.id, plan, status || 'active')
  return { org: orgPublic(orgById(params.id)) }
})

/* ----------------------------- static + dispatch ----------------------------- */
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }
function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath
  const filePath = path.join(PUBLIC, path.normalize(rel).replace(/^\/+/, ''))
  if (!filePath.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden') }
  fs.readFile(filePath, (err, data) => {
    if (err) { // SPA fallback
      fs.readFile(path.join(PUBLIC, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); return res.end('Not found') }
        res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html)
      })
      return
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' })
    res.end(data)
  })
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0]
  if (urlPath.startsWith('/api/')) {
    const m = match(req.method, urlPath)
    if (!m) return sendJSON(res, 404, { error: 'Not found' })
    try {
      const out = await m.handler(req, m.params)
      return sendJSON(res, 200, out)
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500
      if (status === 500) console.error(e)
      return sendJSON(res, status, { error: e.message || 'Server error' })
    }
  }
  serveStatic(req, res, urlPath)
})

server.listen(PORT, () => console.log(`\n✨ EduMatch platform running:  http://localhost:${PORT}\n`))
