import React, { useState, useEffect, useRef } from 'react';
import { X, Bold, Italic, Underline, List, RotateCcw, Save } from 'lucide-react';
import type { JournalEntry } from '../schema';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; title: string; content: string }) => Promise<void>;
  initialData?: Partial<JournalEntry> | null;
}

export const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setTitle(initialData.title || '');
        if (editorRef.current) {
          editorRef.current.innerHTML = initialData.content || '';
        }
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setTitle('');
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleExecCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const contentHtml = editorRef.current?.innerHTML || '';
      await onSave({
        date,
        title: title.trim(),
        content: contentHtml
      });
      onClose();
    } catch (err) {
      console.error('Fehler beim Speichern des Journaleintrags:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '680px', width: '90%' }}
      >
        <div className="modal-header">
          <h2>{initialData?.id ? 'Journaleintrag bearbeiten' : 'Neuer Journaleintrag'}</h2>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Datum & Titel */}
            <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
              <div style={{ width: '160px' }}>
                <label className="form-label">Datum</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">Name / Titel</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="z.B. Besprechung Elternsprechtag, Hausübungs-Kontrolle..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Rich Text Formatierung Werkzeugleiste */}
            <div>
              <label className="form-label" style={{ marginBottom: '6px' }}>Text / Notizen</label>
              
              <div style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#ffffff'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid var(--border-color)'
                }}>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleExecCommand('bold')}
                    title="Fett"
                    style={{ padding: '6px', borderRadius: '4px' }}
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleExecCommand('italic')}
                    title="Kursiv"
                    style={{ padding: '6px', borderRadius: '4px' }}
                  >
                    <Italic size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleExecCommand('underline')}
                    title="Unterstreichen"
                    style={{ padding: '6px', borderRadius: '4px' }}
                  >
                    <Underline size={16} />
                  </button>
                  <div style={{ width: '1px', height: '18px', backgroundColor: '#e2e8f0', margin: '0 4px' }} />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleExecCommand('insertUnorderedList')}
                    title="Aufzählungsliste"
                    style={{ padding: '6px', borderRadius: '4px' }}
                  >
                    <List size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleExecCommand('removeFormat')}
                    title="Formatierung aufheben"
                    style={{ padding: '6px', borderRadius: '4px' }}
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>

                {/* Editor Content Area */}
                <div
                  ref={editorRef}
                  contentEditable
                  className="journal-editor-content"
                  style={{
                    minHeight: '200px',
                    maxHeight: '350px',
                    overflowY: 'auto',
                    padding: '12px',
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#0f172a'
                  }}
                  data-placeholder="Geben Sie hier Ihre Notizen ein..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !title.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Speichere...' : 'Speichern'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
