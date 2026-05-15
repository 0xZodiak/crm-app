import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { leads, users, getAgentStats, getTeamLeaderStats, getRanking, globalDateFrom, globalDateTo } = useData();
  const { currentUser } = useAuth();

  const stats = useMemo(() => {
    let filteredLeads = leads;
    if (currentUser.role === 'team_leader') {
      filteredLeads = leads.filter(l => l.teamId === currentUser.teamId);
    } else if (currentUser.role === 'agent') {
      filteredLeads = leads.filter(l => l.agentId === currentUser.id);
    }

    if (globalDateFrom) filteredLeads = filteredLeads.filter(l => l.addedDate >= globalDateFrom);
    if (globalDateTo)   filteredLeads = filteredLeads.filter(l => l.addedDate <= globalDateTo);

    const total = filteredLeads.length;
    const bookings = filteredLeads.filter(l => l.status === 'مؤكد').length;
    const interested = filteredLeads.filter(l => l.status === 'مهتم').length;
    const potential = filteredLeads.filter(l => l.status === 'محتمل').length;
    const ourCustomer = filteredLeads.filter(l => l.status === 'عميلنا').length;
    const conversionRate = total > 0 ? ((bookings / total) * 100).toFixed(1) : 0;

    return { total, bookings, interested, potential, ourCustomer, conversionRate, filteredLeads };
  }, [leads, currentUser, globalDateFrom, globalDateTo]);

  const teamLeaders = users.filter(u => u.role === 'team_leader');
  const ranking = getRanking();

  // Chart data: bookings per TL
  const tlChartData = teamLeaders.map(tl => {
    const s = getTeamLeaderStats(tl.id);
    return { name: tl.name.split(' ')[0], حجوزات: s.bookings, هدف: s.target };
  });

  // Pie chart: status distribution
  const pieData = [
    { name: 'مؤكد', value: stats.bookings },
    { name: 'مهتم', value: stats.interested },
    { name: 'محتمل', value: stats.potential },
    { name: 'عميلنا', value: stats.ourCustomer },
  ].filter(d => d.value > 0);

  // Timeline: bookings over last 7 days
  const timelineData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLeads = stats.filteredLeads.filter(l => l.addedDate === dateStr);
      days.push({
        day: d.toLocaleDateString('ar-EG', { weekday: 'short' }),
        عملاء: dayLeads.length,
        حجوزات: dayLeads.filter(l => l.status === 'مؤكد').length,
      });
    }
    return days;
  }, [stats.filteredLeads]);

  const topAgent = ranking[0];
  const topTL = teamLeaders.map(tl => {
    const s = getTeamLeaderStats(tl.id);
    return { ...tl, bookings: s.bookings };
  }).sort((a, b) => b.bookings - a.bookings)[0];

  return (
    <div className="dashboard">
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.total}</span>
            <span className="kpi-label">إجمالي العملاء</span>
          </div>
          <div className="kpi-bg-icon">👥</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon">✅</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.bookings}</span>
            <span className="kpi-label">إجمالي الحجوزات</span>
          </div>
          <div className="kpi-bg-icon">✅</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon">🔥</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.interested}</span>
            <span className="kpi-label">عملاء مهتمون</span>
          </div>
          <div className="kpi-bg-icon">🔥</div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-icon">📈</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.conversionRate}%</span>
            <span className="kpi-label">نسبة التحويل</span>
          </div>
          <div className="kpi-bg-icon">📈</div>
        </div>
        <div className="kpi-card pink">
          <div className="kpi-icon">🤝</div>
          <div className="kpi-info">
            <span className="kpi-value">{stats.ourCustomer}</span>
            <span className="kpi-label">عملاؤنا السابقون</span>
          </div>
          <div className="kpi-bg-icon">🤝</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-row">
        {/* Timeline chart */}
        <div className="chart-card wide">
          <h3 className="chart-title">📅 نشاط آخر 7 أيام</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: 'Cairo', color: 'rgba(255,255,255,0.7)' }} />
              <Line type="monotone" dataKey="عملاء" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              <Line type="monotone" dataKey="حجوزات" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="chart-card narrow">
          <h3 className="chart-title">🎯 توزيع الحالات</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                style={{ fontFamily: 'Cairo', fontSize: 11 }}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {pieData.map((d, i) => (
              <div key={i} className="pie-item">
                <span className="pie-dot" style={{ background: COLORS[i] }} />
                <span className="pie-name">{d.name}</span>
                <span className="pie-val">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team leaders performance */}
      {currentUser.role !== 'agent' && (
        <div className="charts-row">
          <div className="chart-card wide">
            <h3 className="chart-title">👔 أداء التيم ليدر</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tlChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13, fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: 'Cairo', color: 'rgba(255,255,255,0.7)' }} />
                <Bar dataKey="حجوزات" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="هدف" fill="rgba(255,255,255,0.08)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top performers */}
          <div className="chart-card narrow">
            <h3 className="chart-title">🏆 أفضل الأداء</h3>
            <div className="top-performers">
              {topAgent && (
                <div className="performer-card agent-p">
                  <div className="performer-badge">🥇 أفضل إيجنت</div>
                  <div className="performer-name">{topAgent.name}</div>
                  <div className="performer-stat">{topAgent.bookings} حجز</div>
                  <div className="performer-commission">
                    💰 كوميشن: {topAgent.commission} ريال
                  </div>
                </div>
              )}
              {topTL && (
                <div className="performer-card tl-p">
                  <div className="performer-badge">🥇 أفضل تيم ليدر</div>
                  <div className="performer-name">{topTL.name}</div>
                  <div className="performer-stat">{topTL.bookings} حجز</div>
                  <div className="performer-commission">
                    🎯 من هدف 200
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TL target cards */}
      {currentUser.role !== 'agent' && (
        <div className="tl-cards">
          <h3 className="section-title">👥 أداء فرق البيع (الانطلاق)</h3>
          <div className="tl-grid">
            {(() => {
              const teamIds = [...new Set(teamLeaders.map(tl => tl.teamId))].filter(Boolean);
              return teamIds.map(teamId => {
                const teamLeadersForThisTeam = teamLeaders.filter(t => t.teamId === teamId);
                const teamLeads = leads.filter(l => l.teamId === teamId);
                
                const bookings = teamLeads.filter(l => l.status === 'مؤكد').length;
                const total = teamLeads.length;
                const target = 200 * teamLeadersForThisTeam.length;
                const progress = (bookings / target) * 100;
                
                const percent = Math.min(progress, 100);
                const color = progress >= 100 ? '#22c55e' : progress >= 50 ? '#eab308' : '#ef4444';

                return (
                  <div className="tl-card" key={teamId}>
                    <div className="tl-card-header">
                      <div className="tl-avatars-stack" style={{ display: 'flex', gap: '-8px' }}>
                        {teamLeadersForThisTeam.map(tl => (
                          <div key={tl.id} className="tl-avatar" style={{ border: '2px solid #1e1e2e' }}>{tl.name.charAt(0)}</div>
                        ))}
                      </div>
                      <div>
                        <div className="tl-name">{teamLeadersForThisTeam.map(tl => tl.name).join(' & ')}</div>
                        <div className="tl-meta">قادة الفريق</div>
                      </div>
                      <div className="tl-bookings" style={{ color }}>{bookings}</div>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${percent}%`, background: color }} />
                      </div>
                      <span className="progress-pct" style={{ color }}>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="tl-stats">
                      <span>العملاء: {total}</span>
                      <span>الهدف: {target}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
