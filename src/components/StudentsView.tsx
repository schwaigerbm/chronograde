import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Wrench, Trash2, AlertTriangle } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import type { Student } from '../schema';
import { StudentEditModal } from './StudentEditModal';

export const StudentsView = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAvatars, setShowAvatars] = useState<boolean>(() => {
    const saved = localStorage.getItem("chronograde_show_avatars");
    return saved ? JSON.parse(saved) : true;
  });
  const [visibleLimit, setVisibleLimit] = useState(50);
  
  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student> | null>(null);

  // Load students in real-time
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = firebaseService.subscribeToStudents(null, (data) => {
      setStudents(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Reset limit on search term change
  useEffect(() => {
    setVisibleLimit(50);
  }, [searchTerm]);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  // Limit displayed students for pagination
  const visibleStudents = useMemo(() => {
    return filteredStudents.slice(0, visibleLimit);
  }, [filteredStudents, visibleLimit]);

  const handleOpenAdd = () => {
    setCurrentStudent({ firstName: '', lastName: '', classId: 'General' });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setCurrentStudent(student);
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (student: Student) => {
    setCurrentStudent(student);
    setIsDeleteModalOpen(true);
  };

  const handleSaveStudent = async (studentData: Partial<Student>, shouldContinue: boolean) => {
    if (!studentData.firstName || !studentData.lastName) return;

    try {
      if (studentData.id) {
        await firebaseService.updateStudent(studentData.id, {
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          photoBase64: studentData.photoBase64 || "",
          excludeFromPublicStats: studentData.excludeFromPublicStats || false
        });
      } else {
        await firebaseService.addStudent({
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          classId: studentData.classId || 'General',
          photoBase64: studentData.photoBase64 || "",
          excludeFromPublicStats: studentData.excludeFromPublicStats || false
        });
      }
      
      if (!shouldContinue) {
        setIsEditModalOpen(false);
        setCurrentStudent(null);
      }
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  const handleDelete = async () => {
    if (!currentStudent?.id) return;
    try {
      await firebaseService.deleteStudent(currentStudent.id);
      setIsDeleteModalOpen(false);
      setCurrentStudent(null);
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="title-group">
          <h1 className="main-title">Schüler</h1>
          <div className="subtitle-wrapper">
            <h2 className="sub-title">Verwaltung aller Schüler</h2>
            <button className="btn-primary btn-sm" onClick={handleOpenAdd}>
              <Plus size={16} /> Hinzufügen
            </button>
          </div>
        </div>
      </div>

      <div className="search-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Schüler suchen..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
        <label className="switch-container" style={{ margin: 0 }}>
          <span className={`switch-label ${!showAvatars ? 'active' : ''}`}>Bilder aus</span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={showAvatars} 
              onChange={() => {
                const newVal = !showAvatars;
                setShowAvatars(newVal);
                localStorage.setItem("chronograde_show_avatars", JSON.stringify(newVal));
              }} 
            />
            <span className="slider"></span>
          </label>
          <span className={`switch-label ${showAvatars ? 'active' : ''}`}>Bilder ein</span>
        </label>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {showAvatars && <th style={{ width: '60px' }}>Foto</th>}
              <th>Vorname</th>
              <th>Nachname</th>
              <th className="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={showAvatars ? 4 : 3} className="text-center py-8">Lade Schüler...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan={showAvatars ? 4 : 3} className="text-center py-8 text-muted">Keine Schüler gefunden.</td></tr>
            ) : visibleStudents.map(student => (
              <tr key={student.id}>
                {showAvatars && (
                  <td>
                    <div className="avatar-preview-container" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {student.photoBase64 ? (
                        <img src={student.photoBase64} alt={`${student.firstName} ${student.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                          {student.firstName[0]}{student.lastName[0]}
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td>{student.firstName}</td>
                <td>
                  {student.lastName}
                  {student.excludeFromPublicStats && (
                    <span style={{ fontSize: '12px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', marginLeft: '6px', fontWeight: 'bold' }}>
                      Privat
                    </span>
                  )}
                </td>
                <td className="text-right actions-cell">
                  <button className="btn-icon" onClick={() => handleOpenEdit(student)} title="Bearbeiten">
                    <Wrench size={18} />
                  </button>
                  <button className="btn-icon danger" onClick={() => handleOpenDelete(student)} title="Löschen">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStudents.length > visibleLimit && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', marginBottom: '20px' }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={() => setVisibleLimit(prev => prev + 50)}
            style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', height: '36px', padding: '0 16px', fontSize: '13px' }}
          >
            Mehr laden
          </button>
        </div>
      )}

      {/* Edit/Add Modal */}
      <StudentEditModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setCurrentStudent(null);
        }}
        student={currentStudent}
        onSave={handleSaveStudent}
        students={students}
      />

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
              <p>Wollen Sie den Schüler <strong>{currentStudent?.firstName} {currentStudent?.lastName}</strong> wirklich löschen?</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                className="btn-danger" 
                onClick={handleDelete} 
                style={{ flex: 1, height: '40px', padding: '0 16px', fontSize: '14px', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Ja
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => setIsDeleteModalOpen(false)} 
                style={{ flex: 1, height: '40px', padding: '0 16px', fontSize: '14px', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Nein
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
