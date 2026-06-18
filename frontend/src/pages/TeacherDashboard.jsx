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
  Eye,
  Settings,
  CreditCard,
  Crown
} from 'lucide-react';

export default function TeacherDashboard({ activeTab, user, organization, updateBranding, onLaunchGame }) {
  // Global State
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [sets, setSets] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals / Editors State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(''); // 'student', 'set', 'course'
  
  // Forms State
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
  const [setForm, setSetForm] = useState({ id: null, title: '', description: '', source_lang: 'en', target_lang: 'es', words: [] });
  const [courseForm, setCourseForm] = useState({ id: null, title: '', content: '', word_set_id: '' });
  
  // AI State helpers
  const [aiTopic, setAiTopic] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [extractedWords, setExtractedWords] = useState([]);
  const [extractLoading, setExtractLoading] = useState(false);

  const [brandForm, setBrandForm] = useState({
    name: organization?.name || '',
    logo_data: organization?.logo_data || null,
    theme_primary: organization?.theme_primary || '#4F46E5',
    theme_secondary: organization?.theme_secondary || '#818CF8',
    dark_mode: organization?.dark_mode || false
  });

  // Sync brandForm when organization prop updates (e.g. after login)
  useEffect(() => {
    if (organization) {
      setBrandForm({
        name: organization.name || '',
        logo_data: organization.logo_data || null,
        theme_primary: organization.theme_primary || '#4F46E5',
        theme_secondary: organization.theme_secondary || '#818CF8',
        dark_mode: organization.dark_mode || false
      });
    }
  }, [organization]);

  // Fetch initial dashboard metrics
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
      
      // Calculate basic aggregates
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

  // Handle student creation
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

  // Handle student deletion
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

  // Word set operations
  const handleAddWordRow = () => {
    setSetForm({
      ...setForm,
      words: [...setForm.words, { term: '', translation: '', hint: '' }]
    });
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

  // AI Autofill Trigger
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
      setSetForm({
        ...setForm,
        words: [...setForm.words, ...res.words]
      });
      setSuccess(`Generated ${res.words.length} vocabulary words!`);
      setAiTopic('');
    } catch (e) {
      setError(e.message || 'AI Autofill failed.');
    } finally {
      setAiLoading(false);
    }
  };

  // Save Word Set
  const handleSaveWordSet = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Filter empty terms
    const cleanWords = setForm.words.filter(w => w.term && w.translation);
    if (cleanWords.length === 0) {
      setError('Please add at least one vocabulary term and translation.');
      return;
    }

    try {
      if (setForm.id) {
        // Edit Mode
        await api.put(`/sets/${setForm.id}`, { ...setForm, words: cleanWords });
        setSuccess('Vocabulary set updated successfully!');
      } else {
        // Create Mode
        await api.post('/sets', { ...setForm, words: cleanWords });
        setSuccess('Vocabulary set created successfully!');
      }
      setIsModalOpen(false);
      loadDashboardData();
    } catch (e) {
      setError(e.message || 'Failed to save vocabulary set.');
    }
  };

  // Course extraction AI trigger
  const handleAiExtract = async () => {
    if (!courseForm.content) {
      setError('Please write or paste course textbook content first.');
      return;
    }
    setExtractLoading(true);
    setError('');
    try {
      const res = await api.post('/ai/extract', {
        text: courseForm.content,
        source_lang: 'en',
        target_lang: 'es'
      });
      setExtractedWords(res.words);
      setSuccess(`Extracted ${res.words.length} key vocabulary terms! Review them below.`);
    } catch (e) {
      setError(e.message || 'Failed to extract text words.');
    } finally {
      setExtractLoading(false);
    }
  };

  // Save Course Lesson
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      let linkedSetId = courseForm.word_set_id;
      
      // If AI extracted terms are present, create a linked Word Set automatically!
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

  // Handle Logo Upload and Compression
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Resize/compress to max width 180px, max height 60px
      const base64Logo = await compressImage(file, 180, 60);
      setBrandForm(prev => ({ ...prev, logo_data: base64Logo }));
      setSuccess('Logo loaded and optimized successfully (client-side resize).');
    } catch (err) {
      setError('Image compression failed. Choose a different PNG/JPG file.');
    }
  };

  // Save branding styles
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

  // Subscription Checkout Trigger
  const handleSubscriptionCheckout = async (plan) => {
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/billing/checkout', {
        planName: plan,
        successUrl: `${window.location.origin}${window.location.pathname}?billing=success`,
        cancelUrl: `${window.location.origin}${window.location.pathname}?billing=cancel`
      });

      // Redirect user to Stripe or Mock Checkout Portal
      if (res.url) {
        window.location.href = res.url;
      } else {
        throw new Error('Billing portal redirection failed.');
      }
    } catch (e) {
      setError(e.message || 'Subscription gateway redirection failed.');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex-center" style={{ height: '50vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p>Fetching school records...</p>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard-container animate-fade">
      {/* Alert Notices */}
      {error && (
        <div className="error-alert animate-scale" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}
      {success && (
        <div className="success-alert animate-scale" style={{ marginBottom: '20px' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'dashboard' && stats && (
        <div>
          <div className="page-header" style={{ marginBottom: '30px' }}>
            <div>
              <h1 className="page-title">School Insights</h1>
              <p className="page-subtitle">Welcome back, {user?.name}. Here is what is happening at {organization?.name || 'your school'}.</p>
            </div>
          </div>

          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '35px' }}>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Users size={22} style={{ color: 'var(--primary-color)' }} /></div>
              <div>
                <div className="stats-label">Active Students</div>
                <div className="stats-value">{stats.studentsCount}</div>
                <div className="stats-change">Registered students playing games</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Layers size={22} style={{ color: 'var(--primary-color)' }} /></div>
              <div>
                <div className="stats-label">Vocabulary Sets</div>
                <div className="stats-value">{stats.setsCount}</div>
                <div className="stats-change">Game lists ready</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><BookOpen size={22} style={{ color: 'var(--primary-color)' }} /></div>
              <div>
                <div className="stats-label">Course Lessons</div>
                <div className="stats-value">{stats.coursesCount}</div>
                <div className="stats-change">Lessons containing text courses</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-icon-wrapper"><Play size={22} style={{ color: 'var(--primary-color)' }} /></div>
              <div>
                <div className="stats-label">Games Played</div>
                <div className="stats-value">{stats.totalPlays}</div>
                <div className="stats-change">Total students session completions</div>
              </div>
            </div>
          </div>

          <div className="card-item" style={{ padding: '25px' }}>
            <h3 style={{ marginBottom: '20px' }}>Recent Student Play Activity</h3>
            {stats.reports.length === 0 ? (
              <p className="text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>No students have completed vocabulary games yet. Send them a lesson to start!</p>
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
                    <tr key={idx}>
                      <td style={{ fontWeight: '600' }}>{r.student_name}</td>
                      <td>{r.set_title}</td>
                      <td style={{ textTransform: 'capitalize' }}>{r.game_mode}</td>
                      <td>{r.score} / {r.total_words}</td>
                      <td>
                        <span style={{ fontWeight: '700', color: (r.score/r.total_words) >= 0.8 ? '#10B981' : '#F59E0B' }}>
                          {Math.round((r.score / r.total_words) * 100)}%
                        </span>
                      </td>
                      <td>{new Date(r.completed_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VOCABULARY SETS */}
      {activeTab === 'sets' && (
        <div>
          <div className="page-header" style={{ marginBottom: '30px' }}>
            <div>
              <h1 className="page-title">Vocabulary Game Sets</h1>
              <p className="page-subtitle">Add terms and create interactive matching and quiz games for your students.</p>
            </div>
            <button 
              onClick={() => {
                setSetForm({ id: null, title: '', description: '', source_lang: 'en', target_lang: 'es', words: [{ term: '', translation: '', hint: '' }] });
                setModalType('set');
                setIsModalOpen(true);
              }} 
              className="action-button-primary"
            >
              <Plus size={18} style={{ marginRight: '6px' }} />
              Create Word Set
            </button>
          </div>

          <div className="vocab-sets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
            {sets.length === 0 ? (
              <div style={{ gridColumn: 'span 3', padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No vocabulary sets created yet. Click "Create Word Set" or use AI autofill to build your first one!
              </div>
            ) : (
              sets.map((set) => (
                <div key={set.id} className="card-item hover-translate" style={{ padding: '25px', display: 'flex', flexDirection: 'column', justifySelf: 'stretch', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span className="lang-tag" style={{ background: 'var(--primary-glow)', color: 'var(--primary-color)' }}>
                      {set.source_lang.toUpperCase()} → {set.target_lang.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{set.word_count} words</span>
                  </div>
                  
                  <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{set.title}</h3>
                  <p className="text-muted" style={{ fontSize: '14px', flex: 1, marginBottom: '20px' }}>{set.description || 'No description provided.'}</p>
                  
                  <div className="card-footer-buttons" style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <button 
                      onClick={() => onLaunchGame(set.id, 'matching')}
                      className="action-button-primary"
                      style={{ flex: 1, fontSize: '13px', padding: '8px 12px' }}
                    >
                      Play Game
                    </button>
                    <button 
                      onClick={async () => {
                        const detailed = await api.get(`/sets/${set.id}`);
                        setSetForm(detailed);
                        setModalType('set');
                        setIsModalOpen(true);
                      }}
                      className="action-button-secondary"
                      style={{ fontSize: '13px', padding: '8px 12px' }}
                    >
                      Edit Set
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Delete this word set and all its matching games?')) {
                          api.delete(`/sets/${set.id}`).then(() => {
                            setSuccess('Word set deleted.');
                            loadDashboardData();
                          });
                        }
                      }}
                      className="action-button-danger"
                      style={{ padding: '8px' }}
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

      {/* TAB 3: COURSES & TEXTBOOK LESSONS */}
      {activeTab === 'courses' && (
        <div>
          <div className="page-header" style={{ marginBottom: '30px' }}>
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
              <Plus size={18} style={{ marginRight: '6px' }} />
              Write Lesson
            </button>
          </div>

          <div className="courses-list-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {courses.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No courses or textbook lessons written yet. Click "Write Lesson" to draft your first module.
              </div>
            ) : (
              courses.map((course) => (
                <div key={course.id} className="card-item" style={{ padding: '25px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '6px' }}>{course.title}</h3>
                    <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      <span>Character length: {course.content.length} chars</span>
                      {course.word_set_title ? (
                        <span style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Linked Vocab Set: {course.word_set_title}</span>
                      ) : (
                        <span style={{ fontStyle: 'italic' }}>No game linked</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
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
                      style={{ padding: '10px' }}
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

      {/* TAB 4: STUDENTS MANAGEMENT */}
      {activeTab === 'students' && (
        <div>
          <div className="page-header" style={{ marginBottom: '30px' }}>
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
              <Plus size={18} style={{ marginRight: '6px' }} />
              Add Student
            </button>
          </div>

          <div className="card-item" style={{ padding: '25px' }}>
            {students.length === 0 ? (
              <p className="text-muted" style={{ padding: '30px 0', textAlign: 'center' }}>No students added yet. Click "Add Student" to provision student accounts.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email Login</th>
                    <th>Registered Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td style={{ fontWeight: '600' }}>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{new Date(student.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteStudent(student.id)} 
                          className="action-button-danger"
                          style={{ padding: '8px' }}
                        >
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

      {/* TAB 5: CUSTOM BRANDING */}
      {activeTab === 'branding' && (
        <div>
          <div className="page-header" style={{ marginBottom: '30px' }}>
            <div>
              <h1 className="page-title">Custom Styling & Themes</h1>
              <p className="page-subtitle">White-label your portal. Adjust headers, accent colors, logo layouts, and dark modes.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
            {/* Theme settings Form */}
            <div className="card-item" style={{ padding: '30px' }}>
              <form onSubmit={handleSaveBranding}>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Portal Name</label>
                  <input 
                    type="text" 
                    value={brandForm.name} 
                    onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                    className="form-input-control" 
                    required 
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Organization Logo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="form-input-control" 
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Note: Files are resized and compressed client-side to keep load times rapid.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Primary Accent Color</label>
                    <input 
                      type="color" 
                      value={brandForm.theme_primary} 
                      onChange={(e) => setBrandForm({ ...brandForm, theme_primary: e.target.value })}
                      style={{ width: '100%', height: '40px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Secondary Color</label>
                    <input 
                      type="color" 
                      value={brandForm.theme_secondary} 
                      onChange={(e) => setBrandForm({ ...brandForm, theme_secondary: e.target.value })}
                      style={{ width: '100%', height: '40px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
                  <input 
                    type="checkbox" 
                    id="dark_mode_toggle"
                    checked={brandForm.dark_mode} 
                    onChange={(e) => setBrandForm({ ...brandForm, dark_mode: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="dark_mode_toggle" style={{ fontWeight: '600', cursor: 'pointer' }}>Enable Dark Theme by Default</label>
                </div>

                <button type="submit" className="action-button-primary" style={{ width: '100%' }}>
                  Apply Custom Branding
                </button>
              </form>
            </div>

            {/* Live mockup layout preview panel */}
            <div>
              <h3 style={{ marginBottom: '15px' }}>Live Brand Preview</h3>
              <div 
                style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  boxShadow: 'var(--shadow-lg)',
                  background: brandForm.dark_mode ? '#0B0F19' : '#F8FAFC',
                  color: brandForm.dark_mode ? '#F8FAFC' : '#0F172A',
                  fontFamily: 'Plus Jakarta Sans, sans-serif'
                }}
              >
                {/* Mockup Header */}
                <div 
                  style={{ 
                    padding: '15px 20px', 
                    background: brandForm.dark_mode ? '#151D30' : '#FFFFFF', 
                    borderBottom: `2px solid ${brandForm.theme_primary}`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}
                >
                  {brandForm.logo_data ? (
                    <img src={brandForm.logo_data} alt="Custom Logo" style={{ maxHeight: '30px' }} />
                  ) : (
                    <span style={{ fontWeight: '800', fontSize: '18px', color: brandForm.theme_primary }}>{brandForm.name || 'EduMatch'}</span>
                  )}
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>Portal Preview</span>
                </div>

                {/* Mockup Body */}
                <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', marginBottom: '20px', opacity: 0.8 }}>Choose a vocabulary course to begin playing matching sessions.</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                    <div 
                      style={{ 
                        padding: '12px 20px', 
                        background: brandForm.theme_primary, 
                        color: '#FFFFFF', 
                        borderRadius: '6px', 
                        fontWeight: '600',
                        fontSize: '13px',
                        boxShadow: `0 4px 6px -1px ${brandForm.theme_primary}33`
                      }}
                    >
                      Button Primary Accent
                    </div>
                    <div 
                      style={{ 
                        padding: '12px 20px', 
                        background: brandForm.dark_mode ? '#242E42' : '#E2E8F0', 
                        color: brandForm.dark_mode ? '#F8FAFC' : '#475569', 
                        borderRadius: '6px', 
                        fontWeight: '600',
                        fontSize: '13px'
                      }}
                    >
                      Secondary Button
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PLAN & BILLING */}
      {activeTab === 'subscription' && (
        <div>
          <div className="page-header" style={{ marginBottom: '30px' }}>
            <div>
              <h1 className="page-title">Manage Subscriptions</h1>
              <p className="page-subtitle">Upgrade plan limits to support more vocabulary sets, students, and AI helper resources.</p>
            </div>
          </div>

          {/* Current plan card */}
          <div 
            className="card-item highlight-revenue" 
            style={{ 
              padding: '30px', 
              marginBottom: '35px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderLeft: '5px solid var(--primary-color)' 
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`plan-badge ${organization.plan.toLowerCase()}`} style={{ fontSize: '14px', padding: '4px 10px' }}>
                  {organization.plan} Plan
                </span>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Current Organization tier</span>
              </div>
              <h3 style={{ fontSize: '24px', marginBottom: '15px' }}>{organization.name} Limits Usage</h3>
              
              <div style={{ display: 'flex', gap: '30px', fontSize: '14px' }}>
                <div>
                  <strong>Word Sets:</strong> {stats?.setsCount} / {organization.plan === 'Free' ? 3 : organization.plan === 'Pro' ? 50 : 'Unlimited'}
                </div>
                <div>
                  <strong>Students:</strong> {stats?.studentsCount} / {organization.plan === 'Free' ? 5 : organization.plan === 'Pro' ? 100 : 'Unlimited'}
                </div>
                <div>
                  <strong>AI Generations:</strong> {organization.ai_generations_count} / {organization.plan === 'Free' ? '3 total' : 'Unlimited'}
                </div>
              </div>
            </div>
            {organization.plan === 'Free' && (
              <div style={{ background: 'var(--primary-glow)', padding: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Crown size={24} style={{ color: 'var(--primary-color)' }} />
                <div>
                  <h4 style={{ color: 'var(--primary-color)' }}>Unlock unlimited limits</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pro starts at just $19 per month.</p>
                </div>
              </div>
            )}
          </div>

          {/* Plan Comparison Cards */}
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
            
            {/* Free Card */}
            <div className={`card-item ${organization.plan === 'Free' ? 'active-tier-card' : ''}`} style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
              <h4 style={{ fontSize: '20px', marginBottom: '10px' }}>Free Sandbox</h4>
              <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '20px' }}>$0<span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '30px', flex: 1 }}>
                <li>✓ Max 3 vocabulary sets</li>
                <li>✓ Max 5 student profiles</li>
                <li>✓ 3 total AI generations trial</li>
                <li style={{ color: 'var(--text-muted)' }}>✗ Custom branding logo/colors</li>
                <li style={{ color: 'var(--text-muted)' }}>✗ Text course links</li>
              </ul>
              <button disabled className="action-button-secondary" style={{ width: '100%' }}>
                {organization.plan === 'Free' ? 'Current Plan' : 'Basic Tier'}
              </button>
            </div>

            {/* Pro Card */}
            <div className={`card-item ${organization.plan === 'Pro' ? 'active-tier-card' : ''}`} style={{ padding: '30px', borderTop: '4px solid var(--primary-color)', display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
              <h4 style={{ fontSize: '20px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Teacher Pro 
                <span style={{ background: 'var(--primary-glow)', color: 'var(--primary-color)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px' }}>Popular</span>
              </h4>
              <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '20px' }}>$19<span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '30px', flex: 1 }}>
                <li>✓ Max 50 vocabulary sets</li>
                <li>✓ Max 100 student profiles</li>
                <li>✓ Unlimited AI autofills</li>
                <li>✓ Full custom branding customization</li>
                <li>✓ Interactive HTML games for reading links</li>
              </ul>
              <button 
                onClick={() => handleSubscriptionCheckout('Pro')}
                className="action-button-primary" 
                style={{ width: '100%' }}
                disabled={organization.plan === 'Pro' || organization.plan === 'School'}
              >
                {organization.plan === 'Pro' ? 'Current Plan' : organization.plan === 'School' ? 'Upgrade Active' : 'Upgrade to Pro'}
              </button>
            </div>

            {/* School Card */}
            <div className={`card-item ${organization.plan === 'School' ? 'active-tier-card' : ''}`} style={{ padding: '30px', borderTop: '4px solid #10B981', display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
              <h4 style={{ fontSize: '20px', marginBottom: '10px' }}>School / Agency</h4>
              <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '20px' }}>$79<span style={{ fontSize: '14px', fontWeight: '400', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', marginBottom: '30px', flex: 1 }}>
                <li>✓ Unlimited vocabulary sets</li>
                <li>✓ Unlimited student profiles</li>
                <li>✓ Unlimited AI generation quota</li>
                <li>✓ Full custom branding setup</li>
                <li>✓ Priority support & integrations</li>
              </ul>
              <button 
                onClick={() => handleSubscriptionCheckout('School')}
                className="action-button-primary" 
                style={{ width: '100%', backgroundColor: '#10B981', borderColor: '#10B981', boxShadow: 'none' }}
                disabled={organization.plan === 'School'}
              >
                {organization.plan === 'School' ? 'Current Plan' : 'Upgrade to School'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POPUP MODALS */}

      {/* MODAL 1: ADD STUDENT */}
      <Modal isOpen={isModalOpen && modalType === 'student'} onClose={() => setIsModalOpen(false)} title="Create Student User Account">
        <form onSubmit={handleAddStudent} className="form-layout">
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Student Name</label>
            <input 
              type="text" 
              placeholder="e.g. Alice Cooper"
              value={studentForm.name} 
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              className="form-input-control" 
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Login Email</label>
            <input 
              type="email" 
              placeholder="e.g. alice@school.com"
              value={studentForm.email} 
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              className="form-input-control" 
              required 
            />
          </div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Login Password</label>
            <input 
              type="password" 
              placeholder="Min 6 chars"
              value={studentForm.password} 
              onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
              className="form-input-control" 
              required 
            />
          </div>
          <button type="submit" className="action-button-primary" style={{ width: '100%' }}>
            Add Student Account
          </button>
        </form>
      </Modal>

      {/* MODAL 2: WORD SET EDITOR / CREATOR */}
      <Modal 
        isOpen={isModalOpen && modalType === 'set'} 
        onClose={() => setIsModalOpen(false)} 
        title={setForm.id ? "Edit Vocabulary Set" : "Create Vocabulary Word Set"}
      >
        <form onSubmit={handleSaveWordSet} className="form-layout">
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Set Title</label>
            <input 
              type="text" 
              value={setForm.title} 
              onChange={(e) => setSetForm({ ...setForm, title: e.target.value })}
              className="form-input-control" 
              placeholder="e.g. Spanish Food Vocabulary"
              required 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Description</label>
            <textarea 
              value={setForm.description} 
              onChange={(e) => setSetForm({ ...setForm, description: e.target.value })}
              className="form-input-control" 
              placeholder="Brief summary of words..."
              rows={2}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Source Lang (Student reads)</label>
              <select 
                value={setForm.source_lang} 
                onChange={(e) => setSetForm({ ...setForm, source_lang: e.target.value })}
                className="form-input-control"
              >
                <option value="en">English (en)</option>
                <option value="es">Spanish (es)</option>
                <option value="ar">Arabic (ar)</option>
                <option value="fr">French (fr)</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Target Lang (Student learns)</label>
              <select 
                value={setForm.target_lang} 
                onChange={(e) => setSetForm({ ...setForm, target_lang: e.target.value })}
                className="form-input-control"
              >
                <option value="es">Spanish (es)</option>
                <option value="ar">Arabic (ar)</option>
                <option value="en">English (en)</option>
                <option value="fr">French (fr)</option>
              </select>
            </div>
          </div>

          {/* AI Autofill Subsection */}
          <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary-color)' }}>
              <Sparkles size={16} />
              <span>AI Vocabulary Autofill Helper</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Topic (e.g. airport, clothing, animals)"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="form-input-control"
                style={{ flex: 1, height: '36px' }}
              />
              <button 
                type="button" 
                onClick={handleAiAutofill} 
                className="action-button-primary"
                style={{ padding: '8px 12px', fontSize: '12px' }}
                disabled={aiLoading || !aiTopic}
              >
                {aiLoading ? 'Autofilling...' : 'Autofill'}
              </button>
            </div>
          </div>

          {/* Words Rows List */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '14px' }}>Vocabulary Terms List</h4>
              <button 
                type="button" 
                onClick={handleAddWordRow} 
                className="action-button-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                + Add Term Row
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto', paddingRight: '5px' }}>
              {setForm.words.map((word, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Term (e.g. el agua)" 
                    value={word.term} 
                    onChange={(e) => handleWordFieldChange(idx, 'term', e.target.value)}
                    className="form-input-control"
                    style={{ flex: 1.2, height: '36px' }}
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Translation (water)" 
                    value={word.translation} 
                    onChange={(e) => handleWordFieldChange(idx, 'translation', e.target.value)}
                    className="form-input-control"
                    style={{ flex: 1.2, height: '36px' }}
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Hint (Fluid)" 
                    value={word.hint} 
                    onChange={(e) => handleWordFieldChange(idx, 'hint', e.target.value)}
                    className="form-input-control"
                    style={{ flex: 1.5, height: '36px' }}
                  />
                  <button 
                    type="button" 
                    onClick={() => handleRemoveWordRow(idx)}
                    className="action-button-danger"
                    style={{ padding: '8px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="action-button-primary" style={{ width: '100%' }}>
            {setForm.id ? 'Save Changes' : 'Create Vocabulary Set'}
          </button>
        </form>
      </Modal>

      {/* MODAL 3: COURSE LESSON EDITOR / CREATOR */}
      <Modal 
        isOpen={isModalOpen && modalType === 'course'} 
        onClose={() => setIsModalOpen(false)} 
        title={courseForm.id ? "Edit Course Lesson" : "Write Course Lesson"}
      >
        <form onSubmit={handleSaveCourse} className="form-layout">
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Lesson Title</label>
            <input 
              type="text" 
              value={courseForm.title} 
              onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
              className="form-input-control" 
              placeholder="e.g. Lesson 1: Eating in Madrid"
              required 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Lesson Content</label>
            <textarea 
              value={courseForm.content} 
              onChange={(e) => setCourseForm({ ...courseForm, content: e.target.value })}
              className="form-input-control" 
              placeholder="Write the full reading text content here. Tip: teachers can use foreign words in quotes followed by translation like: 'el queso' (cheese) to enable automatic vocabulary extraction!"
              rows={8}
              required
            />
          </div>

          {/* AI Extraction Subsection */}
          <div style={{ background: 'var(--bg-main)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--primary-color)' }}>
                <Sparkles size={16} />
                <span>AI Vocabulary Extraction Helper</span>
              </div>
              <button 
                type="button" 
                onClick={handleAiExtract} 
                className="action-button-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                disabled={extractLoading || !courseForm.content}
              >
                {extractLoading ? 'Extracting...' : 'Extract Words'}
              </button>
            </div>
            
            {extractedWords.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Extracted Words (will automatically create a linked matching game):</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                  {extractedWords.map((w, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '5px', fontSize: '11px', background: 'var(--bg-card)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      <strong>{w.term}</strong> <span>→ {w.translation}</span> <span style={{ color: 'var(--text-muted)' }}>({w.hint})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Link an Existing Vocab Set (Optional)</label>
            <select 
              value={courseForm.word_set_id} 
              onChange={(e) => setCourseForm({ ...courseForm, word_set_id: e.target.value })}
              className="form-input-control"
              disabled={extractedWords.length > 0}
            >
              <option value="">-- No linked word set --</option>
              {sets.map(s => <option key={s.id} value={s.id}>{s.title} ({s.word_count} words)</option>)}
            </select>
            {extractedWords.length > 0 && (
              <p style={{ fontSize: '11px', color: 'var(--color-success)', marginTop: '4px' }}>
                ✓ An automatically generated set will be linked.
              </p>
            )}
          </div>

          <button type="submit" className="action-button-primary" style={{ width: '100%' }}>
            {courseForm.id ? 'Save Lesson' : 'Publish Lesson'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
