import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, AlertCircle, ArrowRight, GraduationCap } from 'lucide-react';
import { sqliteService } from '../services/sqliteService';

interface VaultLockScreenProps {
  onUnlock: () => void;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({ onUnlock }) => {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    sqliteService.isVaultConfigured().then(configured => {
      setIsConfigured(configured);
    });
  }, []);

  if (isConfigured === null) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#3b82f6' }} />
      </div>
    );
  }

  const handleKeypadPress = (val: string) => {
    setError(null);
    if (val === 'C') {
      setPin('');
    } else if (pin.length < 8) {
      setPin(prev => prev + val);
    }
  };

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Bitte Tresor-Code eingeben.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isValid = await sqliteService.verifyVaultCode(pin);
      if (isValid) {
        onUnlock();
      } else {
        setError('Ungültiger Tresor-Code! Access Denied.');
        setPin('');
      }
    } catch (err) {
      setError('Entsperrfehler.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setError('Der Tresor-Code muss mindestens 4 Zeichen lang sein.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Die eingegebenen Tresor-Codes stimmen nicht überein.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await sqliteService.setVaultCode(pin);
      onUnlock();
    } catch (err) {
      setError('Fehler beim Einrichten des Tresor-Codes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(30, 41, 59, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '36px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        color: 'white'
      }}>
        
        {/* Top Icon Badge */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: isConfigured ? 'rgba(37, 99, 235, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          border: isConfigured ? '2px solid rgba(37, 99, 235, 0.4)' : '2px solid rgba(16, 185, 129, 0.4)',
          color: isConfigured ? '#3b82f6' : '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          {isConfigured ? <Lock size={32} /> : <ShieldCheck size={32} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
          <GraduationCap size={20} color="#3b82f6" />
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>Chronograde Desktop</span>
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px 0', color: 'white' }}>
          {isConfigured ? 'Tresor gesperrt' : 'Tresor-Code festlegen'}
        </h2>

        <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.5 }}>
          {isConfigured 
            ? 'Geben Sie Ihren Tresor-Code ein, um Ihre lokale Noten-Datenbank zu entsperren.' 
            : 'Dies ist Ihr erster Start. Bitte legen Sie Ihren persönlichen Tresor-Code (mind. 4 Zeichen) fest.'
          }
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Lock / Setup Forms */}
        {isConfigured ? (
          <form onSubmit={handleUnlock}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="••••"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '28px',
                  letterSpacing: '8px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  outline: 'none'
                }}
                autoFocus
              />
            </div>

            {/* Keypad */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '↵'].map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === '↵') handleUnlock();
                    else handleKeypadPress(key);
                  }}
                  style={{
                    padding: '14px',
                    fontSize: '18px',
                    fontWeight: 600,
                    borderRadius: '12px',
                    background: key === '↵' ? '#2563eb' : key === 'C' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: key === 'C' ? '#fca5a5' : 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !pin}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isSubmitting || !pin ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Prüfe Tresor-Code...' : 'Tresor Entsperren'} <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', textAlign: 'left' }}>Neuen Tresor-Code eingeben (mind. 4 Zeichen)</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Neuer Code..."
                style={{
                  width: '100%',
                  fontSize: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  outline: 'none'
                }}
                autoFocus
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px', textAlign: 'left' }}>Tresor-Code bestätigen</label>
              <input
                type="password"
                value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)}
                placeholder="Code wiederholen..."
                style={{
                  width: '100%',
                  fontSize: '16px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  outline: 'none'
                }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || pin.length < 4 || pin !== confirmPin}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                opacity: isSubmitting || pin.length < 4 || pin !== confirmPin ? 0.6 : 1
              }}
            >
              {isSubmitting ? 'Richte Tresor ein...' : 'Tresor einrichten & App starten'} <ArrowRight size={18} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
