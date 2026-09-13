import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import type { Student } from '../schema';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>('');
  const [delimiter, setDelimiter] = useState<string>(',');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);

  // Mapping selections
  const [firstNameColIndex, setFirstNameColIndex] = useState<number>(-1);
  const [lastNameColIndex, setLastNameColIndex] = useState<number>(-1);
  const [classIdColIndex, setClassIdColIndex] = useState<number>(-1);

  // Result state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setErrorMessage("Die ausgewählte Datei ist leer.");
        return;
      }
      parseCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCSV = (text: string) => {
    // Auto-detect delimiter
    let delim = ',';
    const firstLine = text.split(/\r\n|\n/)[0] || '';
    if (firstLine.includes(';')) delim = ';';
    else if (firstLine.includes('\t')) delim = '\t';
    setDelimiter(delim);

    const allLines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
    if (allLines.length < 2) {
      setErrorMessage("Die CSV-Datei muss mindestens eine Kopfzeile und eine Datenzeile enthalten.");
      return;
    }

    const parseLine = (line: string) => {
      // Split by delimiter considering quotes
      const regex = new RegExp(`(?:^|${delim === ';' ? ';' : delim === '\t' ? '\t' : ','})(?:"([^"]*)"|([^"${delim === ';' ? ';' : delim === '\t' ? '\t' : ','}]*))`, 'g');
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        const val = match[1] !== undefined ? match[1] : match[2] || '';
        matches.push(val.trim());
      }
      return matches;
    };

    const headerCols = parseLine(allLines[0]);
    setHeaders(headerCols);

    const parsedRows = allLines.slice(1).map(parseLine).filter(r => r.some(cell => cell.length > 0));
    setRows(parsedRows);

    // Auto-detect matching headers
    let fnIdx = -1;
    let lnIdx = -1;
    let clsIdx = -1;

    headerCols.forEach((col, idx) => {
      const lower = col.toLowerCase();
      if (lower.includes('vorname') || lower.includes('firstname') || lower.includes('given')) {
        fnIdx = idx;
      } else if (lower.includes('nachname') || lower.includes('lastname') || lower.includes('surname') || lower.includes('family')) {
        lnIdx = idx;
      } else if (lower.includes('klasse') || lower.includes('class')) {
        clsIdx = idx;
      }
    });

    if (fnIdx === -1 && headerCols.length > 0) fnIdx = 0;
    if (lnIdx === -1 && headerCols.length > 1) lnIdx = 1;

    setFirstNameColIndex(fnIdx);
    setLastNameColIndex(lnIdx);
    setClassIdColIndex(clsIdx);

    setStep(2);
  };

  const handleExecuteImport = async () => {
    if (firstNameColIndex === -1 || lastNameColIndex === -1) {
      setErrorMessage("Bitte wählen Sie sowohl die Spalte für den Vornamen als auch für den Nachnamen aus.");
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    const candidates: Omit<Student, 'id'>[] = [];

    for (const row of rows) {
      const fn = row[firstNameColIndex]?.trim() || '';
      const ln = row[lastNameColIndex]?.trim() || '';
      const cls = classIdColIndex !== -1 ? (row[classIdColIndex]?.trim() || '') : '';

      if (fn && ln) {
        candidates.push({
          firstName: fn,
          lastName: ln,
          classId: cls
        });
      }
    }

    if (candidates.length === 0) {
      setErrorMessage("Keine gültigen Schülerdaten in den gewählten Spalten gefunden.");
      setIsImporting(false);
      return;
    }

    try {
      const res = await firebaseService.importStudentsFromCSV(candidates);
      setImportResult(res);
      setStep(3);
      onImportSuccess();
    } catch (err: any) {
      console.error("Import error:", err);
      setErrorMessage(err.message || "Fehler beim Importieren der Schüler.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setFirstNameColIndex(-1);
    setLastNameColIndex(-1);
    setClassIdColIndex(-1);
    setImportResult(null);
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ width: '90%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>
              Schüler-Import (CSV)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Schülerlisten aus Excel, Sokrates oder CSV-Dateien importieren
            </p>
          </div>
          <button onClick={handleClose} className="btn-icon" title="Schließen" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{ margin: '16px 0', padding: '12px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#991b1b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px 0' }}>
          
          {/* STEP 1: File Selection */}
          {step === 1 && (
            <div style={{ textAlign: 'center', padding: '30px 20px', border: '2px dashed var(--border-color)', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <Upload size={28} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                CSV-Datei auswählen
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Wählen Sie eine .csv oder .txt Datei mit Schülervornamen und -nachnamen.
              </p>
              
              <label className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 20px', borderRadius: '8px', fontSize: '14px' }}>
                <FileText size={18} />
                <span>Datei auswählen</span>
                <input 
                  type="file" 
                  accept=".csv,.txt" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          )}

          {/* STEP 2: Mapping Wizard & Preview */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                Datei: <strong>{fileName}</strong> ({delimiter === ';' ? 'Semikolon-getrennt' : delimiter === '\t' ? 'Tab-getrennt' : 'Komma-getrennt'})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '10px' }}>
                
                {/* Vorname Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Spalte für Vorname *
                  </label>
                  <select 
                    value={firstNameColIndex} 
                    onChange={(e) => setFirstNameColIndex(Number(e.target.value))}
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value={-1}>-- Bitte wählen --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `Spalte ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                {/* Nachname Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Spalte für Nachname *
                  </label>
                  <select 
                    value={lastNameColIndex} 
                    onChange={(e) => setLastNameColIndex(Number(e.target.value))}
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value={-1}>-- Bitte wählen --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `Spalte ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                {/* Klasse Selection (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Spalte für Klasse (Optional)
                  </label>
                  <select 
                    value={classIdColIndex} 
                    onChange={(e) => setClassIdColIndex(Number(e.target.value))}
                    className="form-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value={-1}>-- Keine Klasse --</option>
                    {headers.map((h, idx) => (
                      <option key={idx} value={idx}>{h || `Spalte ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Preview */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                  Vorschau ({rows.length} Schüler gefunden)
                </h4>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: '600' }}>#</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600' }}>Vorname</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600' }}>Nachname</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600' }}>Klasse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 5).map((r, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{rIdx + 1}</td>
                          <td style={{ padding: '8px 12px', fontWeight: firstNameColIndex !== -1 ? 'bold' : 'normal' }}>
                            {firstNameColIndex !== -1 ? (r[firstNameColIndex] || '-') : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: lastNameColIndex !== -1 ? 'bold' : 'normal' }}>
                            {lastNameColIndex !== -1 ? (r[lastNameColIndex] || '-') : '-'}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {classIdColIndex !== -1 ? (r[classIdColIndex] || '-') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 5 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
                    ... und {rows.length - 5} weitere Zeilen.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Summary */}
          {step === 3 && importResult && (
            <div style={{ textAlign: 'center', padding: '20px 10px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                Import erfolgreich!
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Die Daten wurden in Ihre Schülerdatenbank verarbeitet.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', margin: '20px 0' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '16px 24px', borderRadius: '10px', minWidth: '130px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>{importResult.added}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Neu hinzugefügt</div>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '16px 24px', borderRadius: '10px', minWidth: '130px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ca8a04' }}>{importResult.skipped}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Übersprungen (Duplikate)</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          {step === 1 && (
            <>
              <div></div>
              <button onClick={handleClose} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}>
                <ArrowLeft size={16} /> Zurück
              </button>
              <button 
                onClick={handleExecuteImport} 
                disabled={isImporting || firstNameColIndex === -1 || lastNameColIndex === -1}
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer' }}
              >
                {isImporting ? 'Importiere...' : 'Jetzt importieren'} <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div></div>
              <button onClick={handleClose} className="btn-primary" style={{ padding: '8px 24px', borderRadius: '6px', cursor: 'pointer' }}>
                Fertigstellen
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
