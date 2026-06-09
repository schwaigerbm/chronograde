import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

interface DialogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'danger' | 'success';
  confirmLabel?: string;
  cancelLabel?: string;
  isAlert?: boolean;
}

export const DialogModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'info',
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  isAlert = false
}: DialogModalProps) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
      case 'danger':
        return <AlertTriangle size={32} className="text-warning" style={{ color: type === 'danger' ? 'var(--danger-color)' : '#d97706' }} />;
      case 'success':
        return <CheckCircle2 size={32} style={{ color: '#16a34a' }} />;
      default:
        return <Info size={32} style={{ color: 'var(--primary-color)' }} />;
    }
  };

  const getConfirmBtnClass = () => {
    if (type === 'danger') return 'btn-primary'; // Could be a red button if defined in CSS
    return 'btn-primary';
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
        <button className="btn-icon" onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px' }}>
          <X size={20} />
        </button>

        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          {getIcon()}
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-main)' }}>
          {title}
        </h3>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {!isAlert && (
            <button className="btn-secondary" onClick={onClose} style={{ minWidth: '100px' }}>
              {cancelLabel}
            </button>
          )}
          <button 
            className={getConfirmBtnClass()} 
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            style={{ 
              minWidth: '100px', 
              backgroundColor: type === 'danger' ? 'var(--danger-color)' : undefined,
              borderColor: type === 'danger' ? 'var(--danger-color)' : undefined
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
