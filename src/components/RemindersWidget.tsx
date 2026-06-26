import { useState, useEffect } from 'react';
import { Calendar, Trash2, CheckCircle2, AlertCircle, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import { formatDate } from '../lib/utils';
import type { Reminder } from '../schema';

export const RemindersWidget = () => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showResolved, setShowResolved] = useState(false);
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

  const filteredReminders = reminders.filter(r => showResolved ? true : !r.resolved);
  const unresolvedCount = reminders.filter(r => !r.resolved).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner" style={{ width: '30px', height: '30px', borderColor: 'rgba(37, 99, 235, 0.3)', borderTopColor: '#2563eb' }} />
      </div>
    );
  }

  // Get current date string for checking overdue reminders
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="dashboard-card" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary-color)" /> Terminliste & Abklärungen
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            {unresolvedCount === 0 
              ? 'Keine offenen Abklärungen ausstehend.' 
              : `${unresolvedCount} offene ${unresolvedCount === 1 ? 'Abklärung' : 'Abklärungen'} ausstehend.`
            }
          </p>
        </div>
        
        <button 
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => setShowResolved(prev => !prev)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px' }}
        >
          {showResolved ? (
            <>
              <EyeOff size={14} /> Erledigte ausblenden
            </>
          ) : (
            <>
              <Eye size={14} /> Erledigte anzeigen
            </>
          )}
        </button>
      </div>

      {filteredReminders.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: '12px', opacity: 0.8 }} />
          <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)', margin: '0 0 4px 0' }}>Alles erledigt!</h4>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {showResolved ? 'Es gibt noch keine aufgezeichneten Erinnerungen.' : 'Keine offenen Fehlzeiten-Erinnerungen vorhanden.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredReminders.map((reminder) => {
            const isOverdue = !reminder.resolved && reminder.date < todayStr;
            return (
              <div 
                key={reminder.id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  borderRadius: '10px', 
                  background: reminder.resolved ? '#f8fafc' : isOverdue ? '#fff5f5' : '#ffffff', 
                  border: reminder.resolved 
                    ? '1px dashed #cbd5e1' 
                    : isOverdue 
                      ? '1px solid #fee2e2' 
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
                        fontSize: '14px', 
                        color: reminder.resolved ? 'var(--text-muted)' : 'var(--text-main)',
                        textDecoration: reminder.resolved ? 'line-through' : 'none' 
                      }}>
                        Abklärung: {reminder.studentName}
                      </span>
                      
                      {/* Overdue Badge */}
                      {isOverdue && (
                        <span style={{ 
                          fontSize: '10px', 
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
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Gruppe: <strong>{reminder.courseName}</strong> &bull; Grund: {reminder.anomalyType}
                    </div>

                    <div style={{ fontSize: '11px', color: isOverdue ? '#dc2626' : 'var(--text-muted)', marginTop: '6px', fontWeight: isOverdue ? '600' : 'normal' }}>
                      Fällig bis: {formatDate(reminder.date)}
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
