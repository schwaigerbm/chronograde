import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, User, Check, X } from 'lucide-react';
import type { Anomaly } from '../lib/anomalyDetector';
import type { Reminder } from '../schema';

export interface AnomalyResult {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  violations: Anomaly[];
  date: string;
}

interface AttendanceAnomaliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaliesQueue: AnomalyResult[];
  onConfirm: (reminder: Omit<Reminder, 'id'> | null) => Promise<void>;
}

export const AttendanceAnomaliesModal = ({
  isOpen,
  onClose,
  anomaliesQueue,
  onConfirm
}: AttendanceAnomaliesModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reminderDate, setReminderDate] = useState('');

  useEffect(() => {
    if (isOpen && anomaliesQueue.length > 0) {
      setCurrentIndex(0);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setReminderDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [isOpen, anomaliesQueue]);

  useEffect(() => {
    if (isOpen && anomaliesQueue[currentIndex]) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setReminderDate(tomorrow.toISOString().split('T')[0]);
    }
  }, [currentIndex, isOpen, anomaliesQueue]);

  if (!isOpen || anomaliesQueue.length === 0 || currentIndex >= anomaliesQueue.length) {
    return null;
  }

  const current = anomaliesQueue[currentIndex];
  const violationsStr = current.violations.map(v => v.message).join(', ');

  const handleConfirmYes = async () => {
    const reminderData: Omit<Reminder, 'id'> = {
      studentId: current.studentId,
      studentName: current.studentName,
      courseId: current.courseId,
      courseName: current.courseName,
      title: `Abklärung: ${current.studentName}`,
      description: `Fehlzeiten-Auffälligkeit (${violationsStr}) für ${current.studentName} in Gruppe ${current.courseName}.`,
      anomalyType: violationsStr,
      type: 'attendance_anomaly',
      color: 'rose',
      date: reminderDate,
      dueTime: '07:00',
      resolved: false,
      createdAt: new Date().toISOString()
    };

    await onConfirm(reminderData);
    advanceQueue();
  };

  const handleSkipNo = async () => {
    await onConfirm(null);
    advanceQueue();
  };

  const advanceQueue = () => {
    if (currentIndex + 1 < anomaliesQueue.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={{ maxWidth: '520px', borderTop: '4px solid var(--danger-color)' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-color)', margin: 0, fontSize: '18px' }}>
            <AlertTriangle size={22} /> Fehlzeiten-Auffälligkeit
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626', padding: '2px 10px', borderRadius: '12px' }}>
            Schüler {currentIndex + 1} von {anomaliesQueue.length}
          </span>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Student Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-primary)' }}>{current.studentName}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Gruppe: {current.courseName}</div>
            </div>
          </div>

          {/* Question Text */}
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '14px 16px', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: '#991b1b', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
              Für den Schüler <strong>{current.studentName}</strong> liegt eine Auffälligkeit vor (<em>{violationsStr}</em>).
            </p>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#7f1d1d', margin: '8px 0 0 0' }}>
              Soll ein Abklärungstermin mit Fälligkeitsdatum in der Terminliste eingetragen werden?
            </p>
          </div>

          {/* Due Date Picker */}
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label className="form-label font-semibold" style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>
              Fälligkeitsdatum für den Abklärungstermin:
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="date" 
                className="form-input" 
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '14px 20px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button 
            type="button"
            className="btn-secondary" 
            onClick={handleSkipNo}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '13px' }}
          >
            <X size={16} /> Nein, überspringen
          </button>
          <button 
            type="button"
            className="btn-primary" 
            onClick={handleConfirmYes}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', fontSize: '13px' }}
          >
            <Check size={16} /> Ja, Termin eintragen
          </button>
        </div>
      </div>
    </div>
  );
};
