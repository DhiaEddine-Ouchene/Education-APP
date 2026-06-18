import React from 'react';
import { 
  BookOpen, 
  Settings, 
  Users, 
  BarChart3, 
  Layers, 
  CreditCard, 
  LogOut, 
  ShieldAlert, 
  GraduationCap, 
  Activity,
  Palette,
  X
} from 'lucide-react';

export default function Sidebar({ user, organization, activeTab, setActiveTab, onLogout, onCloseDrawer, isOpen }) {
  if (!user) return null;

  // Define navigation based on role
  const getNavLinks = () => {
    let links = [];
    switch (user.role) {
      case 'admin':
        links = [
          { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
          { id: 'organizations', label: 'Organizations', icon: ShieldAlert }
        ];
        break;
      case 'teacher':
        links = [
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'sets', label: 'Vocabulary Sets', icon: Layers },
          { id: 'courses', label: 'Courses & Lessons', icon: BookOpen },
          { id: 'students', label: 'Student Accounts', icon: Users },
          { id: 'branding', label: 'Custom Branding', icon: Palette },
          { id: 'subscription', label: 'Plan & Billing', icon: CreditCard }
        ];
        break;
      case 'student':
        links = [
          { id: 'courses', label: 'My Lessons', icon: BookOpen },
          { id: 'sets', label: 'Vocabulary Games', icon: GraduationCap },
          { id: 'history', label: 'My Progress', icon: Activity }
        ];
        break;
      default:
        break;
    }
    // Append Account Settings for all users
    links.push({ id: 'account', label: 'My Account', icon: Settings });
    return links;
  };

  const navLinks = getNavLinks();

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    if (onCloseDrawer) {
      onCloseDrawer(); // Auto-close drawer on mobile layouts
    }
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand Profile */}
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {organization && organization.logo_data ? (
            <img src={organization.logo_data} alt={organization.name} className="sidebar-logo" />
          ) : (
            <div className="sidebar-logo-fallback">
              <GraduationCap size={24} style={{ color: 'var(--primary-color)' }} />
              <span className="brand-text">EduMatch</span>
            </div>
          )}
          
          {/* Mobile Drawer Close Icon */}
          {onCloseDrawer && (
            <button 
              onClick={onCloseDrawer} 
              className="sidebar-close-btn"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'none' // Controlled by CSS media queries
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {organization && (
          <div className="sidebar-tenant-name" style={{ marginTop: '8px' }}>{organization.name}</div>
        )}
      </div>

      {/* User Info Card */}
      <div className="sidebar-user-card">
        <div className="user-avatar" style={{ overflow: 'hidden' }}>
          {user.profile_picture ? (
            <img src={user.profile_picture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (user.name || user.email || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="user-details" style={{ flex: 1 }}>
          <div className="user-name" title={user.name || user.email}>{user.name || user.email}</div>
          <div className="user-role-badge">{user.role}</div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        <ul>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <li key={link.id}>
                <button
                  onClick={() => handleNavClick(link.id)}
                  className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
                  style={isActive ? { borderLeft: '4px solid var(--primary-color)', color: 'var(--primary-color)' } : {}}
                >
                  <Icon size={18} className="nav-icon" />
                  <span>{link.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Footer */}
      <div className="sidebar-footer">
        <button 
          onClick={() => {
            onLogout();
            if (onCloseDrawer) onCloseDrawer();
          }} 
          className="sidebar-logout-btn"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
