import { useEffect, useRef } from 'react';

interface UseSmartPollingOptions {
  isEnabled: boolean;
  playbackState: any;
  currentProgress: number;
  onFetchPlayback: () => Promise<void>;
  onFetchQueue?: () => Promise<void>;
  queueInterval?: number; // Default: 10000ms
}

/**
 * Smart adaptive polling hook for Spotify API
 * 
 * Initial behavior:
 * - Fetches playback state once on mount
 * - Fetches queue once on mount
 * - Waits 3 seconds before starting polling loop (prevents rate limiting on page load)
 * 
 * Polling frequency based on playback state:
 * - No song playing: 3s (detect playback start without rate limiting)
 * - Song ending in 3s: 1s (catch track changes quickly)
 * - Song ending in 15s: 3s (prepare for transition)
 * - Normal playback: 5s (standard polling)
 * - Paused: 5s (minimal API calls)
 * - Tab hidden: Paused (save resources)
 * - Errors: Exponential backoff (5s → 10s → 20s → max 30s)
 * 
 * Rate-limit friendly approach - prevents Spotify API throttling.
 */
export function useSmartPolling({
  isEnabled,
  playbackState,
  currentProgress,
  onFetchPlayback,
  onFetchQueue,
  queueInterval = 10000,
}: UseSmartPollingOptions) {
  const playbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const queueIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isPageVisibleRef = useRef(true);
  const errorCountRef = useRef(0);
  
  // Use refs for callbacks to prevent recreating the polling loop
  const onFetchPlaybackRef = useRef(onFetchPlayback);
  const onFetchQueueRef = useRef(onFetchQueue);
  const playbackStateRef = useRef(playbackState);
  const currentProgressRef = useRef(currentProgress);
  
  // Update refs when values change (doesn't trigger useEffect)
  useEffect(() => {
    onFetchPlaybackRef.current = onFetchPlayback;
    onFetchQueueRef.current = onFetchQueue;
    playbackStateRef.current = playbackState;
    currentProgressRef.current = currentProgress;
  }, [onFetchPlayback, onFetchQueue, playbackState, currentProgress]);

  useEffect(() => {
    if (!isEnabled) return;

    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
      if (isPageVisibleRef.current) {
        // Resume polling immediately when tab becomes visible
        errorCountRef.current = 0; // Reset error count
        scheduleFetch();
      } else {
        // Clear timeout when tab is hidden
        if (playbackTimeoutRef.current) {
          clearTimeout(playbackTimeoutRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const scheduleFetch = async () => {
      if (!isPageVisibleRef.current) return; // Don't poll when tab is hidden

      try {
        await onFetchPlaybackRef.current();
        errorCountRef.current = 0; // Reset on success

        // Determine next polling interval based on state (using refs!)
        const state = playbackStateRef.current;
        const progress = currentProgressRef.current;
        let nextInterval = 5000; // Default: 5 seconds

        if (!state?.item) {
          // No song playing - poll to detect start (not too aggressive to avoid rate limits)
          nextInterval = 666; // 0.666 seconds
        } else if (state?.is_playing) {
          const timeRemaining = (state.item.duration_ms || 0) - progress;
          
          if (timeRemaining <= 1000 && timeRemaining > 0) {
            // Song ending in 3 seconds - poll more frequently
            nextInterval = 0.333 * 1000; // 0.333 second
          } else if (timeRemaining <= 3000) {
            nextInterval = 666; // 0.666 seconds
          } else if (timeRemaining <= 15000) {
            // Song ending in 15 seconds - poll a bit more frequently
            nextInterval = 3000; // 3 seconds
          } else {
            // Normal playback - standard polling
            nextInterval = 5000; // 5 seconds
          }
        } else {
          // Paused - poll less frequently to save API calls
          nextInterval = 666; // 0.666 seconds
        }

        playbackTimeoutRef.current = setTimeout(scheduleFetch, nextInterval);
      } catch (err) {
        console.error("Smart polling error:", err);
        errorCountRef.current++;
        
        // Exponential backoff on errors: 5s, 10s, 20s, max 30s
        const backoffInterval = Math.min(5000 * Math.pow(2, errorCountRef.current - 1), 30000);
        playbackTimeoutRef.current = setTimeout(scheduleFetch, backoffInterval);
      }
    };

    // Initial fetch on mount
    const initializeFetch = async () => {
      try {
        await onFetchPlaybackRef.current();
        if (onFetchQueueRef.current) {
          await onFetchQueueRef.current();
        }
        errorCountRef.current = 0;
      } catch (err) {
        console.error("Initial fetch error:", err);
        errorCountRef.current = 1;
      }
      
      // Start polling after initial fetch completes + 3 second delay
      // This prevents hammering the API on page load
      playbackTimeoutRef.current = setTimeout(scheduleFetch, 3000);
    };

    // Start with initial fetch (only once)
    initializeFetch();

    // Queue updates at fixed interval (less critical)
    if (onFetchQueueRef.current) {
      queueIntervalRef.current = setInterval(() => {
        if (isPageVisibleRef.current && onFetchQueueRef.current) {
          onFetchQueueRef.current();
        }
      }, queueInterval);
    }

    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current);
      }
      if (queueIntervalRef.current) {
        clearInterval(queueIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled, queueInterval]); // ONLY depend on isEnabled and queueInterval - NOT on playback state!
}

