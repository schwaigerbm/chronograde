// src/components/ManualEntryModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, Check, Trash2 } from 'lucide-react';
import type { CourseEntry } from '../schema';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  column: CourseEntry;
  currentValue?: string | number;
  isCalculated?: boolean;
  onSave: (val: string | number | null) => void;
}

export const ManualEntryModal = ({
  isOpen,
  onClose,
  studentName,
  column,
  currentValue,
  isCalculated,
  onSave
}: ManualEntryModalProps) => {
  const [val, setVal] = useState<string | number>('');

  useEffect(() => {
    if (isOpen) {
      setVal(currentValue !== undefined ? currentValue : '');
    }
  }, [isOpen, currentValue]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePercentRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetVal = Number(e.target.value);
    setVal(targetVal);
  };

  const handlePercentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setVal('');
      return;
    }
    let targetVal = parseInt(raw, 10);
    if (isNaN(targetVal)) targetVal = 0;
    // Clamp between 0 and 100
    targetVal = Math.max(0, Math.min(100, targetVal));
    setVal(targetVal);
  };

  const handleConfirmSave = () => {
    if (val === '') {
      onSave(null);
    } else {
      onSave(val);
    }
  };

  const handleDelete = () => {
    onSave(null);
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{studentName}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              {column.title} &bull; Bewertung eingeben
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}><XIcon size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {column.calcType === 'grade' && (
            <div className="manual-modal-options-list">
              {isCalculated && (
                <>
                  <button 
                    type="button" 
                    className={`manual-modal-option-btn auto-calc-btn ${val === '' ? 'active' : ''}`}
                    onClick={() => onSave(null)}
                  >
                    <span>Autom. Berechnung</span>
                    {val === '' && <Check size={16} />}
                  </button>
                  <div className="menu-divider" style={{ margin: '8px 0', borderBottom: '1px solid var(--border-color)' }}></div>
                </>
              )}
              {[
                { num: 1, label: '1-Sehr gut' },
                { num: 2, label: '2-Gut' },
                { num: 3, label: '3-Befriedigend' },
                { num: 4, label: '4-Genügend' },
                { num: 5, label: '5-Nicht Genügend' }
              ].map(g => (
                <button
                  key={g.num}
                  type="button"
                  className={`manual-modal-option-btn ${val == g.num ? 'active' : ''}`}
                  onClick={() => onSave(g.num)}
                >
                  <span>{g.label}</span>
                  {val == g.num && <Check size={16} />}
                </button>
              ))}
            </div>
          )}

          {column.calcType === 'percent' && (
            <div className="manual-modal-percent-container">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={val === '' ? 0 : Number(val)}
                  onChange={handlePercentRangeChange}
                  onMouseUp={handleConfirmSave}
                  onTouchEnd={handleConfirmSave}
                  className="range-input"
                  style={{ flex: 1, cursor: 'pointer', height: '6px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={val}
                    onChange={handlePercentInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmSave();
                    }}
                    className="form-input text-center"
                    style={{ width: '70px', padding: '6px 8px', fontSize: '15px', fontWeight: 'bold' }}
                    placeholder="-"
                  />
                  <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', marginRight: '4px' }}>%</span>
                  <button 
                    type="button"
                    className="btn-primary"
                    onClick={handleConfirmSave}
                    style={{ width: '36px', height: '36px', minWidth: '36px', padding: 0, marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                    title="Bestätigen & Speichern"
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>
              <div className="range-label" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Schieberegler loslassen oder Enter drücken zum Speichern
              </div>
            </div>
          )}

          {column.calcType === 'sign' && (
            <div className="manual-modal-sign-container">
              {['+', '~', '-'].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`manual-modal-sign-btn ${s === '+' ? 'plus' : s === '-' ? 'minus' : 'neutral'} ${val === s ? 'active' : ''}`}
                  onClick={() => onSave(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {val !== '' && !isCalculated ? (
            <button 
              type="button" 
              className="delete-link" 
              style={{ color: 'var(--danger-color)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}
              onClick={handleDelete}
            >
              <Trash2 size={16} /> Eintrag löschen
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-secondary" style={{ marginTop: 0 }} onClick={onClose}>
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
