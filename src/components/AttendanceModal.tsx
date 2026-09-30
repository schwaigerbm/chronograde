import { useState, useEffect } from 'react';
import { X, Check, Save, ArrowRight, ArrowLeft } from 'lucide-react';
import type { Student } from '../schema';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (date: string, hours: number, attendance: Record<string, 'check' | 'x'>) => void;
  availableGroups?: string[];
  studentGroupMap?: Record<string, string>;
}

export const AttendanceModal = ({ isOpen, onClose, students, onSave, availableGroups = [], studentGroupMap = {} }: AttendanceModalProps) => {
  const [step, setStep] = useState<'setup' | 'entry'>('setup');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState<number>(1);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  
  // Use 'unset' as initial state to avoid pre-selection
  const [attendance, setAttendance] = useState<Record<string, 'check' | 'x' | 'unset'>>(
    Object.fromEntries(students.map(s => [s.id, 'unset']))
  );

  // Reset states when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep('setup');
      setDate(new Date().toISOString().split('T')[0]);
      setHours(1);
      setSelectedGroup('all');
      setAttendance(Object.fromEntries(students.map(s => [s.id, 'unset'])));
    }
  }, [isOpen, students]);

  if (!isOpen) return null;

  const displayedStudents = selectedGroup === 'all' 
    ? students 
    : students.filter(s => (studentGroupMap[s.id] || '') === selectedGroup);

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId];
      let next: 'check' | 'x' | 'unset' = 'check';
      if (current === 'check') next = 'x';
      else if (current === 'x') next = 'unset';
      return { ...prev, [studentId]: next };
    });
  };

  const handleSetAllAttendance = (value: 'check' | 'x' | 'unset') => {
    setAttendance(prev => {
      const next = { ...prev };
      displayedStudents.forEach(s => {
        next[s.id] = value;
      });
      return next;
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
    
    onSave(date, hours, filteredAttendance);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        {step === 'setup' ? (
          <>
            <div className="modal-header">
              <h3>Anwesenheit erfassen - Voreinstellungen</h3>
              <button className="btn-icon" onClick={onClose}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                Bitte legen Sie zuerst das Datum und die Anzahl der Unterrichtsstunden für diese Erfassung fest.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stunden</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 4].map(h => (
                      <button 
                        key={h} 
                        type="button"
                        className={`btn-secondary btn-xs ${hours === h ? 'active-btn' : ''}`}
                        style={hours === h ? { backgroundColor: 'var(--primary-color)', color: 'white', borderColor: 'var(--primary-color)' } : { padding: '4px 12px' }}
                        onClick={() => setHours(h)}
                      >
                        {h} Std.
                      </button>
                    ))}
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '60px', padding: '4px 8px' }}
                      value={hours}
                      onChange={(e) => setHours(Number(e.target.value))}
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
              <button 
                className="btn-primary" 
                onClick={() => setStep('entry')} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
                disabled={!date || hours < 1}
              >
                Weiter zur Schülerliste <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h3>Anwesenheit erfassen</h3>
              <button className="btn-icon" onClick={onClose}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              {/* Voreinstellungen Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  Datum: <strong>{date.split('-').reverse().join('.')}</strong> | Unterrichtsstunden: <strong>{hours} Std.</strong>
                </div>
                <button 
                  type="button" 
                  className="btn-secondary btn-xs" 
                  onClick={() => setStep('setup')}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }}
                >
                  <ArrowLeft size={12} /> Ändern
                </button>
              </div>

              {availableGroups.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', margin: 0 }}>Gruppe filtern:</label>
                  <select 
                    className="form-select" 
                    style={{ padding: '4px 8px', fontSize: '13px', borderRadius: '6px', maxWidth: '180px' }}
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                  >
                    <option value="all">Alle Gruppen ({students.length})</option>
                    {availableGroups.map(g => (
                      <option key={g} value={g}>Gruppe {g}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                  Klicken Sie auf die Zeilen der Schüler, um zwischen Anwesend (Häkchen), Abwesend (X) und Nicht gesetzt zu wechseln.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button 
                    type="button" 
                    className="btn-secondary btn-xs"
                    style={{ fontSize: '11px', padding: '4px 8px', borderColor: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '2px' }}
                    onClick={() => handleSetAllAttendance('check')}
                  >
                    Alle anwesend
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-xs"
                    style={{ fontSize: '11px', padding: '4px 8px', borderColor: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '2px' }}
                    onClick={() => handleSetAllAttendance('x')}
                  >
                    Alle abwesend
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-xs"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                    onClick={() => handleSetAllAttendance('unset')}
                  >
                    Zurücksetzen
                  </button>
                </div>
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
                    {displayedStudents.map((student, index) => (
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
              <button className="btn-secondary" onClick={() => setStep('setup')}>Zurück</button>
              <button 
                className="btn-primary" 
                onClick={handleSave} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
                disabled={Object.values(attendance).every(v => v === 'unset')}
              >
                <Save size={18} /> Speichern
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
