import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  CheckSquare, 
  Square, 
  Clock, 
  ListFilter, 
  Plus, 
  Pencil, 
  Search, 
  ArrowUpDown, 
  BookOpen, 
  FileText, 
  User, 
  Users,
  ExternalLink
} from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import { formatDate } from '../lib/utils';
import type { Reminder, Course, Student } from '../schema';
import { AddReminderModal, COLOR_OPTIONS } from './AddReminderModal';

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
  const [showAllTermine, setShowAllTermine] = useState(false); // false = "Nur aktuelle Termine", true = "Alle Termine"
  const [loading, setLoading] = useState(true);
  
  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'exam' | 'assignment' | 'anomaly'>('all');
  const [sortOption, setSortOption] = useState<'date_asc' | 'date_desc' | 'title_asc' | 'created_desc'>('date_asc');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState<Reminder | null>(null);

  // Local courses & students fetch fallback if not passed as props
  const [localCourses, setLocalCourses] = useState<Course[]>(courses);
  const [localStudents, setLocalStudents] = useState<Student[]>(students);

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
      console.error("Fehler beim Aktualisieren der Erinnerung:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firebaseService.deleteReminder(id);
    } catch (err) {
      console.error("Fehler beim Löschen der Erinnerung:", err);
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
    prepDays?: 1 | 3 | 7 | null,
    existingReminderId?: string
  ) => {
    await firebaseService.saveCustomReminder(reminderData, prepDays, existingReminderId);
  };

  // Date calculation & active filters
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  const isCurrentReminder = (r: Reminder) => {
    if (r.resolved) return false;
    if (r.date < todayStr) return true; // Overdue
    if (r.date === todayStr && currentHour >= 7) return true; // Today starting at 07:00
    return false; // Future
  };

  const currentCount = reminders.filter(isCurrentReminder).length;

  // Filtered & Sorted Reminders list
  const filteredReminders = useMemo(() => {
    return reminders
      .filter(r => {
        // 1. Time / Active status filter
        if (!showAllTermine && !isCurrentReminder(r)) return false;

        // 2. Category Filter
        if (categoryFilter === 'exam' && r.type !== 'exam') return false;
        if (categoryFilter === 'assignment' && r.type !== 'assignment') return false;
        if (categoryFilter === 'anomaly' && r.type !== 'attendance_anomaly' && r.type !== undefined) return false;

        // 3. Search Term Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = (r.title || r.anomalyType || '').toLowerCase().includes(q);
          const matchStudent = (r.studentName || '').toLowerCase().includes(q);
          const matchCourse = (r.courseName || '').toLowerCase().includes(q);
          const matchAnomaly = (r.anomalyType || '').toLowerCase().includes(q);
          return matchTitle || matchStudent || matchCourse || matchAnomaly;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'date_asc') {
          return a.date.localeCompare(b.date);
        }
        if (sortOption === 'date_desc') {
          return b.date.localeCompare(a.date);
        }
        if (sortOption === 'title_asc') {
          const titleA = a.title || a.anomalyType || '';
          const titleB = b.title || b.anomalyType || '';
          return titleA.localeCompare(titleB);
        }
        if (sortOption === 'created_desc') {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        return 0;
      });
  }, [reminders, showAllTermine, categoryFilter, searchTerm, sortOption, todayStr, currentHour]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', borderColor: 'rgba(37, 99, 235, 0.3)', borderTopColor: '#2563eb' }} />
      </div>
    );
  }

  return (
    <div className="dashboard-card" style={{ width: '100%', maxWidth: '850px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
      
      {/* Widget Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary-color)" /> Terminliste & Abklärungen
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {currentCount === 0 
              ? 'Keine aktuellen Abklärungen oder Termine ausstehend.' 
              : `${currentCount} aktuelle ${currentCount === 1 ? 'Erinnerung' : 'Erinnerungen'} ausstehend.`
            }
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Neuer Termin Button */}
          <button 
            type="button"
            className="btn-primary btn-sm"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 14px', width: 'auto', marginTop: 0 }}
          >
            <Plus size={16} /> Termin / Abgabe erstellen
          </button>

          {/* Toggle Switch: Nur aktuelle vs Alle Termine */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            <button 
              type="button"
              className={`btn-xs ${!showAllTermine ? 'active-btn' : ''}`}
              onClick={() => setShowAllTermine(false)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '12px', 
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: !showAllTermine ? 'white' : 'transparent',
                color: !showAllTermine ? 'var(--primary-color)' : 'var(--text-muted)',
                boxShadow: !showAllTermine ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: !showAllTermine ? '600' : 'normal',
                cursor: 'pointer'
              }}
            >
              <Clock size={14} /> Aktuell
            </button>
            <button 
              type="button"
              className={`btn-xs ${showAllTermine ? 'active-btn' : ''}`}
              onClick={() => setShowAllTermine(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '12px', 
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: showAllTermine ? 'white' : 'transparent',
                color: showAllTermine ? 'var(--primary-color)' : 'var(--text-muted)',
                boxShadow: showAllTermine ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                fontWeight: showAllTermine ? '600' : 'normal',
                cursor: 'pointer'
              }}
            >
              <ListFilter size={14} /> Alle ({reminders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category Pills & Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Termine, Schüler oder Gruppen suchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '13px', padding: '6px 10px 6px 32px' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Alle' },
            { id: 'exam', label: '📝 Tests' },
            { id: 'assignment', label: '📁 Abgaben' },
            { id: 'anomaly', label: '⚠️ Fehlzeiten' },
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setCategoryFilter(p.id as any)}
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: categoryFilter === p.id ? 'var(--primary-color)' : 'var(--border-color)',
                backgroundColor: categoryFilter === p.id ? 'var(--primary-color)' : '#f8fafc',
                color: categoryFilter === p.id ? 'white' : 'var(--text-main)',
                fontWeight: categoryFilter === p.id ? '600' : 'normal',
                cursor: 'pointer'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowUpDown size={14} color="var(--text-muted)" />
          <select
            className="form-input"
            value={sortOption}
            onChange={e => setSortOption(e.target.value as any)}
            style={{ fontSize: '12px', padding: '4px 8px', width: 'auto' }}
          >
            <option value="date_asc">Fälligkeit (Nächste zuerst)</option>
            <option value="date_desc">Fälligkeit (Späteste zuerst)</option>
            <option value="title_asc">Alphabetisch (A-Z)</option>
            <option value="created_desc">Neueste Erstellungen</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {filteredReminders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Keine Termine gefunden!</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            {searchTerm ? 'Es wurden keine passenden Termine für deine Suchanfrage gefunden.' : 'Derzeit sind keine Termine in diesem Filter vorhanden.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredReminders.map((reminder) => {
            const isOverdue = !reminder.resolved && reminder.date < todayStr;
            const isFuture = !reminder.resolved && (reminder.date > todayStr || (reminder.date === todayStr && currentHour < 7));
            const isPrep = reminder.type === 'prep_reminder';

            // Find matching color option
            const colorOption = COLOR_OPTIONS.find(c => c.id === reminder.color) || COLOR_OPTIONS[0];
            const borderLeftColor = reminder.resolved 
              ? '#cbd5e1' 
              : isOverdue 
                ? '#ef4444' 
                : colorOption.hex;

            return (
              <div 
                key={reminder.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  borderRadius: '10px', 
                  background: reminder.resolved ? '#f8fafc' : isOverdue ? '#fff5f5' : isFuture ? colorOption.bg : '#ffffff', 
                  border: reminder.resolved 
                    ? '1px dashed #cbd5e1' 
                    : isOverdue 
                      ? '1px solid #fee2e2' 
                      : `1px solid ${colorOption.border}`,
                  borderLeft: `5px solid ${borderLeftColor}`,
                  opacity: reminder.resolved ? 0.65 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                  {/* Checkbox Button */}
                  <button 
                    onClick={() => handleToggleResolve(reminder.id, reminder.resolved)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      margin: '2px 0 0 0', 
                      cursor: 'pointer', 
                      color: reminder.resolved ? '#16a34a' : isOverdue ? '#ef4444' : colorOption.hex
                    }}
                    title={reminder.resolved ? "Als unerledigt markieren" : "Als erledigt markieren"}
                  >
                    {reminder.resolved ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      
                      {/* Type Icon Badge */}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        color: 'white',
                        backgroundColor: isPrep ? '#6366f1' : reminder.type === 'exam' ? '#8b5cf6' : reminder.type === 'assignment' ? '#10b981' : colorOption.hex,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isPrep ? '⏳ Vorbereitung' : reminder.type === 'exam' ? '📝 Test' : reminder.type === 'assignment' ? '📁 Abgabe' : reminder.type === 'attendance_anomaly' ? '⚠️ Fehlzeit' : '📌 Notiz'}
                      </span>

                      <span style={{ 
                        fontWeight: 'bold', 
                        fontSize: '16px', 
                        color: reminder.resolved ? 'var(--text-muted)' : 'var(--text-main)',
                        textDecoration: reminder.resolved ? 'line-through' : 'none' 
                      }}>
                        {reminder.title || reminder.anomalyType}
                      </span>
                      
                      {/* Overdue Badge */}
                      {isOverdue && (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          background: '#fee2e2', 
                          color: '#dc2626', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <AlertCircle size={10} /> Überfällig
                        </span>
                      )}

                      {/* Future Badge */}
                      {isFuture && (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          background: '#e0f2fe', 
                          color: '#0284c7', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <Clock size={10} /> Geplant ({reminder.dueTime || '07:00'})
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      
                      {/* Course / Direktsprung */}
                      <span 
                        style={{ cursor: onOpenCourse ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => onOpenCourse && reminder.courseId && onOpenCourse(reminder.courseId)}
                        title={onOpenCourse ? "Gruppe in Noten-Matrix öffnen" : undefined}
                      >
                        Gruppe: <strong style={{ color: onOpenCourse ? 'var(--primary-color)' : 'var(--text-main)', textDecoration: onOpenCourse ? 'underline' : 'none' }}>
                          {reminder.courseName}
                        </strong>
                        {onOpenCourse && <ExternalLink size={12} color="var(--primary-color)" />}
                      </span>

                      {/* Target Scope / Student */}
                      {reminder.studentName && reminder.studentName !== 'Gesamte Gruppe' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <User size={13} color="var(--text-muted)" /> Schüler: <strong style={{ color: 'var(--text-main)' }}>{reminder.studentName}</strong>
                        </span>
                      )}
                      {reminder.targetType === 'course' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                          <Users size={13} /> (Gesamte Gruppe)
                        </span>
                      )}
                    </div>

                    {/* Details / Anomaly description if available */}
                    {reminder.anomalyType && reminder.anomalyType !== reminder.title && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Detail: {reminder.anomalyType}
                      </div>
                    )}

                    <div style={{ fontSize: '12px', color: isOverdue ? '#dc2626' : 'var(--text-muted)', marginTop: '6px', fontWeight: isOverdue ? '600' : 'normal' }}>
                      Fällig ab: {formatDate(reminder.date)} ({reminder.dueTime || '07:00'} Uhr)
                    </div>
                  </div>
                </div>

                {/* Actions: Edit & Delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '12px' }}>
                  {!isPrep && (
                    <button 
                      className="btn-icon" 
                      onClick={() => handleOpenEdit(reminder)}
                      style={{ color: '#475569', padding: '6px' }}
                      title="Termin bearbeiten"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button 
                    className="btn-icon" 
                    onClick={() => handleDelete(reminder.id)}
                    style={{ color: '#ef4444', padding: '6px' }}
                    title="Termin löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for creating / editing reminders */}
      {isAddModalOpen && (
        <AddReminderModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          courses={localCourses}
          students={localStudents}
          reminderToEdit={reminderToEdit}
          onSave={handleSaveReminder}
        />
      )}
    </div>
  );
};

