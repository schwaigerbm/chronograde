import { useState, useEffect } from 'react';
import { X, Save, Plus, Minus, Trash2, Filter } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import type { Student, Course, Grade, PredefinedComment } from '../schema';

interface CollaborationBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  course?: Course;
  grades?: Record<string, Record<string, Grade>>;
  onSave: (date: string, updates: { studentId: string; value: '+' | '-' | '~'; note: string }[]) => void;
}

export const CollaborationBulkModal = ({ isOpen, onClose, students, course, grades, onSave }: CollaborationBulkModalProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [predefinedComments, setPredefinedComments] = useState<PredefinedComment[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [sessionEntries, setSessionEntries] = useState<Record<string, { value: '+' | '-' | '~'; note: string }>>({});
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  
  // Custom manual entry states
  const [customNote, setCustomNote] = useState('');

  // Find group assignment column and collaboration column if any
  const groupCol = course?.columns.find(col => col.type === 'groupAssignment');
  const collabCol = course?.columns.find(col => col.type === 'collaborationSum');

  // Gather available group names
  const availableGroups = Array.from(
    new Set(
      students
        .map(s => (groupCol && grades?.[s.id]?.[groupCol.id]?.value ? String(grades[s.id][groupCol.id].value).trim() : ''))
        .filter(Boolean)
    )
  ).sort();

  // Filter students by selected group
  const displayStudents = students.filter(s => {
    if (!groupCol || selectedGroup === 'ALL') return true;
    const gVal = grades?.[s.id]?.[groupCol.id]?.value ? String(grades[s.id][groupCol.id].value).trim() : '';
    if (selectedGroup === 'NONE') return !gVal;
    return gVal === selectedGroup;
  });

  // Subscribe to predefined comments when open
  useEffect(() => {
    if (isOpen) {
      const unsubscribe = firebaseService.subscribeToPredefinedComments((comments) => {
        setPredefinedComments(comments);
      });
      // Reset state
      setSelectedStudentIds(new Set());
      setSessionEntries({});
      setCustomNote('');
      setSelectedGroup('ALL');
      setDate(new Date().toISOString().split('T')[0]);
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    setSelectedStudentIds(new Set(displayStudents.map(s => s.id)));
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const handleSelectMissingEntries = () => {
    const missingIds = displayStudents.filter(s => {
      if (!collabCol) return true;
      const existingEntries = grades?.[s.id]?.[collabCol.id]?.entries || [];
      const hasEntryOnDate = existingEntries.some(e => e.date === date);
      return !hasEntryOnDate;
    }).map(s => s.id);

    setSelectedStudentIds(new Set(missingIds));
  };

  const handleFillMissingNeutral = () => {
    const missingIds = displayStudents.filter(s => {
      if (sessionEntries[s.id]) return false;
      if (!collabCol) return true;
      const existingEntries = grades?.[s.id]?.[collabCol.id]?.entries || [];
      const hasEntryOnDate = existingEntries.some(e => e.date === date);
      return !hasEntryOnDate;
    }).map(s => s.id);

    if (missingIds.length === 0) return;

    setSessionEntries(prev => {
      const next = { ...prev };
      missingIds.forEach(id => {
        next[id] = { value: '~', note: '' };
      });
      return next;
    });
  };
  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleAssignComment = (type: '+' | '-' | '~', noteText: string) => {
    if (selectedStudentIds.size === 0) return;

    setSessionEntries(prev => {
      const next = { ...prev };
      selectedStudentIds.forEach(id => {
        next[id] = { value: type, note: noteText };
      });
      return next;
    });

    // Clear selection after assignment
    setSelectedStudentIds(new Set());
  };

  const handleAssignCustom = (type: '+' | '-' | '~') => {
    if (!customNote.trim()) return;
    handleAssignComment(type, customNote.trim());
    setCustomNote('');
  };

  const handleRemoveEntry = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling selection
    setSessionEntries(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const handleSave = () => {
    const updates = Object.entries(sessionEntries).map(([studentId, entry]) => ({
      studentId,
      value: entry.value,
      note: entry.note
    }));

    if (updates.length === 0) return;
    onSave(date, updates);
  };

  // Group predefined comments by type
  const plusComments = predefinedComments.filter(c => c.type === '+');
  const neutralComments = predefinedComments.filter(c => c.type === '~');
  const minusComments = predefinedComments.filter(c => c.type === '-');

  return (
    <div className="modal-overlay">
      <div 
        className="modal-card collaboration-bulk-modal" 
        style={{ 
          width: '98vw', 
          height: '95vh', 
          maxWidth: '1600px', 
          maxHeight: '95vh', 
          display: 'flex', 
          flexDirection: 'column' 
        }}
      >
        <div className="modal-header">
          <h2 className="modal-title">Mitarbeit Schnellerfassung</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body p-8" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div className="form-group" style={{ marginBottom: '20px', maxWidth: '250px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Erfassungsdatum</label>
            <input 
              type="date" 
              className="form-input" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>
            
            {/* LINKE SPALTE: Schülerliste */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
                  Schüler auswählen ({selectedStudentIds.size} markiert)
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {groupCol && availableGroups.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                      <Filter size={13} style={{ color: 'var(--text-muted)' }} />
                      <select 
                        className="form-input" 
                        style={{ padding: '2px 6px', fontSize: '11px', height: '26px' }}
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                      >
                        <option value="ALL">Alle Gruppen ({students.length})</option>
                        {availableGroups.map(g => (
                          <option key={g} value={g}>Gruppe {g}</option>
                        ))}
                        <option value="NONE">Ohne Gruppe</option>
                      </select>
                    </div>
                  )}
                  <button 
                    type="button" 
                    className="btn-secondary btn-xs" 
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={handleSelectAll}
                  >
                    Alle
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-xs" 
                    style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}
                    onClick={handleSelectMissingEntries}
                    title="Schüler ohne heutigen bzw. gewählten Eintrag in der Matrix auswählen"
                  >
                    Ohne Eintrag heute
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-xs" 
                    style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--warning-color)', borderColor: 'rgba(245, 158, 11, 0.5)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
                    onClick={handleFillMissingNeutral}
                    title="Allen Schülern der gewählten Gruppe/Klasse ohne heutigen Eintrag einen neutralen Eintrag (~) zuweisen"
                  >
                    Fehlende mit Neutral (~) auffüllen
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-xs" 
                    style={{ padding: '2px 8px', fontSize: '11px' }}
                    onClick={handleClearSelection}
                  >
                    Keine
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white' }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#e2e8f0' }}>
                      <th style={{ width: '40px', textAlign: 'center' }}>Sel.</th>
                      <th>Schüler</th>
                      <th style={{ width: '150px' }}>Aktuelle Erfassung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const isSelected = selectedStudentIds.has(student.id);
                      const entry = sessionEntries[student.id];
                      return (
                        <tr 
                          key={student.id} 
                          onClick={() => handleToggleStudent(student.id)}
                          style={{ cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : 'transparent' }}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => handleToggleStudent(student.id)}
                            />
                          </td>
                          <td 
                            className="student-name-cell"
                            style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 400, position: 'relative' }}
                          >
                            <strong style={{ fontWeight: 'bold' }}>{student.lastName}</strong>, {student.firstName}
                            {student.photoBase64 && (
                              <div className="student-avatar-tooltip">
                                <img src={student.photoBase64} alt={`${student.firstName} ${student.lastName}`} className="student-avatar-img" />
                              </div>
                            )}
                          </td>
                          <td>
                            {entry ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                <span className={`badge ${entry.value === '+' ? 'badge-success' : entry.value === '-' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '12px', padding: '2px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                                  {entry.value} {entry.note}
                                </span>
                                <button 
                                  type="button" 
                                  className="btn-icon" 
                                  onClick={(e) => handleRemoveEntry(student.id, e)}
                                  style={{ padding: '2px', color: 'var(--danger-color)' }}
                                  title="Eintrag entfernen"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RECHTE SPALTE: Zuweisungs-Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', height: '100%', minHeight: 0, paddingRight: '4px' }}>
              
              {/* Vordefinierte Kommentare */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'white' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: '12px', color: 'var(--text-main)' }}>
                  Vorgefertigte Kommentare zuweisen
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                  {/* Plus Kommentare */}
                  <div style={{ border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '8px', padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.04)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--success-color)', marginBottom: '8px', textTransform: 'uppercase' }}>Plus (+)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plusComments.length === 0 ? (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Keine Kommentare</span>
                      ) : (
                        plusComments.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="btn-secondary btn-xs hover-success"
                            style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '6px 8px', fontSize: '13px', borderColor: 'rgba(34, 197, 94, 0.2)', backgroundColor: 'white', color: '#0f172a' }}
                            onClick={() => handleAssignComment('+', c.text)}
                            disabled={selectedStudentIds.size === 0}
                          >
                            {c.text}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Neutral Kommentare */}
                  <div style={{ border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.04)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--warning-color)', marginBottom: '8px', textTransform: 'uppercase' }}>Neutral (~)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {neutralComments.length === 0 ? (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Keine Kommentare</span>
                      ) : (
                        neutralComments.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="btn-secondary btn-xs hover-warning"
                            style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '6px 8px', fontSize: '13px', borderColor: 'rgba(245, 158, 11, 0.3)', backgroundColor: 'white', color: '#0f172a' }}
                            onClick={() => handleAssignComment('~', c.text)}
                            disabled={selectedStudentIds.size === 0}
                          >
                            {c.text}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Minus Kommentare */}
                  <div style={{ border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.04)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger-color)', marginBottom: '8px', textTransform: 'uppercase' }}>Minus (-)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {minusComments.length === 0 ? (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Keine Kommentare</span>
                      ) : (
                        minusComments.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="btn-secondary btn-xs hover-danger"
                            style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '6px 8px', fontSize: '13px', borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'white', color: '#0f172a' }}
                            onClick={() => handleAssignComment('-', c.text)}
                            disabled={selectedStudentIds.size === 0}
                          >
                            {c.text}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Benutzerdefinierter Eintrag */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'white' }}>
                <span style={{ fontSize: '16px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>
                  Benutzerdefinierter Kommentar
                </span>
                
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Eigener Kommentartext..."
                  style={{ marginBottom: '12px', fontSize: '14px', padding: '6px 10px' }}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary btn-sm" 
                    style={{ flex: 1, color: 'var(--success-color)', borderColor: 'rgba(34, 197, 94, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleAssignCustom('+')}
                    disabled={selectedStudentIds.size === 0 || !customNote.trim()}
                  >
                    <Plus size={14} /> Plus (+)
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-sm" 
                    style={{ flex: 1, color: 'var(--warning-color)', borderColor: 'rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', fontSize: '14px' }}
                    onClick={() => handleAssignCustom('~')}
                    disabled={selectedStudentIds.size === 0 || !customNote.trim()}
                  >
                    ~ Neutral
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-sm" 
                    style={{ flex: 1, color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                    onClick={() => handleAssignCustom('-')}
                    disabled={selectedStudentIds.size === 0 || !customNote.trim()}
                  >
                    <Minus size={14} /> Minus (-)
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={Object.keys(sessionEntries).length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
          >
            <Save size={18} /> Speichern
          </button>
        </div>
      </div>
    </div>
  );
};
