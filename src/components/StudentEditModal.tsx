// src/components/StudentEditModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Camera } from 'lucide-react';
import type { Student } from '../schema';
import { compressImageToBase64 } from '../lib/utils';
import { DialogModal } from './DialogModal';

interface StudentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Partial<Student> | null;
  onSave: (studentData: Partial<Student>, shouldContinue: boolean) => Promise<void>;
  students?: Student[];
}

export const StudentEditModal = ({
  isOpen,
  onClose,
  student,
  onSave,
  students = []
}: StudentEditModalProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [excludeFromPublicStats, setExcludeFromPublicStats] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning' as 'info' | 'warning' | 'danger' | 'success',
    isAlert: true,
    confirmLabel: 'OK',
    onConfirm: () => {}
  });

  const firstNameInputRef = useRef<HTMLInputElement>(null);
  const saveAndContinueRef = useRef<HTMLButtonElement>(null);
  const isEditMode = !!student?.id;

  // Sync state with student prop when modal opens/changes
  useEffect(() => {
    if (isOpen) {
      if (student) {
        setFirstName(student.firstName || '');
        setLastName(student.lastName || '');
        setPhotoBase64(student.photoBase64 || '');
        setExcludeFromPublicStats(student.excludeFromPublicStats || false);
      } else {
        setFirstName('');
        setLastName('');
        setPhotoBase64('');
        setExcludeFromPublicStats(false);
      }

      // Auto-focus first name input after modal renders
      const timer = setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, student]);

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const checkDuplicate = (): boolean => {
    return (students || []).some(s => 
      s.id !== student?.id &&
      s.firstName.trim().toLowerCase() === firstName.trim().toLowerCase() &&
      s.lastName.trim().toLowerCase() === lastName.trim().toLowerCase()
    );
  };

  const handleSaveAndContinue = async () => {
    if (!firstName.trim() || !lastName.trim() || isSaving) return;

    if (checkDuplicate()) {
      let cleared = false;
      const resetForm = () => {
        if (cleared) return;
        cleared = true;
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        setFirstName('');
        setLastName('');
        setPhotoBase64('');
        setTimeout(() => {
          firstNameInputRef.current?.focus();
        }, 50);
      };

      setDialogConfig({
        isOpen: true,
        title: 'Schüler existiert bereits',
        message: `Ein Schüler mit dem Namen "${firstName.trim()} ${lastName.trim()}" ist bereits vorhanden.`,
        type: 'warning',
        isAlert: true,
        confirmLabel: 'OK',
        onConfirm: resetForm
      });

      // Auto-dismiss after 2 seconds
      setTimeout(resetForm, 2000);
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...student,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        photoBase64: photoBase64 || "",
        excludeFromPublicStats
      }, true);
      
      // Clear inputs for the next student
      setFirstName('');
      setLastName('');
      setPhotoBase64('');
      setExcludeFromPublicStats(false);
    } catch (error) {
      console.error("Error saving student:", error);
    } finally {
      setIsSaving(false);
      // Wait for inputs to be re-enabled before focusing
      setTimeout(() => {
        firstNameInputRef.current?.focus();
      }, 50);
    }
  };

  const handleSaveAndClose = async () => {
    if (!firstName.trim() || !lastName.trim() || isSaving) return;

    if (checkDuplicate()) {
      setDialogConfig({
        isOpen: true,
        title: 'Schüler existiert bereits',
        message: `Ein Schüler mit dem Namen "${firstName.trim()} ${lastName.trim()}" ist bereits vorhanden.`,
        type: 'warning',
        isAlert: true,
        confirmLabel: 'OK',
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          onClose(); // Close the modal
        }
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...student,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        photoBase64: photoBase64 || "",
        excludeFromPublicStats
      }, false);
    } catch (error) {
      console.error("Error saving student:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) {
      handleSaveAndClose();
    } else {
      handleSaveAndContinue();
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={!isEditMode ? { maxWidth: '540px' } : undefined}>
        <div className="modal-header">
          <h3>{isEditMode ? 'Schüler bearbeiten' : 'Schüler hinzufügen'}</h3>
          <button type="button" className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Profilbild Upload Sektion */}
            <div className="student-photo-section" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <div className="avatar-preview-container" style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', border: '1px solid var(--border-color)', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {photoBase64 ? (
                  <>
                    <img src={photoBase64} alt="Vorschau" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={() => setPhotoBase64("")}
                      style={{ position: 'absolute', top: '2px', right: '2px', backgroundColor: 'rgba(15, 23, 42, 0.6)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', padding: 0 }}
                      title="Foto löschen"
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <User size={28} className="text-muted" style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              
              <div className="photo-upload-controls" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label className="btn-secondary btn-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', width: 'fit-content', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '500' }}>
                  <Camera size={14} /> Foto auswählen
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const base64 = await compressImageToBase64(file);
                          setPhotoBase64(base64);
                        } catch (err) {
                          console.error("Error compressing image:", err);
                        }
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>JPEG/PNG, wird auto-komprimiert</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Vorname</label>
              <input 
                ref={firstNameInputRef}
                type="text" 
                className="form-input" 
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                disabled={isSaving}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nachname</label>
              <input 
                type="text" 
                className="form-input" 
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && !e.shiftKey && !isEditMode && lastName.trim() !== "") {
                    e.preventDefault();
                    saveAndContinueRef.current?.focus();
                  }
                }}
                required
                disabled={isSaving}
              />
            </div>
            
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px' }}>
                <input 
                  type="checkbox" 
                  checked={excludeFromPublicStats} 
                  onChange={e => setExcludeFromPublicStats(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Von Auswertungs-Statistiken ausschließen</span>
              </label>
              <p style={{ margin: '4px 0 0 26px', fontSize: '13px', color: 'var(--text-muted)' }}>
                Der Schüler und seine Leistungen werden vollständig aus den Vollbild-Statistiken, Diagrammen und Ranglisten entfernt, um Rückschlüsse zu verhindern.
              </p>
            </div>
          </div>
          <div className="modal-footer" style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose} 
              disabled={isSaving} 
              style={{ flex: 1, minWidth: '120px', height: '40px', padding: '0 16px', fontSize: '14px', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              Abbrechen
            </button>
            {isEditMode ? (
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSaving} 
                style={{ flex: 1, minWidth: '120px', height: '40px', padding: '0 16px', fontSize: '14px', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Speichern
              </button>
            ) : (
              <>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={handleSaveAndClose} 
                  disabled={isSaving} 
                  style={{ flex: 1, minWidth: '120px', height: '40px', padding: '0 16px', fontSize: '14px', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Speichern & Schließen
                </button>
                <button 
                  ref={saveAndContinueRef}
                  type="submit" 
                  className="btn-primary" 
                  disabled={isSaving} 
                  style={{ flex: 1, minWidth: '120px', height: '40px', padding: '0 16px', fontSize: '14px', marginTop: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Speichern & Weiter
                </button>
              </>
            )}
          </div>
        </form>
      </div>
      
      <DialogModal 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmLabel={dialogConfig.confirmLabel}
        isAlert={dialogConfig.isAlert}
        onConfirm={dialogConfig.onConfirm}
        onClose={dialogConfig.onConfirm}
      />
    </div>,
    document.body
  );
};
