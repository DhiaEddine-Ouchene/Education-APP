import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { compressImage } from '../utils/compress';
import { User, Shield, AlertCircle, CheckCircle, Camera, Sliders, Palette, Lock } from 'lucide-react';

export default function AccountSettings({ user, organization, onUpdateUser, onUpdateBranding }) {
  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'branding'
  
  // Profile Form States
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    profile_picture: user?.profile_picture || null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Branding Form States
  const [brandForm, setBrandForm] = useState({
    name: organization?.name || '',
    logo_data: organization?.logo_data || null,
    theme_primary: organization?.theme_primary || '#4F46E5',
    theme_secondary: organization?.theme_secondary || '#818CF8',
    dark_mode: organization?.dark_mode || false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync state if props change
  useEffect(() => {
    if (user) {
      setProfileForm(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        profile_picture: user.profile_picture || null
      }));
    }
  }, [user]);

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

  // Handle Profile Picture upload & compression
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      setError('');
      // Compress avatar image to max 150x150 pixels for high speed base64 load
      const base64Avatar = await compressImage(file, 150, 150);
      setProfileForm(prev => ({ ...prev, profile_picture: base64Avatar }));
      setSuccess('Profile picture loaded and optimized successfully.');
    } catch (err) {
      setError(err.message || 'Image upload failed. Try another PNG or JPG.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Organization Logo upload & compression
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      setError('');
      const base64Logo = await compressImage(file, 180, 60);
      setBrandForm(prev => ({ ...prev, logo_data: base64Logo }));
      setSuccess('Logo loaded and optimized successfully.');
    } catch (err) {
      setError(err.message || 'Logo upload failed. Try another file.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.put('/auth/profile', {
        name: profileForm.name,
        email: profileForm.email,
        profile_picture: profileForm.profile_picture,
        currentPassword: profileForm.currentPassword || undefined,
        newPassword: profileForm.newPassword || undefined
      });
      
      // Update session user in App.jsx
      onUpdateUser(response.user);
      
      setProfileForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setSuccess('Profile configurations updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save profile changes.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Branding Save
  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.put('/organizations/branding', brandForm);
      onUpdateBranding(response.organization);
      setSuccess('Custom branding configurations applied successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update organization branding.');
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="account-settings-container animate-fade">
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

      {/* Main Header */}
      <div className="page-header" style={{ marginBottom: '25px' }}>
        <div>
          <h1 className="page-title">Account Settings</h1>
          <p className="page-subtitle">Configure personal credentials, avatar settings, and portal design layouts.</p>
        </div>
      </div>

      {/* Sub Tabs Toggle (Only for teachers/admins) */}
      {isTeacher && (
        <div 
          style={{ 
            display: 'flex', 
            gap: '10px', 
            borderBottom: '1px solid var(--border-color)', 
            marginBottom: '30px',
            paddingBottom: '2px'
          }}
        >
          <button
            onClick={() => setActiveSubTab('profile')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '10px 20px',
              fontWeight: '600',
              fontSize: '14px',
              color: activeSubTab === 'profile' ? 'var(--primary-color)' : 'var(--text-muted)',
              borderBottom: activeSubTab === 'profile' ? '2px solid var(--primary-color)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <User size={16} />
            My Profile
          </button>
          <button
            onClick={() => setActiveSubTab('branding')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '10px 20px',
              fontWeight: '600',
              fontSize: '14px',
              color: activeSubTab === 'branding' ? 'var(--primary-color)' : 'var(--text-muted)',
              borderBottom: activeSubTab === 'branding' ? '2px solid var(--primary-color)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Palette size={16} />
            Portal Design & Themes
          </button>
        </div>
      )}

      {/* RENDER ACTIVE PANEL */}
      
      {/* PANEL 1: PROFILE MANAGEMENT */}
      {activeSubTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', alignItems: 'start' }} className="account-profile-grid">
          {/* Avatar Settings */}
          <div className="card-item" style={{ padding: '30px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '16px' }}>Account Avatar</h3>
            
            <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 20px' }}>
              <div 
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '50%', 
                  background: 'var(--primary-glow)',
                  color: 'var(--primary-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '42px',
                  fontWeight: '700',
                  overflow: 'hidden',
                  border: '2px solid var(--border-color)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {profileForm.profile_picture ? (
                  <img src={profileForm.profile_picture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (profileForm.name || '?').charAt(0).toUpperCase()
                )}
              </div>
              
              <label 
                htmlFor="avatar-upload-input" 
                style={{ 
                  position: 'absolute', 
                  bottom: '0', 
                  right: '0', 
                  background: 'var(--primary-color)', 
                  color: '#FFFFFF',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--bg-card)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Camera size={16} />
              </label>
              
              <input 
                type="file" 
                id="avatar-upload-input" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                style={{ display: 'none' }} 
              />
            </div>
            
            <p className="text-muted" style={{ fontSize: '12px' }}>
              Upload your profile picture. Max size 2MB. Stored locally inside your portal.
            </p>
          </div>

          {/* Profile Form Details */}
          <div className="card-item" style={{ padding: '30px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Personal Credentials</h3>
            
            <form onSubmit={handleSaveProfile} className="form-layout">
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Full Name</label>
                <input 
                  type="text" 
                  value={profileForm.name} 
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="form-input-control" 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>Email Address</label>
                <input 
                  type="email" 
                  value={profileForm.email} 
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="form-input-control" 
                  required 
                />
              </div>

              {/* Password Section */}
              <div 
                style={{ 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '20px',
                  marginTop: '20px',
                  marginBottom: '20px'
                }}
              >
                <h4 style={{ fontSize: '14px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={15} /> Change Password (Leave blank to keep current)
                </h4>
                
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>Current Password</label>
                  <input 
                    type="password" 
                    value={profileForm.currentPassword} 
                    onChange={(e) => setProfileForm({ ...profileForm, currentPassword: e.target.value })}
                    className="form-input-control" 
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>New Password</label>
                    <input 
                      type="password" 
                      value={profileForm.newPassword} 
                      onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                      className="form-input-control" 
                      placeholder="Min 6 characters"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>Confirm New Password</label>
                    <input 
                      type="password" 
                      value={profileForm.confirmPassword} 
                      onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                      className="form-input-control" 
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                className="action-button-primary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Saving Changes...' : 'Save Profile Settings'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PANEL 2: PORTAL BRANDING (TEACHER ONLY) */}
      {activeSubTab === 'branding' && isTeacher && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', alignItems: 'start' }} className="account-branding-grid">
          {/* Theme Settings Form */}
          <div className="card-item" style={{ padding: '30px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Portal White-Labeling</h3>
            
            <form onSubmit={handleSaveBranding}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>Portal Brand Name</label>
                <input 
                  type="text" 
                  value={brandForm.name} 
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  className="form-input-control" 
                  required 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>Portal Logo Picture</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="form-input-control" 
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  PNG/JPG. Resized client-side to max 180x60px for high performance loads.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>Primary Brand Accent</label>
                  <input 
                    type="color" 
                    value={brandForm.theme_primary} 
                    onChange={(e) => setBrandForm({ ...brandForm, theme_primary: e.target.value })}
                    style={{ width: '100%', height: '40px', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', fontSize: '13px' }}>Secondary Accent</label>
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
                  id="branding_dark_mode_toggle"
                  checked={brandForm.dark_mode} 
                  onChange={(e) => setBrandForm({ ...brandForm, dark_mode: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="branding_dark_mode_toggle" style={{ fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>
                  Enable Portal Dark Mode as Default
                </label>
              </div>

              <button 
                type="submit" 
                className="action-button-primary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Applying Settings...' : 'Apply Portal Branding'}
              </button>
            </form>
          </div>

          {/* Live Mockup Layout Preview */}
          <div>
            <h3 style={{ marginBottom: '15px', fontSize: '16px' }}>Real-time Stylings Preview</h3>
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
              {/* Header */}
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
                  <img src={brandForm.logo_data} alt="Logo" style={{ maxHeight: '30px' }} />
                ) : (
                  <span style={{ fontWeight: '800', fontSize: '18px', color: brandForm.theme_primary }}>{brandForm.name || 'EduMatch'}</span>
                )}
                <span style={{ fontSize: '11px', opacity: 0.7 }}>Portal Skin</span>
              </div>

              {/* Body */}
              <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', marginBottom: '20px', opacity: 0.8 }}>Practice your translations and complete language courses.</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
                  <div 
                    style={{ 
                      padding: '10px 18px', 
                      background: brandForm.theme_primary, 
                      color: '#FFFFFF', 
                      borderRadius: '6px', 
                      fontWeight: '600',
                      fontSize: '12px',
                      boxShadow: `0 4px 6px -1px ${brandForm.theme_primary}33`
                    }}
                  >
                    Primary Accent Button
                  </div>
                  <div 
                    style={{ 
                      padding: '10px 18px', 
                      background: brandForm.dark_mode ? '#242E42' : '#E2E8F0', 
                      color: brandForm.dark_mode ? '#F8FAFC' : '#475569', 
                      borderRadius: '6px', 
                      fontWeight: '600',
                      fontSize: '12px'
                    }}
                  >
                    Secondary Button
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
