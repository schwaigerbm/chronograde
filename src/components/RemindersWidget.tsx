import { useState, useEffect } from 'react';
import { Calendar, Trash2, CheckCircle2, AlertCircle, CheckSquare, Square, Eye, EyeOff, Clock, ListFilter } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import { formatDate } from '../lib/utils';
import type { Reminder } from '../schema';

export const RemindersWidget = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAllTermine, setShowAllTermine] = useState(false); // false = "Nur aktuelle Termine", true = "Alle Termine"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = firebaseService.subscribeToReminders((data) => {
      setReminders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleResolve = async (id: string, currentResolved: boolean) => {
    try {
      await firebaseService.updateReminder(id, { resolved: !currentResolved });
    } catch (err) {
      console.error("Fehler beim Aktualisieren der Erinnerung:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await firebaseService.deleteReminder(id);
    } catch (err) {
      console.error("Fehler beim Löschen der Erinnerung:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', borderColor: 'rgba(37, 99, 235, 0.3)', borderTopColor: '#2563eb' }} />
      </div>
    );
  }

  // Get current date & time info for checking active/current reminders
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();

  // Helper to check if a reminder is currently due/active (due at or before today starting at 07:00 AM)
  const isCurrentReminder = (r: Reminder) => {
    if (r.resolved) return false;
    if (r.date < todayStr) return true; // Overdue
    if (r.date === todayStr && currentHour >= 7) return true; // Today starting at 07:00
    return false; // Future
  };

  const currentCount = reminders.filter(isCurrentReminder).length;
  const filteredReminders = reminders.filter(r => showAllTermine ? true : isCurrentReminder(r));

  return (
    <div className="dashboard-card" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary-color)" /> Terminliste & Abklärungen
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {currentCount === 0 
              ? 'Keine aktuellen Abklärungen ausstehend.' 
              : `${currentCount} aktuelle ${currentCount === 1 ? 'Abklärung' : 'Abklärungen'} ausstehend.`
            }
          </p>
        </div>
        
        {/* Toggle Switch: Nur aktuelle vs Alle Termine */}
        <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
          <button 
            type="button"
            className={`btn-xs ${!showAllTermine ? 'active-btn' : ''}`}
            onClick={() => setShowAllTermine(false)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: !showAllTermine ? 'white' : 'transparent',
              color: !showAllTermine ? 'var(--primary-color)' : 'var(--text-muted)',
              boxShadow: !showAllTermine ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: !showAllTermine ? '600' : 'normal',
              cursor: 'pointer'
            }}
          >
            <Clock size={14} /> Nur aktuelle Termine
          </button>
          <button 
            type="button"
            className={`btn-xs ${showAllTermine ? 'active-btn' : ''}`}
            onClick={() => setShowAllTermine(true)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: showAllTermine ? 'white' : 'transparent',
              color: showAllTermine ? 'var(--primary-color)' : 'var(--text-muted)',
              boxShadow: showAllTermine ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              fontWeight: showAllTermine ? '600' : 'normal',
              cursor: 'pointer'
            }}
          >
            <ListFilter size={14} /> Alle Termine
          </button>
        </div>
      </div>

      {filteredReminders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Keine aktuellen Termine!</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            {!showAllTermine 
              ? 'Für den heutigen Tag sind derzeit keine offenen Abklärungen ab 07:00 Uhr fällig.' 
              : 'Es gibt generell keine erfassten Erinnerungen.'
            }
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredReminders.map((reminder) => {
            const isOverdue = !reminder.resolved && reminder.date < todayStr;
            const isFuture = !reminder.resolved && (reminder.date > todayStr || (reminder.date === todayStr && currentHour < 7));

            return (
              <div 
                key={reminder.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  borderRadius: '10px', 
                  background: reminder.resolved ? '#f8fafc' : isOverdue ? '#fff5f5' : isFuture ? '#f0f9ff' : '#ffffff', 
                  border: reminder.resolved 
                    ? '1px dashed #cbd5e1' 
                    : isOverdue 
                      ? '1px solid #fee2e2' 
                      : isFuture 
                        ? '1px solid #bae6fd' 
                        : '1px solid var(--border-color)',
                  opacity: reminder.resolved ? 0.7 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                  {/* Resolve Checkbox Icon */}
                  <button 
                    onClick={() => handleToggleResolve(reminder.id, reminder.resolved)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      margin: '2px 0 0 0', 
                      cursor: 'pointer', 
                      color: reminder.resolved ? '#16a34a' : isOverdue ? '#ef4444' : 'var(--text-muted)' 
                    }}
                  >
                    {reminder.resolved ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontWeight: 'bold', 
                        fontSize: '16px', 
                        color: reminder.resolved ? 'var(--text-muted)' : 'var(--text-main)',
                        textDecoration: reminder.resolved ? 'line-through' : 'none' 
                      }}>
                        Abklärung: {reminder.studentName}
                      </span>
                      
                      {/* Overdue Badge */}
                      {isOverdue && (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          background: '#fee2e2', 
                          color: '#dc2626', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <AlertCircle size={10} /> Überfällig
                        </span>
                      )}

                      {/* Future Badge */}
                      {isFuture && (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          background: '#e0f2fe', 
                          color: '#0284c7', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <Clock size={10} /> Geplant (Ab 07:00 Uhr)
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Gruppe: <strong>{reminder.courseName}</strong>
                      <div style={{ marginTop: '4px', fontWeight: '600', color: 'var(--text-main)' }}>Auffälligkeiten:</div>
                      <ul style={{ margin: '2px 0 0 0', paddingLeft: '16px', listStyleType: 'disc' }}>
                        {reminder.anomalyType.split(', ').map((reason, idx) => (
                          <li key={idx} style={{ marginTop: '2px' }}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ fontSize: '13px', color: isOverdue ? '#dc2626' : 'var(--text-muted)', marginTop: '6px', fontWeight: isOverdue ? '600' : 'normal' }}>
                      Fällig ab: {formatDate(reminder.date)} (07:00 Uhr)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
                  <button 
                    className="btn-icon" 
                    onClick={() => handleDelete(reminder.id)}
                    style={{ color: '#ef4444', padding: '6px' }}
                    title="Erinnerung löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
