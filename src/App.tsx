import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Home,
  Star,
  Folder,
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

  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [draggedCourseId, setDraggedCourseId] = useState<string | null>(null);
  const [draggedOverCardId, setDraggedOverCardId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, courseId: string) => {
    e.dataTransfer.setData('text/plain', courseId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCourseId(courseId);
  };

  const handleDragEnd = () => {
    setDraggedCourseId(null);
    setDraggedOverCardId(null);
  };

  const handleDragEnterCard = (e: React.DragEvent, targetCourseId: string) => {
    e.preventDefault();
    if (draggedCourseId && draggedCourseId !== targetCourseId) {
      setDraggedOverCardId(targetCourseId);
    }
  };

  const handleDragLeaveCard = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedOverCardId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    setDragOverCell(cellId);
  };

  const handleDragLeave = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    if (e.currentTarget && e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDragOverCell(prev => prev === cellId ? null : prev);
  };

  const handleDrop = async (
    e: React.DragEvent, 
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | null, 
    slot: 'morning' | 'afternoon' | null
  ) => {
    e.preventDefault();
    setDragOverCell(null);
    const courseId = e.dataTransfer.getData('text/plain');
    if (!courseId) return;

    const courseToUpdate = courses.find(c => c.id === courseId);
    if (!courseToUpdate) return;

    // Get current courses in the target cell to determine the next priority
    const cellCourses = courses.filter(c => c.timetableDay === day && c.timetableSlot === slot);
    const maxPriority = cellCourses.reduce((max, c) => Math.max(max, c.priority || 0), -1);

    const updatedCourse: Course = {
      ...courseToUpdate,
      timetableDay: day,
      timetableSlot: slot,
      priority: maxPriority + 1
    };

    try {
      await firebaseService.saveCourse(updatedCourse);
    } catch (err) {
      console.error("Error saving course timetable position:", err);
    }
  };

  const handleDropOnCard = async (e: React.DragEvent, targetCourse: Course) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);
    setDraggedOverCardId(null);
    setDraggedCourseId(null);
    const courseId = e.dataTransfer.getData('text/plain');
    if (!courseId || courseId === targetCourse.id) return;

    const courseToUpdate = courses.find(c => c.id === courseId);
    if (!courseToUpdate) return;

    const targetDay = targetCourse.timetableDay || null;
    const targetSlot = targetCourse.timetableSlot || null;

    // Get sibling courses in the target slot (excluding the dragged one)
    const siblingCourses = courses
      .filter(c => c.timetableDay === targetDay && c.timetableSlot === targetSlot && c.id !== courseId)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));

    // Find the index of the target course
    const targetIndex = siblingCourses.findIndex(c => c.id === targetCourse.id);
    
    // Insert the dragged course before the target course
    const newOrder = [...siblingCourses];
    newOrder.splice(targetIndex, 0, courseToUpdate);

    // Save all updated courses with their new priorities
    try {
      for (let i = 0; i < newOrder.length; i++) {
        const c = newOrder[i];
        const updated: Course = {
          ...c,
          timetableDay: targetDay,
          timetableSlot: targetSlot,
          priority: i
        };
        await firebaseService.saveCourse(updated);
      }
    } catch (err) {
      console.error("Error reordering courses:", err);
    }
  };

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
          const DAYS = [
            { id: 'monday', label: 'Montag', value: 1 },
            { id: 'tuesday', label: 'Dienstag', value: 2 },
            { id: 'wednesday', label: 'Mittwoch', value: 3 },
            { id: 'thursday', label: 'Donnerstag', value: 4 },
            { id: 'friday', label: 'Freitag', value: 5 },
            { id: 'saturday', label: 'Samstag', value: 6 },
          ] as const;

          const SLOTS = [
            { id: 'morning', label: 'Vormittag' },
            { id: 'afternoon', label: 'Nachmittag' },
          ] as const;

          const currentDayValue = new Date().getDay();

          const getCoursesForCell = (dayId: typeof DAYS[number]['id'], slotId: typeof SLOTS[number]['id']) => {
            return courses
              .filter(c => c.timetableDay === dayId && c.timetableSlot === slotId)
              .sort((a, b) => (a.priority || 0) - (b.priority || 0));
          };

          const unassignedCourses = courses
            .filter(c => !c.timetableDay || !c.timetableSlot)
            .sort((a, b) => (a.priority || 0) - (b.priority || 0));

          return (
            <div className="view-container">
              <div className="view-header">
                <div className="title-group">
                  <h1 className="main-title">Beurteilungen</h1>
                  <h2 className="sub-title">Wählen Sie eine Gruppe aus oder ziehen Sie sie per Drag & Drop in den Wochenplan</h2>
                </div>
              </div>
              
              <div className="content-area p-8" style={{ overflowY: 'auto' }}>
                <div className="timetable-container">
                  <table className="timetable-table">
                    <thead>
                      <tr>
                        <th style={{ width: '140px' }}></th>
                        {SLOTS.map(slot => (
                          <th key={slot.id}>{slot.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map(day => {
                        const isCurrentDay = day.value === currentDayValue;
                        return (
                          <tr 
                            key={day.id} 
                            className={`timetable-row ${isCurrentDay ? 'current-day' : ''}`}
                          >
                            <td className="timetable-day-cell">
                              {day.label}
                              {isCurrentDay && (
                                <span style={{ 
                                  display: 'block', 
                                  fontSize: '10px', 
                                  fontWeight: '700', 
                                  color: 'var(--primary-color)',
                                  textTransform: 'uppercase',
                                  marginTop: '2px'
                                }}>
                                  Heute
                                </span>
                              )}
                            </td>
                            {SLOTS.map(slot => {
                              const cellId = `${day.id}-${slot.id}`;
                              const cellCourses = getCoursesForCell(day.id, slot.id);
                              const isDragOver = dragOverCell === cellId;
                              
                              return (
                                <td 
                                  key={slot.id}
                                  className={`timetable-slot-cell ${isDragOver ? 'drag-over' : ''}`}
                                  onDragOver={handleDragOver}
                                  onDragEnter={(e) => handleDragEnter(e, cellId)}
                                  onDragLeave={(e) => handleDragLeave(e, cellId)}
                                  onDrop={(e) => handleDrop(e, day.id, slot.id)}
                                >
                                  <div className="timetable-slot-content">
                                    {cellCourses.map(course => {
                                      const isHovered = draggedOverCardId === course.id;
                                      return (
                                        <div 
                                          key={course.id}
                                          className={`timetable-course-card ${isHovered ? 'drag-hover-before' : ''}`}
                                          draggable
                                          onDragStart={(e) => handleDragStart(e, course.id)}
                                          onDragEnd={handleDragEnd}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDragEnter={(e) => handleDragEnterCard(e, course.id)}
                                          onDragLeave={handleDragLeaveCard}
                                          onDrop={(e) => handleDropOnCard(e, course)}
                                          onClick={() => setSelectedCourse(course)}
                                        >
                                          <h3 className="timetable-course-card-title">{course.name}</h3>
                                          <p className="timetable-course-card-year">{course.year}</p>
                                          <div className="timetable-course-card-link">
                                            Matrix öffnen <ChevronRight size={11} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="unassigned-pool-container">
                    <h3 className="unassigned-pool-title">Unzugeordnete Gruppen</h3>
                    <div 
                      className={`unassigned-pool-dropzone ${dragOverCell === 'pool' ? 'drag-over' : ''}`}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, 'pool')}
                      onDragLeave={(e) => handleDragLeave(e, 'pool')}
                      onDrop={(e) => handleDrop(e, null, null)}
                    >
                      {unassignedCourses.length === 0 ? (
                        <div className="unassigned-pool-placeholder">
                          Keine unzugeordneten Gruppen. Ziehen Sie Gruppen hierher, um die Zuweisung aufzuheben.
                        </div>
                      ) : (
                        unassignedCourses.map(course => {
                          const isHovered = draggedOverCardId === course.id;
                          return (
                            <div 
                              key={course.id}
                              className={`timetable-course-card ${isHovered ? 'drag-hover-before' : ''}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, course.id)}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              onDragEnter={(e) => handleDragEnterCard(e, course.id)}
                              onDragLeave={handleDragLeaveCard}
                              onDrop={(e) => handleDropOnCard(e, course)}
                              onClick={() => setSelectedCourse(course)}
                            >
                              <h3 className="timetable-course-card-title">{course.name}</h3>
                              <p className="timetable-course-card-year">{course.year}</p>
                              <div className="timetable-course-card-link">
                                Matrix öffnen <ChevronRight size={11} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
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
            onClick={() => {
              setActiveTab('beurteilungen');
              setSelectedCourse(null);
            }}
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
