import { useEffect, useRef, useState } from 'react';

/**
 * Hook to prevent the screen from going to sleep using the Screen Wake Lock API.
 * Automatically handles visibility changes and re-acquires the lock when the page becomes visible again.
 * 
 * @returns An object with the wake lock status and a manual release function
 */
export function useWakeLock() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    // Check if Wake Lock API is supported
    if ('wakeLock' in navigator) {
      setIsSupported(true);
    } else {
      console.warn('⚠️ Wake Lock API is not supported in this browser');
      return;
    }

    const requestWakeLock = async () => {
      try {
        // Request a screen wake lock
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsActive(true);
        console.log('🔒 Wake Lock acquired - screen will stay awake');

        // Listen for wake lock release
        wakeLockRef.current.addEventListener('release', () => {
          console.log('🔓 Wake Lock released');
          setIsActive(false);
        });
      } catch (err) {
        console.error('❌ Failed to acquire Wake Lock:', err);
        setIsActive(false);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
        // Re-acquire wake lock when page becomes visible again
        await requestWakeLock();
      }
    };

    // Request initial wake lock
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible (after being hidden/minimized)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release()
          .then(() => {
            console.log('🔓 Wake Lock released on cleanup');
            wakeLockRef.current = null;
            setIsActive(false);
          })
          .catch((err) => {
            console.error('❌ Failed to release Wake Lock:', err);
          });
      }
    };
  }, []);

  // Manual release function (if needed)
  const release = async () => {
    if (wakeLockRef.current !== null) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('🔓 Wake Lock manually released');
      } catch (err) {
        console.error('❌ Failed to manually release Wake Lock:', err);
      }
    }
  };

  return {
    isSupported,
    isActive,
    release,
  };
}

