const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { saveDb } = require('../db/connection');
const { authenticate, requireAuth, requireTenant, requireRole } = require('../middleware/auth');
const { generateFromTopic, extractFromText } = require('../services/aiService');

const checkAiLimits = async (req, res, next) => {
  const orgId = req.user.organization_id;
  try {
    const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const org = allOrgs.find(o => o.id === orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    if (org.plan === 'Free' && (org.ai_generations_count || 0) >= 3) {
      return res.status(403).json({
        error: 'AI trial limit reached. Free plans are limited to 3 AI generations. Please upgrade to Pro or School for unlimited AI.'
      });
    }
    req.org = org;
    next();
  } catch (err) { next(err); }
};

const incrementAiCount = (orgId) => {
  const allOrgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
  const org = allOrgs.find(o => o.id === orgId);
  if (org) {
    org.ai_generations_count = (org.ai_generations_count || 0) + 1;
    saveDb();
  }
};

// POST autofill from topic
router.post('/autofill', authenticate, requireAuth, requireTenant, requireRole(['teacher']), checkAiLimits, async (req, res, next) => {
  const { topic, source_lang, target_lang } = req.body;
  const orgId = req.user.organization_id;

  if (!topic) return res.status(400).json({ error: 'Topic is required' });

  try {
    const result = await generateFromTopic(topic, source_lang || 'en', target_lang || 'es');
    incrementAiCount(orgId);
    const remaining = req.org.plan === 'Free' ? Math.max(0, 3 - (req.org.ai_generations_count || 0) - 1) : 'unlimited';
    res.json({ words: result, remainingTrials: remaining });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate vocabulary list' });
  }
});

// POST extract from text
router.post('/extract', authenticate, requireAuth, requireTenant, requireRole(['teacher']), checkAiLimits, async (req, res, next) => {
  const { text, source_lang, target_lang } = req.body;
  const orgId = req.user.organization_id;

  if (!text) return res.status(400).json({ error: 'Content text is required' });

  try {
    const result = await extractFromText(text, source_lang || 'en', target_lang || 'es');
    incrementAiCount(orgId);
    const remaining = req.org.plan === 'Free' ? Math.max(0, 3 - (req.org.ai_generations_count || 0) - 1) : 'unlimited';
    res.json({ words: result, remainingTrials: remaining });
  } catch (err) {
    res.status(500).json({ error: 'Failed to extract vocabulary words' });
  }
});

module.exports = router;
