import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  MoreVertical, 
  Trash2, 
  MessageSquare,
  Check,
  X as XIcon,
  PlusCircle,
  MinusCircle,
  Minus,
  Info
} from 'lucide-react';
import { useGradesManager } from '../hooks/useGradesManager';
import { firebaseService } from '../services/firebaseService';
import { AddColumnModal } from './AddColumnModal';
import { AttendanceModal } from './AttendanceModal';
import type { Course, Student, CourseEntry, Grade, GradeEntry } from '../schema';

interface GradesMatrixProps {
  course: Course;
}

export const GradesMatrix = ({ course }: GradesMatrixProps) => {
  const { 
    students, 
    grades, 
    loading, 
    updateGrade, 
    addGradeEntry, 
    bulkAddEntries,
    deleteGradeEntry 
  } = useGradesManager(course);

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [activeAttendanceColumnId, setActiveAttendanceColumnId] = useState<string | null>(null);
  const [showPresenceDetails, setShowPresenceDetails] = useState<Record<string, boolean>>({});

  const handleAddColumn = async (columnData: Omit<CourseEntry, 'id'>) => {
    const newColumn: CourseEntry = {
      ...columnData,
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
          ? crypto.randomUUID() 
          : Date.now().toString(36) + Math.random().toString(36).substring(2),
    };
    const updatedColumns = [...course.columns, newColumn];
    await firebaseService.updateCourseColumns(course.id, updatedColumns);
    setIsAddColumnModalOpen(false);
  };

  const togglePresenceDetails = (columnId: string) => {
    setShowPresenceDetails(prev => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const handleOpenAttendanceModal = (columnId: string) => {
    setActiveAttendanceColumnId(columnId);
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async (date: string, attendanceData: Record<string, 'check' | 'x'>) => {
    if (!activeAttendanceColumnId) return;

    const updates = Object.entries(attendanceData).map(([studentId, value]) => ({
      studentId,
      entry: {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : Date.now().toString(36) + Math.random().toString(36).substring(2),
        value,
        date
      }
    }));

    try {
      await bulkAddEntries(activeAttendanceColumnId, updates);
      setIsAttendanceModalOpen(false);
      setActiveAttendanceColumnId(null);
    } catch (err) {
      console.error("Fehler beim Speichern der Anwesenheit:", err);
    }
  };

  if (loading) return <div className="loading-state">Lade Leistungsmatrix...</div>;

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="title-group">
          <h1 className="main-title">Leistungsbeurteilung</h1>
          <div className="subtitle-wrapper" style={{ justifyContent: 'space-between', width: '100%' }}>
            <h2 className="sub-title">{course.name}</h2>
            <button className="btn-primary btn-sm" onClick={() => setIsAddColumnModalOpen(true)} style={{ width: 'auto', marginTop: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={16} /> Beurteilungsspalte hinzufügen</span>
            </button>
          </div>
        </div>
      </div>

      <div className="matrix-scroll-area">
        <table className="data-table matrix-table">
          <thead>
            <tr>
              <th className="sticky-col">Schüler</th>
              {course.columns.map(col => (
                <th key={col.id} className="matrix-header-cell">
                  <div className="header-content">
                    <span>{col.title}</span>
                    {col.type === 'presenceSum' && (
                      <div className="header-actions" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                        <button 
                          className="btn-icon btn-xs" 
                          onClick={() => handleOpenAttendanceModal(col.id)}
                          title="Anwesenheit erfassen"
                        >
                          <Plus size={14} />
                        </button>
                        <button 
                          className="btn-icon btn-xs" 
                          onClick={() => togglePresenceDetails(col.id)}
                          title={showPresenceDetails[col.id] ? "Details ausblenden" : "Details einblenden"}
                        >
                          {showPresenceDetails[col.id] ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>
                    )}
                    <span className="date-label">{col.date}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td className="sticky-col font-medium">
                  {student.lastName}, {student.firstName}
                </td>
                {course.columns.map(col => (
                  <td 
                    key={col.id} 
                    className={`matrix-cell ${col.type === 'presenceSum' && !showPresenceDetails[col.id] ? 'presence-hidden' : ''}`}
                  >
                    <GradeCell 
                      studentId={student.id}
                      column={col}
                      grade={grades[student.id]?.[col.id]}
                      onUpdateGrade={(g) => updateGrade(student.id, col.id, g)}
                      onAddEntry={(e) => addGradeEntry(student.id, col.id, e)}
                      onDeleteEntry={(entryId) => deleteGradeEntry(student.id, col.id, entryId)}
                      isHidden={col.type === 'presenceSum' && !showPresenceDetails[col.id]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddColumnModal 
        isOpen={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        onSave={handleAddColumn}
      />

      <AttendanceModal 
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        students={students}
        onSave={handleSaveAttendance}
      />
    </div>
  );
};

interface GradeCellProps {
  studentId: string;
  column: CourseEntry;
  grade?: Grade;
  onUpdateGrade: (grade: Grade) => void;
  onAddEntry: (entry: GradeEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  isHidden?: boolean;
}

const GradeCell = ({ column, grade, onUpdateGrade, onAddEntry, onDeleteEntry, isHidden }: GradeCellProps) => {
  const [showMenu, setShowMenu] = useState(false);

  if (isHidden) return null;

  const handleGroupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || (/^[1-9]$/.test(val))) {
      onUpdateGrade({ value: val, date: new Date().toISOString() });
    }
  };

  const renderContent = () => {
    switch (column.type) {
      case 'groupAssignment':
        return (
          <input 
            type="text"
            className="group-input"
            value={grade?.value || ''}
            onChange={handleGroupChange}
            placeholder="-"
          />
        );
      
      case 'manual':
        return (
          <div 
            className="manual-cell-content"
            onClick={() => setShowMenu(true)}
          >
            {grade?.value || <span className="empty-placeholder">-</span>}
            {showMenu && (
              <ManualSelector 
                type={column.calcType} 
                currentValue={grade?.value}
                onSelect={(val) => {
                  onUpdateGrade({ value: val, date: new Date().toISOString() });
                  setShowMenu(false);
                }}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        );

      case 'collaborationSum':
        return (
          <div className="collaboration-cell">
            <div className="entries-list">
              {grade?.entries?.map(entry => (
                <div 
                  key={entry.id} 
                  className={`entry-dot ${entry.value === '+' ? 'plus' : entry.value === '-' ? 'minus' : 'neutral'}`}
                >
                  {entry.value}
                  <div className="tooltip">
                    <div className="tooltip-content">
                      <p className="tooltip-note">{entry.note || 'Keine Notiz'}</p>
                      <p className="tooltip-date">{entry.date}</p>
                      <button 
                        className="delete-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEntry(entry.id);
                        }}
                      >
                        <Trash2 size={12} /> Eintrag löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button 
              className="add-entry-btn"
              onClick={() => setShowMenu(true)}
            >
              <PlusCircle size={14} />
            </button>
            {showMenu && (
              <CollaborationEntryModal 
                onSave={(val, note, date) => {
                  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                    ? crypto.randomUUID() 
                    : Date.now().toString(36) + Math.random().toString(36).substring(2);
                  onAddEntry({ id, value: val, note, date });
                  setShowMenu(false);
                }}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        );

      case 'presenceSum':
        const total = grade?.entries?.length || 0;
        const present = grade?.entries?.filter(e => e.value === 'check').length || 0;
        const percent = total > 0 ? Math.round((present / total) * 100) : null;

        if (isHidden) {
          return (
            <div className="presence-percentage" style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
              {percent !== null ? `${percent}%` : '-'}
            </div>
          );
        }

        return (
          <div className="presence-cell">
            <div className="entries-list">
              {grade?.entries?.map(entry => (
                <div key={entry.id} className="presence-entry">
                  {entry.value === 'check' ? <Check size={12} className="icon-present" /> : <XIcon size={12} className="icon-absent" />}
                  <div className="tooltip-mini">
                    {entry.date}
                  </div>
                </div>
              ))}
              {total > 0 && <span className="presence-summary">{present}/{total}</span>}
            </div>
          </div>
        );

      default:
        return <span>-</span>;
    }
  };

  return (
    <div className="grade-cell-inner">
      {renderContent()}
    </div>
  );
};

const ManualSelector = ({ type, currentValue, onSelect, onClose }: { type: CourseEntry['calcType'], currentValue?: string | number, onSelect: (val: string | number) => void, onClose: () => void }) => {
  return (
    <div className="context-menu selector-menu" onClick={(e) => e.stopPropagation()}>
      <div className="menu-options">
        {type === 'grade' && [1, 2, 3, 4, 5].map(g => (
          <button key={g} className="menu-item" onClick={() => onSelect(g)}>
            <span>{g}</span> {currentValue == g && <Check size={14} />}
          </button>
        ))}
        {type === 'sign' && ['+', '~', '-'].map(s => (
          <button key={s} className="menu-item sign-item" onClick={() => onSelect(s)}>
            {s}
          </button>
        ))}
        {type === 'percent' && (
          <div className="percent-picker">
            <input 
              type="range" 
              min="0" max="100" 
              defaultValue={currentValue as number || 0}
              onMouseUp={(e) => onSelect((e.target as HTMLInputElement).value)}
              className="range-input"
            />
            <div className="range-label">0 - 100%</div>
          </div>
        )}
        <div className="menu-divider"></div>
        <button className="menu-close-btn" onClick={onClose}>Schließen</button>
      </div>
    </div>
  );
};

const CollaborationEntryModal = ({ onSave, onClose }: { onSave: (val: string, note: string, date: string) => void, onClose: () => void }) => {
  const [val, setVal] = useState('+');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="context-modal collaboration-modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-inner">
        <div className="sign-selector">
          {['+', '~', '-'].map(s => (
            <button 
              key={s} 
              className={`sign-btn ${s === '+' ? 'plus' : s === '-' ? 'minus' : 'neutral'} ${val === s ? 'active' : ''}`}
              onClick={() => setVal(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="input-field">
          <label>Notiz (Pflicht)</label>
          <input 
            className="form-input" 
            placeholder="z.B. Gut mitgearbeitet"
            value={note}
            onChange={e => setNote(e.target.value)}
            autoFocus
          />
        </div>
        <div className="input-field">
          <label>Datum</label>
          <input 
            type="date"
            className="form-input" 
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary btn-xs" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary btn-xs" 
            disabled={!note}
            onClick={() => onSave(val, note, date)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
