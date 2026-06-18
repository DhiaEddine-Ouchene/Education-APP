const express = require('express');
const router = express.Router();
const { db, run } = require('../db/connection');
const { authenticate, requireAuth, requireTenant, requireRole } = require('../middleware/auth');
const { saveDb } = require('../db/connection');

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
const now = () => new Date().toISOString();

// GET all courses for the org
router.get('/', authenticate, requireAuth, requireTenant, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const allCourses = db.tables['courses'] ? db.tables['courses'].data : [];
    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
    const allWords = db.tables['words'] ? db.tables['words'].data : [];

    const courses = allCourses
      .filter(c => c.organization_id === orgId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(c => {
        const set = c.word_set_id ? allSets.find(s => s.id === c.word_set_id) : null;
        return {
          ...c,
          word_set_title: set ? set.title : null,
          word_count: set ? allWords.filter(w => w.word_set_id === set.id).length : 0
        };
      });

    res.json(courses);
  } catch (err) { next(err); }
});

// GET single course
router.get('/:id', authenticate, requireAuth, requireTenant, async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const allCourses = db.tables['courses'] ? db.tables['courses'].data : [];
    const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];

    const course = allCourses.find(c => c.id === req.params.id && c.organization_id === orgId);
    if (!course) return res.status(404).json({ error: 'Lesson not found' });

    const set = course.word_set_id ? allSets.find(s => s.id === course.word_set_id) : null;
    res.json({ ...course, word_set_title: set ? set.title : null });
  } catch (err) { next(err); }
});

// POST create course
router.post('/', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const { title, content, word_set_id } = req.body;
  const orgId = req.user.organization_id;
  const userId = req.user.id;

  if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

  try {
    if (word_set_id) {
      const allSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
      const set = allSets.find(s => s.id === word_set_id && s.organization_id === orgId);
      if (!set) return res.status(400).json({ error: 'Associated vocabulary set not found' });
    }

    const courseId = generateId();
    const newCourse = {
      id: courseId, organization_id: orgId, creator_id: userId,
      title, content, word_set_id: word_set_id || null, created_at: now()
    };
    await run(`INSERT INTO courses VALUES ?`, [newCourse]);
    res.status(201).json(newCourse);
  } catch (err) { next(err); }
});

// PUT update course
router.put('/:id', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const { title, content, word_set_id } = req.body;
  const orgId = req.user.organization_id;

  try {
    const allCourses = db.tables['courses'] ? db.tables['courses'].data : [];
    const course = allCourses.find(c => c.id === req.params.id && c.organization_id === orgId);
    if (!course) return res.status(404).json({ error: 'Lesson not found' });

    if (title !== undefined) course.title = title;
    if (content !== undefined) course.content = content;
    if (word_set_id !== undefined) course.word_set_id = word_set_id || null;

    saveDb();
    res.json(course);
  } catch (err) { next(err); }
});

// DELETE course
router.delete('/:id', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const orgId = req.user.organization_id;
  try {
    const allCourses = db.tables['courses'] ? db.tables['courses'].data : [];
    const idx = allCourses.findIndex(c => c.id === req.params.id && c.organization_id === orgId);
    if (idx === -1) return res.status(404).json({ error: 'Lesson not found' });

    db.tables['courses'].data.splice(idx, 1);
    saveDb();
    res.json({ message: 'Lesson deleted successfully' });
  } catch (err) { next(err); }
});

module.exports = router;
