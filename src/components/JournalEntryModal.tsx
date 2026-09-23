import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Bold, Italic, Underline, List, RotateCcw, Save, CheckCircle2, Clock } from 'lucide-react';
import type { JournalEntry } from '../schema';

interface JournalEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id?: string; date: string; title: string; content: string }) => Promise<string | void>;
  initialData?: Partial<JournalEntry> | null;
}

export const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [entryId, setEntryId] = useState<string | undefined>(initialData?.id);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const entryIdRef = useRef<string | undefined>(entryId);
  const dateRef = useRef<string>(date);
  const titleRef = useRef<string>(title);

  useEffect(() => {
    entryIdRef.current = entryId;
  }, [entryId]);

  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    if (isOpen) {
      setLastAutoSaveTime(null);
      if (initialData) {
        setEntryId(initialData.id);
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setTitle(initialData.title || '');
        if (editorRef.current) {
          editorRef.current.innerHTML = initialData.content || '';
        }
      } else {
        setEntryId(undefined);
        setDate(new Date().toISOString().split('T')[0]);
        setTitle('');
        if (editorRef.current) {
          editorRef.current.innerHTML = '';
        }
      }
    }
  }, [isOpen, initialData]);

  // Auto-Save Effect: saves every 4 seconds if title/subject is filled out
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(async () => {
      const currentTitle = titleRef.current.trim();
      if (!currentTitle) return;

      try {
        const contentHtml = editorRef.current?.innerHTML || '';
        const savedId = await onSave({
          id: entryIdRef.current,
          date: dateRef.current,
          title: currentTitle,
          content: contentHtml
        });

        if (savedId && typeof savedId === 'string') {
          setEntryId(savedId);
          entryIdRef.current = savedId;
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastAutoSaveTime(timeStr);
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, onSave]);

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
        id: entryId,
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

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1500 }} onClick={onClose}>
      <div 
        className="modal-card"
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '680px', width: '90%', padding: '24px' }}
      >
        <div className="modal-header">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
            {initialData?.id ? 'Journaleintrag bearbeiten' : 'Neuer Journaleintrag'}
          </h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: 0 }}>
            {/* Datum & Titel */}
            <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
              <div style={{ width: '160px' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Datum</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Name / Titel</label>
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
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Text / Notizen</label>
              
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

          <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 0 }}>
            <div style={{ fontSize: '12px' }}>
              {lastAutoSaveTime ? (
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <CheckCircle2 size={14} />
                  Automatisch gespeichert um {lastAutoSaveTime}
                </span>
              ) : title.trim() ? (
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} />
                  Auto-Speichern aktiv (alle 4s)
                </span>
              ) : null}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
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
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
