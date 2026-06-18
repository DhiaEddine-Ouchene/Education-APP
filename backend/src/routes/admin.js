const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { authenticate, requireAuth, requireRole } = require('../middleware/auth');

router.get('/analytics', authenticate, requireAuth, requireRole(['admin']), async (req, res, next) => {
  try {
    const orgs = db.tables['organizations'] ? db.tables['organizations'].data : [];
    const users = db.tables['users'] ? db.tables['users'].data : [];
    const wordSets = db.tables['word_sets'] ? db.tables['word_sets'].data : [];
    const progress = db.tables['student_progress'] ? db.tables['student_progress'].data : [];
    const courses = db.tables['courses'] ? db.tables['courses'].data : [];

    const nonAdminUsers = users.filter(u => u.role !== 'admin');

    // MRR
    let mrr = 0;
    const planCounts = { Free: 0, Pro: 0, School: 0 };
    orgs.forEach(org => {
      const plan = org.plan || 'Free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
      if (plan === 'Pro') mrr += 19;
      if (plan === 'School') mrr += 79;
    });

    // Organization details
    const organizationsList = orgs.map(org => {
      const orgUsers = users.filter(u => u.organization_id === org.id);
      const orgSets = wordSets.filter(w => w.organization_id === org.id);
      const orgCourses = courses.filter(c => c.organization_id === org.id);
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan || 'Free',
        ai_generations_count: org.ai_generations_count || 0,
        teachers_count: orgUsers.filter(u => u.role === 'teacher').length,
        students_count: orgUsers.filter(u => u.role === 'student').length,
        sets_count: orgSets.length,
        courses_count: orgCourses.length
      };
    });

    // Game engagement stats
    const gameModeMap = {};
    progress.forEach(p => {
      if (!gameModeMap[p.game_mode]) gameModeMap[p.game_mode] = { plays: 0, totalAcc: 0 };
      gameModeMap[p.game_mode].plays++;
      gameModeMap[p.game_mode].totalAcc += (p.score / p.total_words) * 100;
    });
    const gameStats = Object.entries(gameModeMap).map(([mode, data]) => ({
      game_mode: mode,
      plays_count: data.plays,
      avg_accuracy: Math.round(data.totalAcc / data.plays * 10) / 10
    }));

    // Recent users
    const recentUsers = nonAdminUsers.slice(-10).reverse().map(u => {
      const org = orgs.find(o => o.id === u.organization_id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        organization_name: org ? org.name : null,
        created_at: u.created_at
      };
    });

    res.json({
      summary: {
        totalUsers: nonAdminUsers.length,
        totalOrganizations: orgs.length,
        totalWordSets: wordSets.length,
        totalGamesPlayed: progress.length,
        mrr,
        plans: planCounts
      },
      organizations: organizationsList,
      gameStats,
      recentUsers
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
