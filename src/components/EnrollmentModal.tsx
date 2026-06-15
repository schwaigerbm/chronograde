import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ArrowUp, ArrowDown, UserMinus } from 'lucide-react';
import type { Course, Student } from '../schema';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  students: Student[];
  onEnroll: (studentId: string) => Promise<void>;
  onUnenroll: (studentId: string) => Promise<void>;
  onReorder: (index: number, direction: 'up' | 'down') => Promise<void>;
}

export const EnrollmentModal = ({
  isOpen,
  onClose,
  course,
  students,
  onEnroll,
  onUnenroll,
  onReorder
}: EnrollmentModalProps) => {
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync auto-focus on search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setStudentSearchTerm('');
      setHighlightedIndex(-1);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global ESC key listener to close modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Reset highlight index when search term changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [studentSearchTerm]);

  if (!isOpen) return null;

  // Enrolled students in this course
  const enrolledStudents = useMemo(() => {
    if (!course.enrolledStudents) return [];
    return course.enrolledStudents
      .map(id => students.find(s => s.id === id))
      .filter((s): s is Student => !!s);
  }, [course.enrolledStudents, students]);

  // Students not enrolled yet, matching the search term
  const filteredSearchStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return [];
    return students.filter(s => 
      !course.enrolledStudents?.includes(s.id) &&
      (s.firstName.toLowerCase().includes(studentSearchTerm.toLowerCase()) || 
       s.lastName.toLowerCase().includes(studentSearchTerm.toLowerCase()))
    ).slice(0, 5);
  }, [students, studentSearchTerm, course.enrolledStudents]);

  const handleAddStudent = async (studentId: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onEnroll(studentId);
      setStudentSearchTerm('');
      setHighlightedIndex(-1);
      // Put cursor back to search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error("Error enrolling student:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (studentSearchTerm) {
        e.stopPropagation();
        setStudentSearchTerm('');
        setHighlightedIndex(-1);
      }
      return;
    }

    if (!filteredSearchStudents.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev === filteredSearchStudents.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev <= 0 ? filteredSearchStudents.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSearchStudents.length) {
        handleAddStudent(filteredSearchStudents[highlightedIndex].id);
      }
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Schüler-Zuweisung: {course.name}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <div className="search-bar" style={{ marginBottom: '20px' }}>
            <div className="search-input-wrapper" style={{ width: '100%' }}>
              <Search size={18} className="search-icon" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Schüler suchen..." 
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="form-input"
                disabled={isSaving}
              />
              {studentSearchTerm && filteredSearchStudents.length > 0 && (
                <div 
                  className="search-results-dropdown" 
                  style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    background: 'white', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    zIndex: 100, 
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                  }}
                >
                  {filteredSearchStudents.map((student, idx) => (
                    <div 
                      key={student.id} 
                      className="search-result-item"
                      onClick={() => handleAddStudent(student.id)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      style={{ 
                        padding: '10px 16px', 
                        cursor: 'pointer',
                        backgroundColor: idx === highlightedIndex ? '#f1f5f9' : 'white',
                        fontWeight: idx === highlightedIndex ? '600' : 'normal',
                        color: 'var(--text-main)'
                      }}
                    >
                      {student.lastName}, {student.firstName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>Teilnehmerliste</h4>
          <div className="enrolled-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {enrolledStudents.length === 0 ? (
              <p className="text-muted text-center py-4">Noch keine Schüler zugewiesen.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {enrolledStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td style={{ width: '40px', color: '#64748b' }}>{index + 1}</td>
                      <td>{student.lastName}, {student.firstName}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            className="btn-icon btn-sm" 
                            onClick={() => onReorder(index, 'up')}
                            disabled={index === 0 || isSaving}
                            title="Hoch"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            className="btn-icon btn-sm" 
                            onClick={() => onReorder(index, 'down')}
                            disabled={index === enrolledStudents.length - 1 || isSaving}
                            title="Runter"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button 
                            className="btn-icon btn-sm danger" 
                            onClick={() => onUnenroll(student.id)}
                            disabled={isSaving}
                            title="Entfernen"
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button 
            className="btn-primary" 
            onClick={onClose} 
            style={{ flex: 1, height: '40px', padding: '0 16px', fontSize: '14px', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            Fertig
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
