import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import './Users.css';

const ROLE_LABELS = {
  admin:       { label: 'مدير النظام', color: '#fbbf24', icon: '👑', bg: 'rgba(251,191,36,0.1)',    border: 'rgba(251,191,36,0.25)' },
  team_leader: { label: 'تيم ليدر',   color: '#818cf8', icon: '👔', bg: 'rgba(129,140,248,0.1)',   border: 'rgba(129,140,248,0.25)' },
  agent:       { label: 'إيجنت',       color: '#34d399', icon: '🧑‍💼', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)' },
};

const TARGET_AGENT = 150;
const TARGET_TL    = 200;

function progressColor(pct) {
  if (pct >= 110) return '#8b5cf6';
  if (pct >= 100) return '#22c55e';
  if (pct >= 50)  return '#eab308';
  return '#ef4444';
}

function SmallLeadsList({ leads }) {
  const [expanded, setExpanded] = useState(false);
  if (!leads || leads.length === 0) return null;

  const STATUS_COLORS = {
    'مؤكد':   { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    'مهتم':   { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
    'محتمل':  { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  };

  const displayed = expanded ? leads : leads.slice(0, 3);

  return (
    <div className="small-leads-list">
      <div className="sll-header" onClick={() => setExpanded(!expanded)}>
        <span>العملاء ({leads.length})</span>
        <span>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="sll-items">
          {displayed.map(lead => {
            const sc = STATUS_COLORS[lead.status] || STATUS_COLORS['محتمل'];
            return (
              <div key={lead.id} className="sll-item">
                <div className="sll-info">
                  <div className="sll-name">{lead.name}</div>
                  <div className="sll-date">{lead.addedDate}</div>
                </div>
                <div className="sll-status" style={{ background: sc.bg, color: sc.color, borderColor: sc.border }}>
                  {lead.status}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Users() {
  const { users, getAgentStats, getTeamLeaderStats } = useData();
  const { currentUser } = useAuth();
  
  const isAdmin = currentUser.role === 'admin';

  const admins      = users.filter(u => u.role === 'admin');
  let tls           = users.filter(u => u.role === 'team_leader');
  
  if (!isAdmin) {
    tls = tls.filter(t => t.id === currentUser.id);
  }

  const allAgents   = users.filter(u => u.role === 'agent');

  return (
    <div className="users-page">

      {/* ── Summary chips (Admins only) ───────────────────────────── */}
      {isAdmin && (
        <div className="users-summary">
          {[
            { label: 'المديرون',  count: admins.length,    ...ROLE_LABELS.admin },
            { label: 'التيم ليدر', count: tls.length,      ...ROLE_LABELS.team_leader },
            { label: 'الإيجنت',   count: allAgents.length, ...ROLE_LABELS.agent },
          ].map(s => (
            <div className="summary-card" key={s.label} style={{ background: s.bg, borderColor: s.border }}>
              <span className="summary-icon">{s.icon}</span>
              <div>
                <div className="summary-count" style={{ color: s.color }}>{s.count}</div>
                <div className="summary-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Admins strip (Admins only) ────────────────────────────── */}
      {isAdmin && (
        <div className="admins-strip">
          <h3 className="section-title">👑 المديرون</h3>
          <div className="admins-row">
            {admins.map(admin => (
              <div key={admin.id} className="admin-chip">
                <div className="admin-avatar">{admin.name.charAt(0)}</div>
                <div>
                  <div className="admin-name">{admin.name}</div>
                  <div className="admin-role">مدير النظام</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Teams (grouped by teamId) ────────────────────────────── */}
      {(() => {
        const teamIds = [...new Set(allAgents.map(a => a.teamId))].filter(Boolean);
        
        return teamIds.map(teamId => {
          const teamLeadersForThisTeam = tls.filter(t => t.teamId === teamId);
          const teamAgents = allAgents.filter(a => a.teamId === teamId);
          
          // Combined stats for the whole team
          const teamBookings = teamAgents.reduce((sum, a) => sum + getAgentStats(a.id).bookings, 0);
          const teamTotal = teamAgents.reduce((sum, a) => sum + getAgentStats(a.id).total, 0);
          const teamPct = (teamBookings / (TARGET_TL * teamLeadersForThisTeam.length)) * 100;
          const teamColor = progressColor(teamPct);

          return (
            <div key={teamId} className="team-section">
              {/* Team Leaders header */}
              <div className="tl-header">
                <div className="tl-avatars-group" style={{ display: 'flex', gap: '-10px' }}>
                  {teamLeadersForThisTeam.map(tl => (
                    <div key={tl.id} className="tl-avatar-lg" style={{ border: '2px solid #1e1e2e' }}>{tl.name.charAt(0)}</div>
                  ))}
                </div>

                <div className="tl-header-info">
                  <div className="tl-header-name">
                    {teamLeadersForThisTeam.map(tl => tl.name).join(' & ')}
                  </div>
                  <span className="tl-role-tag" style={{ color: ROLE_LABELS.team_leader.color, background: ROLE_LABELS.team_leader.bg, borderColor: ROLE_LABELS.team_leader.border }}>
                    {ROLE_LABELS.team_leader.icon} تيم ليدرز
                  </span>
                </div>

                {/* Team progress */}
                <div className="tl-progress-block">
                  <div className="tl-prog-nums">
                    <span style={{ color: teamColor, fontWeight: 900, fontSize: 26 }}>{teamBookings}</span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>/ {TARGET_TL * teamLeadersForThisTeam.length}</span>
                  </div>
                  <div className="tl-prog-bar-track">
                    <div className="tl-prog-bar-fill" style={{ width: `${Math.min(teamPct, 100)}%`, background: teamColor }} />
                  </div>
                  <div className="tl-prog-pct" style={{ color: teamColor }}>{teamPct.toFixed(1)}% من هدف الفريق</div>
                </div>

                <div className="tl-mini-stats">
                  <div className="tl-mini-stat"><span>{teamTotal}</span><span>عملاء</span></div>
                  <div className="tl-mini-stat"><span style={{ color: teamColor }}>{teamBookings}</span><span>حجز</span></div>
                  <div className="tl-mini-stat"><span>{TARGET_TL * teamLeadersForThisTeam.length}</span><span>هدف</span></div>
                </div>
              </div>

              {/* Agent cards */}
              <div className="team-agents-grid">
                {teamAgents.map(agent => {
                  const s   = getAgentStats(agent.id);
                  const pct = s.progress;
                  const col = progressColor(pct);

                  return (
                    <div key={agent.id} className="agent-perf-card">
                      {/* ... rest of agent card is same ... */}
                      <div className="apc-header">
                        <div className="apc-avatar">{agent.name.charAt(0)}</div>
                        <div className="apc-info">
                          <div className="apc-name">{agent.name}</div>
                          <span className="apc-tag" style={{ color: ROLE_LABELS.agent.color, background: ROLE_LABELS.agent.bg, borderColor: ROLE_LABELS.agent.border }}>
                            {ROLE_LABELS.agent.icon} إيجنت
                          </span>
                        </div>
                        <div className="apc-bookings" style={{ color: col }}>{s.bookings}</div>
                      </div>
                      <div className="apc-prog-label">
                        <span>{s.bookings} حجز من {TARGET_AGENT}</span>
                        <span style={{ color: col, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div className="apc-prog-track">
                        <div className="apc-prog-fill" style={{ width: `${Math.min(pct, 100)}%`, background: col }} />
                      </div>
                      <div className="apc-stats">
                        <div className="apc-stat"><span>{s.total}</span><span>عملاء</span></div>
                        <div className="apc-stat"><span style={{ color: col }}>{s.bookings}</span><span>حجوزات</span></div>
                        <div className="apc-stat">
                          <span style={{ color: s.commission > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)' }}>
                            {s.commission > 0 ? `${s.commission} ريال` : '—'}
                          </span>
                          <span>كوميشن</span>
                        </div>
                      </div>
                      <div className="apc-leads-wrap" style={{ marginTop: '16px' }}>
                        <SmallLeadsList leads={s.leads} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        });
      })()}

      {/* ── Login credentials guide (Admins only) ─────────────────── */}
      {isAdmin && (
        <div className="creds-guide">
          <h3 className="section-title">🔑 بيانات تسجيل الدخول</h3>
          <div className="creds-table-wrap">
            <table className="creds-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>الدور</th>
                  <th>اسم المستخدم</th>
                  <th>كلمة المرور</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const r = ROLE_LABELS[u.role];
                  const pass = u.role === 'admin' ? 'admin123' : u.role === 'team_leader' ? 'leader123' : 'agent123';
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: 'white' }}>{u.name}</td>
                      <td>
                        <span className="role-tag" style={{ background: r.bg, borderColor: r.border, color: r.color }}>
                          {r.icon} {r.label}
                        </span>
                      </td>
                      <td><code className="cred-code">{u.username}</code></td>
                      <td><code className="cred-code">••••••••</code></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
