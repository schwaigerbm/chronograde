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
  TrendingUp,
  FileDown,
  ChevronDown,
  Users,
  Zap
} from 'lucide-react';
import { useGradesManager } from '../hooks/useGradesManager';
import { firebaseService } from '../services/firebaseService';
import { AddColumnModal } from './AddColumnModal';
import { EditColumnModal } from './EditColumnModal';
import { AttendanceModal } from './AttendanceModal';
import { CollaborationBulkModal } from './CollaborationBulkModal';
import { DialogModal } from './DialogModal';
import { formatDate } from '../lib/utils';
import type { Course, Student, CourseEntry, Grade, GradeEntry, PredefinedComment, Reminder } from '../schema';
import { checkAttendanceAnomalies } from '../lib/anomalyDetector';
import { AttendanceAnomaliesModal } from './AttendanceAnomaliesModal';
import type { AnomalyResult } from './AttendanceAnomaliesModal';
import { exportMatrixPDF } from './PDFExports';
import { StudentPerformanceDashboard } from './StudentPerformanceDashboard';
import { TrendSettingsModal } from './TrendSettingsModal';
import { calculateAverage, getCollaborationPercentage, getPresencePercentage } from '../lib/averageCalculator';
import { EvaluationEntryModal } from './EvaluationEntryModal';
import { ManualEntryModal } from './ManualEntryModal';
import { EnrollmentModal } from './EnrollmentModal';
import { QuickEntryModal } from './QuickEntryModal';

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
    editGradeEntry,
    bulkAddEntries,
    deleteGradeEntry 
  } = useGradesManager(course);

  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [isQuickEntryModalOpen, setIsQuickEntryModalOpen] = useState(false);
  const [trendSettingsInitialTab, setTrendSettingsInitialTab] = useState<'layout' | 'trend'>('layout');
  const [isTrendSettingsModalOpen, setIsTrendSettingsModalOpen] = useState(false);
  const [isPDFColumnSelectModalOpen, setIsPDFColumnSelectModalOpen] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CourseEntry | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [activeAttendanceColumnId, setActiveAttendanceColumnId] = useState<string | null>(null);
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [activeCollaborationColumnId, setActiveCollaborationColumnId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [hoveredColId, setHoveredColId] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ studentId: string; columnId: string } | null>(null);
  const [flashedCell, setFlashedCell] = useState<{ studentId: string; columnId: string } | null>(null);
  const [breakdownData, setBreakdownData] = useState<{ studentName: string, data: any } | null>(null);

  // Evaluation Point Entry States
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [activeEvaluationColumn, setActiveEvaluationColumn] = useState<CourseEntry | null>(null);
  const [activeEvaluationStudent, setActiveEvaluationStudent] = useState<{ id: string, name: string } | null>(null);

  // Manual Entry Modal State
  const [activeManualCell, setActiveManualCell] = useState<{ studentId: string, studentName: string, column: CourseEntry, grade?: Grade } | null>(null);
  
  // Cell Hover Tracking for Quick Entry
  const [hoveredCell, setHoveredCell] = useState<{ studentId: string, column: CourseEntry } | null>(null);

  // Student Dashboard Overlay State
  const [selectedStudentForDashboard, setSelectedStudentForDashboard] = useState<Student | null>(null);

  // Enrollment Modal States
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

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

  // Anomalies Modal States
  const [anomaliesQueue, setAnomaliesQueue] = useState<AnomalyResult[]>([]);
  const [isAnomaliesModalOpen, setIsAnomaliesModalOpen] = useState(false);

  // Hover tracking for attendance date synchronization
  const [hoveredAttendanceDate, setHoveredAttendanceDate] = useState<string | null>(null);

  const showDialog = (config: Omit<typeof dialogConfig, 'isOpen'>) => {
    setDialogConfig({ ...config, isOpen: true });
  };

  // Clear states on course change
  useEffect(() => {
    setHoveredCell(null);
    setActiveManualCell(null);
  }, [course?.id]);

  // Load all students for enrollment search
  useEffect(() => {
    firebaseService.getStudents().then(setAllStudents).catch(err => {
      console.error("Error loading students:", err);
    });
  }, []);

  // Enrollment Actions
  const handleEnroll = async (studentId: string) => {
    const enrolled = course.enrolledStudents || [];
    if (enrolled.includes(studentId)) return;
    const updatedCourse = {
      ...course,
      enrolledStudents: [...enrolled, studentId]
    };
    await firebaseService.saveCourse(updatedCourse);
  };

  const handleUnenroll = async (studentId: string) => {
    const enrolled = course.enrolledStudents || [];
    const updatedCourse = {
      ...course,
      enrolledStudents: enrolled.filter(id => id !== studentId)
    };
    await firebaseService.saveCourse(updatedCourse);
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const enrolled = course.enrolledStudents || [];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= enrolled.length) return;
    const newList = [...enrolled];
    const [movedItem] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, movedItem);
    const updatedCourse = {
      ...course,
      enrolledStudents: newList
    };
    await firebaseService.saveCourse(updatedCourse);
  };

  // Global keydown listener for cell quick entry and grid navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return;
      }

      if (
        isAddColumnModalOpen ||
        isEditColumnModalOpen ||
        isTrendSettingsModalOpen ||
        isAttendanceModalOpen ||
        isCollaborationModalOpen ||
        isEvaluationModalOpen ||
        activeManualCell !== null ||
        dialogConfig.isOpen
      ) {
        return;
      }

      // Bestimmen, welche Zelle aktiv ist (Priorität: focusedCell, dann hoveredCell)
      const activeCell = focusedCell || (hoveredCell ? { studentId: hoveredCell.studentId, columnId: hoveredCell.column.id } : null);
      if (!activeCell) return;

      const { studentId, columnId } = activeCell;
      const column = course.columns.find(c => c.id === columnId);
      if (!column) return;

      const studentIndex = students.findIndex(s => s.id === studentId);
      const visibleCols = course.columns.filter(c => c.isVisible !== false);
      const columnIndex = visibleCols.findIndex(c => c.id === columnId);

      // --- Pfeiltasten & Tab/Enter Navigation ---
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
        e.preventDefault();
        
        let nextStudentIndex = studentIndex;
        let nextColumnIndex = columnIndex;

        if (e.key === 'ArrowDown') {
          nextStudentIndex = Math.min(students.length - 1, studentIndex + 1);
        } else if (e.key === 'ArrowUp') {
          nextStudentIndex = Math.max(0, studentIndex - 1);
        } else if (e.key === 'ArrowRight') {
          nextColumnIndex = Math.min(visibleCols.length - 1, columnIndex + 1);
        } else if (e.key === 'ArrowLeft') {
          nextColumnIndex = Math.max(0, columnIndex - 1);
        } else if (e.key === 'Tab' || e.key === 'Enter') {
          if (e.shiftKey) {
            // Shift + Tab / Shift + Enter: Nach oben
            nextStudentIndex = Math.max(0, studentIndex - 1);
          } else {
            // Tab / Enter: Nach unten zum nächsten Schüler in der Spalte
            nextStudentIndex = Math.min(students.length - 1, studentIndex + 1);
          }
        }

        const nextStudent = students[nextStudentIndex];
        const nextCol = visibleCols[nextColumnIndex];

        if (nextStudent && nextCol) {
          setFocusedCell({ studentId: nextStudent.id, columnId: nextCol.id });
        }
        return;
      }

      // Hilfsfunktion für visuelles Feedback (Flash)
      const flash = () => {
        setFlashedCell({ studentId, columnId });
        setTimeout(() => setFlashedCell(null), 300);
      };

      // --- Direkteingabe (Noten / Zeichen / Löschen) ---
      if (column.type === 'manual' || column.type === 'calculated') {
        if (column.calcType === 'grade') {
          if (e.key >= '1' && e.key <= '5') {
            e.preventDefault();
            const val = Number(e.key);
            updateGrade(studentId, column.id, {
              value: val,
              date: new Date().toISOString(),
              ...(column.type === 'calculated' ? { isOverridden: true } : {})
            });
            flash();
          } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            updateGrade(studentId, column.id, {
              value: '',
              date: new Date().toISOString(),
              ...(column.type === 'calculated' ? { isOverridden: false } : {})
            });
            flash();
          }
        } else if (column.calcType === 'sign') {
          if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '+' || e.key === '~' || e.key === '-') {
            e.preventDefault();
            let val = '';
            if (e.key === '1' || e.key === '+') val = '+';
            else if (e.key === '2' || e.key === '~') val = '~';
            else if (e.key === '3' || e.key === '-') val = '-';
            
            updateGrade(studentId, column.id, {
              value: val,
              date: new Date().toISOString()
            });
            flash();
          } else if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            updateGrade(studentId, column.id, {
              value: '',
              date: new Date().toISOString()
            });
            flash();
          }
        }
      } else if (column.type === 'collaborationSum') {
        if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '+' || e.key === '~' || e.key === '-') {
          e.preventDefault();
          let val: '+' | '~' | '-' = '+';
          if (e.key === '1' || e.key === '+') val = '+';
          else if (e.key === '2' || e.key === '~') val = '~';
          else if (e.key === '3' || e.key === '-') val = '-';

          const entryId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : Date.now().toString(36) + Math.random().toString(36).substring(2);

          addGradeEntry(studentId, column.id, {
            id: entryId,
            value: val,
            date: new Date().toISOString().split('T')[0],
            note: ''
          });
          flash();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          updateGrade(studentId, column.id, {
            entries: []
          });
          flash();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    hoveredCell,
    focusedCell,
    isAddColumnModalOpen,
    isEditColumnModalOpen,
    isTrendSettingsModalOpen,
    isAttendanceModalOpen,
    isCollaborationModalOpen,
    isEvaluationModalOpen,
    activeManualCell,
    dialogConfig.isOpen,
    updateGrade,
    addGradeEntry,
    students,
    course
  ]);

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



  const handleUpdateCourseSettings = async (data: Partial<Course>) => {
    await firebaseService.updateCourse(course.id, data);
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

  const runAttendanceAnomalyCheck = (
    date: string,
    columnId: string,
    updates: { studentId: string; value: 'check' | 'x'; hours: number }[]
  ) => {
    const queue: AnomalyResult[] = [];

    updates.forEach(u => {
      const student = students.find(s => s.id === u.studentId);
      if (!student) return;

      const currentGrade = grades[u.studentId]?.[columnId] || { entries: [] };
      const mockEntry: GradeEntry = {
        id: 'temp-id',
        value: u.value,
        date,
        hours: u.hours
      };
      
      const newEntries = [...(currentGrade.entries || []), mockEntry];
      const violations = checkAttendanceAnomalies(newEntries, course.attendanceAnomalySettings);
      
      if (violations.length > 0) {
        queue.push({
          studentId: u.studentId,
          studentName: `${student.lastName}, ${student.firstName}`,
          courseId: course.id,
          courseName: course.name,
          violations,
          date
        });
      }
    });

    if (queue.length > 0) {
      setAnomaliesQueue(queue);
      setIsAnomaliesModalOpen(true);
    }
  };

  const handleConfirmAnomaly = async (reminder: Omit<Reminder, 'id'> | null) => {
    if (reminder) {
      try {
        await firebaseService.addReminder(reminder);
      } catch (err) {
        console.error("Fehler beim Hinzufügen der Erinnerung:", err);
      }
    }
  };

  const handleEditGradeEntry = async (studentId: string, columnId: string, entry: GradeEntry) => {
    const column = course.columns.find(c => c.id === columnId);
    const isPresence = column?.type === 'presenceSum';

    try {
      if (isPresence) {
        // Construct bulk updates for ALL students who have an entry on this date in this column
        const bulkUpdates: { studentId: string, columnId: string, grade: Grade }[] = [];
        
        students.forEach(student => {
          const studentGrade = grades[student.id]?.[columnId] || { entries: [] };
          let hasChanges = false;
          
          const updatedEntries = (studentGrade.entries || []).map(e => {
            // For the active student, replace the edited entry
            if (student.id === studentId && e.id === entry.id) {
              hasChanges = true;
              return entry;
            }
            // For other students, if they have an entry on the same date, update the hours to match the edited entry
            if (e.date === entry.date && e.hours !== entry.hours) {
              hasChanges = true;
              return { ...e, hours: entry.hours };
            }
            return e;
          });
          
          if (hasChanges) {
            bulkUpdates.push({
              studentId: student.id,
              columnId,
              grade: {
                ...studentGrade,
                entries: updatedEntries
              }
            });
          }
        });

        if (bulkUpdates.length > 0) {
          await firebaseService.bulkUpdateGrades(course.id, bulkUpdates);
        }
      } else {
        // Standard edit for non-attendance columns
        await editGradeEntry(studentId, columnId, entry);
      }
      
      // Perform anomaly check
      if (isPresence && (entry.value === 'check' || entry.value === 'x')) {
        const student = students.find(s => s.id === studentId);
        if (student) {
          const currentGrade = grades[studentId]?.[columnId] || { entries: [] };
          const newEntries = (currentGrade.entries || []).map(e => e.id === entry.id ? entry : e);
          const violations = checkAttendanceAnomalies(newEntries, course.attendanceAnomalySettings);
          
          if (violations.length > 0) {
            setAnomaliesQueue([{
              studentId,
              studentName: `${student.lastName}, ${student.firstName}`,
              courseId: course.id,
              courseName: course.name,
              violations,
              date: entry.date
            }]);
            setIsAnomaliesModalOpen(true);
          }
        }
      }
    } catch (err) {
      console.error("Fehler beim Bearbeiten des Eintrags:", err);
    }
  };

  const handleDeleteGradeEntry = async (studentId: string, columnId: string, entryId: string) => {
    const column = course.columns.find(c => c.id === columnId);
    const isPresence = column?.type === 'presenceSum';

    try {
      if (isPresence) {
        // Find the date of the entry to be deleted
        const studentGrade = grades[studentId]?.[columnId];
        const targetEntry = studentGrade?.entries?.find(e => e.id === entryId);
        if (!targetEntry) return;

        const targetDate = targetEntry.date;

        showDialog({
          title: 'Anwesenheitstermin löschen?',
          message: `Achtung: Das Löschen dieses Eintrags entfernt diesen Termin (${targetDate}) für ALLE Schüler des Kurses! Möchten Sie diesen Termin wirklich unwiderruflich löschen?`,
          type: 'danger',
          confirmLabel: 'Termin für alle löschen',
          onConfirm: async () => {
            // Construct bulk updates for ALL students, filtering out any entry on this date
            const bulkUpdates: { studentId: string, columnId: string, grade: Grade }[] = [];

            students.forEach(student => {
              const sg = grades[student.id]?.[columnId];
              if (!sg || !sg.entries) return;

              const updatedEntries = sg.entries.filter(e => e.date !== targetDate);
              
              // Only update if there was actually an entry on that date for this student
              if (updatedEntries.length !== sg.entries.length) {
                bulkUpdates.push({
                  studentId: student.id,
                  columnId,
                  grade: {
                    ...sg,
                    entries: updatedEntries
                  }
                });
              }
            });

            if (bulkUpdates.length > 0) {
              await firebaseService.bulkUpdateGrades(course.id, bulkUpdates);
            }
          }
        });
      } else {
        // Standard delete for non-attendance columns (e.g. collaboration comments)
        await deleteGradeEntry(studentId, columnId, entryId);
      }
    } catch (err) {
      console.error("Fehler beim Löschen des Eintrags:", err);
    }
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
      
      // Check for anomalies
      const anomalyUpdates = Object.entries(attendanceData).map(([studentId, value]) => ({
        studentId,
        value,
        hours
      }));
      runAttendanceAnomalyCheck(date, activeAttendanceColumnId, anomalyUpdates);
      
      setActiveAttendanceColumnId(null);
    } catch (err) {
      console.error("Fehler beim Speichern der Anwesenheit:", err);
    }
  };

  const handleSaveCollaborationBulk = async (date: string, updates: { studentId: string; value: '+' | '-' | '~'; note: string }[]) => {
    if (!activeCollaborationColumnId) return;

    const formattedUpdates = updates.map(u => ({
      studentId: u.studentId,
      entry: {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : Date.now().toString(36) + Math.random().toString(36).substring(2),
        value: u.value,
        note: u.note,
        date
      }
    }));

    if (formattedUpdates.length === 0) return;

    try {
      await bulkAddEntries(activeCollaborationColumnId, formattedUpdates);
      setIsCollaborationModalOpen(false);
      setActiveCollaborationColumnId(null);
    } catch (err) {
      console.error("Fehler beim Speichern der Mitarbeit:", err);
    }
  };

  const handleSaveQuickEntry = async (data: {
    attendance?: {
      columnId: string;
      date: string;
      hours: number;
      entries: Record<string, 'check' | 'x'>;
    };
    collaboration?: {
      columnId: string;
      date: string;
      updates: { studentId: string; value: '+' | '-' | '~'; note: string }[];
    };
  }) => {
    try {
      // 1. Save Attendance
      if (data.attendance) {
        const { columnId, date, hours, entries } = data.attendance;
        const attendanceUpdates = Object.entries(entries).map(([studentId, value]) => ({
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
        await bulkAddEntries(columnId, attendanceUpdates);

        // Run anomaly check
        const anomalyUpdates = Object.entries(entries).map(([studentId, value]) => ({
          studentId,
          value,
          hours
        }));
        runAttendanceAnomalyCheck(date, columnId, anomalyUpdates);
      }

      // 2. Save Collaboration
      if (data.collaboration) {
        const { columnId, date, updates } = data.collaboration;
        const collabUpdates = updates.map(u => ({
          studentId: u.studentId,
          entry: {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : Date.now().toString(36) + Math.random().toString(36).substring(2),
            value: u.value,
            note: u.note,
            date
          }
        }));
        await bulkAddEntries(columnId, collabUpdates);
      }

      setIsQuickEntryModalOpen(false);
    } catch (err) {
      console.error("Fehler beim Speichern der Schnelleingabe:", err);
    }
  };

  const handleSaveEvaluationPoints = async (
    reachedPoints: Record<string, number>, 
    totalPoints: number, 
    percentage: number, 
    calculatedGrade: number,
    nextStudentId?: string
  ) => {
    if (!activeEvaluationColumn || !activeEvaluationStudent) return;

    const gradeUpdate: Grade = {
      value: calculatedGrade,
      date: new Date().toISOString(),
      subTaskPoints: reachedPoints,
      evaluationPoints: totalPoints,
      evaluationPercent: percentage
    };

    try {
      await updateGrade(activeEvaluationStudent.id, activeEvaluationColumn.id, gradeUpdate);
      
      if (nextStudentId) {
        const nextStudent = students.find(s => s.id === nextStudentId);
        if (nextStudent) {
          setActiveEvaluationStudent({
            id: nextStudent.id,
            name: `${nextStudent.lastName}, ${nextStudent.firstName}`
          });
          return;
        }
      }

      setIsEvaluationModalOpen(false);
      setActiveEvaluationColumn(null);
      setActiveEvaluationStudent(null);
    } catch (err) {
      console.error("Fehler beim Speichern der Auswertungspunkte:", err);
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
          <div className="subtitle-wrapper" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 className="sub-title" style={{ margin: 0 }}>{course.name}</h2>
            </div>
            <div className="dropdown-container">
              <button 
                className="btn-secondary btn-sm"
                onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                style={{ width: 'auto', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>Aktionen</span>
                <ChevronDown size={16} />
              </button>
              
              {isActionsDropdownOpen && (
                <>
                  <div 
                    className="dropdown-overlay" 
                    onClick={() => setIsActionsDropdownOpen(false)}
                  />
                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsQuickEntryModalOpen(true);
                      }}
                    >
                      <Zap size={16} />
                      <span>Schnelleingabe</span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsAddColumnModalOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>Beurteilungsspalte hinzufügen</span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setTrendSettingsInitialTab('layout');
                        setIsTrendSettingsModalOpen(true);
                      }}
                    >
                      <Settings size={16} />
                      <span>Ansicht konfigurieren</span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsEnrollmentModalOpen(true);
                      }}
                    >
                      <Users size={16} />
                      <span>Gruppe ändern</span>
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsActionsDropdownOpen(false);
                        setIsPDFColumnSelectModalOpen(true);
                      }}
                    >
                      <FileDown size={16} />
                      <span>PDF Export</span>
                    </button>
                  </div>
                </>
              )}
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
                  <div className="header-level-2 action-row"></div>
                </div>
              </th>
              {visibleColumns.map(col => {
                return (
                  <th 
                    key={col.id} 
                    className={`matrix-header-cell ${hoveredColId === col.id ? 'col-hovered' : ''} ${
                      (col.type === 'collaborationSum' || col.type === 'presenceSum' || col.type === 'evaluation') && showDetails[col.id]
                        ? (col.type === 'evaluation' ? 'evaluation-col' : 'collaboration-col')
                        : 'standard-col'
                    } ${col.type === 'calculated' ? 'milestone-header' : ''}`}
                    onMouseEnter={() => setHoveredColId(col.id)}
                    onMouseLeave={() => setHoveredColId(null)}
                  >
                    <div className={`header-content ${col.type === 'groupAssignment' ? 'align-left' : ''}`}>
                      {/* EBENE 1: IDENTIFIKATION */}
                      <div className="header-level-1">
                        <div className="vertical-title">
                          <span>{col.title}</span>
                        </div>
                        
                        {col.showDateInHeader !== false && col.type !== 'presenceSum' && col.type !== 'collaborationSum' && (
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
                        
                        {(col.type === 'presenceSum' || col.type === 'collaborationSum' || col.type === 'evaluation') && (
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
                        onClick={() => {
                          setTrendSettingsInitialTab('trend');
                          setIsTrendSettingsModalOpen(true);
                        }}
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
            {students.map((student, index) => {
              const liveSummary = calculateAverage(student.id, course.columns, grades, undefined, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
              
              return (
                <tr key={student.id}>
                  <td className="sticky-col">
                    <div className="student-cell-content has-avatar-tooltip">
                      <span className="student-number">{index + 1}</span>
                      <span className="student-lastname">{student.lastName}</span>
                      <span className="student-firstname">{student.firstName}</span>
                      <button 
                        className="btn-student-analysis"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentForDashboard(student);
                        }}
                        title={`Leistungsübersicht für ${student.firstName} ${student.lastName} öffnen`}
                      >
                        <TrendingUp size={13} />
                      </button>
                      {student.photoBase64 && (
                        <div className="student-avatar-tooltip">
                          <img src={student.photoBase64} alt={`${student.firstName} ${student.lastName}`} className="student-avatar-img" />
                        </div>
                      )}
                    </div>
                  </td>
                  {visibleColumns.map(col => {
                    let grade = grades[student.id]?.[col.id];
                    
                    if (col.type === 'calculated' && (!grade || !grade.isOverridden)) {
                      const calculated = calculateAverage(student.id, course.columns, grades, col.cutoffDate, course.roundingRule || 'commercial', course.collaborationCalcMode || 'weighted');
                      grade = { 
                        value: calculated.grade || undefined,
                        date: new Date().toISOString()
                      };
                    }

                    const heatmapStyle = getHeatmapStyle(col, grade);
                    const isHidden = (col.type === 'presenceSum' || col.type === 'collaborationSum' || col.type === 'evaluation') && !showDetails[col.id];
                    
                      return (
                        <td 
                          key={col.id} 
                          className={`matrix-cell ${isHidden ? 'presence-hidden' : ''} ${hoveredColId === col.id ? 'col-hovered' : ''} ${
                            (col.type === 'collaborationSum' || col.type === 'presenceSum' || col.type === 'evaluation') && showDetails[col.id]
                              ? (col.type === 'evaluation' ? 'evaluation-col' : 'collaboration-col')
                              : 'standard-col'
                          } ${col.type === 'calculated' ? 'milestone-cell' : ''} ${
                            focusedCell?.studentId === student.id && focusedCell?.columnId === col.id ? 'focused-cell' : ''
                          } ${
                            flashedCell?.studentId === student.id && flashedCell?.columnId === col.id ? 'animate-flash-green' : ''
                          }`}
                          onClick={() => setFocusedCell({ studentId: student.id, columnId: col.id })}
                          onMouseEnter={() => {
                            setHoveredColId(col.id);
                            setHoveredCell({ studentId: student.id, column: col });
                          }}
                          onMouseLeave={() => {
                            setHoveredColId(null);
                            setHoveredCell(null);
                          }}
                          style={heatmapStyle}
                        >
                        <GradeCell 
                          studentId={student.id}
                          column={col}
                          grade={grade}
                          onUpdateGrade={(g) => updateGrade(student.id, col.id, g)}
                          onAddEntry={(e) => addGradeEntry(student.id, col.id, e)}
                          onEditEntry={(e) => handleEditGradeEntry(student.id, col.id, e)}
                          onDeleteEntry={(entryId) => handleDeleteGradeEntry(student.id, col.id, entryId)}
                          isHidden={isHidden}
                          hoveredAttendanceDate={hoveredAttendanceDate}
                          onHoverAttendanceDate={setHoveredAttendanceDate}
                          heatmapStyle={heatmapStyle}
                          onOpenEvaluation={() => {
                            setActiveEvaluationColumn(col);
                            setActiveEvaluationStudent({ id: student.id, name: `${student.firstName} ${student.lastName}` });
                            setIsEvaluationModalOpen(true);
                          }}
                          onOpenManualEdit={(studentId, column, currentGrade) => {
                            setActiveManualCell({
                              studentId,
                              studentName: `${student.lastName}, ${student.firstName}`,
                              column,
                              grade: currentGrade
                            });
                          }}
                        />
                      </td>
                    );
                  })}
                  {course.showTrend !== false && (() => {
                    const trendHeatmapStyle = course.isTrendColorEnabled && liveSummary.grade
                      ? getHeatmapStyle(
                          { calcType: 'grade', isColorEnabled: true } as any, 
                          { value: liveSummary.grade }
                        )
                      : {};
                    return (
                      <td 
                        className="sticky-col-right summary-cell"
                        onClick={() => setBreakdownData({ studentName: `${student.firstName} ${student.lastName}`, data: liveSummary })}
                        style={trendHeatmapStyle}
                      >
                        <div className="summary-content">
                          <span className="summary-grade" style={{ color: trendHeatmapStyle.color }}>{liveSummary.grade || '-'}</span>
                          {liveSummary.percent !== null && (
                            <span 
                              className="summary-percent" 
                              style={{ 
                                color: trendHeatmapStyle.color ? 'inherit' : undefined, 
                                opacity: trendHeatmapStyle.color ? 0.9 : undefined 
                              }}
                            >
                              {liveSummary.percent}%
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })()}
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
        students={students}
        grades={grades}
      />

      <AttendanceModal 
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        students={students}
        onSave={handleSaveAttendance}
      />

      <AttendanceAnomaliesModal
        isOpen={isAnomaliesModalOpen}
        onClose={() => {
          setIsAnomaliesModalOpen(false);
          setAnomaliesQueue([]);
        }}
        anomaliesQueue={anomaliesQueue}
        onConfirm={handleConfirmAnomaly}
      />

      <CollaborationBulkModal 
        isOpen={isCollaborationModalOpen}
        onClose={() => setIsCollaborationModalOpen(false)}
        students={students}
        onSave={handleSaveCollaborationBulk}
      />

      <QuickEntryModal 
        isOpen={isQuickEntryModalOpen}
        onClose={() => setIsQuickEntryModalOpen(false)}
        course={course}
        students={students}
        onSave={handleSaveQuickEntry}
      />

      <TrendSettingsModal 
        isOpen={isTrendSettingsModalOpen}
        onClose={() => setIsTrendSettingsModalOpen(false)}
        columns={course.columns}
        students={students}
        grades={grades}
        courseId={course.id}
        roundingRule={course.roundingRule || 'commercial'}
        isTrendColorEnabled={!!course.isTrendColorEnabled}
        collaborationCalcMode={course.collaborationCalcMode || 'weighted'}
        showTrend={course.showTrend}
        initialTab={trendSettingsInitialTab}
        onSave={(updatedCols, rule, colorEnabled, collabMode, showTrendVal) => 
          handleUpdateCourseSettings({ 
            columns: updatedCols, 
            roundingRule: rule, 
            isTrendColorEnabled: colorEnabled, 
            collaborationCalcMode: collabMode,
            showTrend: showTrendVal
          })
        }
        showDialog={showDialog}
      />

      {isEvaluationModalOpen && activeEvaluationColumn && activeEvaluationStudent && (
        <EvaluationEntryModal
          isOpen={isEvaluationModalOpen}
          onClose={() => {
            setIsEvaluationModalOpen(false);
            setActiveEvaluationColumn(null);
            setActiveEvaluationStudent(null);
          }}
          studentId={activeEvaluationStudent.id}
          studentName={activeEvaluationStudent.name}
          column={activeEvaluationColumn}
          grade={grades[activeEvaluationStudent.id]?.[activeEvaluationColumn.id]}
          students={students}
          onSave={handleSaveEvaluationPoints}
        />
      )}

      {activeManualCell && (
        <ManualEntryModal
          isOpen={activeManualCell !== null}
          onClose={() => setActiveManualCell(null)}
          studentName={activeManualCell.studentName}
          column={activeManualCell.column}
          currentValue={activeManualCell.grade?.value}
          isCalculated={activeManualCell.column.type === 'calculated'}
          onSave={async (val) => {
            const { studentId, column } = activeManualCell;
            
            if (column.type === 'calculated') {
              if (val === null) {
                await updateGrade(studentId, column.id, { 
                  value: '', 
                  date: new Date().toISOString(),
                  isOverridden: false 
                });
              } else {
                await updateGrade(studentId, column.id, { 
                  value: val, 
                  date: new Date().toISOString(),
                  isOverridden: true 
                });
              }
            } else {
              await updateGrade(studentId, column.id, { 
                value: val !== null ? val : '', 
                date: new Date().toISOString() 
              });
            }
            setActiveManualCell(null);
          }}
        />
      )}

      {breakdownData && (
        <CalculationBreakdown 
          studentName={breakdownData.studentName}
          breakdown={breakdownData.data}
          onClose={() => setBreakdownData(null)}
        />
      )}

      <PDFColumnSelectModal
        isOpen={isPDFColumnSelectModalOpen}
        onClose={() => setIsPDFColumnSelectModalOpen(false)}
        columns={course.columns}
        course={course}
        onConfirm={(selectedColIds, includeTrend) => {
          const selectedColumns = course.columns.filter(col => selectedColIds.includes(col.id));
          exportMatrixPDF(course, students, grades, selectedColumns, includeTrend);
          setIsPDFColumnSelectModalOpen(false);
        }}
      />

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

      {selectedStudentForDashboard && (
        <StudentPerformanceDashboard
          student={selectedStudentForDashboard}
          course={course}
          grades={grades}
          visibleColumns={visibleColumns}
          onClose={() => setSelectedStudentForDashboard(null)}
        />
      )}

      {isEnrollmentModalOpen && (
        <EnrollmentModal
          isOpen={isEnrollmentModalOpen}
          onClose={() => setIsEnrollmentModalOpen(false)}
          course={course}
          students={allStudents}
          onEnroll={handleEnroll}
          onUnenroll={handleUnenroll}
          onReorder={handleReorder}
        />
      )}
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
  onOpenEvaluation?: () => void;
  onOpenManualEdit: (studentId: string, column: CourseEntry, grade?: Grade) => void;
  hoveredAttendanceDate?: string | null;
  onHoverAttendanceDate?: (date: string | null) => void;
}

const GradeCell = ({ 
  studentId, 
  column, 
  grade, 
  onUpdateGrade, 
  onAddEntry, 
  onEditEntry, 
  onDeleteEntry, 
  isHidden, 
  heatmapStyle, 
  onOpenEvaluation, 
  onOpenManualEdit,
  hoveredAttendanceDate,
  onHoverAttendanceDate
}: GradeCellProps) => {
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
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
                e.preventDefault();
                const inputs = Array.from(document.querySelectorAll('.group-input')) as HTMLInputElement[];
                const activeIdx = inputs.indexOf(e.currentTarget);
                if (activeIdx !== -1) {
                  if (e.key === 'ArrowDown' || e.key === 'Enter') {
                    const next = inputs[activeIdx + 1];
                    if (next) {
                      next.focus();
                      next.select();
                    }
                  } else if (e.key === 'ArrowUp') {
                    const prev = inputs[activeIdx - 1];
                    if (prev) {
                      prev.focus();
                      prev.select();
                    }
                  }
                }
              }
            }}
          />
        );
      
      case 'manual':
        return (
          <div 
            className="manual-cell-content"
            onClick={() => onOpenManualEdit(studentId, column, grade)}
            style={{ color: heatmapStyle?.color }}
          >
            {grade?.value || <span className="empty-placeholder">-</span>}
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
                  className={`presence-entry ${hoveredAttendanceDate === entry.date ? 'highlight-same-date' : ''}`}
                  onMouseEnter={() => onHoverAttendanceDate?.(entry.date)}
                  onMouseLeave={() => onHoverAttendanceDate?.(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEntry(entry);
                    handleOpenMenu(e);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {entry.value === 'check' ? <Check size={20} className="icon-present" /> : <XIcon size={20} className="icon-absent" />}
                    {(entry.hours || 1) > 1 && (
                      <span style={{ 
                        position: 'absolute', 
                        top: '-8px', 
                        right: '-8px', 
                        fontSize: '9px', 
                        background: 'var(--primary-color)', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '13px', 
                        height: '13px', 
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
            className={`manual-cell-content calculated-cell ${grade?.isOverridden ? 'is-overridden-grade' : ''}`}
            onClick={() => onOpenManualEdit(studentId, column, grade)}
            style={{ color: heatmapStyle?.color, position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              {grade?.value || <span className="empty-placeholder">-</span>}
              {grade?.isOverridden && <Pencil size={10} className="override-icon" />}
            </div>
          </div>
        );
      }

      case 'evaluation':
        if (isHidden) {
          return (
            <div 
              className="manual-cell-content"
              onClick={onOpenEvaluation}
              style={{ color: heatmapStyle?.color, display: 'flex', flexDirection: 'column', padding: '4px 0', height: '100%', justifyContent: 'center' }}
            >
              <span style={{ fontSize: '15px', fontWeight: 'bold' }}>{grade?.value || <span className="empty-placeholder">-</span>}</span>
              {grade?.evaluationPercent !== undefined && (
                <span style={{ fontSize: '10px', opacity: 0.85 }}>{grade.evaluationPercent}%</span>
              )}
            </div>
          );
        }
        return (
          <div 
            className="manual-cell-content"
            onClick={onOpenEvaluation}
            style={{ color: heatmapStyle?.color, display: 'flex', flexDirection: 'column', padding: '6px 4px', fontSize: '11px', textAlign: 'left', width: '100%', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '4px', width: '100%' }}>
              {column.subTasks?.map(task => (
                <span key={task.id} style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '4px', display: 'block', width: '100%' }}>
                  {task.title}: {grade?.subTaskPoints?.[task.id] !== undefined ? grade.subTaskPoints[task.id] : 0}/{task.maxPoints}
                </span>
              ))}
            </div>
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '4px', marginTop: '2px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span>{grade?.evaluationPoints !== undefined ? grade.evaluationPoints : 0} Pkt.</span>
              <span>Note {grade?.value || '-'}</span>
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

const CollaborationEntryModal = ({ onSave, onClose, entry }: { onSave: (val: string, note: string, date: string) => void, onClose: () => void, entry?: GradeEntry }) => {
  const [val, setVal] = useState(entry?.value as string || '+');
  const [note, setNote] = useState(entry?.note || '');
  const [date, setDate] = useState(entry?.date || new Date().toISOString().split('T')[0]);
  const [predefinedComments, setPredefinedComments] = useState<PredefinedComment[]>([]);

  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToPredefinedComments((comments) => {
      setPredefinedComments(comments);
    });
    return () => unsubscribe();
  }, []);

  const filteredComments = predefinedComments.filter(c => c.type === val);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card collaboration-modal expanded" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{entry ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h3>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>
        
        <div className="modal-body p-8">
          <div className="modal-layout-split">
            {/* Linke Spalte: Eingabefelder */}
            <div className="modal-col-left">
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

            {/* Rechte Spalte: Vorgefertigte Kommentare */}
            <div className="modal-col-right">
              <div className="predefined-header">Kommentare ({val})</div>
              {filteredComments.length === 0 ? (
                <div className="no-predefined-msg">
                  Keine Kommentare für '{val}' angelegt.
                </div>
              ) : (
                <div className="predefined-comments-list">
                  {filteredComments.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={`predefined-comment-item-btn ${note === c.text ? 'active' : ''}`}
                      onClick={() => setNote(c.text)}
                      onDoubleClick={() => {
                        setNote(c.text);
                        onSave(val, c.text, date);
                      }}
                    >
                      {c.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
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

const PDFColumnSelectModal = ({
  isOpen,
  onClose,
  columns,
  course,
  onConfirm
}: {
  isOpen: boolean;
  onClose: () => void;
  columns: CourseEntry[];
  course: Course;
  onConfirm: (selectedColIds: string[], includeTrend: boolean) => void;
}) => {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [includeTrend, setIncludeTrend] = useState(course.showTrend !== false);

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, boolean> = {};
      columns.forEach(col => {
        initial[col.id] = col.isVisible !== false;
      });
      setSelectedIds(initial);
      setIncludeTrend(course.showTrend !== false);
    }
  }, [isOpen, columns, course.showTrend]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const updated: Record<string, boolean> = {};
    columns.forEach(col => {
      updated[col.id] = true;
    });
    setSelectedIds(updated);
  };

  const handleDeselectAll = () => {
    const updated: Record<string, boolean> = {};
    columns.forEach(col => {
      updated[col.id] = false;
    });
    setSelectedIds(updated);
  };

  const handleConfirm = () => {
    const selected = columns
      .filter(col => selectedIds[col.id])
      .map(col => col.id);
    onConfirm(selected, includeTrend);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Spalten für PDF-Export auswählen</h3>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>
        <div className="modal-body p-8">
          <p className="field-hint" style={{ marginBottom: '12px' }}>
            Wählen Sie aus, welche Beurteilungen in dem exportierten PDF enthalten sein sollen:
          </p>
          
          <div className="pdf-selection-toolbar" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button type="button" className="btn-secondary btn-sm" onClick={handleSelectAll} style={{ width: 'auto', padding: '4px 8px', fontSize: '11px', marginTop: 0 }}>
              Alle auswählen
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={handleDeselectAll} style={{ width: 'auto', padding: '4px 8px', fontSize: '11px', marginTop: 0 }}>
              Auswahl aufheben
            </button>
          </div>

          <div className="pdf-columns-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', marginBottom: '12px' }}>
            {columns.map(col => (
              <label 
                key={col.id} 
                className="pdf-column-checkbox-row"
              >
                <input 
                  type="checkbox" 
                  checked={!!selectedIds[col.id]} 
                  onChange={() => toggleSelect(col.id)} 
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>{col.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {col.date ? formatDate(col.date) : 'Kein Datum'}
                  </span>
                </div>
              </label>
            ))}
          </div>

          {course.showTrend !== false && (
            <label 
              className="pdf-column-checkbox-row"
              style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px', cursor: 'pointer' }}
            >
              <input 
                type="checkbox" 
                checked={includeTrend} 
                onChange={() => setIncludeTrend(!includeTrend)} 
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-color)' }}>Gesamt-Trend</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Berechnete Endnote im PDF anzeigen
                </span>
              </div>
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={!Object.values(selectedIds).some(v => v)}
          >
            PDF generieren
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
