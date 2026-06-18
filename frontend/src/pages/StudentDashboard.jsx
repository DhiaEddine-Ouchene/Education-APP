import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Trophy,
  AlertCircle
} from 'lucide-react';

/* Layout-only style objects (theme colours come from index.css classes). */
const s = {
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px', color: 'var(--text-muted)' },
  sectionTitle: { fontSize: '20px', fontWeight: 800, marginBottom: '18px' },
  emptyBox: { padding: '44px 24px', textAlign: 'center', color: 'var(--text-muted)' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' },
  moduleBadge: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' },
  cardTitle: { fontSize: '17px', fontWeight: 700 },
  cardDesc: { fontSize: '13px' },
  footerBtns: { display: 'flex', gap: '8px', marginTop: 'auto' },
  btnFlex: { flex: 1 },
  setLangRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  metaCount: { fontSize: '12px', color: 'var(--text-muted)' },
  gameGroup: { marginTop: 'auto' },
  gameLabel: { fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' },
  gameRowTwo: { display: 'flex', gap: '8px', marginBottom: '8px' },
  gameRowFlexBtn: { flex: 1, padding: '9px 12px', fontSize: '13px' },
  smallBtn: { padding: '9px 8px', fontSize: '12px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' },
  panel: { padding: '24px' },
  panelTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '16px' },
  accuracyPill: { background: 'color-mix(in srgb, var(--color-success), transparent 82%)', color: 'var(--color-success)', padding: '2px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px' }
};

export default function StudentDashboard({ activeTab, user, organization, onReadLesson, onPlayGame }) {
  const [courses, setCourses] = useState([]);
  const [sets, setSets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError('');
      const [coursesData, setsData, historyData] = await Promise.all([
        api.get('/courses'),
        api.get('/sets'),
        api.get('/sets/reports/engagement')
      ]);
      setCourses(coursesData);
      setSets(setsData);
      setHistory(historyData);
    } catch (e) {
      setError(e.message || 'Failed to load curriculum records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [activeTab]);

  const getAggregatedStats = () => {
    if (history.length === 0) return { totalPlays: 0, averageAccuracy: 0, highestScore: 0 };
    let totalScore = 0;
    let totalWords = 0;
    let highestPct = 0;
    history.forEach((item) => {
      const pct = item.score / item.total_words;
      if (pct > highestPct) highestPct = pct;
      totalScore += item.score;
      totalWords += item.total_words;
    });
    return {
      totalPlays: history.length,
      averageAccuracy: Math.round((totalScore / totalWords) * 100),
      highestScore: Math.round(highestPct * 100)
    };
  };

  if (loading) {
    return (
      <div style={s.loading}>
        <div className="loading-spinner" />
        <p>Loading school assignments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        <AlertCircle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  const stats = getAggregatedStats();

  return (
    <div className="student-dashboard animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Learning Portal</h1>
          <p className="page-subtitle">Welcome back, {user.name}! Track lessons and review your vocabulary sets.</p>
        </div>
      </div>

      {activeTab === 'courses' && (
        <div>
          <h2 style={s.sectionTitle}>My Assigned Course Lessons</h2>
          {courses.length === 0 ? (
            <div className="card-item" style={s.emptyBox}>No textbook readings published yet by your teacher.</div>
          ) : (
            <div style={s.cardGrid}>
              {courses.map((course) => (
                <div key={course.id} className="card-item hover-translate" style={s.card}>
                  <div style={s.moduleBadge}>
                    <BookOpen size={18} />
                    <span>Reading Module</span>
                  </div>
                  <h3 style={s.cardTitle}>{course.title}</h3>
                  <p className="text-muted" style={s.cardDesc}>{course.content.substring(0, 120)}...</p>
                  <div style={s.footerBtns}>
                    <button onClick={() => onReadLesson(course)} className="action-button-secondary" style={s.btnFlex}>Read Textbook</button>
                    {course.word_set_id && (
                      <button onClick={() => onPlayGame(course.word_set_id, 'matching')} className="action-button-primary" style={s.btnFlex}>Play Vocab Game</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sets' && (
        <div>
          <h2 style={s.sectionTitle}>Study Rooms & Vocabulary Games</h2>
          {sets.length === 0 ? (
            <div className="card-item" style={s.emptyBox}>No vocabulary sets assigned to your school yet.</div>
          ) : (
            <div style={s.cardGrid}>
              {sets.map((set) => (
                <div key={set.id} className="card-item" style={s.card}>
                  <div style={s.setLangRow}>
                    <span className="lang-tag">{set.source_lang.toUpperCase()} → {set.target_lang.toUpperCase()}</span>
                    <span style={s.metaCount}>{set.word_count} terms</span>
                  </div>
                  <h3 style={s.cardTitle}>{set.title}</h3>
                  <p className="text-muted" style={s.cardDesc}>{set.description || 'Practice your translations.'}</p>
                  <div style={s.gameGroup}>
                    <div style={s.gameLabel}>Select Game Mode:</div>
                    <div style={s.gameRowTwo}>
                      <button onClick={() => onPlayGame(set.id, 'matching')} className="action-button-primary" style={s.gameRowFlexBtn}>Memory Match</button>
                      <button onClick={() => onPlayGame(set.id, 'flashcards')} className="action-button-secondary" style={s.gameRowFlexBtn}>Flashcards</button>
                    </div>
                    <div className="student-games-row">
                      <button onClick={() => onPlayGame(set.id, 'quiz')} className="action-button-secondary" style={s.smallBtn}>Quiz</button>
                      <button onClick={() => onPlayGame(set.id, 'listening')} className="action-button-secondary" style={s.smallBtn}>Listen</button>
                      <button onClick={() => onPlayGame(set.id, 'scramble')} className="action-button-secondary" style={s.smallBtn}>Spelling</button>
                      <button onClick={() => onPlayGame(set.id, 'typein')} className="action-button-secondary" style={s.smallBtn}>Type-In</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          <div style={s.statsGrid}>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Flame size={22} /></div>
              <div>
                <div className="stats-label">Total Completed Plays</div>
                <div className="stats-value">{stats.totalPlays}</div>
                <div className="stats-change">Completed game sessions</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Trophy size={22} /></div>
              <div>
                <div className="stats-label">Average Accuracy</div>
                <div className="stats-value">{stats.averageAccuracy}%</div>
                <div className="stats-change">Cumulative accuracy percentage</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><CheckCircle2 size={22} /></div>
              <div>
                <div className="stats-label">Highest Score</div>
                <div className="stats-value">{stats.highestScore}%</div>
                <div className="stats-change">Highest single game completion</div>
              </div>
            </div>
          </div>

          <div className="card-item" style={s.panel}>
            <h3 style={s.panelTitle}>Personal Game Score Log</h3>
            {history.length === 0 ? (
              <p className="text-muted">No games played yet. Go to "Vocabulary Games" tab to start learning!</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Vocabulary Set</th>
                    <th>Game Mode</th>
                    <th>Score achieved</th>
                    <th>Accuracy Percentage</th>
                    <th>Date completed</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="table-hover-row">
                      <td className="font-bold">{item.set_title}</td>
                      <td>{item.game_mode}</td>
                      <td>{item.score} / {item.total_words} words</td>
                      <td><span style={s.accuracyPill}>{Math.round((item.score / item.total_words) * 100)}%</span></td>
                      <td>{new Date(item.completed_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
