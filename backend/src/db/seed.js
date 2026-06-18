const bcrypt = require('bcryptjs');
const { db, saveDb } = require('./connection');

async function seed() {
  console.log('\n🌱 Seeding EduMatch database...\n');

  // Clear all tables
  const tables = ['student_progress', 'courses', 'words', 'word_sets', 'users', 'organizations'];
  tables.forEach(t => {
    if (db.tables[t]) {
      db.tables[t].data = [];
    } else {
      // Table might not have been created yet in this invocation — create it
      try { db(`CREATE TABLE IF NOT EXISTS ${t} (id STRING)`); } catch(e) {}
      if (db.tables[t]) db.tables[t].data = [];
    }
  });

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('password123', salt);
  const now = () => new Date().toISOString();

  // ── ORGANIZATIONS ──────────────────────────────────────────────────────────
  const orgs = [
    { id: 'org-vivid',  name: 'Vivid Language Academy', slug: 'vivid-academy', logo_data: null, theme_primary: '#2563EB', theme_secondary: '#60A5FA', dark_mode: 0, plan: 'Pro',    stripe_customer_id: 'cus_mock_vivid',  stripe_subscription_id: 'sub_mock_vivid',  ai_generations_count: 5,  created_at: now() },
    { id: 'org-arabic', name: 'Global Arabic School',   slug: 'global-arabic', logo_data: null, theme_primary: '#059669', theme_secondary: '#34D399', dark_mode: 1, plan: 'School', stripe_customer_id: 'cus_mock_arabic', stripe_subscription_id: 'sub_mock_arabic', ai_generations_count: 12, created_at: now() },
    { id: 'org-acme',   name: 'Acme Español',           slug: 'acme-es',       logo_data: null, theme_primary: '#DC2626', theme_secondary: '#F87171', dark_mode: 0, plan: 'Free',   stripe_customer_id: null,              stripe_subscription_id: null,              ai_generations_count: 1,  created_at: now() }
  ];
  orgs.forEach(o => db.tables['organizations'].data.push(o));
  console.log('✅ Organizations seeded');

  // ── USERS ──────────────────────────────────────────────────────────────────
  const users = [
    { id: 'usr-admin',     organization_id: null,         email: 'admin@edumatch.com',    password_hash: hash, role: 'admin',   name: 'Platform Admin',       created_at: now() },
    { id: 'usr-vivid-t1',  organization_id: 'org-vivid',  email: 'teacher@vivid.com',     password_hash: hash, role: 'teacher', name: 'John Doe',             created_at: now() },
    { id: 'usr-vivid-s1',  organization_id: 'org-vivid',  email: 'alice@vivid.com',       password_hash: hash, role: 'student', name: 'Alice Smith',          created_at: now() },
    { id: 'usr-vivid-s2',  organization_id: 'org-vivid',  email: 'bob@vivid.com',         password_hash: hash, role: 'student', name: 'Bob Jones',            created_at: now() },
    { id: 'usr-arabic-t1', organization_id: 'org-arabic', email: 'teacher@arabic.com',    password_hash: hash, role: 'teacher', name: 'Fatima Al-Sudais',     created_at: now() },
    { id: 'usr-arabic-s1', organization_id: 'org-arabic', email: 'khalid@arabic.com',     password_hash: hash, role: 'student', name: 'Khalid Mansoor',       created_at: now() },
    { id: 'usr-acme-t1',   organization_id: 'org-acme',   email: 'teacher@acme.com',      password_hash: hash, role: 'teacher', name: 'Carlos Santana',       created_at: now() },
    { id: 'usr-acme-s1',   organization_id: 'org-acme',   email: 'student@acme.com',      password_hash: hash, role: 'student', name: 'Diego Lopez',          created_at: now() }
  ];
  users.forEach(u => db.tables['users'].data.push(u));
  console.log('✅ Users seeded');

  // ── WORD SETS ──────────────────────────────────────────────────────────────
  const sets = [
    { id: 'set-es-food',   organization_id: 'org-vivid',  creator_id: 'usr-vivid-t1',  title: 'Spanish Culinary Delights', description: 'Essential food vocabulary', source_lang: 'en', target_lang: 'es', created_at: now() },
    { id: 'set-ar-greet',  organization_id: 'org-arabic', creator_id: 'usr-arabic-t1', title: 'Basic Arabic Greetings',    description: 'Introductions in Arabic',   source_lang: 'en', target_lang: 'ar', created_at: now() },
    { id: 'set-es-travel', organization_id: 'org-acme',   creator_id: 'usr-acme-t1',   title: 'Spanish Travel Vocab',      description: 'Airport and hotel words',   source_lang: 'en', target_lang: 'es', created_at: now() }
  ];
  sets.forEach(s => db.tables['word_sets'].data.push(s));
  console.log('✅ Word sets seeded');

  // ── WORDS ──────────────────────────────────────────────────────────────────
  const words = [
    { id: 'w-sp-1', word_set_id: 'set-es-food',   term: 'el pan',       translation: 'bread',        hint: 'Baked flour dough' },
    { id: 'w-sp-2', word_set_id: 'set-es-food',   term: 'la manzana',   translation: 'apple',        hint: 'Crisp red or green fruit' },
    { id: 'w-sp-3', word_set_id: 'set-es-food',   term: 'el queso',     translation: 'cheese',       hint: 'Dairy product from curd' },
    { id: 'w-sp-4', word_set_id: 'set-es-food',   term: 'el agua',      translation: 'water',        hint: 'Essential transparent liquid' },
    { id: 'w-sp-5', word_set_id: 'set-es-food',   term: 'el jamón',     translation: 'ham',          hint: 'Cured pork meat' },
    { id: 'w-sp-6', word_set_id: 'set-es-food',   term: 'la leche',     translation: 'milk',         hint: 'White dairy drink' },
    { id: 'w-ar-1', word_set_id: 'set-ar-greet',  term: 'مرحباً',       translation: 'Hello',        hint: 'General greeting' },
    { id: 'w-ar-2', word_set_id: 'set-ar-greet',  term: 'كيف حالك؟',   translation: 'How are you?', hint: 'Asking about wellbeing' },
    { id: 'w-ar-3', word_set_id: 'set-ar-greet',  term: 'شكراً',        translation: 'Thank you',    hint: 'Expressing gratitude' },
    { id: 'w-ar-4', word_set_id: 'set-ar-greet',  term: 'صباح الخير',  translation: 'Good morning', hint: 'Morning greeting' },
    { id: 'w-ar-5', word_set_id: 'set-ar-greet',  term: 'مع السلامة',  translation: 'Goodbye',      hint: 'Farewell phrase' },
    { id: 'w-tr-1', word_set_id: 'set-es-travel', term: 'el aeropuerto', translation: 'airport',    hint: 'Where planes land' },
    { id: 'w-tr-2', word_set_id: 'set-es-travel', term: 'el hotel',      translation: 'hotel',      hint: 'Where you stay' },
    { id: 'w-tr-3', word_set_id: 'set-es-travel', term: 'el pasaporte',  translation: 'passport',   hint: 'Travel ID document' },
    { id: 'w-tr-4', word_set_id: 'set-es-travel', term: 'el boleto',     translation: 'ticket',     hint: 'Transit payment proof' }
  ];
  words.forEach(w => db.tables['words'].data.push(w));
  console.log('✅ Words seeded');

  // ── COURSES ────────────────────────────────────────────────────────────────
  const courses = [
    {
      id: 'course-vivid-1', organization_id: 'org-vivid', creator_id: 'usr-vivid-t1',
      title: 'Lesson 1: Eating in Madrid',
      content: 'Welcome to your first Spanish lesson!\n\nIn Madrid, breakfast is usually simple: "el pan" (bread) with tomato or butter, accompanied by coffee. For lunch, Spaniards enjoy "el queso" (cheese) and "el jamón" (cured ham) alongside a cold glass of "el agua" (water). A glass of "la leche" (milk) with dessert, such as a sweet "la manzana" (apple), finishes the meal perfectly.',
      word_set_id: 'set-es-food',
      created_at: now()
    },
    {
      id: 'course-arabic-1', organization_id: 'org-arabic', creator_id: 'usr-arabic-t1',
      title: 'Lesson 1: First Meetings',
      content: 'When meeting someone for the first time in the Arab world, begin with a warm "مرحباً" (Hello). Ask "كيف حالك؟" (How are you?) to show genuine interest. Respond with "شكراً" (Thank you) when offered hospitality. Greet early risers with "صباح الخير" (Good morning) and part ways by saying "مع السلامة" (Goodbye).',
      word_set_id: 'set-ar-greet',
      created_at: now()
    }
  ];
  courses.forEach(c => db.tables['courses'].data.push(c));
  console.log('✅ Courses seeded');

  // ── STUDENT PROGRESS ───────────────────────────────────────────────────────
  const progress = [
    { id: 'prog-1', student_id: 'usr-vivid-s1',  word_set_id: 'set-es-food',   game_mode: 'matching',   score: 6, total_words: 6, completed_at: now() },
    { id: 'prog-2', student_id: 'usr-vivid-s1',  word_set_id: 'set-es-food',   game_mode: 'quiz',       score: 5, total_words: 6, completed_at: now() },
    { id: 'prog-3', student_id: 'usr-vivid-s2',  word_set_id: 'set-es-food',   game_mode: 'flashcards', score: 6, total_words: 6, completed_at: now() },
    { id: 'prog-4', student_id: 'usr-arabic-s1', word_set_id: 'set-ar-greet',  game_mode: 'matching',   score: 5, total_words: 5, completed_at: now() },
    { id: 'prog-5', student_id: 'usr-acme-s1',   word_set_id: 'set-es-travel', game_mode: 'scramble',   score: 3, total_words: 4, completed_at: now() }
  ];
  progress.forEach(p => db.tables['student_progress'].data.push(p));
  console.log('✅ Student progress seeded');

  saveDb();
  console.log('\n✨ Database seeded successfully!\n');
  console.log('Demo logins (all use password: password123)');
  console.log('  Platform Admin : admin@edumatch.com');
  console.log('  Teacher (Pro)  : teacher@vivid.com');
  console.log('  Student        : alice@vivid.com');
  console.log('  Teacher (Dark) : teacher@arabic.com');
  console.log('  Teacher (Free) : teacher@acme.com\n');
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}

module.exports = seed;
