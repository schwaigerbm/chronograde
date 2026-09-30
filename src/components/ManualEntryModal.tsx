// src/components/ManualEntryModal.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, Check, Trash2, Calendar, Clock, MessageSquare, Save } from 'lucide-react';
import type { CourseEntry, Grade, PredefinedComment } from '../schema';
import { firebaseService } from '../services/firebaseService';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  column: CourseEntry;
  currentValue?: string | number;
  currentGrade?: Grade;
  isCalculated?: boolean;
  onSave: (val: string | number | null, note?: string, date?: string, time?: string) => void;
}

export const ManualEntryModal = ({
  isOpen,
  onClose,
  studentName,
  column,
  currentValue,
  currentGrade,
  isCalculated,
  onSave
}: ManualEntryModalProps) => {
  const [val, setVal] = useState<string | number>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [predefinedComments, setPredefinedComments] = useState<PredefinedComment[]>([]);

  useEffect(() => {
    if (isOpen) {
      const initialVal = currentValue !== undefined ? currentValue : (currentGrade?.value !== undefined ? currentGrade.value : '');
      setVal(initialVal);

      // Extract date (YYYY-MM-DD)
      const rawDate = currentGrade?.date || column.date || new Date().toISOString();
      const formattedDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;
      setDate(formattedDate || new Date().toISOString().split('T')[0]);

      // Extract time (HH:mm)
      setTime(currentGrade?.time || '');

      // Extract note
      setNote(currentGrade?.note || '');
    }
  }, [isOpen, currentValue, currentGrade, column.date]);

  // Subscribe to predefined comments
  useEffect(() => {
    if (isOpen && column.calcType === 'sign') {
      const unsubscribe = firebaseService.subscribeToPredefinedComments((comments) => {
        setPredefinedComments(comments);
      });
      return () => unsubscribe();
    }
  }, [isOpen, column.calcType]);

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
      onSave(val, note.trim() || undefined, date || undefined, time || undefined);
    }
  };

  const handleDelete = () => {
    onSave(null);
  };

  // Predefined comments for active sign type (+, ~, -)
  const activePredefinedComments = predefinedComments.filter(c => c.type === val);

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={{ maxWidth: column.calcType === 'sign' ? '460px' : '400px' }} onClick={(e) => e.stopPropagation()}>
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
                  onClick={() => onSave(g.num, note.trim() || undefined, date || undefined, time || undefined)}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Zeichen auswahl */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Bewertungszeichen wählen:
                </label>
                <div className="manual-modal-sign-container">
                  {['+', '~', '-'].map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`manual-modal-sign-btn ${s === '+' ? 'plus' : s === '-' ? 'minus' : 'neutral'} ${val === s ? 'active' : ''}`}
                      onClick={() => setVal(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optionale Zusatzfelder: Datum, Uhrzeit & Kommentar */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Optionale Zusatzangaben (muss nicht):
                </div>

                {/* Datum & Uhrzeit in einer Zeile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <Calendar size={12} /> Datum:
                    </label>
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <Clock size={12} /> Uhrzeit:
                    </label>
                    <input 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="form-input"
                      style={{ fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>
                </div>

                {/* Kommentar / Notiz */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <MessageSquare size={12} /> Kommentar / Notiz:
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optionaler Kommentar..."
                    className="form-input"
                    rows={2}
                    style={{ fontSize: '12px', resize: 'vertical', width: '100%' }}
                  />
                </div>

                {/* Vorgefertigte Kommentare aus den Einstellungen */}
                {activePredefinedComments.length > 0 && (
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Vorgefertigte Kommentare ({val}):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {activePredefinedComments.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', marginTop: 0, borderRadius: '12px' }}
                          onClick={() => setNote(c.text)}
                          title="Text übernehmen"
                        >
                          {c.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
            <button 
              type="button" 
              className="btn-primary" 
              style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '6px' }} 
              onClick={handleConfirmSave}
            >
              <Save size={16} /> Speichern
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
