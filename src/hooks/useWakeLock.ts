import { useState, useEffect, useRef, useCallback } from 'react';

export const useWakeLock = (shouldBeActive: boolean) => {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Función interna para solicitar el bloqueo
  const requestLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        setIsLocked(true);
        console.log('🔒 Wake Lock ACTIVO');

        // Si el bloqueo se suelta (ej: cambio de pestaña), actualizamos estado
        sentinel.addEventListener('release', () => {
          console.log('🔓 Wake Lock LIBERADO');
          setIsLocked(false);
        });
      } catch (err) {
        console.error('❌ Error Wake Lock:', err);
        setIsLocked(false);
      }
    }
  }, []);

  // Función para soltar manualmente
  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsLocked(false);
    }
  }, []);

  // Efecto principal: Reacciona a shouldBeActive y visibilidad
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Si volvemos a la app y debería estar activa, re-solicitamos
      if (document.visibilityState === 'visible' && shouldBeActive) {
        requestLock();
      }
    };

    if (shouldBeActive) {
      requestLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } else {
      releaseLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      releaseLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [shouldBeActive, requestLock, releaseLock]);

  return { isLocked };
};