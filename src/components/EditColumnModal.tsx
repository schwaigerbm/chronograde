import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { CourseEntry } from '../schema';

interface EditColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  column: CourseEntry | null;
  onSave: (updatedColumn: CourseEntry) => void;
}

export const EditColumnModal = ({ isOpen, onClose, column, onSave }: EditColumnModalProps) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [cutoffDate, setCutoffDate] = useState('');
  const [calc, setCalc] = useState(true);
  const [calcFactor, setCalcFactor] = useState(100);
  const [isColorEnabled, setIsColorEnabled] = useState(false);
  const [showDateInHeader, setShowDateInHeader] = useState(true);

  useEffect(() => {
    if (column) {
      setTitle(column.title);
      setDate(column.date);
      setCutoffDate(column.cutoffDate || '');
      setCalc(column.calc !== false);
      setCalcFactor(column.calcFactor);
      setIsColorEnabled(!!column.isColorEnabled);
      setShowDateInHeader(column.showDateInHeader !== false);
    }
  }, [column]);

  if (!isOpen || !column) return null;

  const handleSave = () => {
    const isCalcAllowed = column.type !== 'groupAssignment' && column.type !== 'presenceSum' && column.type !== 'calculated';
    const updatedColumn: CourseEntry = {
      ...column,
      title,
      date,
      calc: isCalcAllowed ? calc : false,
      calcFactor: isCalcAllowed ? calcFactor : 0,
      isColorEnabled,
      showDateInHeader: (column.type === 'groupAssignment' || column.type === 'collaborationSum' || column.type === 'presenceSum') ? false : showDateInHeader,
    };

    if (column.type === 'calculated') {
      updatedColumn.cutoffDate = cutoffDate;
    } else {
      delete updatedColumn.cutoffDate;
    }

    // Clean up roundingRule if it exists from previous versions
    delete updatedColumn.roundingRule;

    onSave(updatedColumn);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Spalte bearbeiten</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
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

          {column.type === 'calculated' ? (
            <>
              <div className="form-group">
                <label className="form-label">Stichtag (Cutoff-Date)</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={cutoffDate}
                  onChange={e => setCutoffDate(e.target.value)}
                />
              </div>
            </>
          ) : column.type !== 'groupAssignment' && (
            <div className="form-group">
              <label className="form-label">Datum</label>
              <input 
                type="date" 
                className="form-input" 
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          )}

          {column.type !== 'groupAssignment' && column.type !== 'presenceSum' && column.type !== 'calculated' && (
            <>
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
                    Berechnungseinfluss <span>{calcFactor}%</span>
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
            </>
          )}

          <div className="toggle-box">
            <div>
              <div className="option-label">Farbmodus (Heatmap)</div>
              <div className="option-desc">Zellen basierend auf Wert einfärben</div>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={isColorEnabled} 
                onChange={() => setIsColorEnabled(!isColorEnabled)} 
              />
              <span className="slider"></span>
            </label>
          </div>

          {(column.type === 'manual' || column.type === 'calculated') && (
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
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', marginTop: 0 }}
            disabled={!title}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>Speichern <Save size={18} /></span>
          </button>
        </div>
      </div>
    </div>
  );
};
