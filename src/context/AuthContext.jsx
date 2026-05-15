import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Demo users - in production this would come from Firebase Auth + Firestore
const DEMO_USERS = [
  // ─── Admins ───────────────────────────────────────────────────────────
  { id: 'admin1', username: 'sharif', password: 'admin123', name: 'الحج شريف', role: 'admin', email: 'sharif@crm.com' },
  { id: 'admin2', username: 'hazem', password: 'admin123', name: 'حازم', role: 'admin', email: 'hazem@crm.com' },
  { id: 'admin3', username: 'abdelazim', password: 'admin123', name: 'عبد العظيم', role: 'admin', email: 'abdelazim@crm.com' },

  // ─── Team Leaders ─────────────────────────────────────────────────────
  // تيم حمزة وسارة (تيم واحد)
  { id: 'tl1', username: 'hamza', password: 'leader123', name: 'حمزة أحمد', role: 'team_leader', email: 'hamza@crm.com', teamId: 'team1' },
  { id: 'tl2', username: 'sara', password: 'leader123', name: 'سارة ممدوح', role: 'team_leader', email: 'sara@crm.com', teamId: 'team1' },

  // ─── Agents – فريق واحد ───────────────────────────────────────────────
  { id: 'agent1', username: 'karim', password: 'agent123', name: 'كريم', role: 'agent', email: 'karim@crm.com', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent2', username: 'inas', password: 'agent123', name: 'إيناس', role: 'agent', email: 'inas@crm.com', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent3', username: 'hind', password: 'agent123', name: 'هند', role: 'agent', email: 'hind@crm.com', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent4', username: 'mhmd', password: 'agent123', name: 'محمد', role: 'agent', email: 'mhmd@crm.com', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent5', username: 'mai', password: 'agent123', name: 'مي', role: 'agent', email: 'mai@crm.com', teamId: 'team1', teamLeaderId: 'tl1' },
  { id: 'agent6', username: 'mona', password: 'agent123', name: 'منه', role: 'agent', email: 'mona@crm.com', teamId: 'team1', teamLeaderId: 'tl1' },
];

export { DEMO_USERS };

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('crm_user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('crm_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const user = DEMO_USERS.find(u => u.username === username && u.password === password);
    if (user) {
      const { password: _, ...safeUser } = user;
      setCurrentUser(safeUser);
      localStorage.setItem('crm_user', JSON.stringify(safeUser));
      return { success: true, user: safeUser };
    }
    return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('crm_user');
  };

  const value = { currentUser, login, logout, loading, DEMO_USERS };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
