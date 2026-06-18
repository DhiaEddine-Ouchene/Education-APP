PRAGMA foreign_keys = ON;

-- Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_data TEXT, -- Base64 logo
    theme_primary TEXT DEFAULT '#4F46E5',
    theme_secondary TEXT DEFAULT '#818CF8',
    dark_mode INTEGER DEFAULT 0, -- 0 = light, 1 = dark
    plan TEXT DEFAULT 'Free', -- 'Free', 'Pro', 'School'
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    ai_generations_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    organization_id TEXT, -- NULL for platform superadmins
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin', 'teacher', 'student'
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Word Sets
CREATE TABLE IF NOT EXISTS word_sets (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source_lang TEXT DEFAULT 'en',
    target_lang TEXT DEFAULT 'es',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Words
CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY,
    word_set_id TEXT NOT NULL,
    term TEXT NOT NULL,
    translation TEXT NOT NULL,
    hint TEXT,
    FOREIGN KEY (word_set_id) REFERENCES word_sets(id) ON DELETE CASCADE
);

-- Courses / Lessons
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    word_set_id TEXT, -- Link to vocabulary set
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (word_set_id) REFERENCES word_sets(id) ON DELETE SET NULL
);

-- Student Progress Tracker
CREATE TABLE IF NOT EXISTS student_progress (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    word_set_id TEXT NOT NULL,
    game_mode TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_words INTEGER NOT NULL,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (word_set_id) REFERENCES word_sets(id) ON DELETE CASCADE
);
