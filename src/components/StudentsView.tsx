import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Wrench, Trash2, X, AlertTriangle } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import type { Student } from '../schema';

export const StudentsView = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
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

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent?.firstName || !currentStudent?.lastName) return;

    try {
      if (currentStudent.id) {
        await firebaseService.updateStudent(currentStudent.id, {
          firstName: currentStudent.firstName,
          lastName: currentStudent.lastName
        });
      } else {
        await firebaseService.addStudent({
          firstName: currentStudent.firstName,
          lastName: currentStudent.lastName,
          classId: currentStudent.classId || 'General'
        });
      }
      setIsEditModalOpen(false);
      setCurrentStudent(null);
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

      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Schüler suchen..." 
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
              <th>Vorname</th>
              <th>Nachname</th>
              <th className="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="text-center py-8">Lade Schüler...</td></tr>
            ) : filteredStudents.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted">Keine Schüler gefunden.</td></tr>
            ) : filteredStudents.map(student => (
              <tr key={student.id}>
                <td>{student.firstName}</td>
                <td>{student.lastName}</td>
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

      {/* Edit/Add Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>{currentStudent?.id ? 'Schüler bearbeiten' : 'Schüler hinzufügen'}</h3>
              <button className="btn-icon" onClick={() => setIsEditModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Vorname</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentStudent?.firstName || ''}
                    onChange={e => setCurrentStudent(prev => ({ ...prev!, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nachname</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={currentStudent?.lastName || ''}
                    onChange={e => setCurrentStudent(prev => ({ ...prev!, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>Abbrechen</button>
                <button type="submit" className="btn-primary">Speichern</button>
              </div>
            </form>
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
              <p>Wollen Sie den Schüler <strong>{currentStudent?.firstName} {currentStudent?.lastName}</strong> wirklich löschen?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-danger" onClick={handleDelete}>Ja</button>
              <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Nein</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
