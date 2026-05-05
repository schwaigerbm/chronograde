import React, { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  Settings, 
  LogOut, 
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';

// --- LOGIN VIEW ---
interface LoginViewProps {
  onLogin: (username: string, pass: string) => Promise<any>;
}

const LoginView = ({ onLogin }: LoginViewProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError("Bitte Benutzernamen und Passwort eingeben.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await onLogin(username, password);
    } catch (error: any) {
      console.error("Login failed:", error);
      setLoginError(error.message || "Login fehlgeschlagen.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-wrapper">
            <GraduationCap size={48} />
          </div>
          <h1 className="login-title">Chronograde</h1>
          <p className="login-subtitle">School Admin 2026 - Login</p>
        </div>
        
        {loginError && (
          <div className="error-message">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="z.B. admin"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoggingIn}
            className="btn-primary"
          >
            {isLoggingIn ? (
              <div className="spinner" />
            ) : (
              "Anmelden"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- SIDEBAR ITEM ---
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
}

const SidebarItem = ({ icon, label, active, onClick, danger }: SidebarItemProps) => (
  <button
    onClick={onClick}
    className={`sidebar-item ${active ? 'active' : ''} ${danger ? 'danger' : ''}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// --- MAIN DASHBOARD ---
interface DashboardProps {
  onLogout: () => void;
}

const Dashboard = ({ onLogout }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState('beurteilungen');

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <GraduationCap size={32} />
          <h2 className="sidebar-title">Chronograde</h2>
        </div>

        <nav className="sidebar-nav">
          <SidebarItem 
            icon={<Users size={20} />} 
            label="Schüler" 
            active={activeTab === 'schüler'} 
            onClick={() => setActiveTab('schüler')}
          />
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Beurteilungen" 
            active={activeTab === 'beurteilungen'} 
            onClick={() => setActiveTab('beurteilungen')}
          />
          <SidebarItem 
            icon={<Settings size={20} />} 
            label="Einstellungen" 
            active={activeTab === 'einstellungen'} 
            onClick={() => setActiveTab('einstellungen')}
          />
          
          <SidebarItem 
            icon={<LogOut size={20} />} 
            label="Abmelden" 
            danger
            onClick={onLogout}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <h2 className="content-title">
            {activeTab}
          </h2>
          <p className="content-subtitle">Verwalten Sie Ihre {activeTab} und Daten.</p>
        </header>

        <div className="content-area">
          Inhalt für {activeTab} wird geladen... (Warten auf Spezifikation)
        </div>
      </main>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  // ONLY App calls useAuth to ensure a single source of truth
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="login-container">
        <div className="spinner" style={{ borderColor: 'rgba(37, 99, 235, 0.3)', borderTopColor: '#2563eb' }} />
      </div>
    );
  }

  // Pass login to LoginView and logout to Dashboard
  return user ? <Dashboard onLogout={logout} /> : <LoginView onLogin={login} />;
};

export default App;
