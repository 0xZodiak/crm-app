import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AgentDashboard from './pages/AgentDashboard';
import Leads from './pages/Leads';
import Agents from './pages/Agents';
import Users from './pages/Users';
import Trips from './pages/Trips';
import './App.css';

function AppContent() {
  const { currentUser } = useAuth();
  const { isLoading } = useData();
  const [activePage, setActivePage] = useState('dashboard');

  if (!currentUser) return <Login />;
  
  if (isLoading) {
    return (
      <div className="global-loader">
        <div className="loader-spinner"></div>
        <p>جاري تحميل البيانات...</p>
      </div>
    );
  }

  // Agents can't access the shared agents page or admin users page
  const effectivePage =
    currentUser.role === 'agent' && activePage === 'agents' ? 'dashboard' :
    currentUser.role === 'agent' && activePage === 'users'  ? 'dashboard' :
    activePage;

  const renderPage = () => {
    switch (effectivePage) {
      // Agents see their private dashboard; everyone else sees the full dashboard
      case 'dashboard':
        return currentUser.role === 'agent' ? <AgentDashboard /> : <Dashboard />;
      case 'leads':  return <Leads />;
      case 'trips':  return <Trips />;
      case 'agents': return <Agents />;
      case 'users':  return (currentUser.role === 'admin' || currentUser.role === 'team_leader') ? <Users /> : <Dashboard />;
      default:       return currentUser.role === 'agent' ? <AgentDashboard /> : <Dashboard />;
    }
  };

  return (
    <Layout activePage={effectivePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
