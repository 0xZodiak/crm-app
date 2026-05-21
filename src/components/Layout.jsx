import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import ProfileModal from './ProfileModal';
import './Layout.css';

const NAV_ITEMS = [
  { path: 'dashboard', icon: '📊', label: 'لوحة التحكم', roles: ['admin', 'team_leader', 'agent'] },
  { path: 'leads', icon: '👥', label: 'العملاء', roles: ['admin', 'team_leader', 'agent'] },
  { path: 'trips', icon: '🗺️', label: 'إدارة الرحلات', roles: ['admin', 'team_leader', 'agent'] },
  { path: 'agents', icon: '🏆', label: 'أداء الإيجنت', roles: ['admin', 'team_leader'] },
  { path: 'users', icon: '⚙️', label: 'إدارة الفرق', roles: ['admin', 'team_leader'] },
];

export default function Layout({ children, activePage, setActivePage }) {
  const { currentUser, logout } = useAuth();
  const { globalDateFrom, setGlobalDateFrom, globalDateTo, setGlobalDateTo, notifications, markNotificationRead } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState('departure'); // 'departure' or 'return'
  
  const handleGlobalDateChange = (type, val) => {
    if (type === 'from') {
      if (globalDateTo && val > globalDateTo) {
        setGlobalDateTo('');
      }
      setGlobalDateFrom(val);
    } else {
      if (globalDateFrom && val < globalDateFrom) {
        setGlobalDateFrom('');
      }
      setGlobalDateTo(val);
    }
  };

  const isReturnNotif = (n) => n.type === 'return' || n.message?.includes('ستعود') || n.message?.includes('عودة');

  const unreadCount = notifications?.filter(n => !n.read).length || 0;
  const unreadDepartureCount = notifications?.filter(n => !n.read && !isReturnNotif(n)).length || 0;
  const unreadReturnCount = notifications?.filter(n => !n.read && isReturnNotif(n)).length || 0;

  const roleLabel = {
    admin: { label: 'مدير النظام', color: '#fbbf24', icon: '👑' },
    team_leader: { label: 'تيم ليدر', color: '#818cf8', icon: '👔' },
    agent: { label: 'إيجنت', color: '#34d399', icon: '🧑‍💼' },
  };
  const role = roleLabel[currentUser?.role] || {};

  return (
    <div className={`layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`} dir="rtl">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-box">CRM</div>
            {sidebarOpen && <span className="logo-text">إدارة المبيعات</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.filter(item => item.roles.includes(currentUser?.role)).map(item => (
            <button
              key={item.path}
              className={`nav-item ${activePage === item.path ? 'active' : ''}`}
              onClick={() => setActivePage(item.path)}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {sidebarOpen && activePage === item.path && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="user-card" onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <div className="user-avatar" style={{ background: `linear-gradient(135deg, ${role.color}44, ${role.color}22)`, border: `2px solid ${role.color}` }}>
                {currentUser?.name?.charAt(0)}
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser?.name}</span>
                <span className="user-role" style={{ color: role.color }}>{role.icon} {role.label}</span>
              </div>
              <span className="user-arrow">▾</span>
            </div>
          )}
          {userMenuOpen && sidebarOpen && (
            <div className="user-menu">
              <button className="user-menu-item profile" onClick={() => { setProfileOpen(true); setUserMenuOpen(false); }}>
                👤 الملف الشخصي
              </button>
              <button className="user-menu-item logout" onClick={logout}>
                🚪 تسجيل الخروج
              </button>
            </div>
          )}
          {!sidebarOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <button className="logout-icon-btn" onClick={() => setProfileOpen(true)} title="الملف الشخصي" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</button>
              <button className="logout-icon-btn" onClick={logout} title="تسجيل الخروج">🚪</button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-right">
            <h2 className="page-title">
              {NAV_ITEMS.find(i => i.path === activePage)?.icon}{' '}
              {NAV_ITEMS.find(i => i.path === activePage)?.label}
            </h2>
          </div>
          <div className="top-bar-left">
            <div className="global-date-filter" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '14px' }}>📅 من:</span>
              <input 
                type="date" 
                value={globalDateFrom} 
                onChange={(e) => handleGlobalDateChange('from', e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', colorScheme: 'dark', outline: 'none', fontFamily: 'inherit' }}
              />
              <span style={{ fontSize: '14px', marginRight: '8px' }}>إلى:</span>
              <input 
                type="date" 
                value={globalDateTo} 
                onChange={(e) => handleGlobalDateChange('to', e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', colorScheme: 'dark', outline: 'none', fontFamily: 'inherit' }}
              />
              {(globalDateFrom || globalDateTo) && (
                <button 
                  onClick={() => { setGlobalDateFrom(''); setGlobalDateTo(''); }}
                  style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginRight: '8px' }}
                  title="إلغاء التصفية"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="notifications-wrapper" style={{ position: 'relative' }}>
              <button className="notif-btn" onClick={() => setNotifOpen(!notifOpen)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', position: 'relative' }}>
                🔔 الإشعارات
                {unreadCount > 0 && <span className="notif-badge" style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', fontSize: '10px', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{unreadCount}</span>}
              </button>

              {notifOpen && (
                <div className="notif-dropdown" style={{ position: 'absolute', left: 0, top: '45px', width: '340px', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', zIndex: 100, boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                  <div className="notif-header" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold', fontSize: '14px', textAlign: 'center' }}>الإشعارات والتذكيرات</div>
                  
                  {/* Tabs for Going (Departure) and Coming back (Return) */}
                  <div className="notif-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.1)' }}>
                    <button 
                      onClick={() => setNotifTab('departure')} 
                      style={{ 
                        flex: 1, 
                        padding: '10px 6px', 
                        background: notifTab === 'departure' ? 'rgba(59,130,246,0.15)' : 'transparent', 
                        border: 'none', 
                        borderBottom: notifTab === 'departure' ? '3px solid #3b82f6' : '3px solid transparent', 
                        color: notifTab === 'departure' ? '#60a5fa' : 'rgba(255,255,255,0.6)', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                    >
                      🛫 الذهاب
                      {unreadDepartureCount > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', fontSize: '9px', minWidth: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {unreadDepartureCount}
                        </span>
                      )}
                    </button>
                    <button 
                      onClick={() => setNotifTab('return')} 
                      style={{ 
                        flex: 1, 
                        padding: '10px 6px', 
                        background: notifTab === 'return' ? 'rgba(59,130,246,0.15)' : 'transparent', 
                        border: 'none', 
                        borderBottom: notifTab === 'return' ? '3px solid #3b82f6' : '3px solid transparent', 
                        color: notifTab === 'return' ? '#60a5fa' : 'rgba(255,255,255,0.6)', 
                        fontWeight: 'bold', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                    >
                      🛬 العودة
                      {unreadReturnCount > 0 && (
                        <span style={{ background: '#ef4444', color: 'white', fontSize: '9px', minWidth: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {unreadReturnCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="notif-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {(() => {
                      const filteredNotifs = notifications?.filter(n => {
                        const isReturn = isReturnNotif(n);
                        if (notifTab === 'departure') {
                          return !isReturn;
                        } else {
                          return isReturn;
                        }
                      }) || [];

                      if (filteredNotifs.length === 0) {
                        return (
                          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                            {notifTab === 'departure' ? 'لا توجد تنبيهات للذهاب' : 'لا توجد تنبيهات للعودة'}
                          </div>
                        );
                      }

                      return filteredNotifs.map(n => (
                        <div 
                          key={n.id} 
                          className={`notif-item ${!n.read ? 'unread' : ''}`} 
                          style={{ 
                            padding: '12px 16px', 
                            borderBottom: '1px solid rgba(255,255,255,0.05)', 
                            background: n.read ? 'transparent' : 'rgba(59,130,246,0.1)', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '6px' 
                          }} 
                          onClick={() => markNotificationRead(n.id)}
                        >
                          <span style={{ fontSize: '13px', color: 'white', lineHeight: 1.5 }}>{n.message}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{new Date(n.createdAt).toLocaleString('ar-EG')}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
