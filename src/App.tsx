import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Home,
  Star,
  Folder,
  Calendar,
  LogIn,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { StudentsView } from './components/StudentsView';
import { CourseManager } from './components/CourseManager';
import { GradesMatrix } from './components/GradesMatrix';
import { SettingsView } from './components/SettingsView';
import { firebaseService } from './services/firebaseService';
import type { Course } from './schema';

// --- LOGIN VIEW ---
interface LoginViewProps {
  onLogin: (username: string, pass: string) => Promise<any>;
}

const LoginView = ({ onLogin }: LoginViewProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
 
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
                title={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoggingIn}
            className="btn-primary"
          >
            {isLoggingIn ? (
              <div className="spinner" />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <LogIn size={18} /> Anmelden
              </span>
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
  const [activeTab, setActiveTab] = useState('start');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToCourses(false, (data) => {
      setCourses(data);
      // Sync selectedCourse if it exists
      setSelectedCourse(prev => {
        if (!prev) return null;
        return data.find(c => c.id === prev.id) || null;
      });
    });
    return () => unsubscribe();
  }, []);

  const handleOpenMatrix = (course: Course) => {
    setSelectedCourse(course);
    setActiveTab('beurteilungen');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'schüler':
        return <StudentsView />;
      case 'courses':
        return <CourseManager onOpenMatrix={handleOpenMatrix} />;
      case 'beurteilungen':
        if (!selectedCourse) {
          return (
            <div className="view-container">
              <div className="view-header">
                <div className="title-group">
                  <h1 className="main-title">Beurteilungen</h1>
                  <h2 className="sub-title">Bitte wählen Sie eine Gruppe aus</h2>
                </div>
              </div>
              <div className="content-area p-8">
                <div className="course-grid">
                  {courses.map(course => (
                    <button 
                      key={course.id} 
                      className="course-card"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <h3 className="course-card-title">{course.name}</h3>
                      <p className="course-card-year">{course.year}</p>
                      <div className="course-card-link">
                        Matrix öffnen <ChevronRight size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        }
        return <GradesMatrix course={selectedCourse} />;
      case 'start':
        return (
          <div className="content-area" style={{ padding: '40px', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <GraduationCap size={80} color="#2563eb" style={{ marginBottom: '24px' }} />
              <h2 className="content-title">Willkommen bei Chronograde</h2>
              <p className="content-subtitle">Wählen Sie ein Modul in der Sidebar aus, um zu beginnen.</p>
            </div>
          </div>
        );
      case 'einstellungen':
        return <SettingsView />;
      default:
        return (
          <div className="view-container">
            <div className="view-header">
              <div className="title-group">
                <h1 className="main-title" style={{ textTransform: 'capitalize' }}>{activeTab}</h1>
                <h2 className="sub-title">Modul wird vorbereitet</h2>
              </div>
            </div>
            <div className="content-area" style={{ padding: '40px', justifyContent: 'center', alignItems: 'center', fontStyle: 'italic', color: '#64748b' }}>
              Inhalt für {activeTab} wird geladen... (Warten auf Spezifikation)
            </div>
          </div>
        );
    }
  };

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
            icon={<Home size={20} />} 
            label="Start" 
            active={activeTab === 'start'} 
            onClick={() => setActiveTab('start')}
          />
          <SidebarItem 
            icon={<Star size={20} />} 
            label="Beurteilungen" 
            active={activeTab === 'beurteilungen'} 
            onClick={() => setActiveTab('beurteilungen')}
          />
          <SidebarItem 
            icon={<Folder size={20} />} 
            label="Gruppen" 
            active={activeTab === 'courses'} 
            onClick={() => setActiveTab('courses')}
          />
          <SidebarItem 
            icon={<Users size={20} />} 
            label="Schüler" 
            active={activeTab === 'schüler'} 
            onClick={() => setActiveTab('schüler')}
          />
          <SidebarItem 
            icon={<Calendar size={20} />} 
            label="Termine" 
            active={activeTab === 'termine'} 
            onClick={() => setActiveTab('termine')}
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
        {renderContent()}
      </main>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="login-container">
        <div className="spinner" style={{ borderColor: 'rgba(37, 99, 235, 0.3)', borderTopColor: '#2563eb' }} />
      </div>
    );
  }

  return user ? <Dashboard onLogout={logout} /> : <LoginView onLogin={login} />;
};

export default App;
