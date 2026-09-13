import React, { useState, useEffect } from 'react';
import { X, Check, CheckCircle2, Sparkles, RefreshCw, Trophy, AlertTriangle } from 'lucide-react';
import type { Course, Student } from '../schema';

interface ADDialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  students: Student[];
  onSaveAttendance?: (date: string, hours: number, attendance: Record<string, 'check' | 'x'>) => Promise<void>;
}

export const ADDialogModal: React.FC<ADDialogModalProps> = ({
  isOpen,
  onClose,
  course,
  students,
  onSaveAttendance
}) => {
  const [phase, setPhase] = useState<'attendance' | 'rolling' | 'winner'>('attendance');
  const [attendance, setAttendance] = useState<Record<string, 'check' | 'x'>>({});
  const [date] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Rolling & Winner states
  const [currentDisplayStudent, setCurrentDisplayStudent] = useState<{ student: Student; numberIndex: number } | null>(null);
  const [winner, setWinner] = useState<{ student: Student; numberIndex: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const enrolledStudentIds = course.enrolledStudents || [];
  const activeStudents = students
    .filter(s => enrolledStudentIds.includes(s.id) && !course.deregisteredStudents?.includes(s.id));

  // Initialize attendance (default: all present)
  useEffect(() => {
    if (isOpen) {
      setPhase('attendance');
      setWinner(null);
      setCurrentDisplayStudent(null);
      setIsSaving(false);

      const initial: Record<string, 'check' | 'x'> = {};
      activeStudents.forEach(s => {
        initial[s.id] = 'check';
      });
      setAttendance(initial);
    }
  }, [isOpen, course, students]);

  if (!isOpen) return null;

  const toggleStudentAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'check' ? 'x' : 'check'
    }));
  };

  const setAllAttendance = (status: 'check' | 'x') => {
    const updated: Record<string, 'check' | 'x'> = {};
    activeStudents.forEach(s => {
      updated[s.id] = status;
    });
    setAttendance(updated);
  };

  const presentStudentsWithNumbers = activeStudents
    .map((student, idx) => ({ student, numberIndex: idx + 1 }))
    .filter(item => attendance[item.student.id] === 'check');

  const startRollAnimation = (candidates: { student: Student; numberIndex: number }[]) => {
    if (candidates.length === 0) return;

    setPhase('rolling');
    setWinner(null);

    // Random winner pick
    const selectedWinner = candidates[Math.floor(Math.random() * candidates.length)];

    let speed = 40; // Initial fast cycle speed in ms
    let iterations = 0;
    const maxFastIterations = 35;

    const rollStep = () => {
      iterations++;
      // Pick random candidate to display while rolling
      const tempDisplay = candidates[Math.floor(Math.random() * candidates.length)];
      setCurrentDisplayStudent(tempDisplay);

      if (iterations < maxFastIterations) {
        setTimeout(rollStep, speed);
      } else if (iterations < maxFastIterations + 15) {
        // Slow down phase
        speed += 25;
        setTimeout(rollStep, speed);
      } else {
        // Final winner reveal
        setCurrentDisplayStudent(selectedWinner);
        setWinner(selectedWinner);
        setPhase('winner');
      }
    };

    rollStep();
  };

  const handleSaveAndStartRoll = async () => {
    setIsSaving(true);
    try {
      if (onSaveAttendance) {
        await onSaveAttendance(date, 1, attendance);
      }
    } catch (err) {
      console.error("Fehler beim Speichern der Anwesenheit:", err);
    } finally {
      setIsSaving(false);
      startRollAnimation(presentStudentsWithNumbers);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div 
        className="modal-card" 
        style={{ 
          maxWidth: phase === 'attendance' ? '640px' : '560px', 
          borderRadius: '20px', 
          overflow: 'hidden',
          boxShadow: phase !== 'attendance' ? '0 20px 60px rgba(234, 179, 8, 0.25)' : undefined,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '18px 24px', 
            background: phase !== 'attendance' ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)' : 'var(--bg-secondary)', 
            color: phase !== 'attendance' ? 'white' : 'var(--text-primary)',
            borderBottom: '1px solid var(--border-color)' 
          }}
        >
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            {phase === 'attendance' ? (
              <>
                <CheckCircle2 size={22} color="var(--primary-color)" /> 
                Anwesenheit & Zufalls-Erfassung (A & D) – {course.name}
              </>
            ) : (
              <>
                <Sparkles size={22} color="#f59e0b" />
                Zufallsgenerator – {course.name}
              </>
            )}
          </h3>
          <button 
            className="btn-icon" 
            onClick={onClose} 
            style={{ color: phase !== 'attendance' ? 'white' : undefined }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          
          {phase === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Quick Actions Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Schnellauswahl für {activeStudents.length} Schüler:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary btn-sm"
                    onClick={() => setAllAttendance('check')}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    <Check size={14} color="#16a34a" /> Alle Anwesend
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary btn-sm"
                    onClick={() => setAllAttendance('x')}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    <X size={14} color="#dc2626" /> Alle Abwesend
                  </button>
                </div>
              </div>

              {/* Student Attendance List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeStudents.map((s, index) => {
                  const isPresent = attendance[s.id] === 'check';
                  const registerNumber = index + 1;

                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleStudentAttendance(s.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: isPresent ? '#bbf7d0' : '#fecdd3',
                        backgroundColor: isPresent ? 'rgba(240, 253, 244, 0.7)' : 'rgba(255, 241, 242, 0.7)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          background: isPresent ? '#16a34a' : '#dc2626', 
                          color: 'white', 
                          fontSize: '12px', 
                          fontWeight: 'bold', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          #{registerNumber}
                        </span>

                        {s.photoBase64 && (
                          <img 
                            src={s.photoBase64} 
                            alt={`${s.firstName} ${s.lastName}`} 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                          />
                        )}

                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                            {s.lastName}, {s.firstName}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '13px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: isPresent ? '#16a34a' : '#dc2626',
                          color: 'white',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isPresent ? <><Check size={16} /> Anwesend</> : <><X size={16} /> Abwesend</>}
                      </button>
                    </div>
                  );
                })}
              </div>

              {presentStudentsWithNumbers.length === 0 && (
                <div style={{ padding: '16px', borderRadius: '12px', background: '#fffbe0', border: '1px solid #fef08a', color: '#854d0e', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} /> Achtung: Es ist kein Schüler als anwesend markiert. Bitte mindestens einen Schüler anwesend melden.
                </div>
              )}
            </div>
          )}

          {/* Phase 2: Spectacular Lotto/Slot Roller */}
          {(phase === 'rolling' || phase === 'winner') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 10px', textAlign: 'center' }}>
              
              {/* Animated Slot Container */}
              <div 
                style={{ 
                  width: '100%',
                  maxWidth: '380px',
                  background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)',
                  borderRadius: '24px',
                  padding: '30px 20px',
                  border: phase === 'winner' ? '4px solid #f59e0b' : '4px solid #6366f1',
                  boxShadow: phase === 'winner' 
                    ? '0 0 40px rgba(245, 158, 11, 0.6), inset 0 0 20px rgba(245, 158, 11, 0.4)' 
                    : '0 0 30px rgba(99, 102, 241, 0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* Glow Background Pulse */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: phase === 'winner' 
                    ? 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 60%)' 
                    : 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%)',
                  pointerEvents: 'none',
                  animation: phase === 'rolling' ? 'pulse 0.5s infinite alternate' : 'none'
                }} />

                {/* Big Roll Number Display */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: phase === 'winner' ? '#fbbf24' : '#a5b4fc', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                    {phase === 'rolling' ? '🎰 ZIEHUNG LÄUFT...' : '🏆 GEZOGENER SCHÜLER'}
                  </div>

                  <div style={{ 
                    fontSize: '64px', 
                    fontWeight: 900, 
                    color: phase === 'winner' ? '#fef08a' : '#ffffff', 
                    fontFamily: 'monospace',
                    textShadow: phase === 'winner' ? '0 0 20px rgba(245, 158, 11, 0.8)' : '0 0 10px rgba(255,255,255,0.5)',
                    transform: phase === 'winner' ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}>
                    #{currentDisplayStudent?.numberIndex || 1}
                  </div>

                  {/* Student Name Display */}
                  <div style={{ marginTop: '16px', minHeight: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {currentDisplayStudent?.student.photoBase64 && (
                      <img 
                        src={currentDisplayStudent.student.photoBase64} 
                        alt="Profilbild" 
                        style={{ 
                          width: '64px', 
                          height: '64px', 
                          borderRadius: '50%', 
                          objectFit: 'cover', 
                          border: phase === 'winner' ? '3px solid #f59e0b' : '2px solid #a5b4fc',
                          marginBottom: '10px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                        }} 
                      />
                    )}
                    
                    <h4 style={{ 
                      margin: 0, 
                      fontSize: '22px', 
                      fontWeight: 800, 
                      color: phase === 'winner' ? '#ffffff' : '#e0e7ff',
                      filter: phase === 'rolling' ? 'blur(0.5px)' : 'none'
                    }}>
                      {currentDisplayStudent?.student.lastName}, {currentDisplayStudent?.student.firstName}
                    </h4>

                    <span style={{ fontSize: '13px', color: phase === 'winner' ? '#fde047' : '#93c5fd', marginTop: '4px', fontWeight: 600 }}>
                      Klassenbuchnummer #{currentDisplayStudent?.numberIndex}
                    </span>
                  </div>
                </div>
              </div>

              {/* Winner Banner */}
              {phase === 'winner' && winner && (
                <div style={{ 
                  marginTop: '20px', 
                  padding: '12px 24px', 
                  background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', 
                  color: 'white', 
                  borderRadius: '30px', 
                  fontWeight: 800, 
                  fontSize: '15px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)',
                  animation: 'bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                  <Trophy size={18} /> Ausgewählt für Stundenwiederholung / Moderation!
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {phase === 'attendance' ? (
            <>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
                Abbrechen
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleSaveAndStartRoll} 
                disabled={isSaving || presentStudentsWithNumbers.length === 0}
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', width: 'auto', marginTop: 0 }}
              >
                {isSaving ? 'Speichere...' : `Anwesenheit speichern & Generator starten 🎲 (${presentStudentsWithNumbers.length})`}
              </button>
            </>
          ) : (
            <>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setPhase('attendance')}
                disabled={phase === 'rolling'}
              >
                ← Zurück zur Anwesenheit
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => startRollAnimation(presentStudentsWithNumbers)}
                  disabled={phase === 'rolling'}
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', width: 'auto', marginTop: 0 }}
                >
                  <RefreshCw size={16} /> Erneut drehen
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={onClose}
                  disabled={phase === 'rolling'}
                >
                  Schließen
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
