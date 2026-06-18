import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  BookOpen, 
  Play, 
  CheckCircle2, 
  Activity, 
  Flame, 
  Trophy, 
  AlertCircle,
  GraduationCap
} from 'lucide-react';

export default function StudentDashboard({ activeTab, user, organization, onReadLesson, onPlayGame }) {
  const [courses, setCourses] = useState([]);
  const [sets, setSets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch student curriculum and stats
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

  // Aggregate stats from history
  const getAggregatedStats = () => {
    if (history.length === 0) return { totalPlays: 0, averageAccuracy: 0, highestScore: 0 };
    
    let totalScore = 0;
    let totalWords = 0;
    let highestPct = 0;

    history.forEach(item => {
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
      <div className="flex-center" style={{ height: '50vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
      {/* Dynamic Welcome Title */}
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <div>
          <h1 className="page-title">My Learning Portal</h1>
          <p className="page-subtitle">Welcome back, {user.name}! Track lessons and review your vocabulary sets.</p>
        </div>
      </div>

      {/* TAB 1: CURRICULUM LESSONS */}
      {activeTab === 'courses' && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>My Assigned Course Lessons</h2>
          {courses.length === 0 ? (
            <div className="card-item" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No textbook readings published yet by your teacher.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
              {courses.map((course) => (
                <div key={course.id} className="card-item hover-translate" style={{ padding: '25px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', color: 'var(--primary-color)' }}>
                    <BookOpen size={20} />
                    <span style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase' }}>Reading Module</span>
                  </div>
                  
                  <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>{course.title}</h3>
                  <p className="text-muted" style={{ fontSize: '14px', flex: 1, marginBottom: '20px' }}>
                    {course.content.substring(0, 120)}...
                  </p>
                  
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <button 
                      onClick={() => onReadLesson(course)}
                      className="action-button-secondary"
                      style={{ fontSize: '13px', padding: '8px 15px' }}
                    >
                      Read Textbook
                    </button>
                    {course.word_set_id && (
                      <button 
                        onClick={() => onPlayGame(course.word_set_id, 'matching')}
                        className="action-button-primary"
                        style={{ fontSize: '13px', padding: '8px 15px' }}
                      >
                        Play Vocab Game
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VOCABULARY MATCHING GAMES */}
      {activeTab === 'sets' && (
        <div>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Study Rooms & Vocabulary Games</h2>
          {sets.length === 0 ? (
            <div className="card-item" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No vocabulary sets assigned to your school yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
              {sets.map((set) => (
                <div key={set.id} className="card-item" style={{ padding: '25px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span className="lang-tag" style={{ background: 'var(--primary-glow)', color: 'var(--primary-color)', fontSize: '12px' }}>
                      {set.source_lang.toUpperCase()} → {set.target_lang.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{set.word_count} terms</span>
                  </div>

                  <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>{set.title}</h3>
                  <p className="text-muted" style={{ fontSize: '14px', flex: 1, marginBottom: '20px' }}>{set.description || 'Practice your translations.'}</p>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-muted)' }}>Select Game Mode:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <button onClick={() => onPlayGame(set.id, 'matching')} className="action-button-primary" style={{ padding: '8px 4px', fontSize: '12px' }}>
                        Memory Match
                      </button>
                      <button onClick={() => onPlayGame(set.id, 'flashcards')} className="action-button-secondary" style={{ padding: '8px 4px', fontSize: '12px' }}>
                        Flashcards
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }} className="student-games-row">
                      <button onClick={() => onPlayGame(set.id, 'quiz')} className="action-button-secondary" style={{ padding: '6px 2px', fontSize: '11px' }}>
                        Quiz
                      </button>
                      <button onClick={() => onPlayGame(set.id, 'listening')} className="action-button-secondary" style={{ padding: '6px 2px', fontSize: '11px' }}>
                        Listen
                      </button>
                      <button onClick={() => onPlayGame(set.id, 'scramble')} className="action-button-secondary" style={{ padding: '6px 2px', fontSize: '11px' }}>
                        Spelling
                      </button>
                      <button onClick={() => onPlayGame(set.id, 'typein')} className="action-button-secondary" style={{ padding: '6px 2px', fontSize: '11px' }}>
                        Type-In
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PERSONAL PROGRESS HISTORIES */}
      {activeTab === 'history' && (
        <div>
          {/* Stats Aggregators cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '35px' }}>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Flame style={{ color: 'var(--primary-color)' }} /></div>
              <div>
                <div className="stats-label">Total Completed Plays</div>
                <div className="stats-value">{stats.totalPlays}</div>
                <div className="stats-change">Completed games session</div>
              </div>
            </div>
            
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Trophy style={{ color: '#F59E0B' }} /></div>
              <div>
                <div className="stats-label">Average Accuracy</div>
                <div className="stats-value" style={{ color: stats.averageAccuracy >= 80 ? '#10B981' : 'inherit' }}>
                  {stats.averageAccuracy}%
                </div>
                <div className="stats-change">Cumulative accuracy percentage</div>
              </div>
            </div>

            <div className="stats-card">
              <div className="stats-icon-wrapper"><CheckCircle2 style={{ color: '#10B981' }} /></div>
              <div>
                <div className="stats-label">Highest Score</div>
                <div className="stats-value" style={{ color: '#10B981' }}>{stats.highestScore}%</div>
                <div className="stats-change">Highest single game completion</div>
              </div>
            </div>
          </div>

          {/* Completion Lists */}
          <div className="card-item" style={{ padding: '25px' }}>
            <h3 style={{ marginBottom: '20px' }}>Personal Game Score Log</h3>
            {history.length === 0 ? (
              <p className="text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No games played yet. Go to "Vocabulary Games" tab to start learning!</p>
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
                    <tr key={item.id}>
                      <td style={{ fontWeight: '600' }}>{item.set_title}</td>
                      <td style={{ textTransform: 'capitalize' }}>{item.game_mode}</td>
                      <td>{item.score} / {item.total_words} words</td>
                      <td>
                        <span style={{ fontWeight: '700', color: (item.score / item.total_words) >= 0.8 ? '#10B981' : '#F59E0B' }}>
                          {Math.round((item.score / item.total_words) * 100)}%
                        </span>
                      </td>
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
