import { useEffect, useRef } from 'react';

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 Minutes in milliseconds

export const useInactivityTimer = (isLocked: boolean, onLock: () => void) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!isLocked) {
      timerRef.current = setTimeout(() => {
        onLock();
      }, INACTIVITY_LIMIT_MS);
    }
  };

  useEffect(() => {
    if (isLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    
    const handleUserActivity = () => {
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isLocked]);
};
