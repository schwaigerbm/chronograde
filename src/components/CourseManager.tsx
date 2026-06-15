import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  LayoutGrid, 
  Wrench, 
  Users, 
  Archive, 
  RotateCcw, 
  Trash2, 
  Search, 
  X, 
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import type { Course, Student } from '../schema';
import { EnrollmentModal } from './EnrollmentModal';

export const CourseManager = ({ onOpenMatrix }: { onOpenMatrix: (course: Course) => void }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'year', direction: 'asc' | 'desc' } | null>(null);

  // Modals state
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Partial<Course> | null>(null);
  
  // Enrollment State

  // Load courses
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = firebaseService.subscribeToCourses(showArchived, (data) => {
      setCourses(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [showArchived]);

  // Load students for enrollment
  useEffect(() => {
    firebaseService.getStudents().then(setStudents);
  }, []);

  // Filtering logic
  const filteredCourses = useMemo(() => {
    return courses.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.year.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [courses, searchTerm]);

  // Sorting logic
  const sortedCourses = useMemo(() => {
    let sortableCourses = [...filteredCourses];
    if (sortConfig !== null) {
      sortableCourses.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableCourses;
  }, [filteredCourses, sortConfig]);

  const requestSort = (key: 'name' | 'year') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenAdd = () => {
    setCurrentCourse({ name: '', year: '', archived: false });
    setIsCourseModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setCurrentCourse(course);
    setIsCourseModalOpen(true);
  };

  const handleOpenEnrollment = (course: Course) => {
    setCurrentCourse(course);
    setIsEnrollmentModalOpen(true);
  };

  const handleOpenDelete = (course: Course) => {
    setCurrentCourse(course);
    setIsDeleteModalOpen(true);
  };

  const handleOpenArchive = (course: Course) => {
    setCurrentCourse(course);
    setIsArchiveModalOpen(true);
  };

  const handleOpenRestore = (course: Course) => {
    setCurrentCourse(course);
    setIsRestoreModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCourse?.name || !currentCourse?.year) return;

    try {
      await firebaseService.saveCourse(currentCourse as any);
      setIsCourseModalOpen(false);
      setCurrentCourse(null);
    } catch (error) {
      console.error("Error saving course:", error);
    }
  };

  const handleConfirmArchive = async () => {
    if (!currentCourse) return;
    try {
      await firebaseService.saveCourse({ ...currentCourse, archived: true } as any);
      setIsArchiveModalOpen(false);
      setCurrentCourse(null);
    } catch (error) {
      console.error("Error archiving course:", error);
    }
  };

  const handleConfirmRestore = async () => {
    if (!currentCourse) return;
    try {
      await firebaseService.saveCourse({ ...currentCourse, archived: false } as any);
      setIsRestoreModalOpen(false);
      setCurrentCourse(null);
    } catch (error) {
      console.error("Error restoring course:", error);
    }
  };

  const handleDeleteCourse = async () => {
    if (!currentCourse?.id) return;
    try {
      await firebaseService.deleteCourse(currentCourse.id);
      setIsDeleteModalOpen(false);
      setCurrentCourse(null);
    } catch (error) {
      console.error("Error deleting course:", error);
    }
  };

  // Enrollment Functions
  const addStudentToCourse = async (studentId: string) => {
    if (!currentCourse?.id) return;
    const newList = [...(currentCourse.enrolledStudents || []), studentId];
    const updatedCourse = { ...currentCourse, enrolledStudents: newList };
    setCurrentCourse(updatedCourse);
    await firebaseService.saveCourse(updatedCourse as any);
  };

  const removeStudentFromCourse = async (studentId: string) => {
    if (!currentCourse?.id) return;
    const newList = (currentCourse.enrolledStudents || []).filter(id => id !== studentId);
    const updatedCourse = { ...currentCourse, enrolledStudents: newList };
    setCurrentCourse(updatedCourse);
    await firebaseService.saveCourse(updatedCourse as any);
  };

  const moveStudent = async (index: number, direction: 'up' | 'down') => {
    if (!currentCourse?.id || !currentCourse.enrolledStudents) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentCourse.enrolledStudents.length) return;

    const newList = [...currentCourse.enrolledStudents];
    const [movedItem] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, movedItem);
    
    const updatedCourse = { ...currentCourse, enrolledStudents: newList };
    setCurrentCourse(updatedCourse);
    await firebaseService.saveCourse(updatedCourse as any);
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="title-group">
          <h1 className="main-title" style={{ color: '#0f172a', fontWeight: 800 }}>Gruppen</h1>
          <div className="subtitle-wrapper" style={{ justifyContent: 'space-between', width: '100%' }}>
            <h2 className="sub-title" style={{ color: '#64748b', fontWeight: 500 }}>Verwaltung aller Benotungsgruppen</h2>
            <div className="flex items-center" style={{ gap: '32px' }}>
              <label className="switch-container">
                <span className={`switch-label ${!showArchived ? 'active' : ''}`}>Aktiv</span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={showArchived} 
                    onChange={() => setShowArchived(!showArchived)} 
                  />
                  <span className="slider"></span>
                </label>
                <span className={`switch-label ${showArchived ? 'active' : ''}`}>Archiv</span>
              </label>
              <button className="btn-primary btn-sm" onClick={handleOpenAdd} style={{ width: 'auto', marginTop: 0 }}>
                <Plus size={16} /> Gruppe hinzufügen
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '24px' }}>
        <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Gruppen suchen (Name oder Jahr)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('name')} className="cursor-pointer select-none" style={{ cursor: 'pointer' }}>
                <div className="flex items-center gap-2">
                  Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th onClick={() => requestSort('year')} className="cursor-pointer select-none" style={{ cursor: 'pointer' }}>
                <div className="flex items-center gap-2">
                  Schuljahr {sortConfig?.key === 'year' && (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                </div>
              </th>
              <th className="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-8">Lade Gruppen...</td></tr>
            ) : sortedCourses.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted">Keine Gruppen gefunden.</td></tr>
            ) : sortedCourses.map(course => (
              <tr key={course.id}>
                <td className="font-semibold">{course.name}</td>
                <td>{course.year}</td>
                <td className="text-right actions-cell">
                  <button className="btn-icon" title="Matrix" onClick={() => onOpenMatrix(course)}>
                    <LayoutGrid size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => handleOpenEdit(course)} title="Bearbeiten">
                    <Wrench size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => handleOpenEnrollment(course)} title="Schüler">
                    <Users size={18} />
                  </button>
                  {!showArchived ? (
                    <button className="btn-icon" onClick={() => handleOpenArchive(course)} title="Archivieren">
                      <Archive size={18} />
                    </button>
                  ) : (
                    <>
                      <button className="btn-icon" onClick={() => handleOpenRestore(course)} title="Wiederherstellen">
                        <RotateCcw size={18} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleOpenDelete(course)} title="Löschen">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Course Modal */}
      {isCourseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{currentCourse?.id ? 'Gruppe bearbeiten' : 'Gruppe hinzufügen'}</h3>
              <button className="btn-icon" onClick={() => setIsCourseModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCourse}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name des Fachs / der Gruppe</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentCourse?.name || ''}
                    onChange={e => setCurrentCourse(prev => ({ ...prev!, name: e.target.value }))}
                    placeholder="z.B. Mathematik"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Schuljahr</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentCourse?.year || ''}
                    onChange={e => setCurrentCourse(prev => ({ ...prev!, year: e.target.value }))}
                    placeholder="z.B. 2025/26"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsCourseModalOpen(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 0 }}>Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {isEnrollmentModalOpen && currentCourse && (
        <EnrollmentModal 
          isOpen={isEnrollmentModalOpen}
          onClose={() => {
            setIsEnrollmentModalOpen(false);
            setCurrentCourse(null);
          }}
          course={currentCourse as Course}
          students={students}
          onEnroll={addStudentToCourse}
          onUnenroll={removeStudentFromCourse}
          onReorder={moveStudent}
        />
      )}

      {/* Archive Confirmation Modal */}
      {isArchiveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="flex items-center gap-2">
                <Archive size={20} /> Gruppe archivieren
              </h3>
            </div>
            <div className="modal-body">
              <p>Wollen Sie die Gruppe <strong>{currentCourse?.name}</strong> wirklich archivieren?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={handleConfirmArchive} style={{ width: 'auto', marginTop: 0 }}>Ja, archivieren</button>
              <button className="btn-secondary" onClick={() => setIsArchiveModalOpen(false)}>Nein</button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {isRestoreModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="flex items-center gap-2">
                <RotateCcw size={20} /> Gruppe wiederherstellen
              </h3>
            </div>
            <div className="modal-body">
              <p>Wollen Sie die Gruppe <strong>{currentCourse?.name}</strong> wirklich wiederherstellen?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={handleConfirmRestore} style={{ width: 'auto', marginTop: 0 }}>Ja, wiederherstellen</button>
              <button className="btn-secondary" onClick={() => setIsRestoreModalOpen(false)}>Nein</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 className="text-danger flex items-center gap-2">
                <AlertTriangle size={20} /> Löschen bestätigen
              </h3>
            </div>
            <div className="modal-body">
              <p>Wollen Sie die Gruppe <strong>{currentCourse?.name}</strong> ({currentCourse?.year}) wirklich endgültig löschen? Alle zugehörigen Noten werden ebenfalls entfernt.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-danger" onClick={handleDeleteCourse}>Ja, löschen</button>
              <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
