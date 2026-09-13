import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Users, Check, FileText, BookOpen, Palette, AlertTriangle, Tag, HelpCircle, Info, Bell, Bookmark } from 'lucide-react';
import type { Course, Student, Reminder, ReminderCategory } from '../schema';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  students: Student[];
  categories?: ReminderCategory[];
  initialDate?: string;
  reminderToEdit?: Reminder | null;
  onSave: (
    reminderData: Partial<Reminder> & { title: string; courseId: string; date: string },
    _prepDays?: any,
    existingReminderId?: string
  ) => Promise<void>;
}

export const COLOR_OPTIONS = [
  { id: 'blue', name: 'Blau', hex: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'purple', name: 'Violett', hex: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  { id: 'emerald', name: 'Smaragd', hex: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'amber', name: 'Bernstein', hex: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { id: 'rose', name: 'Rosenrot', hex: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
];

const DEFAULT_CATEGORIES: ReminderCategory[] = [
  { id: 'exam', name: 'Tests & Prüfungen', color: '#8b5cf6', icon: 'BookOpen' },
  { id: 'assignment', name: 'Abgaben', color: '#10b981', icon: 'FileText' },
  { id: 'general', name: 'Notizen & Sonstiges', color: '#2563eb', icon: 'Calendar' },
  { id: 'attendance_anomaly', name: 'Fehlzeiten', color: '#ef4444', icon: 'AlertTriangle', isFixed: true },
];

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  courses,
  students,
  categories,
  initialDate,
  reminderToEdit,
  onSave
}) => {
  const activeCategories = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('exam');
  const [type, setType] = useState<string>('exam');
  const [targetType, setTargetType] = useState<'course' | 'student'>('course');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [color, setColor] = useState<string>('purple');
  const [date, setDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('07:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen size={15} />;
      case 'FileText': return <FileText size={15} />;
      case 'AlertTriangle': return <AlertTriangle size={15} />;
      case 'Clock': return <Clock size={15} />;
      case 'Tag': return <Tag size={15} />;
      case 'HelpCircle': return <HelpCircle size={15} />;
      case 'Info': return <Info size={15} />;
      case 'Bell': return <Bell size={15} />;
      case 'Bookmark': return <Bookmark size={15} />;
      default: return <Calendar size={15} />;
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (reminderToEdit) {
        const catId = reminderToEdit.categoryId || reminderToEdit.type || 'exam';
        setSelectedCategoryId(catId);
        setType(reminderToEdit.type || catId);
        setTargetType(reminderToEdit.targetType || (reminderToEdit.studentId ? 'student' : 'course'));
        setSelectedCourseId(reminderToEdit.courseId || (courses[0]?.id || ''));
        setSelectedStudentId(reminderToEdit.studentId || '');
        setTitle(reminderToEdit.title || reminderToEdit.anomalyType || '');
        setDescription(reminderToEdit.description || '');
        setColor(reminderToEdit.color || 'purple');
        setDate(reminderToEdit.date || new Date().toISOString().split('T')[0]);
        setDueTime(reminderToEdit.dueTime || '07:00');
      } else {
        const defaultCat = activeCategories[0] || DEFAULT_CATEGORIES[0];
        setSelectedCategoryId(defaultCat.id);
        setType(defaultCat.id);
        setTargetType('course');
        const defaultCourse = courses[0]?.id || '';
        setSelectedCourseId(defaultCourse);
        setSelectedStudentId('');
        setTitle('');
        setDescription('');
        
        // Map hex/category color if possible
        const matchingColorOpt = COLOR_OPTIONS.find(c => c.hex === defaultCat.color || c.id === defaultCat.color);
        setColor(matchingColorOpt ? matchingColorOpt.id : 'purple');

        if (initialDate) {
          setDate(initialDate);
        } else {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          setDate(tomorrow.toISOString().split('T')[0]);
        }
        setDueTime('07:00');
      }
    }
  }, [isOpen, reminderToEdit, courses, initialDate]);

  if (!isOpen) return null;

  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const enrolledStudentIds = currentCourse?.enrolledStudents || [];
  const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));

  const handleSelectCategory = (cat: ReminderCategory) => {
    setSelectedCategoryId(cat.id);
    setType(cat.id);
    const matchingColorOpt = COLOR_OPTIONS.find(c => c.hex === cat.color || c.id === cat.color);
    if (matchingColorOpt) {
      setColor(matchingColorOpt.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedCourseId || !date) return;

    setIsSubmitting(true);
    try {
      const selectedStudent = students.find(s => s.id === selectedStudentId);
      const studentName = targetType === 'student' && selectedStudent 
        ? `${selectedStudent.lastName}, ${selectedStudent.firstName}`
        : 'Gesamte Gruppe';

      await onSave(
        {
          title: title.trim(),
          description: description.trim(),
          anomalyType: title.trim(),
          courseId: selectedCourseId,
          courseName: currentCourse?.name || '',
          studentId: targetType === 'student' ? selectedStudentId : '',
          studentName,
          targetType,
          type: selectedCategoryId || type,
          categoryId: selectedCategoryId || type,
          color,
          date,
          dueTime,
        },
        null,
        reminderToEdit?.id
      );

      onClose();
    } catch (err) {
      console.error("Fehler beim Speichern des Termins:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1150 }}>
      <div className="modal-card" style={{ maxWidth: '580px', borderRadius: '16px', overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary-color)" /> 
            {reminderToEdit ? 'Termin / Abgabe bearbeiten' : 'Neuen Termin erstellen'}
          </h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto' }}>
            
            {/* 1. Termin-Kategorie Wahl */}
            <div>
              <label className="form-label font-semibold" style={{ marginBottom: '8px', display: 'block' }}>Kategorie des Termins</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {activeCategories.map(cat => {
                  const isSelected = selectedCategoryId === cat.id;
                  const catColor = cat.color || 'var(--primary-color)';
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '13px',
                        backgroundColor: isSelected ? catColor : 'var(--bg-secondary)',
                        color: isSelected ? 'white' : 'var(--text-primary)',
                        border: '1px solid',
                        borderColor: isSelected ? catColor : 'var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {renderCategoryIcon(cat.icon)}
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Bezeichnung / Titel */}
            <div className="form-group">
              <label className="form-label font-semibold">Titel / Bezeichnung</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="z.B. 1. Schularbeit (Algebra) oder Mitschrift-Abgabe"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label font-semibold">Notiz / Beschreibung (mehrzeilig)</label>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Details, Anmerkungen oder Notizen zu diesem Eintrag..."
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* 3. Bezug (Gesamte Gruppe vs Einzelner Schüler) */}
            <div>
              <label className="form-label font-semibold" style={{ marginBottom: '8px', display: 'block' }}>Bezug (Zielgruppe)</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'course'}
                    onChange={() => setTargetType('course')}
                  />
                  <Users size={16} color="var(--primary-color)" /> Gesamte Gruppe
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'student'}
                    onChange={() => setTargetType('student')}
                  />
                  <User size={16} color="var(--primary-color)" /> Einzelner Schüler
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: targetType === 'student' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Gruppe / Kurs</label>
                  <select
                    className="form-input"
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    required
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                    ))}
                  </select>
                </div>

                {targetType === 'student' && (
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Schüler auswählen</label>
                    <select
                      className="form-input"
                      value={selectedStudentId}
                      onChange={e => setSelectedStudentId(e.target.value)}
                      required={targetType === 'student'}
                    >
                      <option value="">-- Schüler wählen --</option>
                      {enrolledStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.lastName}, {s.firstName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Akzentfarbe */}
            <div>
              <label className="form-label font-semibold" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={16} /> Farbakzent wählen
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      border: color === c.id ? '3px solid #0f172a' : '2px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'transform 0.15s ease'
                    }}
                    title={c.name}
                  >
                    {color === c.id && <Check size={16} strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Fälligkeitsdatum & Uhrzeit */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label font-semibold">Fälligkeitsdatum</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{ paddingLeft: '34px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label font-semibold">Uhrzeit</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Clock size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    value={dueTime}
                    onChange={e => setDueTime(e.target.value)}
                    style={{ paddingLeft: '34px' }}
                    placeholder="07:00"
                  />
                </div>
              </div>
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>Abbrechen</button>
            <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 0 }} disabled={isSubmitting || !title.trim() || !selectedCourseId || !date}>
              {isSubmitting ? 'Speichere...' : reminderToEdit ? 'Änderungen speichern' : 'Termin anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
