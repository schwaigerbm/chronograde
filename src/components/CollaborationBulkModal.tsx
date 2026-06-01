import React, { useState } from 'react';
import { X, Check, Save, Plus, Minus } from 'lucide-react';
import type { Student } from '../schema';

interface CollaborationBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (date: string, note: string, data: Record<string, '+' | '-' | '~' | 'unset'>) => void;
}

export const CollaborationBulkModal = ({ isOpen, onClose, students, onSave }: CollaborationBulkModalProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<Record<string, '+' | '-' | '~' | 'unset'>>({});

  if (!isOpen) return null;

  const handleToggle = (studentId: string, val: '+' | '-' | '~') => {
    setEntries(prev => ({
      ...prev,
      [studentId]: prev[studentId] === val ? 'unset' : val
    }));
  };

  const handleSave = () => {
    if (!note.trim()) return;
    onSave(date, note, entries);
    setEntries({});
    setNote('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Mitarbeit Schnellerfassung</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body p-8">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="input-field">
              <label>Datum</label>
              <input 
                type="date" 
                className="form-input" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
              />
            </div>
            <div className="input-field">
              <label>Notiz (Pflicht)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="z.B. Mitarbeit im Unterricht"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="attendance-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Schüler</th>
                  <th style={{ textAlign: 'center' }}>Bewertung</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => (
                  <tr key={s.id}>
                    <td>{idx + 1}</td>
                    <td>{s.lastName}, {s.firstName}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className={`btn-icon ${entries[s.id] === '+' ? 'bg-success text-white' : 'btn-outline'}`}
                          onClick={() => handleToggle(s.id, '+')}
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        >
                          <Plus size={16} />
                        </button>
                        <button 
                          className={`btn-icon ${entries[s.id] === '~' ? 'bg-warning text-white' : 'btn-outline'}`}
                          onClick={() => handleToggle(s.id, '~')}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', fontSize: '18px' }}
                        >
                          ~
                        </button>
                        <button 
                          className={`btn-icon ${entries[s.id] === '-' ? 'bg-danger text-white' : 'btn-outline'}`}
                          onClick={() => handleToggle(s.id, '-')}
                          style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        >
                          <Minus size={16} />
                        </button>
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
            disabled={!note.trim() || Object.values(entries).every(v => v === 'unset' || !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
          >
            <Save size={18} /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
};
