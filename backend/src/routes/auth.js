const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, run } = require('../db/connection');
const { JWT_SECRET, authenticate, requireAuth } = require('../middleware/auth');

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
const now = () => new Date().toISOString();

// GET tenant branding by slug
router.get('/tenant/:slug', async (req, res, next) => {
  try {
    const orgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = orgs.find(o => o.slug === req.params.slug);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    res.json({
      id: org.id, name: org.name, slug: org.slug,
      logo_data: org.logo_data,
      theme_primary: org.theme_primary || '#4F46E5',
      theme_secondary: org.theme_secondary || '#818CF8',
      dark_mode: org.dark_mode === 1 || org.dark_mode === true,
      plan: org.plan || 'Free'
    });
  } catch (err) { next(err); }
});

// POST Register new teacher & org
router.post('/register', async (req, res, next) => {
  const { orgName, orgSlug, name, email, password } = req.body;
  if (!orgName || !orgSlug || !name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });

  try {
    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];

    if (allUsers.find(u => u.email === email))
      return res.status(400).json({ error: 'Email is already registered' });
    if (allOrgs.find(o => o.slug === orgSlug))
      return res.status(400).json({ error: 'Subdomain/slug is already taken' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const orgId = generateId();
    const userId = generateId();

    const newOrg = {
      id: orgId, name: orgName, slug: orgSlug, logo_data: null,
      theme_primary: '#4F46E5', theme_secondary: '#818CF8', dark_mode: 0,
      plan: 'Free', stripe_customer_id: null, stripe_subscription_id: null,
      ai_generations_count: 0, created_at: now()
    };
    await run(`INSERT INTO organizations VALUES ?`, [newOrg]);

    const newUser = { id: userId, organization_id: orgId, email, password_hash, role: 'teacher', name, created_at: now() };
    await run(`INSERT INTO users VALUES ?`, [newUser]);

    const token = jwt.sign({ id: userId, organization_id: orgId, email, role: 'teacher', name }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: { id: userId, name, email, role: 'teacher', organization_id: orgId, profile_picture: null },
      organization: { id: orgId, name: orgName, slug: orgSlug, theme_primary: '#4F46E5', theme_secondary: '#818CF8', dark_mode: false, plan: 'Free' }
    });
  } catch (err) { next(err); }
});

// POST Login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const user = allUsers.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = user.organization_id ? allOrgs.find(o => o.id === user.organization_id) : null;

    const token = jwt.sign(
      { id: user.id, organization_id: user.organization_id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, organization_id: user.organization_id, profile_picture: user.profile_picture || null },
      organization: org ? {
        id: org.id, name: org.name, slug: org.slug, logo_data: org.logo_data,
        theme_primary: org.theme_primary, theme_secondary: org.theme_secondary,
        dark_mode: org.dark_mode === 1 || org.dark_mode === true,
        plan: org.plan
      } : null
    });
  } catch (err) { next(err); }
});

// GET /me
router.get('/me', authenticate, requireAuth, async (req, res, next) => {
  try {
    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const user = allUsers.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = user.organization_id ? allOrgs.find(o => o.id === user.organization_id) : null;

    res.json({
      user: { id: user.id, organization_id: user.organization_id, email: user.email, role: user.role, name: user.name, profile_picture: user.profile_picture || null },
      organization: org ? {
        id: org.id, name: org.name, slug: org.slug, logo_data: org.logo_data,
        theme_primary: org.theme_primary, theme_secondary: org.theme_secondary,
        dark_mode: org.dark_mode === 1 || org.dark_mode === true,
        plan: org.plan
      } : null
    });
  } catch (err) { next(err); }
});

// PUT /profile
router.put('/profile', authenticate, requireAuth, async (req, res, next) => {
  const { name, email, profile_picture, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const allUsers = db.tables['users'] ? db.tables['users'].data : [];
    const user = allUsers.find(u => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (email && email !== user.email) {
      if (allUsers.find(u => u.email === email && u.id !== userId)) {
        return res.status(400).json({ error: 'This email is already in use' });
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (profile_picture !== undefined) user.profile_picture = profile_picture;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) return res.status(400).json({ error: 'Incorrect current password' });

      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(newPassword, salt);
    }

    const { saveDb } = require('../db/connection');
    saveDb();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id,
        profile_picture: user.profile_picture || null
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
