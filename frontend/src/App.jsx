import React, { useState, useEffect } from 'react';
import api from './utils/api';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';

// Dashboard Panels
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import GamePlayer from './pages/GamePlayer';
import AccountSettings from './pages/AccountSettings';

import { Menu, GraduationCap } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('edumatch_token'));
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  
  // Mobile UI Sidebar Drawer Toggling State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Custom navigation targets for fullscreen experiences
  const [activeGame, setActiveGame] = useState(null); // { setId, mode }
  const [activeLesson, setActiveLesson] = useState(null); // { lesson }
  
  // Registration page view toggle
  const [view, setView] = useState('login'); // 'login', 'register'

  // Apply organization theme styles dynamically
  const applyBranding = (org) => {
    const root = document.documentElement;
    if (org) {
      root.style.setProperty('--primary-color', org.theme_primary || '#4F46E5');
      root.style.setProperty('--secondary-color', org.theme_secondary || '#818CF8');
      root.style.setProperty('--primary-glow', `${org.theme_primary}26`); // 15% opacity hex
      
      if (org.dark_mode) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    } else {
      // Restore default branding colors
      root.style.setProperty('--primary-color', '#4F46E5');
      root.style.setProperty('--secondary-color', '#818CF8');
      root.style.setProperty('--primary-glow', 'rgba(79, 70, 229, 0.15)');
      document.body.classList.remove('dark');
    }
  };

  // Listen for API session-expired events (fired instead of hard redirect)
  useEffect(() => {
    const onExpired = () => handleLogout();
    window.addEventListener('edumatch:session-expired', onExpired);
    return () => window.removeEventListener('edumatch:session-expired', onExpired);
  }, []);

  // On initialization or token changes, fetch profile
  useEffect(() => {
    const initSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await api.get('/auth/me');
        setUser(data.user);
        setOrganization(data.organization);
        
        // Apply theme settings
        applyBranding(data.organization);

        // Select default landing tab based on role
        if (data.user.role === 'admin') setActiveTab('analytics');
        else if (data.user.role === 'teacher') setActiveTab('dashboard');
        else if (data.user.role === 'student') setActiveTab('courses');
        
      } catch (err) {
        console.error('Session loading failed:', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [token]);


  // Read tenant slug query params or local storage for initial skinning
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tenantSlug = params.get('tenant') || localStorage.getItem('edumatch_tenant_slug');
    
    if (tenantSlug && !organization) {
      // Load branding settings before login
      api.get(`/auth/tenant/${tenantSlug}`)
        .then((org) => {
          applyBranding(org);
          localStorage.setItem('edumatch_tenant_slug', tenantSlug);
        })
        .catch((e) => console.warn('Could not load pre-auth tenant branding:', e));
    }
  }, [organization]);

  const handleLoginSuccess = (newToken, userData, orgData) => {
    localStorage.setItem('edumatch_token', newToken);
    if (orgData) {
      localStorage.setItem('edumatch_tenant_slug', orgData.slug);
    }
    setUser(userData);
    setOrganization(orgData);
    applyBranding(orgData);
    setToken(newToken);
    
    if (userData.role === 'admin') setActiveTab('analytics');
    else if (userData.role === 'teacher') setActiveTab('dashboard');
    else if (userData.role === 'student') setActiveTab('courses');
  };

  const handleLogout = () => {
    api.clearToken();
    localStorage.removeItem('edumatch_token');
    // We retain tenant slug in localStorage so the login page stays branded!
    setUser(null);
    setOrganization(null);
    setToken(null);
    setActiveGame(null);
    setActiveLesson(null);
    applyBranding(null);
  };

  const updateOrganizationBranding = (updatedOrg) => {
    setOrganization(updatedOrg);
    applyBranding(updatedOrg);
  };

  const updateProfileUser = (updatedUser) => {
    setUser(updatedUser);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: 'Outfit, sans-serif', color: 'var(--text-muted)' }}>Loading EduMatch...</p>
      </div>
    );
  }

  // Auth Gate
  if (!user) {
    return view === 'register' ? (
      <Register 
        onRegisterSuccess={handleLoginSuccess} 
        onSwitchToLogin={() => setView('login')} 
      />
    ) : (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onSwitchToRegister={() => setView('register')} 
      />
    );
  }

  // Fullscreen Game Mode Override
  if (activeGame) {
    return (
      <GamePlayer 
        setId={activeGame.setId} 
        mode={activeGame.mode} 
        onClose={() => setActiveGame(null)} 
      />
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Top Header (hidden on large displays) */}
      <header className="mobile-header">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="hamburger-btn"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
        >
          <Menu size={24} />
        </button>

        <div className="mobile-logo-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {organization?.logo_data ? (
            <img src={organization.logo_data} alt={organization.name} style={{ maxHeight: '28px' }} />
          ) : (
            <>
              <GraduationCap size={20} style={{ color: 'var(--primary-color)' }} />
              <span style={{ fontFamily: 'Outfit', fontWeight: '800', fontSize: '16px' }}>EduMatch</span>
            </>
          )}
        </div>

        <div 
          onClick={() => { setActiveTab('account'); setActiveLesson(null); }}
          className="mobile-avatar-badge user-avatar" 
          style={{ 
            width: '32px', 
            height: '32px', 
            fontSize: '13px', 
            cursor: 'pointer',
            overflow: 'hidden'
          }}
        >
          {user.profile_picture ? (
            <img src={user.profile_picture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (user.name || user.email || '?').charAt(0).toUpperCase()
          )}
        </div>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Dynamic Sidebar */}
      <Sidebar 
        user={user} 
        organization={organization} 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setActiveLesson(null); // Clear active sub-views
        }} 
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onCloseDrawer={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace Panels */}
      <main className="app-main-content">
        
        {/* Sub-view: Reading a lesson */}
        {activeLesson ? (
          <div className="course-lesson-reading">
            <button 
              onClick={() => setActiveLesson(null)}
              className="action-button-secondary"
              style={{ marginBottom: '20px' }}
            >
              ← Back to Lessons
            </button>
            <div className="card-item" style={{ padding: '30px' }}>
              <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>{activeLesson.title}</h1>
              <div 
                style={{ fontSize: '16px', lineHeight: '1.7', whiteSpace: 'pre-line', color: 'var(--text-muted)' }}
                dir={activeLesson.word_set_title && activeLesson.word_set_title.toLowerCase().includes('arabic') ? 'rtl' : 'ltr'}
              >
                {activeLesson.content}
              </div>
              
              {activeLesson.word_set_id && (
                <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                  <h3 style={{ marginBottom: '15px' }}>Linked Vocabulary Lesson</h3>
                  <button 
                    onClick={() => setActiveGame({ setId: activeLesson.word_set_id, mode: 'flashcards' })}
                    className="action-button-primary"
                  >
                    Play Vocabulary Games
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Main Tab Panels */
          <>
            {/* UNIFIED ACCOUNT TAB */}
            {activeTab === 'account' && (
              <AccountSettings 
                user={user} 
                organization={organization}
                onUpdateUser={updateProfileUser}
                onUpdateBranding={updateOrganizationBranding}
              />
            )}

            {/* SUPERADMIN VIEW */}
            {user.role === 'admin' && activeTab === 'analytics' && (
              <AdminDashboard />
            )}
            
            {/* TEACHER VIEW */}
            {user.role === 'teacher' && activeTab !== 'account' && (
              <TeacherDashboard 
                activeTab={activeTab} 
                user={user}
                organization={organization}
                updateBranding={updateOrganizationBranding}
                onLaunchGame={(setId, mode) => setActiveGame({ setId, mode })}
              />
            )}

            {/* STUDENT VIEW */}
            {user.role === 'student' && activeTab !== 'account' && (
              <StudentDashboard 
                activeTab={activeTab} 
                user={user}
                organization={organization}
                onReadLesson={(lesson) => setActiveLesson(lesson)}
                onPlayGame={(setId, mode) => setActiveGame({ setId, mode })}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
