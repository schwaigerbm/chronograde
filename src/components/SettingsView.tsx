import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X,
  MessageSquare,
  Users,
  Database,
  Download,
  Upload
} from 'lucide-react';
import { firebaseService, DEFAULT_REMINDER_CATEGORIES } from '../services/firebaseService';
import { sqliteService } from '../services/sqliteService';
import type { PredefinedComment, ReminderCategory } from '../schema';
import { DialogModal } from './DialogModal';

export const SettingsView = () => {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'categories' | 'preferences' | 'backup'>('evaluation');
  const [showAvatars, setShowAvatars] = useState<boolean>(() => {
    const stored = localStorage.getItem('showAvatars');
    return stored !== 'false'; // Default to true
  });
  
  const [enableADDialog, setEnableADDialog] = useState<boolean>(true);

  useEffect(() => {
    sqliteService.getSetting<boolean>('enable_ad_dialog', true).then(setEnableADDialog);
  }, []);

  const handleToggleADDialog = async (checked: boolean) => {
    setEnableADDialog(checked);
    await sqliteService.saveSetting('enable_ad_dialog', checked);
    window.dispatchEvent(new Event('storage_enableADDialog'));
  };
  
  const [comments, setComments] = useState<PredefinedComment[]>([]);
  const [categories, setCategories] = useState<ReminderCategory[]>(DEFAULT_REMINDER_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  // Category form states
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#7e22ce');
  const [catIcon, setCatIcon] = useState('BookOpen');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catToDelete, setCatToDelete] = useState<ReminderCategory | null>(null);
  const [isCatDeleteModalOpen, setIsCatDeleteModalOpen] = useState(false);

  // Backup & Restore states
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupStatusMessage, setBackupStatusMessage] = useState<string | null>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [isRestoreConfirmModalOpen, setIsRestoreConfirmModalOpen] = useState(false);

  const handleToggleAvatars = (checked: boolean) => {
    setShowAvatars(checked);
    localStorage.setItem('showAvatars', String(checked));
    // Dispatch event to notify other components instantly
    window.dispatchEvent(new Event('storage_showAvatars'));
  };

  // Form states
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<'+' | '-' | '~'>('+');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<PredefinedComment | null>(null);

  // Subscribe to comments
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = firebaseService.subscribeToPredefinedComments((data) => {
      setComments(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    const newComment: PredefinedComment = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Date.now().toString(36) + Math.random().toString(36).substring(2),
      text: newText.trim(),
      type: newType
    };

    try {
      await firebaseService.savePredefinedComments([...comments, newComment]);
      setNewText('');
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const handleStartEdit = (comment: PredefinedComment) => {
    setEditingId(comment.id);
    setEditingText(comment.text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      const updated = comments.map(c => c.id === id ? { ...c, text: editingText.trim() } : c);
      await firebaseService.savePredefinedComments(updated);
      setEditingId(null);
      setEditingText('');
    } catch (err) {
      console.error("Error saving comment edit:", err);
    }
  };

  const handleOpenDelete = (comment: PredefinedComment) => {
    setCommentToDelete(comment);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;
    try {
      const updated = comments.filter(c => c.id !== commentToDelete.id);
      await firebaseService.savePredefinedComments(updated);
      setIsDeleteModalOpen(false);
      setCommentToDelete(null);
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  const moveComment = async (index: number, direction: 'up' | 'down') => {
    const commentToMove = comments[index];
    const sameTypeIndices = comments
      .map((c, i) => ({ c, i }))
      .filter(item => item.c.type === commentToMove.type);
    
    const currentPosition = sameTypeIndices.findIndex(item => item.i === index);
    if (direction === 'up' && currentPosition === 0) return;
    if (direction === 'down' && currentPosition === sameTypeIndices.length - 1) return;

    const targetPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;
    const targetIndex = sameTypeIndices[targetPosition].i;

    const updatedComments = [...comments];
    // Swap elements
    const temp = updatedComments[index];
    updatedComments[index] = updatedComments[targetIndex];
    updatedComments[targetIndex] = temp;

    try {
      await firebaseService.savePredefinedComments(updatedComments);
    } catch (err) {
      console.error("Error reordering comments:", err);
    }
  };

  useEffect(() => {
    firebaseService.getReminderCategories().then(setCategories).catch(() => {});
  }, []);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCatId) {
      const updated = categories.map(c => c.id === editingCatId ? { ...c, name: catName.trim(), color: catColor, icon: catIcon } : c);
      await firebaseService.saveReminderCategories(updated);
      setCategories(updated);
      setEditingCatId(null);
    } else {
      const newCat: ReminderCategory = {
        id: 'cat_' + Date.now().toString(36),
        name: catName.trim(),
        color: catColor,
        icon: catIcon,
        isFixed: false
      };
      const updated = [...categories, newCat];
      await firebaseService.saveReminderCategories(updated);
      setCategories(updated);
    }
    setCatName('');
    setCatColor('#7e22ce');
    setCatIcon('BookOpen');
  };

  const handleStartEditCat = (cat: ReminderCategory) => {
    if (cat.isFixed) return;
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
  };

  const handleConfirmDeleteCat = async () => {
    if (!catToDelete || catToDelete.isFixed) return;
    const updated = categories.filter(c => c.id !== catToDelete.id);
    await firebaseService.saveReminderCategories(updated);
    setCategories(updated);
    setIsCatDeleteModalOpen(false);
    setCatToDelete(null);
  };

  // Group comments by type
  const plusComments = comments.map((c, i) => ({ c, i })).filter(item => item.c.type === '+');
  const neutralComments = comments.map((c, i) => ({ c, i })).filter(item => item.c.type === '~');
  const minusComments = comments.map((c, i) => ({ c, i })).filter(item => item.c.type === '-');

  const renderCommentList = (groupedItems: { c: PredefinedComment; i: number }[], label: string, colorClass: string) => {
    return (
      <div className={`settings-column-card border-top-${colorClass}`}>
        <div className="settings-column-header">
          <span className={`badge-indicator bg-${colorClass}`}>{label}</span>
          <span className="comments-count">{groupedItems.length} Kommentare</span>
        </div>
        
        {groupedItems.length === 0 ? (
          <div className="settings-column-empty">
            Keine vorgefertigten Kommentare vorhanden.
          </div>
        ) : (
          <div className="settings-comments-list">
            {groupedItems.map(({ c, i }, idx) => {
              const isEditing = editingId === c.id;
              const isFirst = idx === 0;
              const isLast = idx === groupedItems.length - 1;

              return (
                <div key={c.id} className="settings-comment-item">
                  {isEditing ? (
                    <div className="comment-edit-form">
                      <input 
                        type="text" 
                        className="form-input text-xs" 
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        autoFocus
                      />
                      <div className="comment-edit-actions">
                        <button className="btn-icon text-success" onClick={() => handleSaveEdit(c.id)} title="Speichern">
                          <Check size={16} />
                        </button>
                        <button className="btn-icon text-muted" onClick={handleCancelEdit} title="Abbrechen">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="comment-text">{c.text}</span>
                      <div className="comment-actions">
                        <button 
                          className="btn-icon-sm" 
                          disabled={isFirst} 
                          onClick={() => moveComment(i, 'up')}
                          title="Nach oben verschieben"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button 
                          className="btn-icon-sm" 
                          disabled={isLast} 
                          onClick={() => moveComment(i, 'down')}
                          title="Nach unten verschieben"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button 
                          className="btn-icon-sm" 
                          onClick={() => handleStartEdit(c)}
                          title="Bearbeiten"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          className="btn-icon-sm text-danger" 
                          onClick={() => handleOpenDelete(c)}
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupStatusMessage(null);
    try {
      const jsonStr = await firebaseService.exportFullBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `chronograde_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupStatusMessage("Datensicherung erfolgreich heruntergeladen!");
    } catch (err: any) {
      console.error("Backup error:", err);
      setBackupStatusMessage(`Fehler beim Erstellen des Backups: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) {
        setBackupStatusMessage("Die ausgewählte Backup-Datei ist leer.");
        return;
      }
      try {
        JSON.parse(text);
        setRestoreFileContent(text);
        setIsRestoreConfirmModalOpen(true);
      } catch (err) {
        setBackupStatusMessage("Die Datei ist kein gültiges JSON-Format.");
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmRestore = async () => {
    if (!restoreFileContent) return;
    setIsRestoring(true);
    setIsRestoreConfirmModalOpen(false);
    try {
      const res = await firebaseService.restoreFullBackupJSON(restoreFileContent);
      setBackupStatusMessage(`Wiederherstellung erfolgreich! (${res.students} Schüler, ${res.courses} Kurse, ${res.reminders} Termine geladen)`);
      setRestoreFileContent(null);
    } catch (err: any) {
      console.error("Restore error:", err);
      setBackupStatusMessage(`Fehler bei der Wiederherstellung: ${err.message || err}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="title-group">
          <h1 className="main-title">Einstellungen</h1>
          <h2 className="sub-title">System-Konfiguration</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-navigation-container">
        <nav role="tablist" aria-label="Einstellungsebenen" className="custom-tablist">
          <button
            id="tab-evaluation"
            role="tab"
            type="button"
            aria-selected={activeTab === 'evaluation'}
            aria-controls="panel-evaluation"
            className="custom-tab-button"
            onClick={() => setActiveTab('evaluation')}
          >
            Bewertungsvorgaben
          </button>
          <button
            id="tab-categories"
            role="tab"
            type="button"
            aria-selected={activeTab === 'categories'}
            aria-controls="panel-categories"
            className="custom-tab-button"
            onClick={() => setActiveTab('categories')}
          >
            Terminkategorien
          </button>
          <button
            id="tab-preferences"
            role="tab"
            type="button"
            aria-selected={activeTab === 'preferences'}
            aria-controls="panel-preferences"
            className="custom-tab-button"
            onClick={() => setActiveTab('preferences')}
          >
            Benutzerpräferenzen
          </button>
          <button
            id="tab-backup"
            role="tab"
            type="button"
            aria-selected={activeTab === 'backup'}
            aria-controls="panel-backup"
            className="custom-tab-button"
            onClick={() => setActiveTab('backup')}
          >
            Datensicherung & Import
          </button>
        </nav>
      </div>

      <div className="settings-content-area">
        {activeTab === 'evaluation' ? (
          /* Section: Mitarbeit */
          <section 
            id="panel-evaluation"
            role="tabpanel"
            aria-labelledby="tab-evaluation"
            className="settings-section-card"
          >
            <div className="settings-section-header">
              <MessageSquare size={22} className="text-indigo-600" />
              <div>
                <h3 className="text-lg font-bold">Mitarbeitskommentare</h3>
                <p className="section-desc text-base">Verwalte vorgefertigte Notizen für die Leistungsbeurteilung (+, ~, -) in der Notenmatrix.</p>
              </div>
            </div>

            {/* Add Form */}
            <form onSubmit={handleAddComment} className="settings-add-form">
              <div className="settings-form-row">
                <div className="form-group min-w-120">
                  <label className="form-label text-base font-semibold">Zeichen</label>
                  <div className="settings-type-buttons">
                    {(['+', '~', '-'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        className={`btn-type-toggle ${t === '+' ? 'plus' : t === '-' ? 'minus' : 'neutral'} ${newType === t ? 'active' : ''}`}
                        onClick={() => setNewType(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group flex-1">
                  <label className="form-label text-base font-semibold">Vorgefertigter Kommentartext</label>
                  <div className="input-with-btn">
                    <input
                      type="text"
                      placeholder="z.B. Sehr gute Mitarbeit im Unterricht"
                      value={newText}
                      onChange={e => setNewText(e.target.value)}
                      className="form-input text-base"
                      required
                    />
                    <button type="submit" className="btn-primary bg-indigo-600 hover:bg-indigo-700 text-base" disabled={!newText.trim()}>
                      <Plus size={16} /> Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Grid for grouped comments */}
            {isLoading ? (
              <div className="text-center py-8 text-base text-muted">Lade Kommentare...</div>
            ) : (
              <div className="settings-columns-grid">
                {renderCommentList(plusComments, '+ (Positiv)', 'success')}
                {renderCommentList(neutralComments, '~ (Neutral)', 'warning')}
                {renderCommentList(minusComments, '- (Negativ)', 'danger')}
              </div>
            )}
          </section>
        ) : activeTab === 'categories' ? (
          /* Section: Terminkategorien */
          <section 
            id="panel-categories"
            role="tabpanel"
            aria-labelledby="tab-categories"
            className="settings-section-card"
          >
            <div className="settings-section-header">
              <MessageSquare size={22} className="text-indigo-600" />
              <div>
                <h3 className="text-lg font-bold">Termin- & Aufgabenkategorien</h3>
                <p className="section-desc text-base">Verwalte Kategorien (Farbe, Name) für die Terminliste. „Fehlzeiten“ ist eine fixe System-Kategorie.</p>
              </div>
            </div>

            {/* Category Form */}
            <form onSubmit={handleSaveCategory} className="settings-add-form" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div className="form-group">
                  <label className="form-label font-semibold">Kategoriename</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="z.B. Projektarbeit oder Elterngespräche"
                    value={catName}
                    onChange={e => setCatName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label font-semibold">Farbe wählen</label>
                  <input
                    type="color"
                    className="form-input"
                    value={catColor}
                    onChange={e => setCatColor(e.target.value)}
                    style={{ height: '38px', padding: '2px', cursor: 'pointer' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label font-semibold">Icon</label>
                  <select
                    className="form-input"
                    value={catIcon}
                    onChange={e => setCatIcon(e.target.value)}
                  >
                    <option value="BookOpen">📝 Test / Buch</option>
                    <option value="FileText">📁 Datei / Abgabe</option>
                    <option value="Calendar">📅 Kalender / Notiz</option>
                    <option value="AlertTriangle">⚠️ Fehlzeit / Warnung</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingCatId && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingCatId(null);
                        setCatName('');
                        setCatColor('#7e22ce');
                      }}
                      style={{ height: '38px' }}
                    >
                      Abbrechen
                    </button>
                  )}
                  <button type="submit" className="btn-primary" style={{ height: '38px', whiteSpace: 'nowrap' }} disabled={!catName.trim()}>
                    <Plus size={16} /> {editingCatId ? 'Speichern' : 'Hinzufügen'}
                  </button>
                </div>
              </div>
            </form>

            {/* Categories List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {categories.map(cat => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderLeft: `5px solid ${cat.color}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: cat.color }} />
                    <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{cat.name}</span>
                    {cat.isFixed && (
                      <span style={{ fontSize: '11px', fontWeight: 'bold', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px' }}>
                        Fixierte System-Kategorie
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!cat.isFixed && (
                      <>
                        <button
                          className="btn-icon"
                          onClick={() => handleStartEditCat(cat)}
                          title="Kategorie bearbeiten"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-icon danger"
                          onClick={() => {
                            setCatToDelete(cat);
                            setIsCatDeleteModalOpen(true);
                          }}
                          title="Kategorie löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : activeTab === 'preferences' ? (
          /* Section: Benutzerpräferenzen */
          <section 
            id="panel-preferences"
            role="tabpanel"
            aria-labelledby="tab-preferences"
            className="settings-section-card"
          >
            <div className="settings-section-header">
              <Users size={22} className="text-indigo-600" />
              <div>
                <h3 className="text-lg font-bold">Benutzerpräferenzen</h3>
                <p className="section-desc text-base">Passe die Benutzeroberfläche an deine persönlichen Vorlieben an.</p>
              </div>
            </div>

            <div className="py-4" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="switch-container">
                <div className="switch-label-group">
                  <label htmlFor="avatar-toggle" className="switch-title">Schüler-Avatare anzeigen</label>
                  <span className="switch-description">Blendet die Profilbilder der Schüler in Tabellen und Listen ein oder aus.</span>
                </div>
                <label className="custom-switch">
                  <input
                    id="avatar-toggle"
                    type="checkbox"
                    checked={showAvatars}
                    onChange={(e) => handleToggleAvatars(e.target.checked)}
                  />
                  <span className="custom-switch-slider"></span>
                </label>
              </div>

              <div className="switch-container">
                <div className="switch-label-group">
                  <label htmlFor="ad-dialog-toggle" className="switch-title">„A &amp; D Dialog &gt;“ Button auf Gruppen-Karten anzeigen</label>
                  <span className="switch-description">Blendet den Button für Anwesenheits-Schnellerfassung & Zufallsgenerator unter „Matrix öffnen“ auf allen Gruppenkarten ein oder aus.</span>
                </div>
                <label className="custom-switch">
                  <input
                    id="ad-dialog-toggle"
                    type="checkbox"
                    checked={enableADDialog}
                    onChange={(e) => handleToggleADDialog(e.target.checked)}
                  />
                  <span className="custom-switch-slider"></span>
                </label>
              </div>
            </div>
          </section>
        ) : (
          /* Section: Datensicherung & Import/Export */
          <section 
            id="panel-backup"
            role="tabpanel"
            aria-labelledby="tab-backup"
            className="settings-section-card"
          >
            <div className="settings-section-header">
              <Database size={22} className="text-indigo-600" />
              <div>
                <h3 className="text-lg font-bold">Datensicherung & Import / Export</h3>
                <p className="section-desc text-base">Erstelle vollständige Sicherungsdateien deiner Anwendungsdaten oder stelle Daten aus Backups wieder her.</p>
              </div>
            </div>

            {backupStatusMessage && (
              <div style={{ margin: '16px 0', padding: '12px 16px', borderRadius: '8px', backgroundColor: backupStatusMessage.includes('Fehler') ? '#fef2f2' : '#f0fdf4', color: backupStatusMessage.includes('Fehler') ? '#991b1b' : '#166534', fontSize: '14px', fontWeight: '500' }}>
                {backupStatusMessage}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '20px' }}>
              
              {/* Backup Export Card */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--primary-color)' }}>
                    <Download size={22} />
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Backup erstellen (JSON)</h4>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                    Exportiert alle Kurse, Schüler, Noten, Einstellungen und Termine als strukturierte JSON-Datei zur externen Sicherung.
                  </p>
                </div>
                <button 
                  onClick={handleExportBackup} 
                  disabled={isExporting}
                  className="btn-primary" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '14px', borderRadius: '8px' }}
                >
                  <Download size={18} />
                  <span>{isExporting ? 'Erstelle Backup...' : 'Backup herunterladen'}</span>
                </button>
              </div>

              {/* Restore Backup Card */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: '#0284c7' }}>
                    <Upload size={22} />
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Backup wiederherstellen</h4>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                    Spielt Daten aus einer zuvor erstellten Chronograde JSON-Sicherungsdatei wieder in die Datenbank ein.
                  </p>
                </div>
                <label className="btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center' }}>
                  <Upload size={18} />
                  <span>{isRestoring ? 'Wiederherstellung läuft...' : 'Backup-Datei auswählen'}</span>
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleSelectRestoreFile} 
                    disabled={isRestoring}
                    style={{ display: 'none' }} 
                  />
                </label>
              </div>

            </div>
          </section>
        )}
      </div>

      {/* Delete Comment Confirmation Modal */}
      <DialogModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Kommentar löschen"
        message={`Möchtest du den vorgefertigten Kommentar "${commentToDelete?.text}" wirklich löschen?`}
        type="danger"
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
      />

      {/* Restore JSON Backup Confirmation Modal */}
      <DialogModal
        isOpen={isRestoreConfirmModalOpen}
        onClose={() => {
          setIsRestoreConfirmModalOpen(false);
          setRestoreFileContent(null);
        }}
        onConfirm={handleConfirmRestore}
        title="Backup wiederherstellen?"
        message="Sind Sie sicher, dass Sie die Daten aus der Backup-Datei wiederherstellen möchten? Dieser Vorgang importiert alle Schüler, Kurse und Noten."
        type="warning"
        confirmLabel="Wiederherstellen"
        cancelLabel="Abbrechen"
      />

      {/* Delete Category Confirmation Modal */}
      <DialogModal
        isOpen={isCatDeleteModalOpen}
        onClose={() => {
          setIsCatDeleteModalOpen(false);
          setCatToDelete(null);
        }}
        onConfirm={handleConfirmDeleteCat}
        title="Kategorie löschen"
        message={`Möchtest du die Kategorie "${catToDelete?.name}" wirklich löschen?`}
        type="danger"
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
      />
    </div>
  );
};
