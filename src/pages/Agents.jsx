import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import './Agents.css';

const RANK_MEDALS = ['🥇', '🥈', '🥉'];
const BONUSES = [500, 300, 200];

function CircularProgress({ percent, color, size = 90 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

export default function Agents() {
  const { users, getRanking } = useData();
  const { currentUser } = useAuth();

  const ranking = useMemo(() => getRanking(), [users]);

  // For team leaders, show only their agents
  const visibleRanking = currentUser.role === 'team_leader'
    ? ranking.filter(a => a.teamId === currentUser.teamId).map((a, i) => ({ ...a, rank: i + 1 }))
    : ranking;

  return (
    <div className="agents-page">
      {/* Podium (top 3) */}
      {visibleRanking.length >= 3 && (
        <div className="podium-section">
          <h3 className="section-title">🏆 المتصدرون</h3>
          <div className="podium">
            {/* 2nd */}
            <div className="podium-item second">
              <div className="podium-medal">🥈</div>
              <div className="podium-avatar">{visibleRanking[1]?.name.charAt(0)}</div>
              <div className="podium-name">{visibleRanking[1]?.name}</div>
              <div className="podium-bookings">{visibleRanking[1]?.bookings} حجز</div>
              <div className="podium-bonus">+{BONUSES[1]} ريال</div>
              <div className="podium-block second-block">2</div>
            </div>
            {/* 1st */}
            <div className="podium-item first">
              <div className="podium-crown">👑</div>
              <div className="podium-medal">🥇</div>
              <div className="podium-avatar gold">{visibleRanking[0]?.name.charAt(0)}</div>
              <div className="podium-name">{visibleRanking[0]?.name}</div>
              <div className="podium-bookings">{visibleRanking[0]?.bookings} حجز</div>
              <div className="podium-bonus">+{BONUSES[0]} ريال</div>
              <div className="podium-block first-block">1</div>
            </div>
            {/* 3rd */}
            <div className="podium-item third">
              <div className="podium-medal">🥉</div>
              <div className="podium-avatar">{visibleRanking[2]?.name.charAt(0)}</div>
              <div className="podium-name">{visibleRanking[2]?.name}</div>
              <div className="podium-bookings">{visibleRanking[2]?.bookings} حجز</div>
              <div className="podium-bonus">+{BONUSES[2]} ريال</div>
              <div className="podium-block third-block">3</div>
            </div>
          </div>
        </div>
      )}

      {/* Full ranking */}
      <h3 className="section-title">📊 أداء جميع الإيجنت</h3>
      <div className="agents-grid">
        {visibleRanking.map((agent) => {
          const stats = agent; // already computed from getRanking
          const isTop3 = agent.rank <= 3;
          const rankColor = agent.rank === 1 ? '#fbbf24' : agent.rank === 2 ? '#94a3b8' : agent.rank === 3 ? '#cd7c2f' : 'rgba(255,255,255,0.3)';

          return (
            <div key={agent.id} className={`agent-card ${isTop3 ? 'top3' : ''}`} style={isTop3 ? { borderColor: `${rankColor}44` } : {}}>
              {/* Header */}
              <div className="agent-card-header">
                <div className="agent-rank" style={{ color: rankColor }}>
                  {isTop3 ? RANK_MEDALS[agent.rank - 1] : `#${agent.rank}`}
                </div>
                <div className="agent-avatar-wrap">
                  <div className="agent-avatar" style={{ background: isTop3 ? `linear-gradient(135deg, ${rankColor}44, ${rankColor}22)` : 'rgba(255,255,255,0.07)', border: `2px solid ${isTop3 ? rankColor : 'transparent'}` }}>
                    {agent.name.charAt(0)}
                  </div>
                  <CircularProgress percent={stats.progress} color={stats.progressColor} size={90} />
                </div>
                <div className="agent-info">
                  <div className="agent-name">{agent.name}</div>
                  <div className="agent-team" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    التيم: {users.find(u => u.id === agent.teamLeaderId)?.name || '—'}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="agent-stats-grid">
                <div className="agent-stat">
                  <span className="stat-val">{stats.total}</span>
                  <span className="stat-lbl">عملاء</span>
                </div>
                <div className="agent-stat">
                  <span className="stat-val green">{stats.bookings}</span>
                  <span className="stat-lbl">حجوزات</span>
                </div>
                <div className="agent-stat">
                  <span className="stat-val" style={{ color: stats.progressColor }}>{stats.progress}%</span>
                  <span className="stat-lbl">التارجت</span>
                </div>
                <div className="agent-stat">
                  <span className="stat-val yellow">{stats.commission}</span>
                  <span className="stat-lbl">كوميشن ريال</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="agent-progress-section">
                <div className="progress-label">
                  <span>التارجت: {stats.bookings} / {stats.target}</span>
                  <span style={{ color: stats.progressColor }}>{stats.progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.min(stats.progress, 100)}%`, background: stats.progressColor }} />
                  {stats.progress > 100 && (
                    <div className="progress-overflow" style={{ width: `${Math.min(stats.progress - 100, 20)}%` }} />
                  )}
                </div>
                <div className="progress-milestones">
                  <span>0</span>
                  <span style={{ position: 'absolute', right: '33%', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>50%</span>
                  <span style={{ position: 'absolute', right: '0', color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>100%</span>
                </div>
              </div>

              {/* Bonus */}
              {agent.rank <= 3 && (
                <div className="agent-bonus" style={{ borderColor: `${rankColor}44`, background: `${rankColor}10` }}>
                  🎁 مكافأة الترتيب: <strong style={{ color: rankColor }}>{BONUSES[agent.rank - 1]} ريال</strong>
                </div>
              )}

              {/* Commission badge */}
              {stats.commission > 0 && (
                <div className="commission-badge">
                  💰 كوميشن إضافي: <strong>{stats.commission} ريال</strong>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary table */}
      <div className="agents-summary">
        <h3 className="section-title">📋 ملخص الأداء</h3>
        <div className="table-wrapper">
          <table className="summary-table">
            <thead>
              <tr>
                <th>الترتيب</th>
                <th>الإيجنت</th>
                <th>التيم</th>
                <th>العملاء</th>
                <th>الحجوزات</th>
                <th>التارجت %</th>
                <th>الكوميشن</th>
                <th>المكافأة</th>
              </tr>
            </thead>
            <tbody>
              {visibleRanking.map(agent => (
                <tr key={agent.id}>
                  <td>
                    <span className="rank-cell">{agent.rank <= 3 ? RANK_MEDALS[agent.rank - 1] : `#${agent.rank}`}</span>
                  </td>
                  <td className="agent-name-cell">{agent.name}</td>
                  <td>{users.find(u => u.id === agent.teamLeaderId)?.name?.split(' ')[0] || '—'}</td>
                  <td>{agent.total}</td>
                  <td><strong className="bookings-num">{agent.bookings}</strong></td>
                  <td>
                    <span className="pct-cell" style={{ color: agent.progressColor }}>{agent.progress}%</span>
                  </td>
                  <td className="commission-cell">{agent.commission > 0 ? `${agent.commission} ريال` : '—'}</td>
                  <td className="bonus-cell">{agent.rank <= 3 ? `${BONUSES[agent.rank - 1]} ريال` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
