// src/components/EvaluationEntryModal.tsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, ClipboardList } from 'lucide-react';
import type { CourseEntry, Grade } from '../schema';

interface EvaluationEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  column: CourseEntry;
  grade?: Grade;
  onSave: (
    reachedPoints: Record<string, number>, 
    totalPoints: number, 
    percentage: number, 
    calculatedGrade: number
  ) => void;
}

export const EvaluationEntryModal = ({
  isOpen,
  onClose,
  studentName,
  column,
  grade,
  onSave
}: EvaluationEntryModalProps) => {
  const [reachedPoints, setReachedPoints] = useState<Record<string, number>>({});
  const subTasks = column.subTasks || [];
  const totalMaxPoints = subTasks.reduce((sum, t) => sum + (t.maxPoints || 0), 0);

  useEffect(() => {
    if (isOpen) {
      const initialPoints: Record<string, number> = {};
      subTasks.forEach(task => {
        initialPoints[task.id] = grade?.subTaskPoints?.[task.id] !== undefined
          ? grade.subTaskPoints[task.id]
          : 0;
      });
      setReachedPoints(initialPoints);
    }
  }, [isOpen, column, grade]);

  if (!isOpen) return null;

  const handlePointChange = (taskId: string, maxPoints: number, valueStr: string) => {
    let val = parseFloat(valueStr);
    if (isNaN(val)) val = 0;
    
    // Clamp between 0 and maxPoints
    val = Math.max(0, Math.min(val, maxPoints));

    setReachedPoints(prev => ({
      ...prev,
      [taskId]: val
    }));
  };

  const totalReachedPoints = subTasks.reduce((sum, t) => sum + (reachedPoints[t.id] || 0), 0);
  const percentage = totalMaxPoints > 0 ? (totalReachedPoints / totalMaxPoints) * 100 : 0;

  // Grade calculation based on grading key
  let calculatedGrade = 5;
  if (column.gradingKey) {
    const { grade1MinPoints, grade2MinPoints, grade3MinPoints, grade4MinPoints } = column.gradingKey;
    if (totalReachedPoints >= grade1MinPoints) calculatedGrade = 1;
    else if (totalReachedPoints >= grade2MinPoints) calculatedGrade = 2;
    else if (totalReachedPoints >= grade3MinPoints) calculatedGrade = 3;
    else if (totalReachedPoints >= grade4MinPoints) calculatedGrade = 4;
  }

  const handleConfirmSave = () => {
    onSave(
      reachedPoints, 
      totalReachedPoints, 
      Math.round(percentage * 10) / 10, 
      calculatedGrade
    );
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card modal-medium">
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0 }}>Punkte erfassen</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              {column.title} &bull; <strong>{studentName}</strong>
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body trend-settings-split-layout">
          {/* Linke Seite: Aufgaben-Liste */}
          <div className="trend-settings-left-col">
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>PUNKTE PRO AUFGABE</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {subTasks.map(task => {
                const max = task.maxPoints || 0;
                return (
                  <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div>
                      <span className="font-bold" style={{ fontSize: '14px' }}>{task.title}</span>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Maximum: {max} Pkt.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number"
                        className="form-input text-center"
                        style={{ width: '80px', padding: '6px' }}
                        min="0"
                        max={max}
                        step="0.5"
                        value={reachedPoints[task.id] ?? ''}
                        onChange={e => handlePointChange(task.id, max, e.target.value)}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)' }}>/ {max} Pkt.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rechte Seite: Berechnete Note */}
          <div className="trend-settings-right-col" style={{ paddingLeft: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ClipboardList size={16} className="text-primary" />
              <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>ERGEBNIS</h4>
            </div>

            <div className="summary-status" style={{ background: '#f0fdf4', padding: '16px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', color: '#166534', fontWeight: 'bold', marginBottom: '4px' }}>Berechnete Note:</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '36px', fontWeight: '800', color: '#15803d' }}>{calculatedGrade}</span>
                <span style={{ fontSize: '14px', color: '#166534', fontWeight: '500' }}>
                  ({percentage.toFixed(1)}%)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Erreichte Punkte:</span>
                <span className="font-bold">{totalReachedPoints.toFixed(1)} Pkt.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Maximale Punkte:</span>
                <span className="font-bold">{totalMaxPoints.toFixed(1)} Pkt.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Prozentwert:</span>
                <span className="font-bold text-primary">{percentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', marginTop: 0 }}
            onClick={handleConfirmSave}
          >
            <Save size={18} /> Speichern
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
