// src/components/TrendSettingsModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, TrendingUp, Info, Lock, Unlock, Scale, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';
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
  isTrendColorEnabled: boolean;
  collaborationCalcMode: 'linear' | 'weighted';
  showTrend?: boolean;
  initialTab?: 'layout' | 'trend';
  onSave: (
    updatedCols: CourseEntry[], 
    roundingRule: 'commercial' | 'studentFriendly',
    isTrendColorEnabled: boolean,
    collaborationCalcMode: 'linear' | 'weighted',
    showTrend: boolean
  ) => void;
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
  isTrendColorEnabled,
  collaborationCalcMode,
  showTrend,
  initialTab,
  onSave,
  showDialog
}: TrendSettingsModalProps) => {
  const [activeTab, setActiveTab] = useState<'layout' | 'trend'>('layout');
  const [localColumns, setLocalColumns] = useState<CourseEntry[]>([]);
  const [localShowTrend, setLocalShowTrend] = useState<boolean>(showTrend !== false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localRoundingRule, setLocalRoundingRule] = useState<'commercial' | 'studentFriendly'>(roundingRule);
  const [localIsTrendColorEnabled, setLocalIsTrendColorEnabled] = useState<boolean>(isTrendColorEnabled);
  const [localCollaborationCalcMode, setLocalCollaborationCalcMode] = useState<'linear' | 'weighted'>(collaborationCalcMode);
  const [lockedColIds, setLockedColIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'layout');
      setLocalShowTrend(showTrend !== false);
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
      setLocalIsTrendColorEnabled(isTrendColorEnabled);
      setLocalCollaborationCalcMode(collaborationCalcMode);
      
      const initialLocks: Record<string, boolean> = {};
      initialCols.forEach(c => {
        if (c.isLocked && c.calc) {
          initialLocks[c.id] = true;
        }
      });
      setLockedColIds(initialLocks);
    }
  }, [isOpen, columns, roundingRule, isTrendColorEnabled, collaborationCalcMode, showTrend]);

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

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const newCols = [...localColumns];
    if (direction === 'up' && index > 0) {
      [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
    } else if (direction === 'down' && index < newCols.length - 1) {
      [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
    }
    setLocalColumns(newCols);
  };

  const toggleVisibility = (id: string) => {
    setLocalColumns(prev => prev.map(col => 
      col.id === id ? { ...col, isVisible: col.isVisible === false ? true : false } : col
    ));
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
        const trend = calculateAverage(student.id, localColumns, grades, undefined, localRoundingRule, localCollaborationCalcMode);
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
      onSave(updatedColumns, localRoundingRule, localIsTrendColorEnabled, localCollaborationCalcMode, localShowTrend); // Triggert Update in der Matrix
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

  const handleSetEqualShare = (id: string) => {
    const col = localColumns.find(c => c.id === id);
    if (!col || !col.calc || lockedColIds[id]) return;

    const active = localColumns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
    const activeLocked = active.filter(a => lockedColIds[a.id]);
    const sumLocked = activeLocked.reduce((sum, c) => sum + c.calcFactor, 0);

    const remaining = Math.max(0, 100 - sumLocked);
    const activeUnlocked = active.filter(c => !lockedColIds[c.id]);
    
    if (activeUnlocked.length > 0) {
      const share = Math.round(remaining / activeUnlocked.length);
      const nextCols = localColumns.map(c => c.id === id ? { ...c, calcFactor: share } : c);
      setLocalColumns(normalize(nextCols, id, lockedColIds));
    }
  };

  const handleSetAllEqual = () => {
    const active = localColumns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment');
    const unlockedActive = active.filter(c => !lockedColIds[c.id]);
    
    if (unlockedActive.length === 0) return;
    
    const lockedActive = active.filter(c => lockedColIds[c.id]);
    const sumLocked = lockedActive.reduce((sum, c) => sum + c.calcFactor, 0);
    const remaining = Math.max(0, 100 - sumLocked);
    
    const share = Math.floor(remaining / unlockedActive.length);
    const remainder = remaining - (share * unlockedActive.length);
    
    let assignedCount = 0;
    const finalCols = localColumns.map(c => {
      if (c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment' && !lockedColIds[c.id]) {
        const factor = assignedCount === 0 ? share + remainder : share;
        assignedCount++;
        return { ...c, calcFactor: factor };
      }
      return c;
    });
    
    setLocalColumns(finalCols);
  };

  const activeCount = localColumns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment').length;
  const collabCol = localColumns.find(c => c.type === 'collaborationSum');
  const isCollabCalcActive = collabCol ? !!collabCol.calc : false;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card modal-large" style={{ maxWidth: '900px', width: '90%' }}>
        <div className="modal-header">
          <h3>Kurs-Einstellungen</h3>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 mt-2">
          <nav role="tablist" aria-label="Kurs-Konfigurationsebenen" className="custom-tablist">
            <button
              id="tab-layout"
              role="tab"
              type="button"
              aria-selected={activeTab === 'layout'}
              aria-controls="panel-layout"
              className="custom-tab-button"
              onClick={() => setActiveTab('layout')}
            >
              Spalten & Layout
            </button>
            <button
              id="tab-trend"
              role="tab"
              type="button"
              aria-selected={activeTab === 'trend'}
              aria-controls="panel-trend"
              className="custom-tab-button"
              onClick={() => setActiveTab('trend')}
            >
              Gewichtung & Trend
            </button>
          </nav>
        </div>

        {activeTab === 'layout' ? (
          /* Tab 1: Spalten & Layout */
          <section 
            id="panel-layout"
            role="tabpanel"
            aria-labelledby="tab-layout"
            className="modal-body p-6"
          >
            <div className="toggle-box" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <TrendingUp size={20} className="text-indigo-600" />
                <div>
                  <div className="option-label font-semibold text-base">Trend-Spalte anzeigen</div>
                  <div className="option-desc text-base text-muted">Sticky Auswertung am rechten Rand der Matrix einblenden</div>
                </div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={localShowTrend} 
                  onChange={() => setLocalShowTrend(!localShowTrend)} 
                />
                <span className="slider"></span>
              </label>
            </div>

            <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Ändern Sie hier die Reihenfolge der Spalten oder blenden Sie diese in der Matrix ein/aus.
            </p>

            <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center', fontSize: '16px' }}>Reihenfolge</th>
                    <th style={{ width: '60px', textAlign: 'center', fontSize: '16px' }}>Sichtbar</th>
                    <th style={{ fontSize: '16px' }}>Spaltenname</th>
                    <th style={{ fontSize: '16px' }}>Typ</th>
                  </tr>
                </thead>
                <tbody>
                  {localColumns.map((col, idx) => (
                    <tr key={col.id} style={{ opacity: col.isVisible === false ? 0.5 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button 
                            className="btn-icon btn-sm" 
                            onClick={() => moveColumn(idx, 'up')}
                            disabled={idx === 0}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button 
                            className="btn-icon btn-sm" 
                            onClick={() => moveColumn(idx, 'down')}
                            disabled={idx === localColumns.length - 1}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className={`btn-icon ${col.isVisible === false ? 'text-muted' : 'text-primary'}`}
                          onClick={() => toggleVisibility(col.id)}
                          title={col.isVisible === false ? "Einblenden" : "Ausblenden"}
                        >
                          {col.isVisible === false ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </td>
                      <td className="font-bold text-base">{col.title}</td>
                      <td style={{ fontSize: '16px' }} className="capitalize text-muted">{col.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          /* Tab 2: Gewichtung & Trend */
          <section 
            id="panel-trend"
            role="tabpanel"
            aria-labelledby="tab-trend"
            className="modal-body trend-settings-split-layout p-6"
          >
            <div className="trend-settings-left-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>GEWICHTUNG (SUMME = 100%)</h4>
                {localColumns.filter(c => c.calc && c.type !== 'calculated' && c.type !== 'presenceSum' && c.type !== 'groupAssignment').length > 1 && (
                  <button
                    type="button"
                    onClick={handleSetAllEqual}
                    className="btn-secondary btn-xs bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    style={{ fontSize: '16px', padding: '6px 12px', height: '28px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: 0 }}
                    title="Verteilt die verbleibende Gewichtung gleichmäßig auf alle unfixierten, aktiven Spalten"
                  >
                    <Scale size={12} />
                    <span>Alle gleich gewichten</span>
                  </button>
                )}
              </div>
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
                          <span className="font-bold" style={{ fontSize: '16px' }}>{col.title}</span>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="font-mono text-indigo-600" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {col.calc ? `${col.calcFactor}%` : 'Inaktiv'}
                          </span>
                          
                          {col.calc && activeCount > 1 && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {!isLocked && (
                                <button 
                                  type="button" 
                                  className="scale-btn"
                                  onClick={() => handleSetEqualShare(col.id)}
                                  title="Gewichtung auf Mittelwert der freien Anteile zentrieren (gleichverteilen)"
                                >
                                  <Scale size={12} />
                                </button>
                              )}
                              <button 
                                  type="button" 
                                  className={`lock-btn ${isLocked ? 'active' : ''}`}
                                  onClick={() => handleToggleLock(col.id)}
                                  title={isLocked ? "Gewichtung entsperren" : "Gewichtung sperren (fixieren)"}
                                >
                                  {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {col.calc && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                          <input 
                            type="range" 
                            min="0" max="100" 
                            value={col.calcFactor} 
                            onChange={e => handleWeightChange(col.id, parseInt(e.target.value) || 0)}
                            disabled={isLocked}
                            style={{ flex: 1, cursor: isLocked ? 'not-allowed' : 'pointer', height: '6px' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              value={col.calcFactor}
                              onChange={e => {
                                let v = parseInt(e.target.value, 10);
                                if (isNaN(v)) v = 0;
                                handleWeightChange(col.id, Math.max(0, Math.min(100, v)));
                              }}
                              disabled={isLocked}
                              className="form-input text-center"
                              style={{ 
                                width: '64px', 
                                padding: '4px 6px', 
                                fontSize: '16px', 
                                fontWeight: 'bold', 
                                height: '28px', 
                                cursor: isLocked ? 'not-allowed' : 'text' 
                              }}
                            />
                            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-muted)' }}>%</span>
                          </div>
                        </div>
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
                  <Info size={16} className="text-indigo-600" />
                  <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>GLOBALE RUNDUNGSREGEL</h4>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select 
                    className="form-input text-base" 
                    value={localRoundingRule}
                    onChange={e => setLocalRoundingRule(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '16px' }}
                  >
                    <option value="commercial">Kaufmännisch (Standard)</option>
                    <option value="studentFriendly">Schülerfreundlich (Aufrunden)</option>
                  </select>
                  <p className="field-hint text-base" style={{ marginTop: '6px' }}>
                    Beeinflusst, wie der Live-Trend und Meilenstein-Vorschläge berechnet werden.
                  </p>
                </div>
              </div>

              {/* Mitarbeits-Berechnungsmodus */}
              <div className="collaboration-mode-section" style={{ marginTop: 0, paddingTop: '24px', borderTop: '2px dashed var(--border-color)', opacity: isCollabCalcActive ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Info size={16} className="text-indigo-600" />
                  <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    MITARBEITS-BERECHNUNG {!isCollabCalcActive && ' (INAKTIV)'}
                  </h4>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select 
                    className="form-input text-base" 
                    value={localCollaborationCalcMode}
                    onChange={e => setLocalCollaborationCalcMode(e.target.value as any)}
                    disabled={!isCollabCalcActive}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '16px', cursor: isCollabCalcActive ? 'pointer' : 'not-allowed' }}
                  >
                    <option value="weighted">Als gesamte Mitarbeitsnote am Schluss einrechnen (Standard)</option>
                    <option value="linear">Linear mit der Zeit in den Trend einrechnen (nur bei Bedarf)</option>
                  </select>
                  <p className="field-hint text-base" style={{ marginTop: '6px' }}>
                    {isCollabCalcActive 
                      ? 'Legt fest, ob Mitarbeits-Einzelnoten chronologisch in den Trend einfließen oder die Mitarbeit als statische Gesamtnote gewichtet wird.'
                      : 'Die Mitarbeits-Spalte ist aktuell inaktiv oder nicht in der Berechnung enthalten.'}
                  </p>
                </div>
              </div>

              {/* Farbmodus (Heatmap) */}
              <div className="color-section" style={{ marginTop: 0, paddingTop: '24px', borderTop: '2px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Info size={16} className="text-indigo-600" />
                  <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>FARBMODUS (HEATMAP)</h4>
                </div>
                <div className="toggle-box" style={{ margin: 0, padding: '12px 16px' }}>
                  <div>
                    <div className="option-label text-base" style={{ fontSize: '16px' }}>Trend einfärben</div>
                    <div className="option-desc text-base text-muted" style={{ fontSize: '16px' }}>Zellen basierend auf Trendnote einfärben</div>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={localIsTrendColorEnabled} 
                      onChange={() => setLocalIsTrendColorEnabled(!localIsTrendColorEnabled)} 
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              {/* Snapshot */}
              <div className="snapshot-section" style={{ marginTop: 0, paddingTop: '24px', borderTop: '2px dashed var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <TrendingUp size={16} className="text-indigo-600" />
                  <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>SNAPSHOT ERSTELLEN</h4>
                </div>
                <p className="field-hint text-base" style={{ marginBottom: '12px' }}>
                  Erstellt eine neue Spalte (Meilenstein) mit den aktuell berechneten Trend-Werten.
                </p>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="form-input text-base" 
                    style={{ flex: 1, padding: '8px 10px', fontSize: '16px' }}
                    placeholder="Titel, z.B. Semester-Note"
                    value={newMilestoneTitle}
                    onChange={e => setNewMilestoneTitle(e.target.value)}
                  />
                  <button 
                    className="btn-secondary bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-base" 
                    style={{ whiteSpace: 'nowrap', fontSize: '16px', padding: '8px 16px' }}
                    onClick={handleCreateSnapshot}
                    disabled={isProcessing || !newMilestoneTitle.trim()}
                  >
                    {isProcessing ? 'Verarbeite...' : 'Snapshot erstellen'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary bg-indigo-600 hover:bg-indigo-700" 
            onClick={() => {
              const sanitizedCols = localColumns.map(c => ({
                ...c,
                isLocked: c.calc ? !!lockedColIds[c.id] : false
              }));
              onSave(sanitizedCols, localRoundingRule, localIsTrendColorEnabled, localCollaborationCalcMode, localShowTrend);
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
