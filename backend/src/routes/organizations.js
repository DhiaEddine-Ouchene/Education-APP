const express = require('express');
const router = express.Router();
const { db, run } = require('../db/connection');
const { authenticate, requireAuth, requireRole } = require('../middleware/auth');
const { saveDb } = require('../db/connection');

router.put('/branding', authenticate, requireAuth, requireRole(['teacher']), async (req, res, next) => {
  const { name, logo_data, theme_primary, theme_secondary, dark_mode } = req.body;
  const orgId = req.user.organization_id;

  if (!orgId) return res.status(400).json({ error: 'User does not belong to an organization' });

  try {
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = allOrgs.find(o => o.id === orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    if (name !== undefined) org.name = name;
    if (logo_data !== undefined) org.logo_data = logo_data;
    if (theme_primary !== undefined) org.theme_primary = theme_primary;
    if (theme_secondary !== undefined) org.theme_secondary = theme_secondary;
    if (dark_mode !== undefined) org.dark_mode = dark_mode ? 1 : 0;

    saveDb();

    res.json({
      message: 'Branding updated successfully',
      organization: {
        id: org.id, name: org.name, slug: org.slug, logo_data: org.logo_data,
        theme_primary: org.theme_primary, theme_secondary: org.theme_secondary,
        dark_mode: org.dark_mode === 1, plan: org.plan
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
