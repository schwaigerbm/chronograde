import React, { useState } from 'react';
import { X, Check, Save } from 'lucide-react';
import type { Student, GradeEntry } from '../schema';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (date: string, attendance: Record<string, 'check' | 'x'>) => void;
}

export const AttendanceModal = ({ isOpen, onClose, students, onSave }: AttendanceModalProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, 'check' | 'x'>>(
    Object.fromEntries(students.map(s => [s.id, 'check']))
  );

  if (!isOpen) return null;

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'check' ? 'x' : 'check'
    }));
  };

  const handleSave = () => {
    onSave(date, attendance);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Anwesenheit erfassen</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body">
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">Datum</label>
            <input 
              type="date" 
              className="form-input" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="attendance-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>Nr.</th>
                  <th>Schüler</th>
                  <th className="text-center">Anwesenheit</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student.id} onClick={() => toggleAttendance(student.id)} style={{ cursor: 'pointer' }}>
                    <td>{index + 1}</td>
                    <td>{student.lastName}, {student.firstName}</td>
                    <td className="text-center">
                      <div className={`presence-toggle ${attendance[student.id]}`}>
                        {attendance[student.id] === 'check' ? (
                          <Check size={20} className="icon-present" />
                        ) : (
                          <X size={20} className="icon-absent" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}>
            <Save size={18} /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
};
