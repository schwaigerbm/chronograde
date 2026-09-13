import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Trash2, 
  CheckSquare, 
  Square, 
  Plus, 
  Pencil, 
  Search, 
  User, 
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BookOpen,
  X
} from 'lucide-react';
import { firebaseService, DEFAULT_REMINDER_CATEGORIES } from '../services/firebaseService';
import type { Reminder, Course, Student, ReminderCategory } from '../schema';
import { AddReminderModal, COLOR_OPTIONS } from './AddReminderModal';
import { formatDate, formatDateWithWeekday } from '../lib/utils';

interface RemindersWidgetProps {
  courses?: Course[];
  students?: Student[];
  onOpenCourse?: (courseId: string) => void;
}

export const RemindersWidget: React.FC<RemindersWidgetProps> = ({
  courses = [],
  students = [],
  onOpenCourse
}) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<ReminderCategory[]>(DEFAULT_REMINDER_CATEGORIES);
  const [loading, setLoading] = useState(true);
  
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  
  // Calendar Navigation & Filter State
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState<Reminder | null>(null);

  // Local fallback states
  const [localCourses, setLocalCourses] = useState<Course[]>(courses);
  const [localStudents, setLocalStudents] = useState<Student[]>(students);

  useEffect(() => {
    firebaseService.getReminderCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (courses.length > 0) {
      setLocalCourses(courses);
    } else {
      const unsub = firebaseService.subscribeToCourses(false, setLocalCourses);
      return () => unsub();
    }
  }, [courses]);

  useEffect(() => {
    if (students.length > 0) {
      setLocalStudents(students);
    } else {
      firebaseService.getStudents().then(setLocalStudents);
    }
  }, [students]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = firebaseService.subscribeToReminders((data) => {
      setReminders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleResolve = async (id: string, currentResolved: boolean) => {
    try {
      await firebaseService.updateReminder(id, { resolved: !currentResolved });
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Termins:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firebaseService.deleteReminder(id);
    } catch (err) {
      console.error("Fehler beim Löschen des Termins:", err);
    }
  };

  const handleOpenAdd = () => {
    setReminderToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (reminder: Reminder) => {
    setReminderToEdit(reminder);
    setIsAddModalOpen(true);
  };

  const handleSaveReminder = async (
    reminderData: Partial<Reminder> & { title: string; courseId: string; date: string },
    _prepDays?: any,
    existingReminderId?: string
  ) => {
    await firebaseService.saveCustomReminder(reminderData, null, existingReminderId);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Calendar calculations
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  // Map reminders to date strings (YYYY-MM-DD)
  const remindersByDate = useMemo(() => {
    const map: Record<string, Reminder[]> = {};
    reminders.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [reminders]);

  // Filtered Reminders List
  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      // Status filter
      if (statusFilter === 'open' && r.resolved) return false;
      if (statusFilter === 'resolved' && !r.resolved) return false;

      // Live search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = (r.title || r.anomalyType || '').toLowerCase().includes(term);
        const descMatch = (r.description || '').toLowerCase().includes(term);
        const courseMatch = (r.courseName || '').toLowerCase().includes(term);
        const studentMatch = (r.studentName || '').toLowerCase().includes(term);
        if (!titleMatch && !descMatch && !courseMatch && !studentMatch) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'exam' && r.type !== 'exam') return false;
        if (categoryFilter === 'assignment' && r.type !== 'assignment') return false;
        if (categoryFilter === 'anomaly' && r.type !== 'attendance_anomaly') return false;
        if (categoryFilter === 'general' && r.type !== 'general' && r.type !== undefined) return false;
        if (categoryFilter !== 'exam' && categoryFilter !== 'assignment' && categoryFilter !== 'anomaly' && categoryFilter !== 'general') {
          if (r.type !== categoryFilter && r.categoryId !== categoryFilter) return false;
        }
      }

      // Calendar Selected Day filter
      if (selectedDayFilter && r.date !== selectedDayFilter) return false;

      return true;
    });
  }, [reminders, searchTerm, categoryFilter, statusFilter, selectedDayFilter]);

  // Group filtered reminders into sections
  const overdueOrTodayList = useMemo(() => {
    return filteredReminders.filter(r => !r.resolved && r.date <= todayStr).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredReminders, todayStr]);

  const upcomingList = useMemo(() => {
    return filteredReminders.filter(r => !r.resolved && r.date > todayStr).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredReminders, todayStr]);

  const resolvedList = useMemo(() => {
    return filteredReminders.filter(r => r.resolved).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredReminders]);

  const prevMonth = () => setCurrentCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentCalendarDate(new Date(year, month + 1, 1));

  const getTypeBadge = (type?: string) => {
    const cat = categories.find(c => c.id === type);
    if (cat) {
      return { label: cat.name, icon: <BookOpen size={14} />, bg: `${cat.color}18`, color: cat.color };
    }
    switch (type) {
      case 'exam':
        return { label: 'Test / Prüfung', icon: <BookOpen size={14} />, bg: '#f3e8ff', color: '#7e22ce' };
      case 'assignment':
        return { label: 'Aufgabe / Abgabe', icon: <FileText size={14} />, bg: '#dcfce7', color: '#15803d' };
      case 'attendance_anomaly':
        return { label: 'Fehlzeit-Abklärung', icon: <AlertTriangle size={14} />, bg: '#fee2e2', color: '#b91c1c' };
      default:
        return { label: 'Notiz / Sonstiges', icon: <Calendar size={14} />, bg: '#dbeafe', color: '#1d4ed8' };
    }
  };

  const getColorTheme = (colorId?: string) => {
    return COLOR_OPTIONS.find(c => c.id === colorId) || COLOR_OPTIONS[0];
  };

  return (
    <div className="reminders-widget-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '15px 20px 0 20px' }}>
      
      {/* Widget Header with +15px top spacing and right-aligned compact button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '4px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={22} color="var(--primary-color)" /> Terminkalender & Aufgaben
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Übersicht aller Fälligkeiten, Prüfungen und Abklärungen
          </p>
        </div>

        <button 
          onClick={handleOpenAdd} 
          className="btn-primary btn-sm" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', height: '34px', marginLeft: 'auto' }}
        >
          <Plus size={16} /> Neuer Termin
        </button>
      </div>

      {/* Main Grid: Left Calendar (1/3), Right Appointment List (2/3) with bottom margin */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: '24px', alignItems: 'start', marginBottom: '20px' }}>
        
        {/* LEFT COLUMN: Calendar Grid Card */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
          
          {/* Month Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              {monthNames[month]} {year}
            </h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={prevMonth} className="btn-icon" style={{ padding: '6px', borderRadius: '6px', cursor: 'pointer', background: 'none', border: '1px solid var(--border-color)' }}>
                <ChevronLeft size={16} />
              </button>
              <button onClick={nextMonth} className="btn-icon" style={{ padding: '6px', borderRadius: '6px', cursor: 'pointer', background: 'none', border: '1px solid var(--border-color)' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div>
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {/* Blank offset cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} style={{ height: '36px' }} />
            ))}

            {/* Day Cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isToday = dateStr === todayStr;
              const isSelected = selectedDayFilter === dateStr;
              const dayReminders = remindersByDate[dateStr] || [];
              const hasReminders = dayReminders.length > 0;

              return (
                <button
                  key={dayNum}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDayFilter(null);
                    } else {
                      setSelectedDayFilter(dateStr);
                    }
                  }}
                  style={{
                    height: '38px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid var(--primary-color)' : isToday ? '1px solid var(--primary-color)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.15)' : isToday ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                    color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                    fontWeight: isToday || isSelected ? 'bold' : 'normal',
                    fontSize: '13px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{dayNum}</span>
                  
                  {/* Dots for tasks */}
                  {hasReminders && (
                    <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                      {dayReminders.slice(0, 3).map((r, i) => {
                        const theme = getColorTheme(r.color);
                        return (
                          <div 
                            key={i} 
                            style={{ 
                              width: '5px', 
                              height: '5px', 
                              borderRadius: '50%', 
                              backgroundColor: r.resolved ? '#94a3b8' : theme.hex 
                            }} 
                          />
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Day Filter Active Banner */}
          {selectedDayFilter && (
            <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--primary-color)' }}>
              <span>Filter: <strong>{formatDate(selectedDayFilter)}</strong></span>
              <button 
                onClick={() => setSelectedDayFilter(null)}
                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
              >
                <X size={14} /> Aufheben
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Clean Appointment List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Search Bar & Category Filter Pills */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Live Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Termine suchen (Titel, Kurs, Schüler)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', borderRadius: '8px', fontSize: '14px' }}
              />
            </div>

            {/* Status & Category Filter Pills */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Status Filter */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={14} /> Status:
                </span>
                {[
                  { id: 'all', label: 'Alle' },
                  { id: 'open', label: '⏳ Offen / Unerledigt' },
                  { id: 'resolved', label: '✅ Erledigt' },
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setStatusFilter(pill.id as any)}
                    style={{
                      padding: '4px 11px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: statusFilter === pill.id ? 'var(--primary-color)' : 'var(--border-color)',
                      backgroundColor: statusFilter === pill.id ? 'var(--primary-color)' : 'transparent',
                      color: statusFilter === pill.id ? 'white' : 'var(--text-primary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', marginRight: '4px' }}>
                  Kategorie:
                </span>
                <button
                  onClick={() => setCategoryFilter('all')}
                  style={{
                    padding: '4px 11px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: categoryFilter === 'all' ? 'var(--primary-color)' : 'var(--border-color)',
                    backgroundColor: categoryFilter === 'all' ? 'var(--primary-color)' : 'transparent',
                    color: categoryFilter === 'all' ? 'white' : 'var(--text-primary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Alle
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    style={{
                      padding: '4px 11px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: categoryFilter === cat.id ? cat.color : 'var(--border-color)',
                      backgroundColor: categoryFilter === cat.id ? cat.color : 'transparent',
                      color: categoryFilter === cat.id ? 'white' : 'var(--text-primary)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reminders List Body */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Lade Termine...</div>
          ) : filteredReminders.length === 0 ? (
            <div style={{ background: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ color: '#16a34a', marginBottom: '8px' }} />
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Keine anstehenden Termine</div>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Keine Termine für die aktuelle Auswahl gefunden.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* SECTION 1: Überfällig / Heute */}
              {overdueOrTodayList.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#b91c1c', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} /> ⚠️ Überfällig & Heute ({overdueOrTodayList.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {overdueOrTodayList.map(item => renderReminderItem(item))}
                  </div>
                </div>
              )}

              {/* SECTION 2: Demnächst */}
              {upcomingList.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={16} /> 📅 Demnächst ({upcomingList.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {upcomingList.map(item => renderReminderItem(item))}
                  </div>
                </div>
              )}

              {/* SECTION 3: Erledigt */}
              {resolvedList.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> ✅ Erledigt ({resolvedList.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0.75 }}>
                    {resolvedList.map(item => renderReminderItem(item))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Add / Edit Reminder Modal */}
      <AddReminderModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setReminderToEdit(null);
        }}
        courses={localCourses}
        students={localStudents}
        reminderToEdit={reminderToEdit}
        onSave={handleSaveReminder}
      />
    </div>
  );

  // Helper render for single appointment item
  function renderReminderItem(item: Reminder) {
    const badge = getTypeBadge(item.type);
    const colorTheme = getColorTheme(item.color);

    return (
      <div 
        key={item.id}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderLeft: `5px solid ${colorTheme.hex}`,
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          transition: 'all 0.15s ease'
        }}
      >
        {/* Left Checkbox & Title Info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
          <button
            onClick={() => handleToggleResolve(item.id, item.resolved)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px', color: item.resolved ? '#16a34a' : 'var(--text-muted)' }}
            title={item.resolved ? "Als unerledigt markieren" : "Als erledigt abhaken"}
          >
            {item.resolved ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', backgroundColor: badge.bg, color: badge.color, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {badge.icon} {badge.label}
              </span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)', background: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                📅 {formatDateWithWeekday(item.date)}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: item.resolved ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.resolved ? 'line-through' : 'none' }}>
                {item.title || item.anomalyType}
              </span>
            </div>

            {(item.description || (item.type === 'attendance_anomaly' && item.anomalyType)) && (
              <div style={{ margin: '4px 0 6px 0', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.02)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid var(--border-color)' }}>
                {item.description || item.anomalyType}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span 
                onClick={() => onOpenCourse && onOpenCourse(item.courseId)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: onOpenCourse ? 'pointer' : 'default' }}
                title={onOpenCourse ? "Gruppe öffnen" : undefined}
              >
                <Users size={13} /> {item.courseName || 'Gruppe'}
              </span>

              {item.studentName && item.studentName !== 'Gesamte Gruppe' && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <User size={13} /> {item.studentName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Date & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', fontSize: '12px', fontWeight: 'bold', color: item.date <= todayStr && !item.resolved ? '#dc2626' : 'var(--text-primary)' }}>
            <div>{formatDate(item.date)}</div>
            <div style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>{item.dueTime || '07:00'}</div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => handleOpenEdit(item)} className="btn-icon" title="Bearbeiten" style={{ padding: '6px', cursor: 'pointer', background: 'none', border: 'none' }}>
              <Pencil size={15} />
            </button>
            <button onClick={() => handleDelete(item.id)} className="btn-icon danger" title="Löschen" style={{ padding: '6px', cursor: 'pointer', background: 'none', border: 'none' }}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }
};
