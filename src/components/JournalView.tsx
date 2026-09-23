import React, { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, Calendar, FileText, PlusCircle, ArrowUp, ArrowDown, Users } from 'lucide-react';
import type { Course, JournalEntry } from '../schema';
import { sqliteService } from '../services/sqliteService';
import { formatDate } from '../lib/utils';

interface JournalViewProps {
  course: Course;
  availableGroups?: string[];
  onEditEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entry: JournalEntry) => void;
  onEntriesLoaded?: (entries: JournalEntry[]) => void;
  onOpenNewModal: () => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  course,
  availableGroups = [],
  onEditEntry,
  onDeleteEntry,
  onEntriesLoaded,
  onOpenNewModal
}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter & Sort state
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'date' | 'group'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = sqliteService.subscribeToJournalEntries(course.id, (loadedEntries) => {
      setEntries(loadedEntries);
      if (onEntriesLoaded) {
        onEntriesLoaded(loadedEntries);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [course.id]);

  const filteredAndSortedEntries = useMemo(() => {
    let result = [...entries];

    if (groupFilter !== 'all') {
      result = result.filter(e => e.groupId === groupFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = (a.date || '').localeCompare(b.date || '');
      } else if (sortField === 'group') {
        const gA = a.groupId || '';
        const gB = b.groupId || '';
        comparison = gA.localeCompare(gB, undefined, { numeric: true });
      }

      if (comparison === 0) {
        comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [entries, groupFilter, sortField, sortOrder]);

  // Keep selected entry valid
  useEffect(() => {
    if (filteredAndSortedEntries.length > 0) {
      if (!selectedEntryId || !filteredAndSortedEntries.some(e => e.id === selectedEntryId)) {
        setSelectedEntryId(filteredAndSortedEntries[0].id);
      }
    } else {
      setSelectedEntryId(null);
    }
  }, [filteredAndSortedEntries, selectedEntryId]);

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null;

  if (loading) {
    return <div className="loading-state">Lade Kurs-Journal...</div>;
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '380px 1fr',
      gap: '20px',
      height: 'calc(100vh - 165px)',
      overflow: 'hidden',
      marginTop: '12px'
    }}>
      {/* LINKESEITE: EINTRAGSLISTE */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Header Zähler & Filter-Leiste */}
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {filteredAndSortedEntries.length} {filteredAndSortedEntries.length === 1 ? 'Eintrag' : 'Einträge'}
            </span>
            <button 
              type="button"
              className="btn-secondary btn-xs"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              style={{ padding: '2px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title={`Sortierrichtung: ${sortOrder === 'desc' ? 'Absteigend' : 'Aufsteigend'}`}
            >
              {sortOrder === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
              <span>{sortOrder === 'desc' ? 'Absteigend' : 'Aufsteigend'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {availableGroups.length > 0 && (
              <select
                className="form-select"
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                style={{ flex: 1, padding: '4px 6px', fontSize: '12px', borderRadius: '6px' }}
              >
                <option value="all">Alle Gruppen</option>
                {availableGroups.map(g => (
                  <option key={g} value={g}>Gruppe {g}</option>
                ))}
              </select>
            )}
            <select
              className="form-select"
              value={sortField}
              onChange={e => setSortField(e.target.value as 'date' | 'group')}
              style={{ flex: availableGroups.length > 0 ? 1 : '100%', padding: '4px 6px', fontSize: '12px', borderRadius: '6px' }}
            >
              <option value="date">Nach Datum</option>
              {availableGroups.length > 0 && <option value="group">Nach Gruppe</option>}
            </select>
          </div>
        </div>

        {/* Eintrags-Liste */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}>
          {filteredAndSortedEntries.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#64748b',
              gap: '12px'
            }}>
              <FileText size={36} style={{ opacity: 0.4 }} />
              <div>
                <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Keine Eintrags-Daten</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Es wurden keine passenden Journaleinträge gefunden.</p>
              </div>
              <button 
                className="btn-secondary btn-sm"
                onClick={onOpenNewModal}
                style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusCircle size={14} />
                <span>Neuer Eintrag</span>
              </button>
            </div>
          ) : (
            filteredAndSortedEntries.map(entry => {
              const isSelected = entry.id === selectedEntryId;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntryId(entry.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    marginBottom: '6px',
                    borderRadius: '8px',
                    border: isSelected ? '1.5px solid var(--primary-color)' : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} style={{ color: isSelected ? 'var(--primary-color)' : '#64748b', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: isSelected ? 'var(--primary-color)' : '#64748b' }}>
                        {formatDate(entry.date)}
                      </span>
                      {entry.groupId && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: isSelected ? 'var(--primary-color)' : '#e2e8f0',
                          color: isSelected ? 'white' : '#475569',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <Users size={10} /> Gr. {entry.groupId}
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {entry.title}
                    </span>
                  </div>

                  {/* Aktions-Buttons rechtsbündig */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <button
                      className="btn-header-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEntry(entry);
                      }}
                      title="Bearbeiten"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn-header-action danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteEntry(entry);
                      }}
                      title="Löschen"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RECHTE SEITE: DETAIL-VORSCHAU */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {selectedEntry ? (
          <>
            {/* Detail Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-color)', marginBottom: '2px' }}>
                  {formatDate(selectedEntry.date)}
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {selectedEntry.title}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => onEditEntry(selectedEntry)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Pencil size={14} />
                  <span>Bearbeiten</span>
                </button>
                <button
                  className="btn-secondary btn-sm danger"
                  onClick={() => onDeleteEntry(selectedEntry)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626' }}
                >
                  <Trash2 size={14} />
                  <span>Löschen</span>
                </button>
              </div>
            </div>

            {/* Detail Content Body */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#1e293b'
            }}>
              {selectedEntry.content ? (
                <div 
                  className="journal-entry-html-content"
                  dangerouslySetInnerHTML={{ __html: selectedEntry.content }} 
                />
              ) : (
                <p style={{ fontStyle: 'italic', color: '#94a3b8' }}>Kein ausführlicher Text erfasst.</p>
              )}
            </div>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            padding: '40px',
            textAlign: 'center',
            gap: '12px'
          }}>
            <FileText size={48} style={{ opacity: 0.3 }} />
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#334155', margin: 0 }}>Kein Eintrag ausgewählt</p>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>Wählen Sie einen Eintrag aus der linken Liste, um Details anzuzeigen.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
