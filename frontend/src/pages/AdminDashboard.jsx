import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Building, 
  Users, 
  Layers, 
  Play, 
  DollarSign, 
  Sparkles, 
  Activity, 
  AlertCircle 
} from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/analytics');
      setData(res);
    } catch (e) {
      setError(e.message || 'Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '50vh', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p>Loading analytics database...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-alert">
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  const { summary, organizations, gameStats, recentUsers } = data;

  return (
    <div className="admin-dashboard-container animate-fade">
      {/* Top Welcome Title */}
      <div className="page-header" style={{ marginBottom: '30px' }}>
        <div>
          <h1 className="page-title">Platform Operator Panel</h1>
          <p className="page-subtitle">EduMatch global metrics, billing statistics, and tenant tracking.</p>
        </div>
        <button onClick={fetchAnalytics} className="action-button-secondary">
          Refresh Database
        </button>
      </div>

      {/* 5-Column Stats Cards Row */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '35px' }}>
        
        {/* MRR Card */}
        <div className="stats-card highlight-revenue">
          <div className="stats-icon-wrapper">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stats-label">MRR (Revenue)</div>
            <div className="stats-value" style={{ color: '#10B981' }}>${summary.mrr}.00</div>
            <div className="stats-change text-success">Active subscription revenue</div>
          </div>
        </div>

        {/* Orgs Card */}
        <div className="stats-card">
          <div className="stats-icon-wrapper">
            <Building size={24} />
          </div>
          <div>
            <div className="stats-label">Total Organizations</div>
            <div className="stats-value">{summary.totalOrganizations}</div>
            <div className="stats-change">{summary.plans.Pro + summary.plans.School} paid, {summary.plans.Free} free</div>
          </div>
        </div>

        {/* Users Card */}
        <div className="stats-card">
          <div className="stats-icon-wrapper">
            <Users size={24} />
          </div>
          <div>
            <div className="stats-label">Platform Users</div>
            <div className="stats-value">{summary.totalUsers}</div>
            <div className="stats-change">Teachers & students</div>
          </div>
        </div>

        {/* Word Sets Card */}
        <div className="stats-card">
          <div className="stats-icon-wrapper">
            <Layers size={24} />
          </div>
          <div>
            <div className="stats-label">Vocabulary Sets</div>
            <div className="stats-value">{summary.totalWordSets}</div>
            <div className="stats-change">Total game vocab packs</div>
          </div>
        </div>

        {/* Games Played Card */}
        <div className="stats-card">
          <div className="stats-icon-wrapper">
            <Play size={24} />
          </div>
          <div>
            <div className="stats-label">Games Completed</div>
            <div className="stats-value">{summary.totalGamesPlayed}</div>
            <div className="stats-change">Student plays tracked</div>
          </div>
        </div>
      </div>

      {/* Middle Row: Plan Distribution & Game Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px', marginBottom: '35px' }}>
        
        {/* Subscriptions Break Down */}
        <div className="card-item" style={{ padding: '25px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--primary-color)' }} />
            Subscription Plan Tier Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Free bar */}
            <div>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                <span style={{ fontWeight: '600' }}>Free Plan ($0/mo)</span>
                <span className="text-muted">{summary.plans.Free} orgs</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${(summary.plans.Free / summary.totalOrganizations) * 100 || 0}%`, height: '100%', background: '#94A3B8' }} />
              </div>
            </div>

            {/* Pro bar */}
            <div>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>Pro Plan ($19/mo)</span>
                <span className="text-muted">{summary.plans.Pro} orgs</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${(summary.plans.Pro / summary.totalOrganizations) * 100 || 0}%`, height: '100%', background: 'var(--primary-color)' }} />
              </div>
            </div>

            {/* School bar */}
            <div>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                <span style={{ fontWeight: '600', color: '#10B981' }}>School Plan ($79/mo)</span>
                <span className="text-muted">{summary.plans.School} orgs</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ width: `${(summary.plans.School / summary.totalOrganizations) * 100 || 0}%`, height: '100%', background: '#10B981' }} />
              </div>
            </div>
            
          </div>
        </div>

        {/* Educational Game Mode Success Analytics */}
        <div className="card-item" style={{ padding: '25px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: 'var(--primary-color)' }} />
            Game Mode Engagement & Student Accuracy
          </h3>
          {gameStats.length === 0 ? (
            <p className="text-muted" style={{ padding: '20px 0' }}>No game history recorded yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Game Mode</th>
                  <th>Completed Plays</th>
                  <th>Average Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {gameStats.map((stat, idx) => (
                  <tr key={idx}>
                    <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>{stat.game_mode}</td>
                    <td>{stat.plays_count} times played</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', color: stat.avg_accuracy >= 80 ? '#10B981' : stat.avg_accuracy >= 50 ? '#F59E0B' : '#EF4444' }}>
                          {stat.avg_accuracy}%
                        </span>
                        <div style={{ width: '60px', height: '6px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${stat.avg_accuracy}%`, height: '100%', background: stat.avg_accuracy >= 80 ? '#10B981' : '#F59E0B' }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Organizations Audits List */}
      <div className="card-item" style={{ padding: '25px', marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Registered School Portals</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Organization</th>
              <th>Slug / Subdomain</th>
              <th>Subscription Plan</th>
              <th>Active Students</th>
              <th>Word Sets</th>
              <th>AI Generations</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id} className="table-hover-row">
                <td style={{ fontWeight: '600' }}>{org.name}</td>
                <td>
                  <code style={{ background: 'var(--bg-main)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                    {org.slug}
                  </code>
                </td>
                <td>
                  <span className={`plan-badge ${org.plan.toLowerCase()}`}>
                    {org.plan}
                  </span>
                </td>
                <td>{org.students_count} students</td>
                <td>{org.sets_count} sets</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>{org.ai_generations_count}</span>
                    {org.plan === 'Free' && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 3 max</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Activity Log */}
      <div className="card-item" style={{ padding: '25px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Global Registration Audit Log</h3>
        <table className="admin-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Email</th>
              <th>System Role</th>
              <th>Organization</th>
              <th>Registered At</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                <td>{u.organization_name || 'System Admin'}</td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
