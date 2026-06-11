// src/components/TrendSettingsModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, TrendingUp, Info, Lock, Unlock } from 'lucide-react';
import { calculateAverage } from '../lib/averageCalculator';
import { firebaseService } from '../services/firebaseService';
import type { CourseEntry, Student, Grade } from '../schema';

export interface TrendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: CourseEntry[];
  students: Student[];
  grades: Record<string, Record<string, Grade>>;
  courseId: string;
  roundingRule: 'commercial' | 'studentFriendly';
  onSave: (updatedCols: CourseEntry[], roundingRule: 'commercial' | 'studentFriendly') => void;
  showDialog: (config: any) => void;
}

export const TrendSettingsModal = ({ 
  isOpen, 
  onClose, 
  columns, 
  students, 
  grades, 
  courseId,
  roundingRule,
  onSave,
  showDialog
}: TrendSettingsModalProps) => {
  const [localColumns, setLocalColumns] = useState<CourseEntry[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localRoundingRule, setLocalRoundingRule] = useState<'commercial' | 'studentFriendly'>(roundingRule);
  const [lockedColIds, setLockedColIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      const active = columns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
      const total = active.reduce((sum, c) => sum + (c.calcFactor || 0), 0);
      
      let initialCols = [...columns];
      if (total > 0 && total !== 100) {
        initialCols = columns.map(c => {
          if (c.calc && active.find(a => a.id === c.id)) {
            return { ...c, calcFactor: Math.round((c.calcFactor / total) * 100) };
          }
          return c;
        });
      } else if (total === 0 && active.length > 0) {
        const share = Math.floor(100 / active.length);
        initialCols = columns.map(c => {
          if (c.calc && active.find(a => a.id === c.id)) {
            return { ...c, calcFactor: share };
          }
          return c;
        });
      }
      setLocalColumns(initialCols);
      setNewMilestoneTitle('');
      setLocalRoundingRule(roundingRule);
      
      const initialLocks: Record<string, boolean> = {};
      initialCols.forEach(c => {
        if (c.isLocked && c.calc) {
          initialLocks[c.id] = true;
        }
      });
      setLockedColIds(initialLocks);
    }
  }, [isOpen, columns, roundingRule]);

  if (!isOpen) return null;

  const normalize = (cols: CourseEntry[], changedId: string, currentLocks: Record<string, boolean>) => {
    const active = cols.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
    if (active.length === 0) return cols;
    if (active.length === 1 && active[0].id === changedId) {
      return cols.map(c => c.id === changedId ? { ...c, calcFactor: 100 } : c);
    }

    const changedCol = active.find(c => c.id === changedId);
    if (!changedCol) {
      // Column was toggled OFF
      const activeLocked = active.filter(c => currentLocks[c.id]);
      const sumLocked = activeLocked.reduce((sum, c) => sum + c.calcFactor, 0);
      const remaining = Math.max(0, 100 - sumLocked);
      const activeUnlocked = active.filter(c => !currentLocks[c.id]);
      
      if (activeUnlocked.length > 0) {
        const activeUnlockedSum = activeUnlocked.reduce((sum, c) => sum + c.calcFactor, 0);
        let result = cols.map(c => {
          if (c.calc && !currentLocks[c.id]) {
            if (activeUnlockedSum > 0) {
              return { ...c, calcFactor: Math.round((c.calcFactor / activeUnlockedSum) * remaining) };
            } else {
              return { ...c, calcFactor: Math.round(remaining / activeUnlocked.length) };
            }
          }
          return c;
        });
        
        // Clean up rounding diff
        const finalActive = result.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
        const finalTotal = finalActive.reduce((sum, c) => sum + c.calcFactor, 0);
        const diff = 100 - finalTotal;
        if (diff !== 0 && activeUnlocked.length > 0) {
          const lastUnlocked = [...activeUnlocked].reverse()[0];
          result = result.map(c => c.id === lastUnlocked.id ? { ...c, calcFactor: Math.max(0, c.calcFactor + diff) } : c);
        }
        return result;
      } else {
        // All remaining active columns are locked. Clear locks and distribute equally
        const share = Math.floor(100 / active.length);
        let result = cols.map(c => c.calc ? { ...c, calcFactor: share } : c);
        const finalTotal = result.filter(c => c.calc).reduce((sum, c) => sum + c.calcFactor, 0);
        const diff = 100 - finalTotal;
        if (diff !== 0 && active.length > 0) {
          result = result.map(c => c.id === active[0].id ? { ...c, calcFactor: c.calcFactor + diff } : c);
        }
        return result;
      }
    }

    // A column was dragged
    const activeLocked = active.filter(c => c.id !== changedId && currentLocks[c.id]);
    const sumLocked = activeLocked.reduce((sum, c) => sum + c.calcFactor, 0);

    const maxAllowedVal = Math.max(0, 100 - sumLocked);
    const cappedVal = Math.max(0, Math.min(changedCol.calcFactor, maxAllowedVal));

    let updatedCols = cols.map(c => c.id === changedId ? { ...c, calcFactor: cappedVal } : c);
    const remaining = 100 - cappedVal - sumLocked;
    const othersUnlocked = active.filter(c => c.id !== changedId && !currentLocks[c.id]);

    if (othersUnlocked.length > 0) {
      const othersUnlockedSum = othersUnlocked.reduce((sum, c) => sum + c.calcFactor, 0);
      let result = updatedCols.map(c => {
        if (c.id !== changedId && c.calc && !currentLocks[c.id]) {
          if (othersUnlockedSum > 0) {
            return { ...c, calcFactor: Math.round((c.calcFactor / othersUnlockedSum) * remaining) };
          } else {
            return { ...c, calcFactor: Math.round(remaining / othersUnlocked.length) };
          }
        }
        return c;
      });

      // Clean up rounding diff
      const finalActive = result.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
      const finalTotal = finalActive.reduce((sum, c) => sum + c.calcFactor, 0);
      const diff = 100 - finalTotal;

      if (diff !== 0) {
        const lastUnlocked = [...othersUnlocked].reverse()[0];
        result = result.map(c => c.id === lastUnlocked.id ? { ...c, calcFactor: Math.max(0, c.calcFactor + diff) } : c);
      }
      return result;
    } else {
      return updatedCols;
    }
  };

  const handleCreateSnapshot = async () => {
    if (!newMilestoneTitle.trim()) {
      showDialog({
        title: 'Titel fehlt',
        message: 'Bitte geben Sie einen Titel für den neuen Meilenstein ein.',
        type: 'warning',
        isAlert: true
      });
      return;
    }

    setIsProcessing(true);
    try {
      const newColumnId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Date.now().toString(36) + Math.random().toString(36).substring(2);

      const newMilestone: CourseEntry = {
        id: newColumnId,
        title: newMilestoneTitle,
        type: 'calculated',
        date: new Date().toISOString().split('T')[0],
        cutoffDate: new Date().toISOString().split('T')[0],
        calc: false,
        calcFactor: 0,
        calcType: 'grade',
        priority: Date.now(),
        isVisible: true
      };

      // 1. Spalten-Array aktualisieren und Locks mitspeichern
      const sanitizedLocalCols = localColumns.map(c => ({
        ...c,
        isLocked: c.calc ? !!lockedColIds[c.id] : false
      }));
      const updatedColumns = [...sanitizedLocalCols, newMilestone];
      await firebaseService.updateCourseColumns(courseId, updatedColumns);

      // 2. Noten für alle Schüler generieren (Snapshot)
      const updates = students.map(student => {
        const trend = calculateAverage(student.id, localColumns, grades, undefined, localRoundingRule);
        return {
          studentId: student.id,
          columnId: newColumnId,
          grade: {
            value: trend.grade || '',
            date: new Date().toISOString(),
            isOverridden: true
          }
        };
      });

      await firebaseService.bulkUpdateGrades(courseId, updates);
      
      showDialog({
        title: 'Erfolgreich',
        message: 'Neuer Meilenstein erfolgreich erstellt!',
        type: 'success',
        isAlert: true
      });
      onSave(updatedColumns, localRoundingRule); // Triggert Update in der Matrix
      onClose();
    } catch (err) {
      console.error("Fehler beim Erstellen des Snapshots:", err);
      showDialog({
        title: 'Fehler',
        message: 'Fehler beim Speichern der Daten.',
        type: 'danger',
        isAlert: true
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggle = (id: string) => {
    const turningOff = localColumns.find(c => c.id === id)?.calc;
    const nextLocks = { ...lockedColIds };
    if (turningOff) {
      delete nextLocks[id];
      setLockedColIds(nextLocks);
    }

    const nextCols = localColumns.map(c => {
      if (c.id === id) {
        const isTurningOn = !c.calc;
        return { ...c, calc: isTurningOn, calcFactor: isTurningOn ? 0 : 0 };
      }
      return c;
    });
    setLocalColumns(normalize(nextCols, id, nextLocks));
  };

  const handleWeightChange = (id: string, val: number) => {
    const nextCols = localColumns.map(c => c.id === id ? { ...c, calcFactor: val } : c);
    setLocalColumns(normalize(nextCols, id, lockedColIds));
  };

  const handleToggleLock = (id: string) => {
    const col = localColumns.find(c => c.id === id);
    if (!col || !col.calc) return;

    const isLocked = !lockedColIds[id];
    const nextLocks = { ...lockedColIds, [id]: isLocked };
    
    const active = localColumns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
    const lockedActive = active.filter(a => nextLocks[a.id]);
    
    if (lockedActive.length === active.length && active.length > 0) {
      showDialog({
        title: 'Aktion nicht möglich',
        message: 'Es muss mindestens ein Regler unfixiert bleiben, um Gewichtungen anpassen zu können.',
        type: 'warning',
        isAlert: true
      });
      return;
    }

    setLockedColIds(nextLocks);
    setLocalColumns(prevCols => prevCols.map(c => c.id === id ? { ...c, isLocked } : c));
  };

  const activeCount = localColumns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment').length;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card modal-large">
        <div className="modal-header">
          <h3>Trend-Konfiguration</h3>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>
        <div className="modal-body trend-settings-split-layout">
          <div className="trend-settings-left-col">
            <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>GEWICHTUNG (SUMME = 100%)</h4>
            <div className="weight-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {localColumns.filter(c => c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment').map(col => {
                const isLocked = !!lockedColIds[col.id];
                return (
                  <div key={col.id} className="weight-item" style={{ opacity: col.calc ? 1 : 0.55 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label className="switch sm">
                          <input type="checkbox" checked={col.calc} onChange={() => handleToggle(col.id)} />
                          <span className="slider"></span>
                        </label>
                        <span className="font-bold" style={{ fontSize: '13px' }}>{col.title}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="font-mono text-primary" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                          {col.calc ? `${col.calcFactor}%` : 'Inaktiv'}
                        </span>
                        
                        {col.calc && activeCount > 1 && (
                          <button 
                            type="button" 
                            className={`lock-btn ${isLocked ? 'active' : ''}`}
                            onClick={() => handleToggleLock(col.id)}
                            title={isLocked ? "Gewichtung entsperren" : "Gewichtung sperren (fixieren)"}
                          >
                            {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                          </button>
                        )}
                      </div>
                    </div>
                    {col.calc && (
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={col.calcFactor} 
                        onChange={e => handleWeightChange(col.id, parseInt(e.target.value))}
                        disabled={isLocked}
                        style={{ width: '100%', cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="trend-settings-right-col">
            {/* Rundungsregel */}
            <div className="rounding-section" style={{ marginTop: 0, paddingTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Info size={16} className="text-primary" />
                <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>GLOBALE RUNDUNGSREGEL</h4>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <select 
                  className="form-input" 
                  value={localRoundingRule}
                  onChange={e => setLocalRoundingRule(e.target.value as any)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }}
                >
                  <option value="commercial">Kaufmännisch (Standard)</option>
                  <option value="studentFriendly">Schülerfreundlich (Aufrunden)</option>
                </select>
                <p className="field-hint" style={{ marginTop: '6px' }}>
                  Beeinflusst, wie der Live-Trend und Meilenstein-Vorschläge berechnet werden.
                </p>
              </div>
            </div>

            {/* Snapshot */}
            <div className="snapshot-section" style={{ marginTop: 0, paddingTop: '24px', borderTop: '2px dashed var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <TrendingUp size={16} className="text-primary" />
                <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>SNAPSHOT ERSTELLEN</h4>
              </div>
              <p className="field-hint" style={{ marginBottom: '12px' }}>
                Erstellt eine neue Spalte (Meilenstein) mit den aktuell berechneten Trend-Werten.
              </p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  className="form-input" 
                  style={{ flex: 1, padding: '8px 10px', fontSize: '13px' }}
                  placeholder="Titel, z.B. Semester-Note"
                  value={newMilestoneTitle}
                  onChange={e => setNewMilestoneTitle(e.target.value)}
                />
                <button 
                  className="btn-secondary" 
                  style={{ whiteSpace: 'nowrap', fontSize: '12px', padding: '8px 16px' }}
                  onClick={handleCreateSnapshot}
                  disabled={isProcessing || !newMilestoneTitle.trim()}
                >
                  {isProcessing ? 'Verarbeite...' : 'Snapshot erstellen'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary" 
            onClick={() => {
              const sanitizedCols = localColumns.map(c => ({
                ...c,
                isLocked: c.calc ? !!lockedColIds[c.id] : false
              }));
              onSave(sanitizedCols, localRoundingRule);
            }} 
            disabled={isProcessing}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
