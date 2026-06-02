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
  Info,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { useGradesManager } from '../hooks/useGradesManager';
import { firebaseService } from '../services/firebaseService';
import { AddColumnModal } from './AddColumnModal';
import { EditColumnModal } from './EditColumnModal';
import { AttendanceModal } from './AttendanceModal';
import { CollaborationBulkModal } from './CollaborationBulkModal';
import { ConfigureViewModal } from './ConfigureViewModal';
import { formatDate } from '../lib/utils';
import type { Course, Student, CourseEntry, Grade, GradeEntry } from '../schema';

interface GradesMatrixProps {
  course: Course;
}

const getCollaborationPercentage = (entries?: GradeEntry[]): number | null => {
  if (!entries || entries.length === 0) return null;
  const totalPoints = entries.reduce((sum, entry) => {
    if (entry.value === '+') return sum + 1;
    if (entry.value === '~') return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((totalPoints / entries.length) * 100);
};

const getPresencePercentage = (entries?: GradeEntry[]): number | null => {
  if (!entries || entries.length === 0) return null;
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 1), 0);
  const presentHours = entries.reduce((sum, entry) => {
    return sum + (entry.value === 'check' ? (entry.hours || 1) : 0);
  }, 0);
  return Math.round((presentHours / totalHours) * 100);
};

