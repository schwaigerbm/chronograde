import React, { useState } from 'react';
import { X, Check, Save } from 'lucide-react';
import type { Student } from '../schema';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (date: string, attendance: Record<string, 'check' | 'x'>) => void;
}

export const AttendanceModal = ({ isOpen, onClose, students, onSave }: AttendanceModalProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  // Use 'unset' as initial state to avoid pre-selection
  const [attendance, setAttendance] = useState<Record<string, 'check' | 'x' | 'unset'>>(
    Object.fromEntries(students.map(s => [s.id, 'unset']))
  );

  if (!isOpen) return null;

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId];
      let next: 'check' | 'x' | 'unset' = 'check';
      if (current === 'check') next = 'x';
      else if (current === 'x') next = 'unset';
      return { ...prev, [studentId]: next };
    });
  };

  const handleSave = () => {
    // Filter out unset entries
    const filteredAttendance: Record<string, 'check' | 'x'> = {};
    Object.entries(attendance).forEach(([id, val]) => {
      if (val !== 'unset') {
        filteredAttendance[id] = val as 'check' | 'x';
      }
    });
    
    onSave(date, filteredAttendance);
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

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Klicken Sie auf die Symbole, um zwischen Anwesend (Häkchen), Abwesend (X) und Nicht gesetzt zu wechseln.
          </p>

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
                    <td className="text-center" style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className={`presence-toggle ${attendance[student.id]}`}>
                        {attendance[student.id] === 'check' && <Check size={20} className="icon-present" />}
                        {attendance[student.id] === 'x' && <X size={20} className="icon-absent" />}
                        {attendance[student.id] === 'unset' && <span style={{ fontSize: '12px' }}>-</span>}
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
          <button 
            className="btn-primary" 
            onClick={handleSave} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
            disabled={Object.values(attendance).every(v => v === 'unset')}
          >
            <Save size={18} /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
};
