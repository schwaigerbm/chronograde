import { useState } from 'react';
import { 
  X, 
  Save, 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  FileText, 
  Award, 
  CalendarCheck, 
  TrendingUp 
} from 'lucide-react';
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
  const [cutoffDate, setCutoffDate] = useState(new Date().toISOString().split('T')[0]);
  const [calcType, setCalcType] = useState<CourseEntry['calcType']>('grade');
  const [calc, setCalc] = useState(true);
  const [calcFactor, setCalcFactor] = useState(100);
  const [showDateInHeader, setShowDateInHeader] = useState(true);

  if (!isOpen) return null;

  const handleNext = () => {
    if ((type === 'manual' || type === 'calculated') && step === 1) {
      setStep(2);
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
    const isCalcAllowed = type !== 'groupAssignment' && type !== 'presenceSum' && type !== 'calculated';
    const newColumn: Omit<CourseEntry, 'id'> = {
      title: (type === 'manual' || type === 'calculated') ? title :
             type === 'groupAssignment' ? 'Gruppe' :
             type === 'collaborationSum' ? 'Mitarbeit' :
             type === 'presenceSum' ? 'Anwesenheit' : title,
      type,
      date,
      calc: isCalcAllowed ? calc : false,
      calcFactor: isCalcAllowed ? calcFactor : 0,
      calcType: type === 'collaborationSum' ? 'percent' : calcType,
      showDateInHeader: type === 'groupAssignment' ? false : showDateInHeader,
      priority: Date.now(),
    };

    if (type === 'calculated' && cutoffDate) {
      newColumn.cutoffDate = cutoffDate;
    }

    onSave(newColumn);
    reset();
  };

  const reset = () => {
    setStep(1);
    setType('manual');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setCutoffDate(new Date().toISOString().split('T')[0]);
    setCalcType('grade');
    setCalc(true);
    setCalcFactor(100);
    setShowDateInHeader(true);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-medium">
        <div className="modal-header">
          <h3>Beurteilungsspalte hinzufügen</h3>
          <button className="btn-icon" onClick={reset}><X size={20} /></button>
        </div>

        <div className="modal-body">
          {step === 1 ? (
            <div className="step-container">
              <p className="step-description" style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                Wählen Sie die Art der neuen Beurteilungsspalte aus:
              </p>
              <div className="type-card-grid">
                {[
                  { id: 'groupAssignment', label: 'Gruppenzuordnung', desc: 'Schülern Gruppen (Zahlen 1-9) zuweisen', icon: Users, tint: 'group' },
                  { id: 'manual', label: 'Manueller Eintrag', desc: 'Eigener Name für Schularbeiten, Tests, o.ä.', icon: FileText, tint: 'manual' },
                  { id: 'collaborationSum', label: 'Mitarbeit', desc: 'Systematische Mitarbeit erfassen (+, ~, -)', icon: Award, tint: 'collaboration' },
                  { id: 'presenceSum', label: 'Anwesenheit', desc: 'Anwesenheitsliste für den Unterricht führen', icon: CalendarCheck, tint: 'presence' },
                  { id: 'calculated', label: 'Meilenstein', desc: 'Berechnete Gesamtnote zu einem Stichtag', icon: TrendingUp, tint: 'calculated' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <label 
                      key={item.id}
                      className={`type-card ${type === item.id ? 'active' : ''}`}
                    >
                      <input 
                        type="radio" 
                        name="type" 
                        value={item.id} 
                        checked={type === item.id}
                        onChange={() => setType(item.id as any)}
                      />
                      <div className={`type-card-icon-wrapper ${item.tint}`}>
                        <Icon size={22} />
                      </div>
                      <div className="type-card-title">{item.label}</div>
                      <div className="type-card-desc">{item.desc}</div>
                    </label>
                  );
                })}
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
                  placeholder={type === 'calculated' ? "z.B. Semesternote" : "z.B. 1. Test"}
                  autoFocus
                />
              </div>
              
              {type === 'calculated' ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Stichtag (Cutoff-Date)</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={cutoffDate}
                      onChange={e => setCutoffDate(e.target.value)}
                    />
                    <p className="field-hint">Nur Noten bis zu diesem Datum werden berücksichtigt.</p>
                  </div>
                </>
              ) : (
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

              {type !== 'groupAssignment' && type !== 'presenceSum' && type !== 'calculated' && (
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

              {(type === 'manual' || type === 'calculated') && (
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
            {(type === 'manual' || type === 'calculated') && step === 1 ? (
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
