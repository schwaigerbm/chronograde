import React, { useState } from 'react';
import { X, Save, ChevronRight, ChevronLeft } from 'lucide-react';
import type { CourseEntry } from '../schema';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (column: Omit<CourseEntry, 'id'>) => void;
}

type Step = 1 | 2;

export const AddColumnModal = ({ isOpen, onClose, onSave }: AddColumnModalProps) => {
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<CourseEntry['type']>('manual');
  
  // Step 2 fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [calcType, setCalcType] = useState<CourseEntry['calcType']>('grade');
  const [calc, setCalc] = useState(true);
  const [calcFactor, setCalcFactor] = useState(100);
  const [showDateInHeader, setShowDateInHeader] = useState(true);

  if (!isOpen) return null;

  const handleNext = () => {
    if (type === 'manual' && step === 1) {
      setStep(2);
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
    const newColumn: Omit<CourseEntry, 'id'> = {
      title: type === 'manual' ? title : 
             type === 'groupAssignment' ? 'Gruppe' :
             type === 'collaborationSum' ? 'Mitarbeit' :
             type === 'presenceSum' ? 'Anwesenheit' : title,
      type,
      date,
      calc,
      calcFactor,
      calcType,
      showDateInHeader: type === 'groupAssignment' ? false : showDateInHeader,
      priority: Date.now(),
    };
    onSave(newColumn);
    reset();
  };

  const reset = () => {
    setStep(1);
    setType('manual');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setCalcType('grade');
    setCalc(true);
    setCalcFactor(100);
    setShowDateInHeader(true);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3>Beurteilungsspalte hinzufügen</h3>
          <button className="btn-icon" onClick={reset}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {step === 1 ? (
            <div className="step-container">
              <p className="step-description">Wählen Sie den Typ der Beurteilung:</p>
              <div className="type-grid">
                {[
                  { id: 'groupAssignment', label: 'Gruppenzuordnung', desc: 'Zahlen 1-9' },
                  { id: 'manual', label: 'Manueller Name', desc: 'Test, Schularbeit, etc.' },
                  { id: 'collaborationSum', label: 'Mitarbeit', desc: 'Systematische Mitarbeit (+, ~, -)' },
                  { id: 'presenceSum', label: 'Anwesenheit', desc: 'Anwesenheitsliste' },
                ].map((item) => (
                  <label 
                    key={item.id}
                    className={`type-option ${type === item.id ? 'active' : ''}`}
                  >
                    <div className="option-content">
                      <input 
                        type="radio" 
                        name="type" 
                        value={item.id} 
                        checked={type === item.id}
                        onChange={() => setType(item.id as any)}
                        className="radio-input"
                      />
                      <div className="option-text">
                        <div className="option-label">{item.label}</div>
                        <div className="option-desc">{item.desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="step-container">
              <div className="form-group">
                <label className="form-label">Bezeichnung</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="z.B. 1. Test"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Datum</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bewertungsart</label>
                <div className="radio-group">
                  {['grade', 'percent', 'sign'].map(t => (
                    <label key={t} className="radio-label">
                      <input 
                        type="radio" 
                        checked={calcType === t}
                        onChange={() => setCalcType(t as any)}
                      />
                      <span className="capitalize">{t === 'grade' ? 'Note' : t === 'percent' ? 'Prozent' : 'Zeichen'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="toggle-box">
                <div>
                  <div className="option-label">Datum im Header anzeigen</div>
                  <div className="option-desc">Sichtbarkeit des Datums in der Matrix</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={showDateInHeader} 
                    onChange={() => setShowDateInHeader(!showDateInHeader)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="toggle-box">
                <div>
                  <div className="option-label">In Berechnung aufnehmen</div>
                  <div className="option-desc">Beeinflusst die Gesamtnote</div>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={calc} 
                    onChange={() => setCalc(!calc)} 
                  />
                  <span className="slider"></span>
                </label>
              </div>
              {calc && (
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Einfluss <span>{calcFactor}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    style={{ width: '100%' }}
                    value={calcFactor}
                    onChange={e => setCalcFactor(parseInt(e.target.value))}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 2 && (
            <button className="btn-secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={18} /> Zurück
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={handleNext}
            style={{ width: 'auto', marginTop: 0 }}
            disabled={step === 2 && !title}
          >
            {type === 'manual' && step === 1 ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Weiter <ChevronRight size={18} /></span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Speichern <Save size={18} /></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
