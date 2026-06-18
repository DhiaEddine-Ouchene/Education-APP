import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Mail, Lock, Shield, GraduationCap, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom Tenant Configuration (visual skinning)
  const [tenantSlug, setTenantSlug] = useState(localStorage.getItem('edumatch_tenant_slug') || '');
  const [tenantConfig, setTenantConfig] = useState(null);

  useEffect(() => {
    if (tenantSlug) {
      api.get(`/auth/tenant/${tenantSlug}`)
        .then(data => {
          setTenantConfig(data);
          localStorage.setItem('edumatch_tenant_slug', tenantSlug);
        })
        .catch(() => {
          console.warn('Invalid tenant slug saved, cleaning up.');
          setTenantConfig(null);
        });
    }
  }, [tenantSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      onLoginSuccess(data.token, data.user, data.organization);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearTenant = () => {
    localStorage.removeItem('edumatch_tenant_slug');
    setTenantSlug('');
    setTenantConfig(null);
    // Reload styles back to default
    const root = document.documentElement;
    root.style.setProperty('--primary-color', '#4F46E5');
    root.style.setProperty('--secondary-color', '#818CF8');
    document.body.classList.remove('dark');
  };

  return (
    <div className="login-page-container">
      {/* Background blobs for premium depth styling */}
      <div className="bg-blob-1" />
      <div className="bg-blob-2" />

      <div className="login-card-wrapper glassmorphism">
        
        {/* Brand Header */}
        <div className="login-header">
          {tenantConfig && tenantConfig.logo_data ? (
            <img src={tenantConfig.logo_data} alt={tenantConfig.name} className="login-tenant-logo" />
          ) : (
            <div className="login-logo-fallback animate-scale">
              <GraduationCap size={40} style={{ color: 'var(--primary-color)' }} />
            </div>
          )}
          
          <h2 className="login-title">
            {tenantConfig ? `Welcome to ${tenantConfig.name}` : 'Sign In to EduMatch'}
          </h2>
          <p className="login-subtitle">
            {tenantConfig 
              ? 'Vocabulary lessons and matching games' 
              : 'The multi-tenant language-education platform'
            }
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="login-error-card animate-scale">
            <Shield size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="teacher@academy.com or student@vivid.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="login-submit-btn" 
            disabled={loading}
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
          </button>
        </form>

        {/* Tenant Details / Footer Link */}
        <div className="login-footer">
          {tenantConfig ? (
            <button onClick={handleClearTenant} className="login-text-link">
              ← Log in to general portal
            </button>
          ) : (
            <>
              <p>Looking for your custom school login? Enter organization slug:</p>
              <div className="tenant-slug-selector" style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="vivid-academy" 
                  className="tenant-slug-input"
                  id="tenant-search"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setTenantSlug(e.target.value);
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('tenant-search');
                    if (input && input.value) setTenantSlug(input.value);
                  }}
                  className="tenant-slug-btn"
                >
                  Go
                </button>
              </div>
              
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <p>New to EduMatch? <button onClick={onSwitchToRegister} className="login-text-link">Register your organization</button></p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
