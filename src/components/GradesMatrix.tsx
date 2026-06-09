import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Trash2, 
  Check,
  X as XIcon,
  PlusCircle,
  Minus,
  Info,
  Eye,
  EyeOff,
  Settings,
  Pencil,
  TrendingUp
} from 'lucide-react';
import { useGradesManager } from '../hooks/useGradesManager';
import { firebaseService } from '../services/firebaseService';
import { AddColumnModal } from './AddColumnModal';
import { EditColumnModal } from './EditColumnModal';
import { AttendanceModal } from './AttendanceModal';
import { CollaborationBulkModal } from './CollaborationBulkModal';
import { ConfigureViewModal } from './ConfigureViewModal';
import { DialogModal } from './DialogModal';
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

const calculateAverage = (studentId: string, columns: CourseEntry[], allGrades: Record<string, Record<string, Grade>>, cutoffDate?: string, roundingRule: 'commercial' | 'studentFriendly' = 'commercial') => {
  let totalWeightValue = 0;
  let weightedSum = 0;
  const breakdown: { title: string, value: number, weight: number, impact?: number }[] = [];

  const relevantColumns = columns.filter(col => {
    if (col.calc === false) return false;
    if (col.type === 'calculated') return false; 
    if (col.type === 'presenceSum' || col.type === 'groupAssignment') return false;
    if (cutoffDate && col.date > cutoffDate) return false;
    return true;
  });

  relevantColumns.forEach(col => {
    const grade = allGrades[studentId]?.[col.id];
    if (!grade) return;

    let percent: number | null = null;
    
    if (col.type === 'collaborationSum') {
      percent = getCollaborationPercentage(grade.entries);
    } else if (grade.value !== undefined && grade.value !== '') {
      if (col.calcType === 'sign') {
        if (grade.value === '+') percent = 100;
        else if (grade.value === '~') percent = 50;
        else if (grade.value === '-') percent = 0;
      } else {
        const numericValue = Number(grade.value);
        if (!isNaN(numericValue)) {
          if (col.calcType === 'grade') {
            // Mapping von Note -> Prozent für die Berechnung
            switch (numericValue) {
              case 1: percent = 100; break;
              case 2: percent = 89; break;
              case 3: percent = 79; break;
              case 4: percent = 64; break;
              case 5: percent = 49; break;
              default: percent = 0;
            }
          } else {
            percent = numericValue;
          }
        }
      }
    }

    if (percent !== null) {
      const weight = (col.calcFactor !== undefined ? col.calcFactor : 100);
      weightedSum += percent * (weight / 100);
      totalWeightValue += (weight / 100);
      breakdown.push({ title: col.title, value: percent, weight });
    }
  });

  if (totalWeightValue === 0) return { percent: null, grade: null, breakdown: [] };
  
  let averagePercent = weightedSum / totalWeightValue;
  
  // RUNDUNGSREGEL ANWENDEN
  if (roundingRule === 'studentFriendly') {
    averagePercent = Math.ceil(averagePercent);
  } else {
    averagePercent = Math.round(averagePercent);
  }

  // Add actual impact to breakdown
  breakdown.forEach(item => {
    item.impact = Math.round(((item.weight / 100) / totalWeightValue) * 100);
  });
  
  // Österreichisches Notensystem (Laut Tabelle)
  let finalGrade: number;
  if (averagePercent >= 90) {
    finalGrade = 1;
  } else if (averagePercent >= 80) {
    finalGrade = 2;
  } else if (averagePercent >= 65) {
    finalGrade = 3;
  } else if (averagePercent >= 50) {
    finalGrade = 4;
  } else {
    finalGrade = 5;
  }
  
  return { 
    percent: Math.round(averagePercent), 
    grade: finalGrade,
    breakdown 
  };
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
  const [isCourseSettingsModalOpen, setIsCourseSettingsModalOpen] = useState(false);
  const [isTrendSettingsModalOpen, setIsTrendSettingsModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CourseEntry | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [activeAttendanceColumnId, setActiveAttendanceColumnId] = useState<string | null>(null);
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [activeCollaborationColumnId, setActiveCollaborationColumnId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [hoveredColId, setHoveredColId] = useState<string | null>(null);
  const [breakdownData, setBreakdownData] = useState<{ studentName: string, data: any } | null>(null);

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    onConfirm?: () => void;
    isAlert?: boolean;
    confirmLabel?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showDialog = (config: Omit<typeof dialogConfig, 'isOpen'>) => {
    setDialogConfig({ ...config, isOpen: true });
  };

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

  const handleConfigureColumns = async (updatedColumns: CourseEntry[], showTrend: boolean) => {
    await firebaseService.updateCourse(course.id, { columns: updatedColumns, showTrend });
    setIsConfigureModalOpen(false);
  };

  const handleUpdateCourseSettings = async (data: Partial<Course>) => {
    await firebaseService.updateCourse(course.id, data);
    setIsCourseSettingsModalOpen(false);
    setIsTrendSettingsModalOpen(false);
  };

  const openEditModal = (column: CourseEntry) => {
    setEditingColumn(column);
    setIsEditColumnModalOpen(true);
  };

  const handleDeleteColumn = async (columnId: string) => {
    showDialog({
      title: 'Spalte löschen?',
      message: 'Möchten Sie diese Spalte wirklich löschen? Alle zugehörigen Noten gehen verloren.',
      type: 'danger',
      confirmLabel: 'Löschen',
      onConfirm: async () => {
        const updatedColumns = course.columns.filter(col => col.id !== columnId);
        await firebaseService.updateCourseColumns(course.id, updatedColumns);
      }
    });
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
              <th className="sticky-col student-header">
                <div className="header-content">
                  <div className="header-level-1">SCHÜLER</div>
                  <div className="header-level-2 action-row">
                    <button 
                      className="btn-header-action" 
                      onClick={() => setIsCourseSettingsModalOpen(true)}
                      title="Kurs-Einstellungen"
                    >
                      <Info size={14} />
                    </button>
                  </div>
                </div>
              </th>
              {visibleColumns.map(col => {
                return (
                  <th 
                    key={col.id} 
                    className={`matrix-header-cell ${hoveredColId === col.id ? 'col-hovered' : ''} ${col.type === 'collaborationSum' && showDetails[col.id] ? 'collaboration-col' : 'standard-col'} ${col.type === 'calculated' ? 'milestone-header' : ''}`}
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
                            {col.type === 'calculated' ? (col.cutoffDate ? formatDate(col.cutoffDate) : '') : formatDate(col.date, false)}
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
              {course.showTrend !== false && (
                <th className="sticky-col-right summary-header">
                  <div className="header-content">
                    <div className="header-level-1">
                      <div className="vertical-title">TREND</div>
                    </div>
                    <div className="header-level-2 action-row">
                      <button 
                        className="btn-header-action" 
                        onClick={() => setIsTrendSettingsModalOpen(true)}
                        title="Trend-Gewichtung konfigurieren"
                        style={{ color: 'var(--primary-color)' }}
                      >
                        <Settings size={14} />
                      </button>
                    </div>
                    <div className="header-level-3">
                      <TrendingUp size={16} style={{ opacity: 0.5 }} />
                    </div>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const liveSummary = calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial');
              
              return (
                <tr key={student.id}>
                  <td className="sticky-col font-medium">
                    {student.lastName}, {student.firstName}
                  </td>
                  {visibleColumns.map(col => {
                    let grade = grades[student.id]?.[col.id];
                    
                    if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
                      const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial');
                      grade = { 
                        value: calculated.grade || undefined,
                        date: new Date().toISOString()
                      };
                    }

                    const heatmapStyle = getHeatmapStyle(col, grade);
                    const isHidden = (col.type === 'presenceSum' || col.type === 'collaborationSum') && !showDetails[col.id];
                    
                    return (
                      <td 
                        key={col.id} 
                        className={`matrix-cell ${isHidden ? 'presence-hidden' : ''} ${hoveredColId === col.id ? 'col-hovered' : ''} ${col.type === 'collaborationSum' && showDetails[col.id] ? 'collaboration-col' : 'standard-col'} ${col.type === 'calculated' ? 'milestone-cell' : ''}`}
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
                  {course.showTrend !== false && (
                    <td 
                      className="sticky-col-right summary-cell"
                      onClick={() => setBreakdownData({ studentName: `${student.firstName} ${student.lastName}`, data: liveSummary })}
                    >
                      <div className="summary-content">
                        <span className="summary-grade">{liveSummary.grade || '-'}</span>
                        {liveSummary.percent !== null && <span className="summary-percent">{liveSummary.percent}%</span>}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
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
        showTrend={course.showTrend}
        onSave={handleConfigureColumns}
      />

      <CourseSettingsModal 
        isOpen={isCourseSettingsModalOpen}
        onClose={() => setIsCourseSettingsModalOpen(false)}
        course={course}
        onSave={handleUpdateCourseSettings}
      />

      <TrendSettingsModal 
        isOpen={isTrendSettingsModalOpen}
        onClose={() => setIsTrendSettingsModalOpen(false)}
        columns={course.columns}
        students={students}
        grades={grades}
        courseId={course.id}
        roundingRule={course.roundingRule || 'commercial'}
        onSave={(updatedCols) => handleUpdateCourseSettings({ columns: updatedCols })}
        showDialog={showDialog}
      />

      {breakdownData && (
        <CalculationBreakdown 
          studentName={breakdownData.studentName}
          breakdown={breakdownData.data}
          onClose={() => setBreakdownData(null)}
        />
      )}

      <DialogModal 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmLabel={dialogConfig.confirmLabel}
        isAlert={dialogConfig.isAlert}
        onConfirm={dialogConfig.onConfirm}
        onClose={() => setDialogConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const CalculationBreakdown = ({ studentName, breakdown, onClose }: { studentName: string, breakdown: any, onClose: () => void }) => {
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Noten-Berechnung: {studentName}</h3>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="summary-status">
            <div className="summary-main">
              <span className="summary-label">Aktueller Trend:</span>
              <span className="summary-value grade-large">{breakdown.grade || '-'}</span>
              <span className="summary-percent-large">{breakdown.percent !== null ? `(${breakdown.percent}%)` : ''}</span>
            </div>
          </div>
          
          <div className="breakdown-list">
            <h4 className="breakdown-title">Einfließende Leistungen:</h4>
            {breakdown.breakdown.length === 0 ? (
              <p className="empty-msg">Noch keine bewerteten Leistungen vorhanden.</p>
            ) : (
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Leistung</th>
                    <th style={{ textAlign: 'center' }}>Wert</th>
                    <th style={{ textAlign: 'center' }}>Gewichtung</th>
                    <th style={{ textAlign: 'center' }}>Effekt. Anteil</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.breakdown.map((item: any, i: number) => (
                    <tr key={i}>
                      <td>{item.title}</td>
                      <td style={{ textAlign: 'center' }}>{item.value}%</td>
                      <td style={{ textAlign: 'center' }}>{item.weight}%</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary-color)' }}>{item.impact}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CourseSettingsModal = ({ isOpen, onClose, course, onSave }: { isOpen: boolean, onClose: () => void, course: Course, onSave: (data: Partial<Course>) => void }) => {
  const [roundingRule, setRoundingRule] = useState<Course['roundingRule']>(course.roundingRule || 'commercial');

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Kurs-Einstellungen: {course.name}</h3>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>
        <div className="modal-body p-8">
          <div className="form-group">
            <label className="form-label">Globale Rundungsregel (Trend)</label>
            <select 
              className="form-input" 
              value={roundingRule}
              onChange={e => setRoundingRule(e.target.value as any)}
            >
              <option value="commercial">Kaufmännisch (Standard)</option>
              <option value="studentFriendly">Schülerfreundlich (Aufrunden)</option>
            </select>
            <p className="field-hint">Beeinflusst, wie der Live-Trend berechnet wird.</p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" onClick={() => onSave({ roundingRule })}>Speichern</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const TrendSettingsModal = ({ 
  isOpen, 
  onClose, 
  columns, 
  students, 
  grades, 
  courseId,
  roundingRule,
  onSave,
  showDialog
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  columns: CourseEntry[], 
  students: Student[], 
  grades: Record<string, Record<string, Grade>>,
  courseId: string,
  roundingRule: 'commercial' | 'studentFriendly',
  onSave: (updatedCols: CourseEntry[]) => void,
  showDialog: (config: any) => void
}) => {
  const [localColumns, setLocalColumns] = useState<CourseEntry[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = columns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
      const total = active.reduce((sum, c) => sum + (c.calcFactor || 0), 0);
      
      let initialCols = [...columns];
      if (total > 0 && total !== 100) {
        initialCols = columns.map(c => {
          if (c.calc && active.find(a => a.id === c.id)) {
            return { ...c, calcFactor: Math.round((c.calcFactor / total) * 100) };
          }
          return c;
        });
      } else if (total === 0 && active.length > 0) {
        const share = Math.floor(100 / active.length);
        initialCols = columns.map(c => {
          if (c.calc && active.find(a => a.id === c.id)) {
            return { ...c, calcFactor: share };
          }
          return c;
        });
      }
      setLocalColumns(initialCols);
      setNewMilestoneTitle('');
    }
  }, [isOpen, columns]);

  if (!isOpen) return null;

  const handleCreateSnapshot = async () => {
    if (!newMilestoneTitle.trim()) {
      showDialog({
        title: 'Titel fehlt',
        message: 'Bitte geben Sie einen Titel für den neuen Meilenstein ein.',
        type: 'warning',
        isAlert: true
      });
      return;
    }

    setIsProcessing(true);
    try {
      const newColumnId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Date.now().toString(36) + Math.random().toString(36).substring(2);

      const newMilestone: CourseEntry = {
        id: newColumnId,
        title: newMilestoneTitle,
        type: 'calculated',
        date: new Date().toISOString().split('T')[0],
        cutoffDate: new Date().toISOString().split('T')[0],
        calc: false,
        calcFactor: 0,
        calcType: 'grade',
        priority: Date.now(),
        isVisible: true
      };

      // 1. Spalten-Array aktualisieren
      const updatedColumns = [...localColumns, newMilestone];
      await firebaseService.updateCourseColumns(courseId, updatedColumns);

      // 2. Noten für alle Schüler generieren (Snapshot)
      const updates = students.map(student => {
        const trend = calculateAverage(student.id, localColumns, grades, undefined, roundingRule);
        return {
          studentId: student.id,
          columnId: newColumnId,
          grade: {
            value: trend.grade || '',
            date: new Date().toISOString(),
            isOverridden: true
          }
        };
      });

      await firebaseService.bulkUpdateGrades(courseId, updates);
      
      showDialog({
        title: 'Erfolgreich',
        message: 'Neuer Meilenstein erfolgreich erstellt!',
        type: 'success',
        isAlert: true
      });
      onSave(updatedColumns); // Triggert Update in der Matrix
      onClose();
    } catch (err) {
      console.error("Fehler beim Erstellen des Snapshots:", err);
      showDialog({
        title: 'Fehler',
        message: 'Fehler beim Speichern der Daten.',
        type: 'danger',
        isAlert: true
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const normalize = (cols: CourseEntry[], changedId: string) => {
    const active = cols.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
    if (active.length === 0) return cols;
    if (active.length === 1 && active[0].id === changedId) {
      return cols.map(c => c.id === changedId ? { ...c, calcFactor: 100 } : c);
    }

    const changedCol = active.find(c => c.id === changedId);
    if (!changedCol) return cols;

    const remaining = 100 - changedCol.calcFactor;
    const others = active.filter(c => c.id !== changedId);
    const othersSum = others.reduce((sum, c) => sum + c.calcFactor, 0);

    let result = cols.map(c => {
      if (c.id === changedId) return c;
      if (c.calc && others.find(o => o.id === c.id)) {
        if (othersSum > 0) {
          return { ...c, calcFactor: Math.round((c.calcFactor / othersSum) * remaining) };
        } else {
          return { ...c, calcFactor: Math.round(remaining / others.length) };
        }
      }
      return c;
    });

    // Ensure sum is exactly 100
    const finalActive = result.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
    const finalTotal = finalActive.reduce((sum, c) => sum + c.calcFactor, 0);
    const diff = 100 - finalTotal;
    
    if (diff !== 0 && finalActive.length > 1) {
      const lastOther = [...finalActive].reverse().find(c => c.id !== changedId);
      if (lastOther) {
        result = result.map(c => c.id === lastOther.id ? { ...c, calcFactor: Math.max(0, c.calcFactor + diff) } : c);
      }
    }

    return result;
  };

  const handleToggle = (id: string) => {
    const nextCols = localColumns.map(c => {
      if (c.id === id) {
        const isTurningOn = !c.calc;
        return { ...c, calc: isTurningOn, calcFactor: isTurningOn ? 0 : 0 };
      }
      return c;
    });
    setLocalColumns(normalize(nextCols, id));
  };

  const handleWeightChange = (id: string, val: number) => {
    const nextCols = localColumns.map(c => c.id === id ? { ...c, calcFactor: val } : c);
    setLocalColumns(normalize(nextCols, id));
  };



  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Trend-Konfiguration</h3>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>
        <div className="modal-body p-8">
          <div className="trend-section">
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Gewichtung (Summe = 100%)</h4>
            <div className="weight-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {localColumns.filter(c => c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment').map(col => (
                <div key={col.id} className="weight-item" style={{ opacity: col.calc ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="switch sm">
                        <input type="checkbox" checked={col.calc} onChange={() => handleToggle(col.id)} />
                        <span className="slider"></span>
                      </label>
                      <span className="font-bold">{col.title}</span>
                    </div>
                    <span className="font-mono text-primary">{col.calc ? `${col.calcFactor}%` : 'Inaktiv'}</span>
                  </div>
                  {col.calc && (
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={col.calcFactor} 
                      onChange={e => handleWeightChange(col.id, parseInt(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="snapshot-section" style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px dashed var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TrendingUp size={18} className="text-primary" />
              <h4 style={{ margin: 0, fontSize: '14px' }}>Snapshot erstellen</h4>
            </div>
            <p className="field-hint" style={{ marginBottom: '16px' }}>
              Erstellt eine neue Spalte (Meilenstein) mit den aktuell berechneten Trend-Werten.
            </p>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                className="form-input" 
                style={{ flex: 1 }}
                placeholder="Titel, z.B. Semester-Note"
                value={newMilestoneTitle}
                onChange={e => setNewMilestoneTitle(e.target.value)}
              />
              <button 
                className="btn-secondary" 
                style={{ whiteSpace: 'nowrap', fontSize: '12px' }}
                onClick={handleCreateSnapshot}
                disabled={isProcessing || !newMilestoneTitle.trim()}
              >
                {isProcessing ? 'Verarbeite...' : 'Snapshot erstellen'}
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" onClick={() => onSave(localColumns)} disabled={isProcessing}>Gewichtung speichern</button>
        </div>
      </div>
    </div>,
    document.body
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
                  onUpdateGrade({ value: val ?? undefined, date: new Date().toISOString() });
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
            <div className="presence-percentage-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
              <span className="presence-percentage" style={{ fontWeight: 'bold', color: heatmapStyle?.color || 'var(--text-main)' }}>
                {p !== null ? `${p}%` : <span className="empty-placeholder">-</span>}
              </span>
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

      case 'calculated': {
        return (
          <div 
            className="manual-cell-content calculated-cell"
            onClick={handleOpenMenu}
            style={{ color: heatmapStyle?.color, position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {grade?.value || <span className="empty-placeholder">-</span>}
              {grade?.isOverridden && <Pencil size={10} className="override-icon" />}
            </div>
            {showMenu && (
              <ManualSelector 
                type={column.calcType} 
                currentValue={grade?.value}
                position={menuPos}
                isCalculated={true}
                onSelect={(val) => {
                  if (val === null) {
                    onUpdateGrade({ 
                      value: '', 
                      date: new Date().toISOString(),
                      isOverridden: false 
                    });
                  } else {
                    onUpdateGrade({ 
                      value: val, 
                      date: new Date().toISOString(),
                      isOverridden: true 
                    });
                  }
                  handleCloseMenu();
                }}
                onClose={handleCloseMenu}
              />
            )}
          </div>
        );
      }

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

const ManualSelector = ({ type, currentValue, position, onSelect, onClose, isCalculated }: { type: CourseEntry['calcType'], currentValue?: string | number, position: { top: number, left: number }, onSelect: (val: string | number | null) => void, onClose: () => void, isCalculated?: boolean }) => {
  return createPortal(
    <div className="modal-overlay menu-overlay" onClick={onClose} style={{ background: 'transparent' }}>
      <div className="context-menu selector-menu" style={{ top: position.top, left: position.left }} onClick={(e) => e.stopPropagation()}>
        <div className="menu-options">
          {isCalculated && (
            <>
              <button 
                className="menu-item" 
                onClick={() => {
                  onSelect(null);
                  onClose();
                }}
                style={{ color: 'var(--primary-color)', fontWeight: '600' }}
              >
                <span>Autom. Berechnung</span>
              </button>
              <div className="menu-divider"></div>
            </>
          )}
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
