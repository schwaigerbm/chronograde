import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { EditColumnModal } from './EditColumnModal';
import { AttendanceModal } from './AttendanceModal';
import { formatDate } from '../lib/utils';
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
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CourseEntry | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [activeAttendanceColumnId, setActiveAttendanceColumnId] = useState<string | null>(null);
  const [showPresenceDetails, setShowPresenceDetails] = useState<Record<string, boolean>>({});
  const [hoveredColId, setHoveredColId] = useState<string | null>(null);

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

  const handleEditColumn = async (updatedColumn: CourseEntry) => {
    const updatedColumns = course.columns.map(col => col.id === updatedColumn.id ? updatedColumn : col);
    await firebaseService.updateCourseColumns(course.id, updatedColumns);
    setIsEditColumnModalOpen(false);
    setEditingColumn(null);
  };

  const openEditModal = (column: CourseEntry) => {
    setEditingColumn(column);
    setIsEditColumnModalOpen(true);
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!window.confirm('Möchten Sie diese Spalte wirklich löschen? Alle zugehörigen Noten gehen verloren.')) return;
    const updatedColumns = course.columns.filter(col => col.id !== columnId);
    await firebaseService.updateCourseColumns(course.id, updatedColumns);
  };

  const isNarrowColumn = (col: CourseEntry) => {
    if (col.type === 'groupAssignment') return true;
    if (col.type === 'manual' && (col.calcType === 'grade' || col.calcType === 'sign')) return true;
    return false;
  };

  const handleMoveColumn = async (columnId: string, direction: 'left' | 'right') => {
    const index = course.columns.findIndex(col => col.id === columnId);
    if (index === -1) return;
    
    const newColumns = [...course.columns];
    if (direction === 'left' && index > 0) {
      [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
    } else if (direction === 'right' && index < newColumns.length - 1) {
      [newColumns[index + 1], newColumns[index]] = [newColumns[index], newColumns[index + 1]];
    } else {
      return;
    }
    
    await firebaseService.updateCourseColumns(course.id, newColumns);
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

  const getHeatmapStyle = (column: CourseEntry, grade?: Grade): React.CSSProperties => {
    if (!column.isColorEnabled || !grade || grade.value === undefined || grade.value === '') return {};

    if (column.calcType === 'grade') {
      const g = Number(grade.value);
      let bg = '';
      let text = '';
      switch (g) {
        case 1: bg = '#15803d'; text = 'white'; break; // Dunkelgrün
        case 2: bg = '#86efac'; text = '#064e3b'; break; // Hellgrün
        case 3: bg = '#ffffff'; text = 'inherit'; break; // Weiß
        case 4: bg = '#fca5a5'; text = '#7f1d1d'; break; // Leicht rot
        case 5: bg = '#b91c1c'; text = 'white'; break; // Dunkelrot
        default: return {};
      }
      return { backgroundColor: bg, color: text };
    }

    if (column.calcType === 'percent' && column.type !== 'presenceSum') {
      const p = Number(grade.value);
      if (isNaN(p)) return {};
      
      const constrainedP = Math.max(50, Math.min(100, p));
      const factor = (constrainedP - 50) / 50; // 0 bei 50%, 1 bei 100%
      
      const r = Math.round(185 + factor * (21 - 185));
      const g = Math.round(28 + factor * (128 - 28));
      const b = Math.round(28 + factor * (61 - 28));
      
      return { 
        backgroundColor: `rgb(${r}, ${g}, ${b})`, 
        color: factor > 0.7 || factor < 0.3 ? 'white' : 'inherit' 
      };
    }

    if (column.calcType === 'sign') {
      const s = grade.value;
      let color = '';
      switch (s) {
        case '+': color = '#15803d'; break; // Dunkelgrün
        case '~': color = '#d97706'; break; // Orange
        case '-': color = '#b91c1c'; break; // Dunkelrot
        default: return {};
      }
      return { color, fontWeight: '900', fontSize: '1.4rem' };
    }

    return {};
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
              <th className="sticky-col">SCHÜLER</th>
              {course.columns.map(col => (
                <th 
                  key={col.id} 
                  className={`matrix-header-cell ${hoveredColId === col.id ? 'col-hovered' : ''} ${isNarrowColumn(col) ? 'narrow-col' : ''}`}
                  onMouseEnter={() => setHoveredColId(col.id)}
                  onMouseLeave={() => setHoveredColId(null)}
                >
                  <div className={`header-content ${col.type === 'groupAssignment' ? 'align-left' : ''}`}>
                    <div className="vertical-title">
                      <span>{col.title}</span>
                    </div>
                    
                    {col.showDateInHeader !== false && col.type !== 'presenceSum' && (
                      <div className="horizontal-date">
                        {formatDate(col.date)}
                      </div>
                    )}

                    <div className="header-inline-actions">
                      {col.type === 'presenceSum' && (
                        <div className="action-row">
                          <button 
                            className="btn-header-action" 
                            onClick={() => handleOpenAttendanceModal(col.id)}
                            title="Anwesenheit erfassen"
                          >
                            <Plus size={14} />
                          </button>
                          <button 
                            className="btn-header-action" 
                            onClick={() => togglePresenceDetails(col.id)}
                            title={showPresenceDetails[col.id] ? "Details ausblenden" : "Details einblenden"}
                          >
                            {showPresenceDetails[col.id] ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </div>
                      )}

                      <div className="action-row">
                        <button 
                          className="btn-header-action" 
                          onClick={() => openEditModal(col)}
                          title="Bearbeiten"
                        >
                          <Info size={14} />
                        </button>
                        <button 
                          className="btn-header-action" 
                          onClick={() => handleMoveColumn(col.id, 'left')}
                          title="Nach links"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button 
                          className="btn-header-action" 
                          onClick={() => handleMoveColumn(col.id, 'right')}
                          title="Nach rechts"
                        >
                          <ChevronRight size={14} />
                        </button>
                        <button 
                          className="btn-header-action danger" 
                          onClick={() => handleDeleteColumn(col.id)}
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
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
                {course.columns.map(col => {
                  const grade = grades[student.id]?.[col.id];
                  const heatmapStyle = getHeatmapStyle(col, grade);
                  
                  return (
                    <td 
                      key={col.id} 
                      className={`matrix-cell ${col.type === 'presenceSum' && !showPresenceDetails[col.id] ? 'presence-hidden' : ''} ${hoveredColId === col.id ? 'col-hovered' : ''} ${isNarrowColumn(col) ? 'narrow-col' : ''}`}
                      onMouseEnter={() => setHoveredColId(col.id)}
                      onMouseLeave={() => setHoveredColId(null)}
                      style={heatmapStyle}
                    >
                      <GradeCell 
                        studentId={student.id}
                        column={col}
                        grade={grade}
                        onUpdateGrade={(g) => updateGrade(student.id, col.id, g)}
                        onAddEntry={(e) => addGradeEntry(student.id, col.id, e)}
                        onDeleteEntry={(entryId) => deleteGradeEntry(student.id, col.id, entryId)}
                        isHidden={col.type === 'presenceSum' && !showPresenceDetails[col.id]}
                        heatmapStyle={heatmapStyle}
                      />
                    </td>
                  );
                })}
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

      <EditColumnModal 
        isOpen={isEditColumnModalOpen}
        onClose={() => setIsEditColumnModalOpen(false)}
        column={editingColumn}
        onSave={handleEditColumn}
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
  heatmapStyle?: React.CSSProperties;
}

const GradeCell = ({ column, grade, onUpdateGrade, onAddEntry, onDeleteEntry, isHidden, heatmapStyle }: GradeCellProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const handleOpenMenu = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom, left: rect.left + rect.width / 2 });
    setShowMenu(true);
  };

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
            pattern="[1-9]"
            title="Bitte eine Zahl zwischen 1 und 9 eingeben"
            style={{ color: heatmapStyle?.color }}
          />
        );
      
      case 'manual':
        return (
          <div 
            className="manual-cell-content"
            onClick={handleOpenMenu}
            style={{ color: heatmapStyle?.color }}
          >
            {grade?.value || <span className="empty-placeholder">-</span>}
            {showMenu && (
              <ManualSelector 
                type={column.calcType} 
                currentValue={grade?.value}
                position={menuPos}
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
                      <p className="tooltip-date">{formatDate(entry.date)}</p>
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
              onClick={handleOpenMenu}
              style={{ color: heatmapStyle?.color || 'var(--primary-color)' }}
            >
              <PlusCircle size={14} />
            </button>
            {showMenu && (
              <CollaborationEntryModal 
                position={menuPos}
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
            <div className="presence-percentage" style={{ fontWeight: 'bold', color: heatmapStyle?.color || 'var(--text-main)' }}>
              {percent !== null ? `${percent}%` : <span className="empty-placeholder">-</span>}
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
                    {formatDate(entry.date)}
                  </div>
                </div>
              ))}
              {total > 0 && <span className="presence-summary" style={{ marginLeft: '4px', opacity: 0.6, color: heatmapStyle?.color }}>{present}/{total}</span>}
            </div>
          </div>
        );

      default:
        return <span className="empty-placeholder">-</span>;
    }
  };

  return (
    <div className="grade-cell-inner">
      {renderContent()}
    </div>
  );
};

const ManualSelector = ({ type, currentValue, position, onSelect, onClose }: { type: CourseEntry['calcType'], currentValue?: string | number, position: { top: number, left: number }, onSelect: (val: string | number) => void, onClose: () => void }) => {
  return createPortal(
    <div className="modal-overlay menu-overlay" onClick={onClose} style={{ background: 'transparent' }}>
      <div className="context-menu selector-menu" style={{ top: position.top, left: position.left }} onClick={(e) => e.stopPropagation()}>
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
    </div>,
    document.body
  );
};

const CollaborationEntryModal = ({ position, onSave, onClose }: { position: { top: number, left: number }, onSave: (val: string, note: string, date: string) => void, onClose: () => void }) => {
  const [val, setVal] = useState('+');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return createPortal(
    <div className="modal-overlay menu-overlay" onClick={onClose} style={{ background: 'transparent' }}>
      <div className="context-modal collaboration-modal context-menu" style={{ top: position.top, left: position.left }} onClick={(e) => e.stopPropagation()}>
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
    </div>,
    document.body
  );
};
