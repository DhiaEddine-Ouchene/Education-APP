// Database layer using Node's built-in SQLite (Node 22+).
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'
import { uid, now } from './util.js'
import { hashPassword } from './auth.js'

const DB_PATH = process.env.DB_PATH || './edumatch.db'
export const db = new DatabaseSync(DB_PATH)

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  theme_primary TEXT DEFAULT '#6c8cff',
  theme_accent  TEXT DEFAULT '#9b6cff',
  theme_mode    TEXT DEFAULT 'dark',
  plan TEXT DEFAULT 'free',
  plan_status TEXT DEFAULT 'trialing',
  trial_ends TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  role TEXT NOT NULL,                 -- superadmin | owner | teacher | student
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📘',
  from_lang TEXT DEFAULT 'en',
  to_lang TEXT DEFAULT 'fr',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL,
  term TEXT NOT NULL,
  answer TEXT NOT NULL,
  hint TEXT,
  position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  set_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  mode TEXT DEFAULT 'any',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS results (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  set_id TEXT,
  mode TEXT,
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  duration_s INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  user_id TEXT,
  type TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '📖',
  content TEXT,
  from_lang TEXT DEFAULT 'en',
  to_lang TEXT DEFAULT 'fr',
  created_at TEXT NOT NULL
);
`)

export function logEvent(type, { orgId = null, userId = null, meta = null } = {}) {
  db.prepare('INSERT INTO events (id,org_id,user_id,type,meta,created_at) VALUES (?,?,?,?,?,?)')
    .run(uid('ev_'), orgId, userId, type, meta ? JSON.stringify(meta) : null, now())
}

// ---- Seed: platform superadmin + a demo org so the app is usable instantly ----
export function seed() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@edumatch.app').toLowerCase()
  const adminPass = process.env.ADMIN_PASSWORD || 'admin1234'
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(adminEmail)
  if (!existing) {
    const { hash, salt } = hashPassword(adminPass)
    db.prepare('INSERT INTO users (id,org_id,role,name,email,pass_hash,salt,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(uid('u_'), null, 'superadmin', 'Platform Admin', adminEmail, hash, salt, now())
    console.log(`Seeded superadmin: ${adminEmail} / ${adminPass}`)
  }

  const demo = db.prepare("SELECT id FROM orgs WHERE name=?").get('Demo Language School')
  if (!demo) {
    const orgId = uid('org_')
    db.prepare('INSERT INTO orgs (id,name,theme_primary,theme_accent,theme_mode,plan,plan_status,trial_ends,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(orgId, 'Demo Language School', '#6c8cff', '#9b6cff', 'dark', 'pro', 'active', null, now())

    const tPass = hashPassword('teacher1234')
    const teacherId = uid('u_')
    db.prepare('INSERT INTO users (id,org_id,role,name,email,pass_hash,salt,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(teacherId, orgId, 'owner', 'Demo Teacher', 'teacher@edumatch.app', tPass.hash, tPass.salt, now())

    const sPass = hashPassword('student1234')
    const studentId = uid('u_')
    db.prepare('INSERT INTO users (id,org_id,role,name,email,pass_hash,salt,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(studentId, orgId, 'student', 'Demo Student', 'student@edumatch.app', sPass.hash, sPass.salt, now())

    // sample set
    const setId = uid('set_')
    db.prepare('INSERT INTO sets (id,org_id,owner_user_id,name,icon,from_lang,to_lang,created_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(setId, orgId, teacherId, 'Food & Drink (A1)', '🍎', 'en', 'fr', now())
    const sample = [['apple','pomme'],['bread','pain'],['water','eau'],['cheese','fromage'],['coffee','café'],['milk','lait']]
    sample.forEach(([t,a],i)=>db.prepare('INSERT INTO words (id,set_id,term,answer,hint,position) VALUES (?,?,?,?,?,?)').run(uid('w_'),setId,t,a,'',i))

    const classId = uid('cls_')
    db.prepare('INSERT INTO classes (id,org_id,teacher_id,name,created_at) VALUES (?,?,?,?,?)').run(classId, orgId, teacherId, 'Beginners A1', now())
    db.prepare('INSERT INTO enrollments (id,class_id,student_id) VALUES (?,?,?)').run(uid('en_'), classId, studentId)
    db.prepare('INSERT INTO assignments (id,org_id,set_id,class_id,mode,created_at) VALUES (?,?,?,?,?,?)').run(uid('as_'), orgId, setId, classId, 'any', now())
    db.prepare('INSERT INTO courses (id,org_id,owner_user_id,title,icon,content,from_lang,to_lang,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(uid('crs_'), orgId, teacherId, 'Lesson 1 — At the Café', '☕', 'At the café you can order a coffee or a tea. There is fresh bread with butter and jam. The waiter brings water and the menu. When you finish your breakfast you ask for the bill and leave a small tip. The café is busy in the morning and quiet in the afternoon.', 'en', 'fr', now())
    console.log('Seeded demo org (teacher@edumatch.app / teacher1234, student@edumatch.app / student1234)')
  }
}
