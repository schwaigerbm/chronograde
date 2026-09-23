import { useState, useEffect } from 'react';
import { X, Save, Plus, Minus, Trash2, ArrowRight, ArrowLeft, Check, Zap } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import type { Student, Course, PredefinedComment } from '../schema';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  students: Student[];
  availableGroups?: string[];
  studentGroupMap?: Record<string, string>;
  onSave: (data: {
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
  }) => void;
}

export const QuickEntryModal = ({ isOpen, onClose, course, students, availableGroups = [], studentGroupMap = {}, onSave }: QuickEntryModalProps) => {
  const presenceCol = course.columns.find(col => col.type === 'presenceSum' && col.isVisible !== false);
  const collabCol = course.columns.find(col => col.type === 'collaborationSum' && col.isVisible !== false);

  const [flowStep, setFlowStep] = useState<'setup' | 'attendance' | 'collaboration' | 'empty'>('empty');
  
  // Attendance States
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceHours, setAttendanceHours] = useState<number>(1);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [attendanceEntries, setAttendanceEntries] = useState<Record<string, 'check' | 'x' | 'unset'>>({});

  // Collaboration States
  const [collabDate, setCollabDate] = useState(new Date().toISOString().split('T')[0]);
  const [predefinedComments, setPredefinedComments] = useState<PredefinedComment[]>([]);
  const [selectedCollabStudentIds, setSelectedCollabStudentIds] = useState<Set<string>>(new Set());
  const [collabSessionEntries, setCollabSessionEntries] = useState<Record<string, { value: '+' | '-' | '~'; note: string }>>({});
  const [collabCustomNote, setCollabCustomNote] = useState('');

  // Initialize flow on open
  useEffect(() => {
    if (isOpen) {
      if (presenceCol) {
        setFlowStep('setup');
      } else if (collabCol) {
        setFlowStep('collaboration');
      } else {
        setFlowStep('empty');
      }

      // Reset Attendance
      setAttendanceDate(new Date().toISOString().split('T')[0]);
      setAttendanceHours(1);
      setAttendanceEntries(Object.fromEntries(students.map(s => [s.id, 'unset'])));

      // Reset Collaboration
      setCollabDate(new Date().toISOString().split('T')[0]);
      setSelectedCollabStudentIds(new Set());
      setCollabSessionEntries({});
      setCollabCustomNote('');
    }
  }, [isOpen, course, students]);

  // Subscribe to predefined comments
  useEffect(() => {
    if (isOpen && collabCol) {
      const unsubscribe = firebaseService.subscribeToPredefinedComments((comments) => {
        setPredefinedComments(comments);
      });
      return () => unsubscribe();
    }
  }, [isOpen, collabCol]);

  if (!isOpen) return null;

  // Attendance Handlers
  const toggleAttendance = (studentId: string) => {
    setAttendanceEntries(prev => {
      const current = prev[studentId];
      let next: 'check' | 'x' | 'unset' = 'check';
      if (current === 'check') next = 'x';
      else if (current === 'x') next = 'unset';
      return { ...prev, [studentId]: next };
    });
  };

  const displayedAttendanceStudents = selectedGroup === 'all'
    ? students
    : students.filter(s => (studentGroupMap[s.id] || '') === selectedGroup);

  const handleSetAllAttendance = (value: 'check' | 'x' | 'unset') => {
    setAttendanceEntries(prev => {
      const next = { ...prev };
      displayedAttendanceStudents.forEach(s => {
        next[s.id] = value;
      });
      return next;
    });
  };

  const handleNextStep = () => {
    if (collabCol) {
      setFlowStep('collaboration');
    } else {
      handleFinalSave();
    }
  };

  // Collaboration Handlers
  const handleSelectAllCollab = () => {
    setSelectedCollabStudentIds(new Set(students.map(s => s.id)));
  };

  const handleClearCollabSelection = () => {
    setSelectedCollabStudentIds(new Set());
  };

  const handleToggleCollabStudent = (studentId: string) => {
    setSelectedCollabStudentIds(prev => {
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
    if (selectedCollabStudentIds.size === 0) return;

    setCollabSessionEntries(prev => {
      const next = { ...prev };
      selectedCollabStudentIds.forEach(id => {
        next[id] = { value: type, note: noteText };
      });
      return next;
    });

    setSelectedCollabStudentIds(new Set());
  };

  const handleAssignCustom = (type: '+' | '-' | '~') => {
    if (!collabCustomNote.trim()) return;
    handleAssignComment(type, collabCustomNote.trim());
    setCollabCustomNote('');
  };

  const handleRemoveCollabEntry = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollabSessionEntries(prev => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const handleFinalSave = () => {
    const dataToSave: any = {};

    // 1. Process Attendance
    if (presenceCol && flowStep !== 'setup') {
      const filteredAttendance: Record<string, 'check' | 'x'> = {};
      Object.entries(attendanceEntries).forEach(([id, val]) => {
        if (val !== 'unset') {
          filteredAttendance[id] = val as 'check' | 'x';
        }
      });

      if (Object.keys(filteredAttendance).length > 0) {
        dataToSave.attendance = {
          columnId: presenceCol.id,
          date: attendanceDate,
          hours: attendanceHours,
          entries: filteredAttendance
        };
      }
    }

    // 2. Process Collaboration
    if (collabCol && Object.keys(collabSessionEntries).length > 0) {
      const updates = Object.entries(collabSessionEntries).map(([studentId, entry]) => ({
        studentId,
        value: entry.value,
        note: entry.note
      }));

      dataToSave.collaboration = {
        columnId: collabCol.id,
        date: collabDate,
        updates
      };
    }

    onSave(dataToSave);
  };

  const plusComments = predefinedComments.filter(c => c.type === '+');
  const neutralComments = predefinedComments.filter(c => c.type === '~');
  const minusComments = predefinedComments.filter(c => c.type === '-');

  return (
    <div className="modal-overlay">
      <div className="modal-card collaboration-modal expanded" style={{ maxWidth: '1200px', width: '95%' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={20} className="text-primary-color" style={{ color: 'var(--primary-color)' }} />
          <h2 className="modal-title" style={{ margin: 0 }}>Schnelleingabe</h2>
          <button className="btn-icon" onClick={onClose} style={{ marginLeft: 'auto' }}><X size={20} /></button>
        </div>

        <div className="modal-body p-8" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          
          {/* STEP 0: EMPTY STATE */}
          {flowStep === 'empty' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                Es sind keine aktiven Anwesenheits- oder Mitarbeitsspalten in dieser Gruppe vorhanden.
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Fügen Sie diese bitte zuerst über das Aktionsmenü "Beurteilungsspalte hinzufügen" hinzu.
              </p>
            </div>
          )}

          {/* STEP 1: ATTENDANCE SETUP */}
          {flowStep === 'setup' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-main)' }}>
                Schritt 1: Anwesenheit - Voreinstellungen
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                Bitte legen Sie das Datum und die Anzahl der Unterrichtsstunden für die Anwesenheitserfassung fest.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', maxWidth: '500px' }}>
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stunden</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 4].map(h => (
                      <button 
                        key={h} 
                        type="button"
                        className={`btn-secondary btn-xs ${attendanceHours === h ? 'active-btn' : ''}`}
                        style={attendanceHours === h ? { backgroundColor: 'var(--primary-color)', color: 'white', borderColor: 'var(--primary-color)' } : { padding: '4px 12px' }}
                        onClick={() => setAttendanceHours(h)}
                      >
                        {h} Std.
                      </button>
                    ))}
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: '60px', padding: '4px 8px' }}
                      value={attendanceHours}
                      onChange={(e) => setAttendanceHours(Number(e.target.value))}
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ATTENDANCE ENTRY */}
          {flowStep === 'attendance' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>
                  Anwesenheit für <strong>{attendanceDate.split('-').reverse().join('.')}</strong> | <strong>{attendanceHours} Std.</strong>
                </div>
                <button 
                  type="button" 
                  className="btn-secondary btn-xs" 
                  onClick={() => setFlowStep('setup')}
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
                  Klicken Sie auf die Schülerzeilen, um zwischen Anwesend (Häkchen), Abwesend (X) und Nicht gesetzt zu wechseln.
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

              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <th style={{ width: '50px' }}>Nr.</th>
                      <th>Schüler</th>
                      <th className="text-center" style={{ width: '120px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedAttendanceStudents.map((student, index) => (
                      <tr key={student.id} onClick={() => toggleAttendance(student.id)} style={{ cursor: 'pointer' }}>
                        <td>{index + 1}</td>
                        <td style={{ fontSize: '13px' }}>{student.lastName}, {student.firstName}</td>
                        <td className="text-center" style={{ display: 'flex', justifyContent: 'center' }}>
                          <div className={`presence-toggle ${attendanceEntries[student.id]}`}>
                            {attendanceEntries[student.id] === 'check' && <Check size={20} className="icon-present" />}
                            {attendanceEntries[student.id] === 'x' && <X size={20} className="icon-absent" />}
                            {attendanceEntries[student.id] === 'unset' && <span style={{ fontSize: '12px' }}>-</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: COLLABORATION ENTRY */}
          {flowStep === 'collaboration' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                  Schritt {presenceCol ? '2' : '1'}: Mitarbeit Schnellerfassung
                </h3>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px', whiteSpace: 'nowrap', margin: 0 }}>Datum:</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    style={{ padding: '4px 8px', width: '140px', fontSize: '12px' }}
                    value={collabDate} 
                    onChange={(e) => setCollabDate(e.target.value)} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
                
                {/* LINKE SPALTE: Schülerliste */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                      Schüler auswählen ({selectedCollabStudentIds.size} markiert)
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="btn-secondary btn-xs" 
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={handleSelectAllCollab}
                      >
                        Alle
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary btn-xs" 
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                        onClick={handleClearCollabSelection}
                      >
                        Keine
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white' }}>
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <th style={{ width: '40px', textAlign: 'center' }}>Sel.</th>
                          <th>Schüler</th>
                          <th style={{ width: '150px' }}>Aktuelle Erfassung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => {
                          const isSelected = selectedCollabStudentIds.has(student.id);
                          const entry = collabSessionEntries[student.id];
                          return (
                            <tr 
                              key={student.id} 
                              onClick={() => handleToggleCollabStudent(student.id)}
                              style={{ cursor: 'pointer', backgroundColor: isSelected ? '#eff6ff' : 'transparent' }}
                            >
                              <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => handleToggleCollabStudent(student.id)}
                                />
                              </td>
                              <td style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 400 }}>
                                {student.lastName}, {student.firstName}
                              </td>
                              <td>
                                {entry ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                    <span className={`badge ${entry.value === '+' ? 'badge-success' : entry.value === '-' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '11px', padding: '2px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }}>
                                      {entry.value} {entry.note}
                                    </span>
                                    <button 
                                      type="button" 
                                      className="btn-icon" 
                                      onClick={(e) => handleRemoveCollabEntry(student.id, e)}
                                      style={{ padding: '2px', color: 'var(--danger-color)' }}
                                      title="Eintrag entfernen"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#cbd5e1', fontSize: '12px' }}>-</span>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Vordefinierte Kommentare */}
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px', color: 'var(--text-main)' }}>
                      Vorgefertigte Kommentare zuweisen
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      {/* Plus Kommentare */}
                      <div style={{ border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(34, 197, 94, 0.02)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--success-color)', marginBottom: '6px', textTransform: 'uppercase' }}>Plus (+)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {plusComments.length === 0 ? (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Keine Kommentare</span>
                          ) : (
                            plusComments.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                className="btn-secondary btn-xs hover-success"
                                style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '4px 6px', fontSize: '10px', borderColor: 'rgba(34, 197, 94, 0.1)', backgroundColor: 'white' }}
                                onClick={() => handleAssignComment('+', c.text)}
                                disabled={selectedCollabStudentIds.size === 0}
                              >
                                {c.text}
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Neutral Kommentare */}
                      <div style={{ border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(245, 158, 11, 0.02)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--warning-color)', marginBottom: '6px', textTransform: 'uppercase' }}>Neutral (~)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {neutralComments.length === 0 ? (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Keine Kommentare</span>
                          ) : (
                            neutralComments.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                className="btn-secondary btn-xs hover-warning"
                                style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '4px 6px', fontSize: '10px', borderColor: 'rgba(245, 158, 11, 0.1)', backgroundColor: 'white' }}
                                onClick={() => handleAssignComment('~', c.text)}
                                disabled={selectedCollabStudentIds.size === 0}
                              >
                                {c.text}
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Minus Kommentare */}
                      <div style={{ border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.02)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--danger-color)', marginBottom: '6px', textTransform: 'uppercase' }}>Minus (-)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {minusComments.length === 0 ? (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Keine Kommentare</span>
                          ) : (
                            minusComments.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                className="btn-secondary btn-xs hover-danger"
                                style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', padding: '4px 6px', fontSize: '10px', borderColor: 'rgba(239, 68, 68, 0.1)', backgroundColor: 'white' }}
                                onClick={() => handleAssignComment('-', c.text)}
                                disabled={selectedCollabStudentIds.size === 0}
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
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', backgroundColor: 'white' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--text-main)' }}>
                      Benutzerdefinierter Kommentar
                    </span>
                    
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Eigener Kommentartext..."
                      style={{ marginBottom: '8px', fontSize: '11px', padding: '4px 8px' }}
                      value={collabCustomNote}
                      onChange={(e) => setCollabCustomNote(e.target.value)}
                    />

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        type="button" 
                        className="btn-secondary btn-xs" 
                        style={{ flex: 1, padding: '4px 6px', fontSize: '11px', color: 'var(--success-color)', borderColor: 'rgba(34, 197, 94, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}
                        onClick={() => handleAssignCustom('+')}
                        disabled={selectedCollabStudentIds.size === 0 || !collabCustomNote.trim()}
                      >
                        <Plus size={12} /> Plus
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary btn-xs" 
                        style={{ flex: 1, padding: '4px 6px', fontSize: '11px', color: 'var(--warning-color)', borderColor: 'rgba(245, 158, 11, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}
                        onClick={() => handleAssignCustom('~')}
                        disabled={selectedCollabStudentIds.size === 0 || !collabCustomNote.trim()}
                      >
                        ~ Neut.
                      </button>
                      <button 
                        type="button" 
                        className="btn-secondary btn-xs" 
                        style={{ flex: 1, padding: '4px 6px', fontSize: '11px', color: 'var(--danger-color)', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2px' }}
                        onClick={() => handleAssignCustom('-')}
                        disabled={selectedCollabStudentIds.size === 0 || !collabCustomNote.trim()}
                      >
                        <Minus size={12} /> Minus
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>

        <div className="modal-footer">
          {/* Back Button */}
          {flowStep === 'attendance' && presenceCol && (
            <button className="btn-secondary" onClick={() => setFlowStep('setup')} style={{ marginRight: 'auto' }}>
              <ArrowLeft size={16} /> Zurück
            </button>
          )}
          {flowStep === 'collaboration' && presenceCol && (
            <button className="btn-secondary" onClick={() => setFlowStep('attendance')} style={{ marginRight: 'auto' }}>
              <ArrowLeft size={16} /> Zurück zur Anwesenheit
            </button>
          )}

          {/* Cancel Button */}
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>

          {/* Action Button */}
          {flowStep === 'setup' && (
            <button 
              className="btn-primary" 
              onClick={() => setFlowStep('attendance')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
              disabled={!attendanceDate || attendanceHours < 1}
            >
              Weiter zur Schülerliste <ArrowRight size={18} />
            </button>
          )}

          {flowStep === 'attendance' && (
            <button 
              className="btn-primary" 
              onClick={handleNextStep}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
              disabled={Object.values(attendanceEntries).every(v => v === 'unset')}
            >
              {collabCol ? (
                <>Weiter zur Mitarbeit <ArrowRight size={18} /></>
              ) : (
                <><Save size={18} /> Speichern</>
              )}
            </button>
          )}

          {flowStep === 'collaboration' && (
            <button 
              className="btn-primary" 
              onClick={handleFinalSave}
              disabled={Object.keys(collabSessionEntries).length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
            >
              <Save size={18} /> Speichern
            </button>
          )}

          {flowStep === 'empty' && (
            <button className="btn-primary" onClick={onClose}>Schließen</button>
          )}
        </div>
      </div>
    </div>
  );
};
