import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import './AgentDashboard.css';

const TARGET = 150;

function CircularProgress({ percent, color, size = 130 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const capped = Math.min(percent, 100);
  const offset = circ - (capped / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
      {/* fill — rotated so it starts from top */}
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
    </svg>
  );
}

function ProgressColor(pct) {
  if (pct >= 110) return '#8b5cf6';
  if (pct >= 100) return '#22c55e';
  if (pct >= 50)  return '#eab308';
  return '#ef4444';
}

function ProgressLabel(pct) {
  if (pct >= 110) return '🚀 تجاوزت الهدف!';
  if (pct >= 100) return '🎯 حققت التارجت!';
  if (pct >= 50)  return '💪 في المنتصف';
  return '⚡ ابدأ قوي!';
}

export default function AgentDashboard() {
  const { leads, globalDateFrom, globalDateTo } = useData();
  const { currentUser } = useAuth();

  const myLeads = useMemo(() => {
    let filtered = leads.filter(l => l.agentId === currentUser.id);
    if (globalDateFrom) filtered = filtered.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   filtered = filtered.filter(l => l.addedDate <= globalDateTo);
    return filtered;
  }, [leads, currentUser.id, globalDateFrom, globalDateTo]);

  const bookings  = myLeads.filter(l => l.status === 'مؤكد' || l.status === 'عميلنا').length;
  const interested = myLeads.filter(l => l.status === 'مهتم').length;
  const potential  = myLeads.filter(l => l.status === 'محتمل').length;
  const pct        = Math.round((bookings / TARGET) * 1000) / 10; // one decimal
  const totalValue = myLeads
    .filter(l => l.status === 'مؤكد' || l.status === 'عميلنا')
    .reduce((sum, l) => sum + (Number(l.bookingValue) || 0), 0);
  const commission = bookings > TARGET ? (bookings - TARGET) * 20 : 0;
  const color      = ProgressColor(pct);
  const label      = ProgressLabel(pct);

  // Latest 5 leads
  const recent = [...myLeads]
    .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate))
    .slice(0, 5);

  const STATUS_STYLE = {
    'مؤكد':   { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80',  border: 'rgba(34,197,94,0.3)' },
    'مهتم':   { bg: 'rgba(99,102,241,0.15)',  color: '#818cf8',  border: 'rgba(99,102,241,0.3)' },
    'محتمل':  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24',  border: 'rgba(245,158,11,0.3)' },
    'عميلنا': { bg: 'rgba(139,92,246,0.15)',  color: '#a78bfa',  border: 'rgba(139,92,246,0.3)' },
  };

  return (
    <div className="agent-dash">
      {/* Welcome banner */}
      <div className="agent-welcome">
        <div className="welcome-text">
          <h2>أهلاً، {currentUser.name} 👋</h2>
          <p>هذا هو أداؤك الشخصي – استمر في التقدم!</p>
        </div>
        <div className="welcome-badge" style={{ background: `${color}20`, borderColor: `${color}50`, color }}>
          {label}
        </div>
      </div>

      {/* Main progress card */}
      <div className="agent-main-card" style={{ borderColor: `${color}33` }}>
        {/* Circular progress */}
        <div className="circular-wrap">
          <CircularProgress percent={pct} color={color} size={140} />
          <div className="circular-inner">
            <span className="circ-pct" style={{ color }}>{pct}%</span>
            <span className="circ-lbl">التارجت</span>
          </div>
        </div>

        {/* Stats */}
        <div className="main-stats">
          <div className="main-stat-row">
            <div className="main-stat">
              <span className="ms-val">{myLeads.length}</span>
              <span className="ms-lbl">إجمالي العملاء</span>
            </div>
            <div className="main-stat highlight" style={{ borderColor: `${color}40`, background: `${color}10` }}>
              <span className="ms-val" style={{ color }}>{bookings}</span>
              <span className="ms-lbl">✅ حجوزات مؤكدة</span>
            </div>
            <div className="main-stat">
              <span className="ms-val">{TARGET}</span>
              <span className="ms-lbl">🎯 التارجت</span>
            </div>
            <div className="main-stat">
              <span className="ms-val yellow">{totalValue.toLocaleString()}</span>
              <span className="ms-lbl">💰 إجمالي القيمة (ريال)</span>
            </div>
            <div className="main-stat">
              <span className="ms-val">{TARGET - bookings > 0 ? TARGET - bookings : 0}</span>
              <span className="ms-lbl">⏳ متبقي للتارجت</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bar-section">
            <div className="bar-label">
              <span>{bookings} حجز من {TARGET}</span>
              <span style={{ color }}>{pct}%</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
            </div>
            <div className="bar-milestones">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Commission card */}
      <div className="commission-section">
        <div className="comm-card" style={commission > 0
          ? { borderColor: 'rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.07)' }
          : { borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="comm-icon">{commission > 0 ? '💰' : '🎯'}</div>
          <div className="comm-body">
            <div className="comm-title">الكوميشن</div>
            {commission > 0 ? (
              <>
                <div className="comm-amount">{commission} <span>ريال</span></div>
                <div className="comm-formula">({bookings} - {TARGET}) × 20 ريال</div>
              </>
            ) : (
              <>
                <div className="comm-amount" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }}>0 ريال</div>
                <div className="comm-formula">ابدأ الكوميشن بعد {TARGET} حجز</div>
              </>
            )}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="status-breakdown">
          {[
            { label: 'مؤكد', val: bookings,   ...STATUS_STYLE['مؤكد'] },
            { label: 'مهتم', val: interested, ...STATUS_STYLE['مهتم'] },
            { label: 'محتمل', val: potential,  ...STATUS_STYLE['محتمل'] },
          ].map(s => (
            <div key={s.label} className="breakdown-item" style={{ background: s.bg, borderColor: s.border }}>
              <span className="bd-val" style={{ color: s.color }}>{s.val}</span>
              <span className="bd-lbl" style={{ color: s.color }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent leads */}
      {recent.length > 0 && (
        <div className="recent-section">
          <h3 className="section-title">📋 آخر العملاء المضافين</h3>
          <div className="recent-list">
            {recent.map(lead => {
              const ss = STATUS_STYLE[lead.status] || {};
              return (
                <div key={lead.id} className="recent-item">
                  <div className="recent-avatar">{lead.name.charAt(0)}</div>
                  <div className="recent-info">
                    <div className="recent-name">{lead.name}</div>
                    <div className="recent-meta">
                      {lead.phone} · {lead.addedDate}
                      {lead.bookingValue && <span style={{ color: '#4ade80', fontWeight: 'bold', marginLeft: '10px' }}> (💰 {lead.bookingValue} ريال)</span>}
                    </div>
                  </div>
                  <span className="recent-status" style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                    {lead.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
