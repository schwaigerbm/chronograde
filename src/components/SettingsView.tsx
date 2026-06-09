import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X,
  MessageSquare
} from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import type { PredefinedComment } from '../schema';
import { DialogModal } from './DialogModal';

export const SettingsView = () => {
  const [comments, setComments] = useState<PredefinedComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="view-container">
      <div className="view-header">
        <div className="title-group">
          <h1 className="main-title">Einstellungen</h1>
          <h2 className="sub-title">System-Konfiguration</h2>
        </div>
      </div>

      <div className="settings-content-area">
        {/* Section: Mitarbeit */}
        <div className="settings-section-card">
          <div className="settings-section-header">
            <MessageSquare size={22} className="text-primary" />
            <div>
              <h3>Mitarbeitskommentare</h3>
              <p className="section-desc">Verwalte vorgefertigte Notizen für die Leistungsbeurteilung (+, ~, -) in der Notenmatrix.</p>
            </div>
          </div>

          {/* Add Form */}
          <form onSubmit={handleAddComment} className="settings-add-form">
            <div className="settings-form-row">
              <div className="form-group min-w-120">
                <label className="form-label text-xs">Zeichen</label>
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
                <label className="form-label text-xs">Vorgefertigter Kommentartext</label>
                <div className="input-with-btn">
                  <input
                    type="text"
                    placeholder="z.B. Sehr gute Mitarbeit im Unterricht"
                    value={newText}
                    onChange={e => setNewText(e.target.value)}
                    className="form-input"
                    required
                  />
                  <button type="submit" className="btn-primary" disabled={!newText.trim()}>
                    <Plus size={16} /> Hinzufügen
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Grid for grouped comments */}
          {isLoading ? (
            <div className="text-center py-8 text-muted">Lade Kommentare...</div>
          ) : (
            <div className="settings-columns-grid">
              {renderCommentList(plusComments, '+ (Positiv)', 'success')}
              {renderCommentList(neutralComments, '~ (Neutral)', 'warning')}
              {renderCommentList(minusComments, '- (Negativ)', 'danger')}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
    </div>
  );
};