export const GradesMatrix = ({ course }: GradesMatrixProps) => {
  const { 
    students, 
    grades, 
    loading, 
    updateGrade, 
    addGradeEntry, 
    editGradeEntry,
    bulkAddEntries,
    deleteGradeEntry 
  } = useGradesManager(course);

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [isConfigureModalOpen, setIsConfigureModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CourseEntry | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [activeAttendanceColumnId, setActiveAttendanceColumnId] = useState<string | null>(null);
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [activeCollaborationColumnId, setActiveCollaborationColumnId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
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

  const handleConfigureColumns = async (updatedColumns: CourseEntry[]) => {
    await firebaseService.updateCourseColumns(course.id, updatedColumns);
    setIsConfigureModalOpen(false);
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

  const toggleDetails = (columnId: string) => {
    setShowDetails(prev => ({ ...prev, [columnId]: !prev[columnId] }));
  };

  const handleOpenAttendanceModal = (columnId: string) => {
    setActiveAttendanceColumnId(columnId);
    setIsAttendanceModalOpen(true);
  };

  const handleOpenCollaborationBulkModal = (columnId: string) => {
    setActiveCollaborationColumnId(columnId);
    setIsCollaborationModalOpen(true);
  };

  const handleSaveAttendance = async (date: string, hours: number, attendanceData: Record<string, 'check' | 'x'>) => {
    if (!activeAttendanceColumnId) return;

    const updates = Object.entries(attendanceData).map(([studentId, value]) => ({
      studentId,
      entry: {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : Date.now().toString(36) + Math.random().toString(36).substring(2),
        value,
        date,
        hours
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

  const handleSaveCollaborationBulk = async (date: string, note: string, collabData: Record<string, '+' | '-' | '~' | 'unset'>) => {
    if (!activeCollaborationColumnId) return;

    const updates = Object.entries(collabData)
      .filter(([_, value]) => value !== 'unset')
      .map(([studentId, value]) => ({
        studentId,
        entry: {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
              ? crypto.randomUUID() 
              : Date.now().toString(36) + Math.random().toString(36).substring(2),
          value: value as string,
          note,
          date
        }
      }));

    if (updates.length === 0) return;

    try {
      await bulkAddEntries(activeCollaborationColumnId, updates);
      setIsCollaborationModalOpen(false);
      setActiveCollaborationColumnId(null);
    } catch (err) {
      console.error("Fehler beim Speichern der Mitarbeit:", err);
    }
  };

  const getPercentHeatmap = (p: number): React.CSSProperties => {
    const constrainedP = Math.max(50, Math.min(100, p));
    const factor = (constrainedP - 50) / 50; // 0 bei 50%, 1 bei 100%
    
    const r = Math.round(185 + factor * (21 - 185));
    const g = Math.round(28 + factor * (128 - 28));
    const b = Math.round(28 + factor * (61 - 28));
    
    return { 
      backgroundColor: `rgb(${r}, ${g}, ${b})`, 
      color: factor > 0.7 || factor < 0.3 ? 'white' : 'inherit' 
    };
  };

  const getHeatmapStyle = (column: CourseEntry, grade?: Grade): React.CSSProperties => {
    if (!column.isColorEnabled || !grade) return {};

    // 1. Spezielle Logik für Mitarbeit in Kompaktansicht
    if (column.type === 'collaborationSum' && !showDetails[column.id]) {
      const p = getCollaborationPercentage(grade.entries);
      if (p === null) return {};
      return getPercentHeatmap(p);
    }

    // 2. Spezielle Logik für Anwesenheit in Kompaktansicht
    if (column.type === 'presenceSum' && !showDetails[column.id]) {
      const p = getPresencePercentage(grade.entries);
      if (p === null) return {};
      return getPercentHeatmap(p);
    }

    if (grade.value === undefined || grade.value === '') return {};

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
      return getPercentHeatmap(p);
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

  const visibleColumns = course.columns.filter(col => col.isVisible !== false);

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="title-group">
          <h1 className="main-title">Leistungsbeurteilung</h1>
          <div className="subtitle-wrapper" style={{ justifyContent: 'space-between', width: '100%' }}>
            <h2 className="sub-title">{course.name}</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary btn-sm" onClick={() => setIsConfigureModalOpen(true)} style={{ width: 'auto', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={16} /> Ansicht konfigurieren
              </button>
              <button className="btn-primary btn-sm" onClick={() => setIsAddColumnModalOpen(true)} style={{ width: 'auto', marginTop: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={16} /> Beurteilungsspalte hinzufügen</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="matrix-scroll-area">
        <table className="data-table matrix-table">
          <thead>
            <tr>
              <th className="sticky-col">SCHÜLER</th>
              {visibleColumns.map(col => {
                return (
                  <th 
                    key={col.id} 
                    className={`matrix-header-cell ${hoveredColId === col.id ? 'col-hovered' : ''} ${col.type === 'collaborationSum' && showDetails[col.id] ? 'collaboration-col' : 'standard-col'}`}
                    onMouseEnter={() => setHoveredColId(col.id)}
                    onMouseLeave={() => setHoveredColId(null)}
                  >
                    <div className={`header-content ${col.type === 'groupAssignment' ? 'align-left' : ''}`}>
                      {/* EBENE 1: IDENTIFIKATION */}
                      <div className="header-level-1">
                        <div className="vertical-title">
                          <span>{col.title}</span>
                        </div>
                        
                        {col.showDateInHeader !== false && col.type !== 'presenceSum' && (
                          <div className="horizontal-date">
                            {formatDate(col.date, false)}
                          </div>
                        )}
                      </div>

                      {/* EBENE 2: VERWALTUNG */}
                      <div className="header-level-2 action-row">
                        <button 
                          className="btn-header-action" 
                          onClick={() => openEditModal(col)}
                          title="Bearbeiten"
                        >
                          <Info size={14} />
                        </button>
                        
                        {(col.type === 'presenceSum' || col.type === 'collaborationSum') && (
                          <button 
                            className="btn-header-action" 
                            onClick={() => col.type === 'presenceSum' ? handleOpenAttendanceModal(col.id) : handleOpenCollaborationBulkModal(col.id)}
                            title={col.type === 'presenceSum' ? "Anwesenheit erfassen" : "Mitarbeit erfassen"}
                          >
                            <Plus size={14} />
                          </button>
                        )}

                        <button 
                          className="btn-header-action danger" 
                          onClick={() => handleDeleteColumn(col.id)}
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* EBENE 3: NAVIGATION & ANSICHT */}
                      <div className="header-level-3 action-row">
                        <button 
                          className="btn-header-action" 
                          onClick={() => handleMoveColumn(col.id, 'left')}
                          title="Nach links"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        
                        {(col.type === 'presenceSum' || col.type === 'collaborationSum') && (
                          <button 
                            className="btn-header-action" 
                            onClick={() => toggleDetails(col.id)}
                            title={showDetails[col.id] ? "Details ausblenden" : "Details einblenden"}
                          >
                            {showDetails[col.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}

                        <button 
                          className="btn-header-action" 
                          onClick={() => handleMoveColumn(col.id, 'right')}
                          title="Nach rechts"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id}>
                <td className="sticky-col font-medium">
                  {student.lastName}, {student.firstName}
                </td>
                {visibleColumns.map(col => {
                  const grade = grades[student.id]?.[col.id];
                  const heatmapStyle = getHeatmapStyle(col, grade);
                  const isHidden = (col.type === 'presenceSum' || col.type === 'collaborationSum') && !showDetails[col.id];
                  
                  return (
                    <td 
                      key={col.id} 
                      className={`matrix-cell ${isHidden ? 'presence-hidden' : ''} ${hoveredColId === col.id ? 'col-hovered' : ''} ${col.type === 'collaborationSum' && showDetails[col.id] ? 'collaboration-col' : 'standard-col'}`}
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
                        onEditEntry={(e) => editGradeEntry(student.id, col.id, e)}
                        onDeleteEntry={(entryId) => deleteGradeEntry(student.id, col.id, entryId)}
                        isHidden={isHidden}
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

      <CollaborationBulkModal 
        isOpen={isCollaborationModalOpen}
        onClose={() => setIsCollaborationModalOpen(false)}
        students={students}
        onSave={handleSaveCollaborationBulk}
      />

      <ConfigureViewModal 
        isOpen={isConfigureModalOpen}
        onClose={() => setIsConfigureModalOpen(false)}
        columns={course.columns}
        onSave={handleConfigureColumns}
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
  onEditEntry: (entry: GradeEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  isHidden?: boolean;
  heatmapStyle?: React.CSSProperties;
}

const GradeCell = ({ column, grade, onUpdateGrade, onAddEntry, onEditEntry, onDeleteEntry, isHidden, heatmapStyle }: GradeCellProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [editingEntry, setEditingEntry] = useState<GradeEntry | null>(null);

  const handleOpenMenu = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom, left: rect.left + rect.width / 2 });
    setShowMenu(true);
  };

  const handleCloseMenu = () => {
    setShowMenu(false);
    setEditingEntry(null);
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
                  handleCloseMenu();
                }}
                onClose={handleCloseMenu}
              />
            )}
          </div>
        );

      case 'collaborationSum':
        if (isHidden) {
          const p = getCollaborationPercentage(grade?.entries);
          return (
            <div className="presence-percentage" style={{ fontWeight: 'bold', color: heatmapStyle?.color || 'var(--text-main)' }}>
              {p !== null ? `${p}%` : <span className="empty-placeholder">-</span>}
            </div>
          );
        }
        return (
          <div className="collaboration-cell">
            <div className="entries-list">
              {grade?.entries?.map(entry => (
                <div 
                  key={entry.id} 
                  className={`entry-dot ${entry.value === '+' ? 'plus' : entry.value === '-' ? 'minus' : 'neutral'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEntry(entry);
                    handleOpenMenu(e);
                  }}
                >
                  {entry.value === '+' && <Plus size={12} />}
                  {entry.value === '-' && <Minus size={12} />}
                  {entry.value === '~' && <span className="tilde-icon">~</span>}
                  
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
                entry={editingEntry || undefined}
                onSave={(val, note, date) => {
                  if (editingEntry) {
                    onEditEntry({ ...editingEntry, value: val, note, date });
                  } else {
                    const id = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                      ? crypto.randomUUID() 
                      : Date.now().toString(36) + Math.random().toString(36).substring(2);
                    onAddEntry({ id, value: val, note, date });
                  }
                  handleCloseMenu();
                }}
                onClose={handleCloseMenu}
              />
            )}
          </div>
        );

      case 'presenceSum':
        if (isHidden) {
          const percent = getPresencePercentage(grade?.entries);
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
                <div 
                  key={entry.id} 
                  className="presence-entry"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEntry(entry);
                    handleOpenMenu(e);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ position: 'relative' }}>
                    {entry.value === 'check' ? <Check size={12} className="icon-present" /> : <XIcon size={12} className="icon-absent" />}
                    {(entry.hours || 1) > 1 && (
                      <span style={{ 
                        position: 'absolute', 
                        top: '-6px', 
                        right: '-6px', 
                        fontSize: '8px', 
                        background: 'var(--primary-color)', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '10px', 
                        height: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 'bold'
                      }}>
                        {entry.hours}
                      </span>
                    )}
                  </div>
                  <div className="tooltip-mini">
                    {formatDate(entry.date)} ({entry.hours || 1} Std.)
                  </div>
                </div>
              ))}
            </div>
            {showMenu && editingEntry && (
              <PresenceEntryModal 
                position={menuPos}
                entry={editingEntry}
                onSave={(val, hours, date) => {
                  onEditEntry({ ...editingEntry, value: val, hours, date });
                  handleCloseMenu();
                }}
                onDelete={() => {
                  onDeleteEntry(editingEntry.id);
                  handleCloseMenu();
                }}
                onClose={handleCloseMenu}
              />
            )}
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

const CollaborationEntryModal = ({ position, onSave, onClose, entry }: { position: { top: number, left: number }, onSave: (val: string, note: string, date: string) => void, onClose: () => void, entry?: GradeEntry }) => {
  const [val, setVal] = useState(entry?.value as string || '+');
  const [note, setNote] = useState(entry?.note || '');
  const [date, setDate] = useState(entry?.date || new Date().toISOString().split('T')[0]);

  return createPortal(
    <div className="modal-overlay menu-overlay" onClick={onClose} style={{ background: 'transparent' }}>
      <div className="context-modal collaboration-modal context-menu" style={{ top: position.top, left: position.left }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner">
          <div className="modal-title" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-muted)' }}>
            {entry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
          </div>
          <div className="sign-selector">
            {['+', '~', '-'].map(s => (
              <button 
                key={s} 
                className={`sign-btn ${s === '+' ? 'plus' : s === '-' ? 'minus' : 'neutral'} ${val === s ? 'active' : ''}`}
                onClick={() => setVal(s)}
              >
                {s === '+' ? <Plus size={20} /> : s === '-' ? <Minus size={20} /> : <span style={{ fontSize: '24px', lineHeight: 1 }}>~</span>}
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

const PresenceEntryModal = ({ position, onSave, onDelete, onClose, entry }: { position: { top: number, left: number }, onSave: (val: string, hours: number, date: string) => void, onDelete: () => void, onClose: () => void, entry: GradeEntry }) => {
  const [val, setVal] = useState(entry.value as string);
  const [hours, setHours] = useState(entry.hours || 1);
  const [date, setDate] = useState(entry.date || new Date().toISOString().split('T')[0]);

  return createPortal(
    <div className="modal-overlay menu-overlay" onClick={onClose} style={{ background: 'transparent' }}>
      <div className="context-modal collaboration-modal context-menu" style={{ top: position.top, left: position.left }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-inner">
          <div className="modal-title" style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-muted)' }}>
            Eintrag bearbeiten
          </div>
          
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', justifyContent: 'center' }}>
            <button 
              className={`presence-toggle check ${val === 'check' ? 'active' : ''}`}
              onClick={() => setVal('check')}
              style={{ width: '44px', height: '44px', borderRadius: '50%', border: val === 'check' ? '2px solid #16a34a' : '1px solid #e2e8f0' }}
            >
              <Check size={20} className="icon-present" />
            </button>
            <button 
              className={`presence-toggle x ${val === 'x' ? 'active' : ''}`}
              onClick={() => setVal('x')}
              style={{ width: '44px', height: '44px', borderRadius: '50%', border: val === 'x' ? '2px solid #dc2626' : '1px solid #e2e8f0' }}
            >
              <XIcon size={20} className="icon-absent" />
            </button>
          </div>

          <div className="input-field">
            <label>Stunden</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 4].map(h => (
                <button 
                  key={h} 
                  type="button"
                  className={`btn-secondary btn-xs`}
                  style={hours === h ? { backgroundColor: 'var(--primary-color)', color: 'white' } : {}}
                  onClick={() => setHours(h)}
                >
                  {h}
                </button>
              ))}
              <input 
                type="number" 
                className="form-input" 
                style={{ width: '50px', padding: '2px 4px', fontSize: '12px' }}
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                min="1"
              />
            </div>
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

          <div className="modal-actions" style={{ flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button className="btn-secondary btn-xs" style={{ flex: 1 }} onClick={onClose}>Abbrechen</button>
              <button className="btn-primary btn-xs" style={{ flex: 1 }} onClick={() => onSave(val, hours, date)}>Speichern</button>
            </div>
            <button 
              className="delete-link" 
              style={{ marginTop: '8px', color: 'var(--danger-color)', background: 'transparent' }}
              onClick={onDelete}
            >
              <Trash2 size={12} /> Eintrag löschen
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
