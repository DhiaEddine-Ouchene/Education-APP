const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, run } = require('../db/connection');
const { authenticate, requireAuth, requireTenant, requireRole } = require('../middleware/auth');
const { getPlanConfig } = require('../services/billingService');

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
const now = () => new Date().toISOString();

// GET list students
router.get('/students', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  try {
    const orgId = req.user.organization_id;
    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const students = allUsers
      .filter(u => u.organization_id === orgId && u.role === 'student')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(u => ({ id: u.id, email: u.email, name: u.name, created_at: u.created_at }));
    res.json(students);
  } catch (err) { next(err); }
});

// POST add student
router.post('/students', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const { name, email, password } = req.body;
  const orgId = req.user.organization_id;

  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

  try {
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = allOrgs.find(o => o.id === orgId);
    const planConfig = getPlanConfig(org ? org.plan : 'Free');

    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const studentCount = allUsers.filter(u => u.organization_id === orgId && u.role === 'student').length;

    if (studentCount >= planConfig.maxStudents) {
      return res.status(403).json({
        error: `Plan limit reached. Your ${org.plan} plan allows ${planConfig.maxStudents} students. Please upgrade.`
      });
    }

    if (allUsers.find(u => u.email === email)) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const studentId = generateId();

    const newStudent = { id: studentId, organization_id: orgId, email, password_hash, role: 'student', name, created_at: now() };
    await run(`INSERT INTO users VALUES ?`, [newStudent]);

    res.status(201).json({ message: 'Student account created', student: { id: studentId, name, email } });
  } catch (err) { next(err); }
});

// DELETE student
router.delete('/students/:id', authenticate, requireAuth, requireTenant, requireRole(['teacher']), async (req, res, next) => {
  const orgId = req.user.organization_id;
  try {
    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const idx = allUsers.findIndex(u => u.id === req.params.id && u.organization_id === orgId && u.role === 'student');
    if (idx === -1) return res.status(404).json({ error: 'Student not found' });

    db.tables['users'].data.splice(idx, 1);
    require('../db/connection').saveDb();
    res.json({ message: 'Student deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
