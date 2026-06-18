const express = require('express');
const router = express.Router();
const { db, query, get, run } = require('../db/connection');
const { authenticate, requireAuth, requireTenant, requireRole } = require('../middleware/auth');
const { getPlanConfig } = require('../services/billingService');

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
const now = () => new Date().toISOString();

// GET All word sets for the tenant
router.get('/', authenticate, requireAuth, requireTenant, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
    const allWords = db.tables['words'] ? db.tables['words'].data : [];

    const sets = allSets
      .filter(s => s.organization_id === orgId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(s => ({
        ...s,
        word_count: allWords.filter(w => w.word_set_id === s.id).length
      }));

    res.json(sets);
  } catch (err) { next(err); }
});

// GET Single word set with words
router.get('/reports/engagement', authenticate, requireAuth, requireTenant, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const { role, id: userId } = req.user;

    const allProgress = db.tables['student_progress'] ? db.tables['student_progress'].data : [];
    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];

    if (role === 'teacher') {
      const orgUserIds = allUsers.filter(u => u.organization_id === orgId).map(u => u.id);
      const reports = allProgress
        .filter(p => orgUserIds.includes(p.student_id))
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .map(p => {
          const student = allUsers.find(u => u.id === p.student_id);
          const set = allSets.find(s => s.id === p.word_set_id);
          return {
            ...p,
            student_name: student ? student.name : 'Unknown',
            student_email: student ? student.email : '',
            set_title: set ? set.title : 'Unknown Set'
          };
        });
      res.json(reports);
    } else {
      const history = allProgress
        .filter(p => p.student_id === userId)
        .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
        .map(p => {
          const set = allSets.find(s => s.id === p.word_set_id);
          return { ...p, set_title: set ? set.title : 'Unknown Set' };
        });
      res.json(history);
    }
  } catch (err) { next(err); }
});

// GET Single word set
router.get('/:id', authenticate, requireAuth, requireTenant, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
    const allWords = db.tables['words'] ? db.tables['words'].data : [];

    const set = allSets.find(s => s.id === req.params.id && s.organization_id === orgId);
    if (!set) return res.status(404).json({ error: 'Word set not found' });

    const words = allWords.filter(w => w.word_set_id === set.id);
    res.json({ ...set, words });
  } catch (err) { next(err); }
});

// POST Create word set
router.post('/', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const { title, description, source_lang, target_lang, words } = req.body;
  const orgId = req.user.organization_id;
  const userId = req.user.id;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = allOrgs.find(o => o.id === orgId);
    const planConfig = getPlanConfig(org ? org.plan : 'Free');

    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
    const orgSetCount = allSets.filter(s => s.organization_id === orgId).length;

    if (orgSetCount >= planConfig.maxSets) {
      return res.status(403).json({
        error: `Plan limit reached. Your ${org.plan} plan allows ${planConfig.maxSets} word sets. Please upgrade.`
      });
    }

    const setId = generateId();
    const newSet = {
      id: setId,
      organization_id: orgId,
      creator_id: userId,
      title,
      description: description || '',
      source_lang: source_lang || 'en',
      target_lang: target_lang || 'es',
      created_at: now()
    };
    await run(`INSERT INTO word_sets VALUES ?`, [newSet]);

    const createdWords = [];
    if (words && Array.isArray(words)) {
      for (const w of words) {
        if (!w.term || !w.translation) continue;
        const wordObj = { id: generateId(), word_set_id: setId, term: w.term, translation: w.translation, hint: w.hint || '' };
        await run(`INSERT INTO words VALUES ?`, [wordObj]);
        createdWords.push(wordObj);
      }
    }

    res.status(201).json({ ...newSet, words: createdWords });
  } catch (err) { next(err); }
});

// PUT Update word set
router.put('/:id', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const { title, description, source_lang, target_lang, words } = req.body;
  const orgId = req.user.organization_id;

  try {
    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
    const existing = allSets.find(s => s.id === req.params.id && s.organization_id === orgId);
    if (!existing) return res.status(404).json({ error: 'Word set not found' });

    // Update set fields
    if (title) existing.title = title;
    if (description !== undefined) existing.description = description;
    if (source_lang) existing.source_lang = source_lang;
    if (target_lang) existing.target_lang = target_lang;

    // Sync words
    if (words && Array.isArray(words)) {
      const allWords = db.tables['words'] ? db.tables['words'].data : [];
      db.tables['words'].data = allWords.filter(w => w.word_set_id !== req.params.id);
      for (const w of words) {
        if (!w.term || !w.translation) continue;
        const wordObj = { id: generateId(), word_set_id: req.params.id, term: w.term, translation: w.translation, hint: w.hint || '' };
        db.tables['words'].data.push(wordObj);
      }
    }

    require('../db/connection').saveDb();
    const updatedWords = (db.tables['words'] ? db.tables['words'].data : []).filter(w => w.word_set_id === req.params.id);
    res.json({ ...existing, words: updatedWords });
  } catch (err) { next(err); }
});

// DELETE word set
router.delete('/:id', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const orgId = req.user.organization_id;
  try {
    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
    const idx = allSets.findIndex(s => s.id === req.params.id && s.organization_id === orgId);
    if (idx === -1) return res.status(404).json({ error: 'Word set not found' });

    db.tables['word_sets'].data.splice(idx, 1);
    db.tables['words'].data = (db.tables['words'].data || []).filter(w => w.word_set_id !== req.params.id);
    require('../db/connection').saveDb();
    res.json({ message: 'Word set deleted successfully' });
  } catch (err) { next(err); }
});

// POST Track student progress
router.post('/:id/progress', authenticate, requireAuth, requireTenant, requireRole(['student']), async (req, res, next) => {
  const { gameMode, score, totalWords } = req.body;
  const studentId = req.user.id;

  if (!gameMode || score === undefined || !totalWords) {
    return res.status(400).json({ error: 'gameMode, score, and totalWords are required' });
  }

  try {
    const progressObj = {
      id: generateId(),
      student_id: studentId,
      word_set_id: req.params.id,
      game_mode: gameMode,
      score: Number(score),
      total_words: Number(totalWords),
      completed_at: now()
    };
    await run(`INSERT INTO student_progress VALUES ?`, [progressObj]);
    res.status(201).json({ message: 'Progress saved', progressId: progressObj.id });
  } catch (err) { next(err); }
});

module.exports = router;
