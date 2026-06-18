import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { compressImage } from '../utils/compress';
import {
  Sparkles,
  Plus,
  Trash2,
  Play,
  AlertCircle,
  Users,
  BookOpen,
  Layers,
  CheckCircle,
  CreditCard,
  Crown
} from 'lucide-react';

/* Every playable game mode (kept in sync with GamePlayer.jsx). */
const GAME_MODES = [
  { mode: 'matching', label: 'Memory Match' },
  { mode: 'flashcards', label: 'Flashcards' },
  { mode: 'quiz', label: 'Quiz' },
  { mode: 'listening', label: 'Listen' },
  { mode: 'scramble', label: 'Spelling' },
  { mode: 'typein', label: 'Type-In' }
];

/* Layout-only style objects (theme colours come from index.css classes). */
const s = {
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '14px', color: 'var(--text-muted)' },
  alertClose: { marginLeft: 'auto', background: 'transparent', border: 'none', color: 'inherit', fontSize: '20px', cursor: 'pointer', lineHeight: 1 },
  panel: { padding: '24px', marginBottom: '24px' },
  panelTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '16px' },
  accuracyPill: { background: 'color-mix(in srgb, var(--color-success), transparent 82%)', color: 'var(--color-success)', padding: '2px 10px', borderRadius: '999px', fontWeight: 700, fontSize: '12px' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  setCard: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' },
  setLangRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  metaCount: { fontSize: '12px', color: 'var(--text-muted)' },
  cardTitle: { fontSize: '17px', fontWeight: 700 },
  cardDesc: { fontSize: '13px' },
  gameModeLabel: { fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 'auto' },
  gameModeRow: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  gameChip: { flex: '1 1 calc(33.333% - 6px)', minWidth: '84px', padding: '8px 6px', fontSize: '12px', textAlign: 'center' },
  editRow: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' },
  btnFlex: { flex: 1 },
  emptyBox: { padding: '44px 24px', textAlign: 'center', color: 'var(--text-muted)' },
  courseStack: { display: 'flex', flexDirection: 'column', gap: '14px' },
  courseRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', padding: '20px' },
  courseMeta: { display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' },
  linkedTag: { color: 'var(--color-success)', fontWeight: 600 },
  btnRow: { display: 'flex', gap: '8px' },
  langSelectRow: { display: 'flex', flexWrap: 'wrap', gap: '14px' },
  langField: { flex: '1 1 180px' },
  aiBox: { background: 'var(--glass)', border: '1px solid var(--border-strong)', borderRadius: '14px', padding: '16px' },
  aiHeader: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 700, fontSize: '13px', marginBottom: '12px' },
  aiHeaderBetween: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-color)', fontWeight: 700, fontSize: '13px', marginBottom: '12px', justifyContent: 'space-between', flexWrap: 'wrap' },
  aiTitle: { display: 'flex', alignItems: 'center', gap: '8px' },
  aiInputRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  aiTrialNote: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' },
  wordsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' },
  wordsList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' },
  wordRow: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  wordInput: { flex: '1 1 140px', minWidth: '110px' },
  extractedBox: { marginTop: '14px', background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px' },
  extractedChip: { fontSize: '13px', padding: '5px 0', borderBottom: '1px solid var(--border-color)' },
  brandingGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' },
  colorGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  colorInput: { width: '100%', height: '42px', borderRadius: '10px', border: '1px solid var(--border-color)', cursor: 'pointer', padding: '2px', background: 'var(--bg-elevated)' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' },
  previewFrame: { border: '1px solid var(--border-color)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' },
  formMargin: { marginBottom: '16px' },
  hintText: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' },
  sectionGap: { marginTop: '20px' },
  planStatus: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', padding: '24px', marginBottom: '28px' },
  planBadges: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' },
  planUsage: { display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '10px', fontSize: '14px' },
  upgradeCallout: { display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--glass-strong)', borderRadius: '14px', padding: '16px 20px', color: 'var(--primary-color)' },
  priceAmount: { fontSize: '32px', fontWeight: 800, margin: '8px 0 16px' },
  pricePeriod: { fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' },
  planTitle: { fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' },
  popularTag: { background: 'linear-gradient(120deg,var(--primary-color),var(--secondary-color))', color: '#06222b', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase' },
  featureList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', margin: '0 0 18px', fontSize: '14px' },
  featureOff: { color: 'var(--text-muted)', textDecoration: 'line-through' },
  planCard: { padding: '24px', display: 'flex', flexDirection: 'column' },
  fullBtn: { width: '100%', marginTop: 'auto' },
  iconGap: { marginRight: '6px' }
};

export default function TeacherDashboard({ activeTab, user, organization, updateBranding, onLaunchGame }) {
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [sets, setSets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');

  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
  const [setForm, setSetForm] = useState({ id: null, title: '', description: '', source_lang: 'en', target_lang: 'es', words: [] });
  const [courseForm, setCourseForm] = useState({ id: null, title: '', content: '', word_set_id: '' });

  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [extractedWords, setExtractedWords] = useState([]);
  const [extractLoading, setExtractLoading] = useState(false);

  const [brandForm, setBrandForm] = useState({
    name: organization?.name || '',
    logo_data: organization?.logo_data || null,
    theme_primary: organization?.theme_primary || '#25D1F4',
    theme_secondary: organization?.theme_secondary || '#A3E635',
    dark_mode: organization?.dark_mode || false
  });

  useEffect(() => {
    if (organization) {
      setBrandForm({
        name: organization.name || '',
        logo_data: organization.logo_data || null,
        theme_primary: organization.theme_primary || '#25D1F4',
        theme_secondary: organization.theme_secondary || '#A3E635',
        dark_mode: organization.dark_mode || false
      });
    }
  }, [organization]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      const [setsData, coursesData, studentsData, reportData] = await Promise.all([
        api.get('/sets'),
        api.get('/courses'),
        api.get('/users/students'),
        api.get('/sets/reports/engagement')
      ]);
      setSets(setsData);
      setCourses(coursesData);
      setStudents(studentsData);
      setStats({
        setsCount: setsData.length,
        coursesCount: coursesData.length,
        studentsCount: studentsData.length,
        totalPlays: reportData.length,
        reports: reportData
      });
    } catch (e) {
      setError(e.message || 'Failed to load teacher stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/users/students', studentForm);
      setSuccess('Student account created successfully!');
      setStudentForm({ name: '', email: '', password: '' });
      setIsModalOpen(false);
      loadDashboardData();
    } catch (e) {
      setError(e.message || 'Failed to add student.');
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to remove this student account?')) return;
    try {
      await api.delete(`/users/students/${id}`);
      setSuccess('Student deleted.');
      loadDashboardData();
    } catch (e) {
      setError(e.message || 'Failed to delete student.');
    }
  };

  const handleAddWordRow = () => {
    setSetForm({ ...setForm, words: [...setForm.words, { term: '', translation: '', hint: '' }] });
  };

  const handleRemoveWordRow = (idx) => {
    const updated = [...setForm.words];
    updated.splice(idx, 1);
    setSetForm({ ...setForm, words: updated });
  };

  const handleWordFieldChange = (idx, field, value) => {
    const updated = [...setForm.words];
    updated[idx][field] = value;
    setSetForm({ ...setForm, words: updated });
  };

  const handleAiAutofill = async () => {
    if (!aiTopic) return;
    setAiLoading(true);
    setError('');
    try {
      const res = await api.post('/ai/autofill', {
        topic: aiTopic,
        source_lang: setForm.source_lang,
        target_lang: setForm.target_lang
      });
      setSetForm({ ...setForm, words: [...setForm.words, ...res.words] });
      setSuccess(`Generated ${res.words.length} vocabulary words!`);
      setAiTopic('');
    } catch (e) {
      setError(e.message || 'AI Autofill failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveWordSet = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const cleanWords = setForm.words.filter((w) => w.term && w.translation);
    if (cleanWords.length === 0) {
      setError('Please add at least one vocabulary term and translation.');
      return;
    }
    try {
      if (setForm.id) {
        await api.put(`/sets/${setForm.id}`, { ...setForm, words: cleanWords });
        setSuccess('Vocabulary set updated successfully!');
      } else {
        await api.post('/sets', { ...setForm, words: cleanWords });
        setSuccess('Vocabulary set created successfully!');
      }
      setIsModalOpen(false);
      loadDashboardData();
    } catch (e) {
      setError(e.message || 'Failed to save vocabulary set.');
    }
  };

  const handleAiExtract = async () => {
    if (!courseForm.content) {
      setError('Please write or paste course textbook content first.');
      return;
    }
    setExtractLoading(true);
    setError('');
    try {
      const res = await api.post('/ai/extract', { text: courseForm.content, source_lang: 'en', target_lang: 'es' });
      setExtractedWords(res.words);
      setSuccess(`Extracted ${res.words.length} key vocabulary terms! Review them below.`);
    } catch (e) {
      setError(e.message || 'Failed to extract text words.');
    } finally {
      setExtractLoading(false);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      let linkedSetId = courseForm.word_set_id;
      if (extractedWords.length > 0) {
        const setRes = await api.post('/sets', {
          title: `Vocab: ${courseForm.title}`,
          description: `Vocabulary extracted from lesson: ${courseForm.title}`,
          source_lang: 'en',
          target_lang: 'es',
          words: extractedWords
        });
        linkedSetId = setRes.id;
      }
      const payload = { ...courseForm, word_set_id: linkedSetId || null };
      if (courseForm.id) {
        await api.put(`/courses/${courseForm.id}`, payload);
        setSuccess('Course lesson updated successfully!');
      } else {
        await api.post('/courses', payload);
        setSuccess('Course lesson created successfully!');
      }
      setIsModalOpen(false);
      setExtractedWords([]);
      loadDashboardData();
    } catch (e) {
      setError(e.message || 'Failed to save lesson.');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64Logo = await compressImage(file, 180, 60);
      setBrandForm((prev) => ({ ...prev, logo_data: base64Logo }));
      setSuccess('Logo loaded and optimized successfully (client-side resize).');
    } catch (err) {
      setError('Image compression failed. Choose a different PNG/JPG file.');
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await api.put('/organizations/branding', brandForm);
      updateBranding(res.organization);
      setSuccess('Custom branding configurations applied successfully!');
    } catch (e) {
      setError(e.message || 'Failed to update branding settings.');
    }
  };

  const handleSubscriptionCheckout = async (plan) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/billing/checkout', {
        planName: plan,
        successUrl: `${window.location.origin}${window.location.pathname}?billing=success`,
        cancelUrl: `${window.location.origin}${window.location.pathname}?billing=cancel`
      });
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error('Billing portal redirection failed.');
      }
    } catch (e) {
      setError(e.message || 'Subscription gateway redirection failed.');
    }
  };

  const aiTrialsLeft = Math.max(0, 3 - (organization?.ai_generations_count || 0));
  const isFreePlan = organization?.plan === 'Free';

  const previewHeaderStyle = {
    padding: '15px 20px',
    background: brandForm.dark_mode ? '#0C1518' : '#FFFFFF',
    borderBottom: `2px solid ${brandForm.theme_primary}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };
  const previewBodyStyle = { padding: '24px', background: brandForm.dark_mode ? '#11242B' : '#F8FAFC', minHeight: '170px' };
  const previewBrandText = { fontWeight: 800, fontSize: '18px', color: brandForm.theme_primary };
  const previewPreviewTag = { fontSize: '11px', color: brandForm.dark_mode ? '#8FB6C0' : '#64748B' };
  const previewSubtitle = { fontSize: '13px', color: brandForm.dark_mode ? '#8FB6C0' : '#475569', marginBottom: '16px' };
  const previewBtnRow = { display: 'flex', gap: '12px' };
  const previewPrimaryBtn = { padding: '11px 18px', background: brandForm.theme_primary, color: '#06222b', borderRadius: '8px', fontWeight: 700, fontSize: '13px' };
  const previewSecondaryBtn = { padding: '11px 18px', background: 'transparent', color: brandForm.theme_secondary, border: `1px solid ${brandForm.theme_secondary}`, borderRadius: '8px', fontWeight: 700, fontSize: '13px' };
  const previewLogo = { maxHeight: '34px' };

  if (loading && !stats) {
    return (
      <div style={s.loading}>
        <div className="loading-spinner" />
        <p>Fetching school records...</p>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard-container animate-fade">
      {error && (
        <div className="error-alert animate-scale" style={s.formMargin}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={s.alertClose}>×</button>
        </div>
      )}
      {success && (
        <div className="success-alert animate-scale" style={s.formMargin}>
          <CheckCircle size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={s.alertClose}>×</button>
        </div>
      )}

      {activeTab === 'dashboard' && stats && (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">School Insights</h1>
              <p className="page-subtitle">Welcome back, {user?.name}. Here is what is happening at {organization?.name || 'your school'}.</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Users size={22} /></div>
              <div>
                <div className="stats-label">Active Students</div>
                <div className="stats-value">{stats.studentsCount}</div>
                <div className="stats-change">Registered students playing games</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Layers size={22} /></div>
              <div>
                <div className="stats-label">Vocabulary Sets</div>
                <div className="stats-value">{stats.setsCount}</div>
                <div className="stats-change">Game lists ready</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><BookOpen size={22} /></div>
              <div>
                <div className="stats-label">Course Lessons</div>
                <div className="stats-value">{stats.coursesCount}</div>
                <div className="stats-change">Lessons containing text courses</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Play size={22} /></div>
              <div>
                <div className="stats-label">Games Played</div>
                <div className="stats-value">{stats.totalPlays}</div>
                <div className="stats-change">Total student session completions</div>
              </div>
            </div>
          </div>

          <div className="card-item" style={s.panel}>
            <h3 style={s.panelTitle}>Recent Student Play Activity</h3>
            {stats.reports.length === 0 ? (
              <p className="text-muted">No students have completed vocabulary games yet. Send them a lesson to start!</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Vocabulary Set</th>
                    <th>Game Mode</th>
                    <th>Score</th>
                    <th>Accuracy</th>
                    <th>Date Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.reports.slice(0, 10).map((r, idx) => (
                    <tr key={idx} className="table-hover-row">
                      <td className="font-bold">{r.student_name}</td>
                      <td>{r.set_title}</td>
                      <td>{r.game_mode}</td>
                      <td>{r.score} / {r.total_words}</td>
                      <td><span style={s.accuracyPill}>{Math.round((r.score / r.total_words) * 100)}%</span></td>
                      <td>{new Date(r.completed_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sets' && (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">Vocabulary Game Sets</h1>
              <p className="page-subtitle">Add terms once, then launch any of the 6 learning games for your students.</p>
            </div>
            <button
              onClick={() => {
                setSetForm({ id: null, title: '', description: '', source_lang: 'en', target_lang: 'es', words: [{ term: '', translation: '', hint: '' }] });
                setModalType('set');
                setIsModalOpen(true);
              }}
              className="action-button-primary"
            >
              <Plus size={18} style={s.iconGap} />
              Create Word Set
            </button>
          </div>

          <div style={s.cardGrid}>
            {sets.length === 0 ? (
              <div className="card-item" style={s.emptyBox}>
                No vocabulary sets created yet. Click "Create Word Set" or use AI autofill to build your first one!
              </div>
            ) : (
              sets.map((set) => (
                <div key={set.id} className="card-item hover-translate" style={s.setCard}>
                  <div style={s.setLangRow}>
                    <span className="lang-tag">{set.source_lang.toUpperCase()} → {set.target_lang.toUpperCase()}</span>
                    <span style={s.metaCount}>{set.word_count} words</span>
                  </div>
                  <h3 style={s.cardTitle}>{set.title}</h3>
                  <p className="text-muted" style={s.cardDesc}>{set.description || 'No description provided.'}</p>

                  <div style={s.gameModeLabel}>Launch a game</div>
                  <div style={s.gameModeRow}>
                    {GAME_MODES.map((g, i) => (
                      <button
                        key={g.mode}
                        onClick={() => onLaunchGame(set.id, g.mode)}
                        className={i === 0 ? 'action-button-primary' : 'action-button-secondary'}
                        style={s.gameChip}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>

                  <div style={s.editRow}>
                    <button
                      onClick={async () => {
                        const detailed = await api.get(`/sets/${set.id}`);
                        setSetForm(detailed);
                        setModalType('set');
                        setIsModalOpen(true);
                      }}
                      className="action-button-secondary"
                      style={s.btnFlex}
                    >
                      Edit Set
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this word set and all its games?')) {
                          api.delete(`/sets/${set.id}`).then(() => {
                            setSuccess('Word set deleted.');
                            loadDashboardData();
                          });
                        }
                      }}
                      className="action-button-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">Course Lessons</h1>
              <p className="page-subtitle">Paste or write curriculum readings. Connect reading texts with active vocab games.</p>
            </div>
            <button
              onClick={() => {
                setCourseForm({ id: null, title: '', content: '', word_set_id: '' });
                setExtractedWords([]);
                setModalType('course');
                setIsModalOpen(true);
              }}
              className="action-button-primary"
            >
              <Plus size={18} style={s.iconGap} />
              Write Lesson
            </button>
          </div>

          <div style={s.courseStack}>
            {courses.length === 0 ? (
              <div className="card-item" style={s.emptyBox}>
                No courses or textbook lessons written yet. Click "Write Lesson" to draft your first module.
              </div>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="card-item" style={s.courseRow}>
                  <div>
                    <h3 style={s.cardTitle}>{course.title}</h3>
                    <div style={s.courseMeta}>
                      <span>Character length: {course.content.length} chars</span>
                      {course.word_set_title ? (
                        <span style={s.linkedTag}>Linked Vocab Set: {course.word_set_title}</span>
                      ) : (
                        <span>No game linked</span>
                      )}
                    </div>
                  </div>
                  <div style={s.btnRow}>
                    <button
                      onClick={() => {
                        setCourseForm(course);
                        setExtractedWords([]);
                        setModalType('course');
                        setIsModalOpen(true);
                      }}
                      className="action-button-secondary"
                    >
                      Edit Lesson
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Delete this course lesson?')) {
                          api.delete(`/courses/${course.id}`).then(() => {
                            setSuccess('Lesson deleted.');
                            loadDashboardData();
                          });
                        }
                      }}
                      className="action-button-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">Manage Students</h1>
              <p className="page-subtitle">Register student logins and view their learning logs.</p>
            </div>
            <button
              onClick={() => {
                setStudentForm({ name: '', email: '', password: '' });
                setModalType('student');
                setIsModalOpen(true);
              }}
              className="action-button-primary"
            >
              <Plus size={18} style={s.iconGap} />
              Add Student
            </button>
          </div>

          <div className="card-item" style={s.panel}>
            {students.length === 0 ? (
              <p className="text-muted">No students added yet. Click "Add Student" to provision student accounts.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email Login</th>
                    <th>Registered Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="table-hover-row">
                      <td className="font-bold">{student.name}</td>
                      <td>{student.email}</td>
                      <td>{new Date(student.created_at).toLocaleDateString()}</td>
                      <td className="text-right">
                        <button onClick={() => handleDeleteStudent(student.id)} className="action-button-danger">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">Custom Styling & Themes</h1>
              <p className="page-subtitle">White-label your portal. Adjust headers, accent colors, logo layouts, and dark modes.</p>
            </div>
          </div>

          <div style={s.brandingGrid}>
            <div className="card-item" style={s.panel}>
              <form onSubmit={handleSaveBranding}>
                <div className="form-group" style={s.formMargin}>
                  <label>Portal Name</label>
                  <input type="text" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} className="form-input-control" required />
                </div>
                <div className="form-group" style={s.formMargin}>
                  <label>Organization Logo</label>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="form-input-control" />
                  <p style={s.hintText}>Note: Files are resized and compressed client-side to keep load times rapid.</p>
                </div>
                <div style={s.colorGrid}>
                  <div className="form-group">
                    <label>Primary Accent Color</label>
                    <input type="color" value={brandForm.theme_primary} onChange={(e) => setBrandForm({ ...brandForm, theme_primary: e.target.value })} style={s.colorInput} />
                  </div>
                  <div className="form-group">
                    <label>Secondary Color</label>
                    <input type="color" value={brandForm.theme_secondary} onChange={(e) => setBrandForm({ ...brandForm, theme_secondary: e.target.value })} style={s.colorInput} />
                  </div>
                </div>
                <div style={s.checkboxRow}>
                  <input type="checkbox" id="dark_mode_toggle" checked={brandForm.dark_mode} onChange={(e) => setBrandForm({ ...brandForm, dark_mode: e.target.checked })} />
                  <label htmlFor="dark_mode_toggle">Enable Dark Theme by Default</label>
                </div>
                <button type="submit" className="action-button-primary" style={s.fullBtn}>Apply Custom Branding</button>
              </form>
            </div>

            <div>
              <h3 style={s.panelTitle}>Live Brand Preview</h3>
              <div style={s.previewFrame}>
                <div style={previewHeaderStyle}>
                  {brandForm.logo_data ? (
                    <img src={brandForm.logo_data} alt="Custom Logo" style={previewLogo} />
                  ) : (
                    <span style={previewBrandText}>{brandForm.name || 'EduMatch'}</span>
                  )}
                  <span style={previewPreviewTag}>Portal Preview</span>
                </div>
                <div style={previewBodyStyle}>
                  <p style={previewSubtitle}>Choose a vocabulary course to begin playing matching sessions.</p>
                  <div style={previewBtnRow}>
                    <div style={previewPrimaryBtn}>Button Primary Accent</div>
                    <div style={previewSecondaryBtn}>Secondary Button</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscription' && (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">Manage Subscriptions</h1>
              <p className="page-subtitle">Upgrade plan limits to support more vocabulary sets, students, and AI helper resources.</p>
            </div>
          </div>

          <div className="card-item highlight-revenue" style={s.planStatus}>
            <div>
              <div style={s.planBadges}>
                <span className={`plan-badge ${organization.plan.toLowerCase()}`}>{organization.plan} Plan</span>
                <span style={s.metaCount}>Current Organization tier</span>
              </div>
              <h3 style={s.cardTitle}>{organization.name} Limits Usage</h3>
              <div style={s.planUsage}>
                <div><strong>Word Sets:</strong> {stats?.setsCount} / {organization.plan === 'Free' ? 3 : organization.plan === 'Pro' ? 50 : 'Unlimited'}</div>
                <div><strong>Students:</strong> {stats?.studentsCount} / {organization.plan === 'Free' ? 5 : organization.plan === 'Pro' ? 100 : 'Unlimited'}</div>
                <div><strong>AI Generations:</strong> {organization.ai_generations_count} / {organization.plan === 'Free' ? '3 total' : 'Unlimited'}</div>
              </div>
            </div>
            {organization.plan === 'Free' && (
              <div style={s.upgradeCallout}>
                <Crown size={24} />
                <div>
                  <h4>Unlock unlimited limits</h4>
                  <p style={s.metaCount}>Pro starts at just $19 per month.</p>
                </div>
              </div>
            )}
          </div>

          <div className="pricing-grid">
            <div className={`card-item ${organization.plan === 'Free' ? 'active-tier-card' : ''}`} style={s.planCard}>
              <h4 style={s.planTitle}>Free Sandbox</h4>
              <div style={s.priceAmount}>$0<span style={s.pricePeriod}>/mo</span></div>
              <ul style={s.featureList}>
                <li>✓ Max 3 vocabulary sets</li>
                <li>✓ Max 5 student profiles</li>
                <li>✓ 3 total AI generations trial</li>
                <li style={s.featureOff}>✗ Custom branding logo/colors</li>
                <li style={s.featureOff}>✗ Text course links</li>
              </ul>
              <button disabled className="action-button-secondary" style={s.fullBtn}>
                {organization.plan === 'Free' ? 'Current Plan' : 'Basic Tier'}
              </button>
            </div>

            <div className={`card-item ${organization.plan === 'Pro' ? 'active-tier-card' : ''}`} style={s.planCard}>
              <h4 style={s.planTitle}>Teacher Pro <span style={s.popularTag}>Popular</span></h4>
              <div style={s.priceAmount}>$19<span style={s.pricePeriod}>/mo</span></div>
              <ul style={s.featureList}>
                <li>✓ Max 50 vocabulary sets</li>
                <li>✓ Max 100 student profiles</li>
                <li>✓ Unlimited AI autofills</li>
                <li>✓ Full custom branding customization</li>
                <li>✓ Interactive HTML games for reading links</li>
              </ul>
              <button
                onClick={() => handleSubscriptionCheckout('Pro')}
                className="action-button-primary"
                style={s.fullBtn}
                disabled={organization.plan === 'Pro' || organization.plan === 'School'}
              >
                {organization.plan === 'Pro' ? 'Current Plan' : organization.plan === 'School' ? 'Upgrade Active' : 'Upgrade to Pro'}
              </button>
            </div>

            <div className={`card-item ${organization.plan === 'School' ? 'active-tier-card' : ''}`} style={s.planCard}>
              <h4 style={s.planTitle}>School / Agency</h4>
              <div style={s.priceAmount}>$79<span style={s.pricePeriod}>/mo</span></div>
              <ul style={s.featureList}>
                <li>✓ Unlimited vocabulary sets</li>
                <li>✓ Unlimited student profiles</li>
                <li>✓ Unlimited AI generation quota</li>
                <li>✓ Full custom branding setup</li>
                <li>✓ Priority support & integrations</li>
              </ul>
              <button
                onClick={() => handleSubscriptionCheckout('School')}
                className="action-button-primary"
                style={s.fullBtn}
                disabled={organization.plan === 'School'}
              >
                {organization.plan === 'School' ? 'Current Plan' : 'Upgrade to School'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen && modalType === 'student'} onClose={() => setIsModalOpen(false)} title="Create Student User Account">
        <form onSubmit={handleAddStudent} className="form-layout">
          <div className="form-group">
            <label>Student Name</label>
            <input type="text" placeholder="e.g. Alice Cooper" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} className="form-input-control" required />
          </div>
          <div className="form-group">
            <label>Login Email</label>
            <input type="email" placeholder="e.g. alice@school.com" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} className="form-input-control" required />
          </div>
          <div className="form-group">
            <label>Login Password</label>
            <input type="password" placeholder="Min 6 chars" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} className="form-input-control" required />
          </div>
          <button type="submit" className="action-button-primary" style={s.fullBtn}>Add Student Account</button>
        </form>
      </Modal>

      <Modal isOpen={isModalOpen && modalType === 'set'} onClose={() => setIsModalOpen(false)} title={setForm.id ? 'Edit Vocabulary Set' : 'Create Vocabulary Word Set'}>
        <form onSubmit={handleSaveWordSet} className="form-layout">
          <div className="form-group">
            <label>Set Title</label>
            <input type="text" value={setForm.title} onChange={(e) => setSetForm({ ...setForm, title: e.target.value })} className="form-input-control" placeholder="e.g. Spanish Food Vocabulary" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={setForm.description} onChange={(e) => setSetForm({ ...setForm, description: e.target.value })} className="form-input-control" placeholder="Brief summary of words..." rows={2} />
          </div>
          <div style={s.langSelectRow}>
            <div className="form-group" style={s.langField}>
              <label>Source Lang (Student reads)</label>
              <select value={setForm.source_lang} onChange={(e) => setSetForm({ ...setForm, source_lang: e.target.value })} className="form-input-control">
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="ar">Arabic (ar)</option>
                <option value="fr">French (fr)</option>
              </select>
            </div>
            <div className="form-group" style={s.langField}>
              <label>Target Lang (Student learns)</label>
              <select value={setForm.target_lang} onChange={(e) => setSetForm({ ...setForm, target_lang: e.target.value })} className="form-input-control">
                <option value="es">Spanish (es)</option>
                <option value="ar">Arabic (ar)</option>
                <option value="en">English (en)</option>
                <option value="fr">French (fr)</option>
              </select>
            </div>
          </div>

          <div style={s.aiBox}>
            <div style={s.aiHeader}>
              <Sparkles size={16} />
              <span>AI Vocabulary Autofill Helper</span>
            </div>
            <div style={s.aiInputRow}>
              <input type="text" placeholder="Topic (e.g. airport, clothing, animals)" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="form-input-control" style={s.wordInput} />
              <button type="button" onClick={handleAiAutofill} className="action-button-primary" disabled={aiLoading || !aiTopic}>
                {aiLoading ? 'Autofilling...' : 'Autofill'}
              </button>
            </div>
            {isFreePlan && (
              <p style={s.aiTrialNote}>✨ {aiTrialsLeft} of 3 free AI generations remaining on the Free plan.</p>
            )}
          </div>

          <div>
            <div style={s.wordsHeader}>
              <h4>Vocabulary Terms List</h4>
              <button type="button" onClick={handleAddWordRow} className="action-button-secondary">+ Add Term Row</button>
            </div>
            <div style={s.wordsList}>
              {setForm.words.map((word, idx) => (
                <div key={idx} style={s.wordRow}>
                  <input type="text" placeholder="Term (e.g. el agua)" value={word.term} onChange={(e) => handleWordFieldChange(idx, 'term', e.target.value)} className="form-input-control" style={s.wordInput} required />
                  <input type="text" placeholder="Translation (water)" value={word.translation} onChange={(e) => handleWordFieldChange(idx, 'translation', e.target.value)} className="form-input-control" style={s.wordInput} required />
                  <input type="text" placeholder="Hint (Fluid)" value={word.hint} onChange={(e) => handleWordFieldChange(idx, 'hint', e.target.value)} className="form-input-control" style={s.wordInput} />
                  <button type="button" onClick={() => handleRemoveWordRow(idx)} className="action-button-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="action-button-primary" style={s.fullBtn}>
            {setForm.id ? 'Save Changes' : 'Create Vocabulary Set'}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isModalOpen && modalType === 'course'} onClose={() => setIsModalOpen(false)} title={courseForm.id ? 'Edit Course Lesson' : 'Write Course Lesson'}>
        <form onSubmit={handleSaveCourse} className="form-layout">
          <div className="form-group">
            <label>Lesson Title</label>
            <input type="text" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} className="form-input-control" placeholder="e.g. Lesson 1: Eating in Madrid" required />
          </div>
          <div className="form-group">
            <label>Lesson Content</label>
            <textarea value={courseForm.content} onChange={(e) => setCourseForm({ ...courseForm, content: e.target.value })} className="form-input-control" placeholder="Write the full reading text content here. Tip: use foreign words in quotes followed by translation like: 'el queso' (cheese) to enable automatic vocabulary extraction!" rows={8} required />
          </div>

          <div style={s.aiBox}>
            <div style={s.aiHeaderBetween}>
              <div style={s.aiTitle}>
                <Sparkles size={16} />
                <span>AI Vocabulary Extraction Helper</span>
              </div>
              <button type="button" onClick={handleAiExtract} className="action-button-secondary" disabled={extractLoading || !courseForm.content}>
                {extractLoading ? 'Extracting...' : 'Extract Words'}
              </button>
            </div>
            {isFreePlan && (
              <p style={s.aiTrialNote}>✨ {aiTrialsLeft} of 3 free AI generations remaining on the Free plan.</p>
            )}
            {extractedWords.length > 0 && (
              <div style={s.extractedBox}>
                <p className="text-muted" style={s.cardDesc}>Extracted Words (will automatically create a linked game set):</p>
                <div>
                  {extractedWords.map((w, idx) => (
                    <div key={idx} style={s.extractedChip}>
                      <strong>{w.term}</strong> <span>→ {w.translation}</span> <span className="text-muted">({w.hint})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Link an Existing Vocab Set (Optional)</label>
            <select value={courseForm.word_set_id} onChange={(e) => setCourseForm({ ...courseForm, word_set_id: e.target.value })} className="form-input-control" disabled={extractedWords.length > 0}>
              <option value="">-- No linked word set --</option>
              {sets.map((sx) => <option key={sx.id} value={sx.id}>{sx.title} ({sx.word_count} words)</option>)}
            </select>
            {extractedWords.length > 0 && (
              <p style={s.linkedTag}>✓ An automatically generated set will be linked.</p>
            )}
          </div>

          <button type="submit" className="action-button-primary" style={s.fullBtn}>
            {courseForm.id ? 'Save Lesson' : 'Publish Lesson'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
