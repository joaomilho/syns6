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
      return;
    }

    const requestWakeLock = async () => {
      // Only request wake lock if page is visible
      if (document.visibilityState !== 'visible') {
        return;
      }
      
      // Don't request if we already have one
      if (wakeLockRef.current !== null) {
        return;
      }
      
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setIsActive(true);

        // Listen for wake lock release
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
          setIsActive(false);
        });
      } catch {
        // Silently fail - will retry when page becomes visible
        setIsActive(false);
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Re-acquire wake lock when page becomes visible again
        await requestWakeLock();
      }
    };

    // Request initial wake lock (only if page is visible)
    requestWakeLock();

    // Re-acquire wake lock when page becomes visible (after being hidden/minimized)
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wakeLockRef.current !== null) {
        wakeLockRef.current.release()
          .then(() => {
            wakeLockRef.current = null;
            setIsActive(false);
          })
          .catch(() => {});
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
      } catch {
        // Ignore release errors
      }
    }
  };

  return {
    isSupported,
    isActive,
    release,
  };
}

