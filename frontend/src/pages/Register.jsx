import React, { useState } from 'react';
import api from '../utils/api';
import { Mail, Lock, User, Building, Landmark, ArrowRight, Shield } from 'lucide-react';

export default function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically generate clean URL slugs as they type their org name
  const handleOrgNameChange = (e) => {
    const val = e.target.value;
    setOrgName(val);
    
    // Sluggify
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric characters with hyphens
      .replace(/(^-|-$)+/g, '');   // Trim leading/trailing hyphens
    
    setOrgSlug(slug);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!orgName || !orgSlug || !name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/register', {
        orgName,
        orgSlug,
        name,
        email,
        password
      });
      onRegisterSuccess(data.token, data.user, data.organization);
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different email or organization slug.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="bg-blob-1" />
      <div className="bg-blob-2" />

      <div className="login-card-wrapper glassmorphism" style={{ maxWidth: '500px' }}>
        
        {/* Header */}
        <div className="login-header" style={{ marginBottom: '25px' }}>
          <div className="login-logo-fallback animate-scale">
            <Building size={40} style={{ color: 'var(--primary-color)' }} />
          </div>
          <h2 className="login-title">Register Your School</h2>
          <p className="login-subtitle">Create your branded language education portal in seconds</p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="login-error-card animate-scale" style={{ marginBottom: '20px' }}>
            <Shield size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="orgName">Organization / School Name</label>
            <div className="input-with-icon">
              <Building size={18} className="input-icon" />
              <input
                id="orgName"
                type="text"
                placeholder="e.g. Vivid Language Academy"
                value={orgName}
                onChange={handleOrgNameChange}
                required
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="orgSlug">Portal URL Identifier (Slug)</label>
            <div className="input-with-icon">
              <Landmark size={18} className="input-icon" />
              <input
                id="orgSlug"
                type="text"
                placeholder="e.g. vivid-academy"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required
              />
            </div>
            <p className="input-helper-text" style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-muted)' }}>
              Your portal will be skinned at: <strong>?tenant={orgSlug || 'your-slug'}</strong>
            </p>
          </div>

          <div className="login-input-group">
            <label htmlFor="name">Teacher Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="name"
                type="text"
                placeholder="e.g. Professor Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="email">Work Email</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="smith@academy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="password">Create Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                placeholder="Minimum 6 characters"
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
            {loading ? 'Registering School...' : 'Create Account'}
            {!loading && <ArrowRight size={18} style={{ marginLeft: '8px' }} />}
          </button>
        </form>

        <div className="login-footer" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
          <p>Already have an account? <button onClick={onSwitchToLogin} className="login-text-link">Sign In</button></p>
        </div>
      </div>
    </div>
  );
}
