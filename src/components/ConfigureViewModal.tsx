import React, { useState } from 'react';
import { X, Save, ArrowUp, ArrowDown, Eye, EyeOff, TrendingUp } from 'lucide-react';
import type { CourseEntry } from '../schema';

interface ConfigureViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: CourseEntry[];
  showTrend?: boolean;
  onSave: (updatedColumns: CourseEntry[], showTrend: boolean) => void;
}

export const ConfigureViewModal = ({ isOpen, onClose, columns, showTrend: initialShowTrend, onSave }: ConfigureViewModalProps) => {
  const [localColumns, setLocalColumns] = useState<CourseEntry[]>([]);
  const [localShowTrend, setLocalShowTrend] = useState(true);

  // Sync state when modal opens or props change
  React.useEffect(() => {
    if (isOpen) {
      setLocalColumns([...columns]);
      setLocalShowTrend(initialShowTrend !== false);
    }
  }, [isOpen, columns, initialShowTrend]);

  if (!isOpen) return null;

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

  const handleSave = () => {
    onSave(localColumns, localShowTrend);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3>Ansicht konfigurieren</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body p-8">
          <div className="toggle-box" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <TrendingUp size={20} style={{ color: 'var(--primary-color)' }} />
              <div>
                <div className="option-label">Trend-Spalte anzeigen</div>
                <div className="option-desc">Sticky Auswertung am rechten Rand einblenden</div>
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

          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Ändern Sie hier die Reihenfolge der Spalten oder blenden Sie diese in der Matrix ein/aus.
          </p>

          <div className="table-wrapper" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Reihenfolge</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Sichtbar</th>
                  <th>Spaltenname</th>
                  <th>Typ</th>
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
                    <td className="font-bold">{col.title}</td>
                    <td style={{ fontSize: '12px' }} className="capitalize text-muted">{col.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto' }}
          >
            <Save size={18} /> Konfiguration speichern
          </button>
        </div>
      </div>
    </div>
  );
};
