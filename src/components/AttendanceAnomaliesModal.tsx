import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, User, Check } from 'lucide-react';
import type { Anomaly } from '../lib/anomalyDetector';
import type { Reminder } from '../schema';

export interface AnomalyResult {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  violations: Anomaly[];
  date: string; // The date of the attendance being saved
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
  const [createReminder, setCreateReminder] = useState(true);
  const [reminderDate, setReminderDate] = useState('');

  // Reset index and set default date when queue changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setCreateReminder(true);
      if (anomaliesQueue.length > 0) {
        // Default reminder date is 1 week (7 days) after the triggering attendance date
        const triggerDate = new Date(anomaliesQueue[0].date);
        triggerDate.setDate(triggerDate.getDate() + 7);
        setReminderDate(triggerDate.toISOString().split('T')[0]);
      }
    }
  }, [isOpen, anomaliesQueue]);

  // Update default reminder date when index changes
  useEffect(() => {
    if (isOpen && anomaliesQueue[currentIndex]) {
      const triggerDate = new Date(anomaliesQueue[currentIndex].date);
      triggerDate.setDate(triggerDate.getDate() + 7);
      setReminderDate(triggerDate.toISOString().split('T')[0]);
    }
  }, [currentIndex, isOpen, anomaliesQueue]);

  if (!isOpen || anomaliesQueue.length === 0 || currentIndex >= anomaliesQueue.length) {
    return null;
  }

  const current = anomaliesQueue[currentIndex];

  const handleNext = async () => {
    let reminderData: Omit<Reminder, 'id'> | null = null;
    if (createReminder) {
      const violationsStr = current.violations.map(v => v.message).join(', ');
      reminderData = {
        studentId: current.studentId,
        studentName: current.studentName,
        courseId: current.courseId,
        courseName: current.courseName,
        anomalyType: violationsStr,
        date: reminderDate,
        resolved: false,
        createdAt: new Date().toISOString()
      };
    }

    await onConfirm(reminderData);

    if (currentIndex + 1 < anomaliesQueue.length) {
      setCurrentIndex(prev => prev + 1);
      setCreateReminder(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={{ maxWidth: '500px', borderTop: '4px solid var(--danger-color)' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-color)' }}>
            <AlertTriangle size={22} /> Fehlzeiten-Auffälligkeit
          </h3>
          <span style={{ fontSize: '13px', fontWeight: 'bold', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px' }}>
            Schüler {currentIndex + 1} von {anomaliesQueue.length}
          </span>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {/* Student Info Card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '8px', borderRadius: '50%' }}>
              <User size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text-main)' }}>{current.studentName}</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Gruppe: {current.courseName}</div>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            Für diesen Schüler wurden bei der heutigen Anwesenheitserfassung ({current.date}) folgende Auffälligkeiten festgestellt:
          </p>

          {/* Anomaly Violations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            {current.violations.map((violation, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '8px', 
                  background: '#fef2f2', 
                  border: '1px solid #fee2e2', 
                  padding: '10px 12px', 
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                <span style={{ marginTop: '2px' }}>•</span>
                <span>{violation.message}</span>
              </div>
            ))}
          </div>

          {/* Reminder Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', marginBottom: '12px' }}>
              <input 
                type="checkbox" 
                checked={createReminder} 
                onChange={(e) => setCreateReminder(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                Abklärungserinnerung für den nächsten Termin erstellen
              </span>
            </label>

            {createReminder && (
              <div className="form-group" style={{ marginLeft: '24px', display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                <label className="form-label" style={{ fontSize: '13px' }}>Erinnerungsdatum</label>
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
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '14px 24px', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button 
            className="btn-primary" 
            onClick={handleNext}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '8px 16px', fontSize: '14px', marginLeft: 'auto' }}
          >
            {currentIndex + 1 < anomaliesQueue.length ? 'Bestätigen & Weiter' : 'Bestätigen & Schließen'} <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
