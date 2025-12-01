import { useEffect, useRef, useCallback } from 'react';
import { LyricLine } from '@/lib/lyrics';

interface LyricsWorkerMessage {
  type: 'FETCH_LYRICS' | 'PREFETCH_QUEUE' | 'START_POLLING' | 'STOP_POLLING' | 'UPDATE_POLLING_STATE'
    | 'START_SHARING' | 'STOP_SHARING' | 'UPDATE_SHARE_STATE' | 'JOIN_SHARING' | 'LEAVE_SHARING';
  data: any;
}

interface LyricsWorkerResponse {
  type: 'LYRICS_RESULT' | 'QUEUE_PREFETCHED' | 'ERROR' | 'PLAYBACK_STATE' | 'POLLING_ERROR'
    | 'SHARING_STARTED' | 'SHARING_STOPPED' | 'SHARING_ERROR' | 'CONNECTED_CLIENTS_UPDATE'
    | 'VIEWING_STARTED' | 'VIEWING_STOPPED' | 'VIEWING_ERROR' | 'SHARED_STATE_UPDATE';
  requestId?: string;
  spotifyId?: string;
  lyrics?: LyricLine[] | null;
  results?: Array<{ trackId: string; lyrics: LyricLine[] | null; videoIds?: string[]; success: boolean }>;
  error?: string;
  data?: any; // For playback state
  code?: string; // For sharing
  connectedClients?: number;
  state?: any; // For shared state
}

interface UseLyricsWorkerOptions {
  onLyricsReceived?: (spotifyId: string, lyrics: LyricLine[] | null) => void;
  onQueuePrefetched?: (results: Array<{ trackId: string; lyrics: LyricLine[] | null; videoIds?: string[]; success: boolean }>) => void;
  onPlaybackState?: (data: any) => void;
  onPollingError?: (error: string) => void;
  onError?: (error: string) => void;
  // Sharing callbacks
  onSharingStarted?: (code: string) => void;
  onSharingStopped?: () => void;
  onSharingError?: (error: string) => void;
  onConnectedClientsUpdate?: (count: number) => void;
  onViewingStarted?: (code: string) => void;
  onViewingStopped?: () => void;
  onViewingError?: (error: string) => void;
  onSharedStateUpdate?: (state: any) => void;
}

export function useLyricsWorker(options: UseLyricsWorkerOptions = {}) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdCounter = useRef(0);
  
  // Use refs for callbacks to avoid reinitializing worker
  const onLyricsReceivedRef = useRef(options.onLyricsReceived);
  const onQueuePrefetchedRef = useRef(options.onQueuePrefetched);
  const onPlaybackStateRef = useRef(options.onPlaybackState);
  const onPollingErrorRef = useRef(options.onPollingError);
  const onErrorRef = useRef(options.onError);
  const onSharingStartedRef = useRef(options.onSharingStarted);
  const onSharingStoppedRef = useRef(options.onSharingStopped);
  const onSharingErrorRef = useRef(options.onSharingError);
  const onConnectedClientsUpdateRef = useRef(options.onConnectedClientsUpdate);
  const onViewingStartedRef = useRef(options.onViewingStarted);
  const onViewingStoppedRef = useRef(options.onViewingStopped);
  const onViewingErrorRef = useRef(options.onViewingError);
  const onSharedStateUpdateRef = useRef(options.onSharedStateUpdate);
  
  // Update refs when callbacks change
  useEffect(() => {
    onLyricsReceivedRef.current = options.onLyricsReceived;
    onQueuePrefetchedRef.current = options.onQueuePrefetched;
    onPlaybackStateRef.current = options.onPlaybackState;
    onPollingErrorRef.current = options.onPollingError;
    onErrorRef.current = options.onError;
    onSharingStartedRef.current = options.onSharingStarted;
    onSharingStoppedRef.current = options.onSharingStopped;
    onSharingErrorRef.current = options.onSharingError;
    onConnectedClientsUpdateRef.current = options.onConnectedClientsUpdate;
    onViewingStartedRef.current = options.onViewingStarted;
    onViewingStoppedRef.current = options.onViewingStopped;
    onViewingErrorRef.current = options.onViewingError;
    onSharedStateUpdateRef.current = options.onSharedStateUpdate;
  }, [
    options.onLyricsReceived,
    options.onQueuePrefetched,
    options.onPlaybackState,
    options.onPollingError,
    options.onError,
    options.onSharingStarted,
    options.onSharingStopped,
    options.onSharingError,
    options.onConnectedClientsUpdate,
    options.onViewingStarted,
    options.onViewingStopped,
    options.onViewingError,
    options.onSharedStateUpdate,
  ]);

  // Initialize worker
  useEffect(() => {
    // Check if Worker is supported
    if (typeof Worker === 'undefined') {
      console.warn('⚠️ Web Workers not supported in this browser');
      return;
    }

    try {
      // Create worker - webpack will handle the bundling
      const worker = new Worker(new URL('../workers/lyrics.worker.ts', import.meta.url));
      workerRef.current = worker;

      // Handle messages from worker
      worker.onmessage = (event: MessageEvent<LyricsWorkerResponse>) => {
        const { type, spotifyId, lyrics, results, error, data, code, connectedClients, state } = event.data;

        switch (type) {
          case 'LYRICS_RESULT':
            if (spotifyId && onLyricsReceivedRef.current) {
              onLyricsReceivedRef.current(spotifyId, lyrics || null);
            }
            break;

          case 'QUEUE_PREFETCHED':
            if (results && onQueuePrefetchedRef.current) {
              onQueuePrefetchedRef.current(results);
            }
            break;

          case 'PLAYBACK_STATE':
            if (onPlaybackStateRef.current) {
              onPlaybackStateRef.current(data);
            }
            break;

          case 'POLLING_ERROR':
            console.error('❌ Polling error:', error);
            if (onPollingErrorRef.current) {
              onPollingErrorRef.current(error || 'Unknown polling error');
            }
            break;

          case 'ERROR':
            console.error('❌ Worker error:', error);
            if (onErrorRef.current) {
              onErrorRef.current(error || 'Unknown worker error');
            }
            break;

          case 'SHARING_STARTED':
            if (code && onSharingStartedRef.current) {
              onSharingStartedRef.current(code);
            }
            break;

          case 'SHARING_STOPPED':
            if (onSharingStoppedRef.current) {
              onSharingStoppedRef.current();
            }
            break;

          case 'SHARING_ERROR':
            if (error && onSharingErrorRef.current) {
              onSharingErrorRef.current(error);
            }
            break;

          case 'CONNECTED_CLIENTS_UPDATE':
            if (connectedClients !== undefined && onConnectedClientsUpdateRef.current) {
              onConnectedClientsUpdateRef.current(connectedClients);
            }
            break;

          case 'VIEWING_STARTED':
            if (code && onViewingStartedRef.current) {
              onViewingStartedRef.current(code);
            }
            break;

          case 'VIEWING_STOPPED':
            if (onViewingStoppedRef.current) {
              onViewingStoppedRef.current();
            }
            break;

          case 'VIEWING_ERROR':
            if (error && onViewingErrorRef.current) {
              onViewingErrorRef.current(error);
            }
            break;

          case 'SHARED_STATE_UPDATE':
            if (state && onSharedStateUpdateRef.current) {
              onSharedStateUpdateRef.current(state);
            }
            break;
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        if (onErrorRef.current) {
          onErrorRef.current(error.message);
        }
      };

      return () => {
        worker.terminate();
      };
    } catch (error) {
      console.error('❌ Failed to create lyrics worker:', error);
      if (onErrorRef.current) {
        onErrorRef.current('Failed to initialize worker');
      }
    }
  }, []); // Empty deps - worker should only init once!

  /**
   * Fetch lyrics for a single track (off main thread)
   */
  const fetchLyrics = useCallback(
    (trackName: string, artistName: string, duration: number, spotifyId?: string) => {
      if (!workerRef.current) {
        console.warn('⚠️ Worker not initialized, cannot fetch lyrics');
        return;
      }

      const requestId = `lyrics-${++requestIdCounter.current}`;

      workerRef.current.postMessage({
        type: 'FETCH_LYRICS',
        data: {
          trackName,
          artistName,
          duration,
          spotifyId,
          requestId,
        },
      });
    },
    []
  );

  /**
   * Prefetch lyrics for queue (off main thread)
   */
  const prefetchQueue = useCallback(
    (queue: Array<{ id: string; name: string; artists: Array<{ name: string }>; duration_ms: number }>, maxTracks = 5) => {
      if (!workerRef.current) {
        console.warn('⚠️ Worker not initialized, cannot prefetch queue');
        return;
      }

      workerRef.current.postMessage({
        type: 'PREFETCH_QUEUE',
        data: {
          queue,
          maxTracks,
        },
      });
    },
    []
  );

  /**
   * Start Spotify polling in worker
   */
  const startPolling = useCallback((accessToken: string) => {
    if (!workerRef.current) {
      console.warn('⚠️ Worker not initialized, cannot start polling');
      return;
    }

    workerRef.current.postMessage({
      type: 'START_POLLING',
      data: { accessToken },
    });
  }, []);

  /**
   * Stop Spotify polling
   */
  const stopPolling = useCallback(() => {
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'STOP_POLLING',
      data: {},
    });
  }, []);

  /**
   * Update polling state (for smart interval calculation)
   */
  const updatePollingState = useCallback((isPlaying: boolean, currentProgress: number, duration: number) => {
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'UPDATE_POLLING_STATE',
      data: { isPlaying, currentProgress, duration },
    });
  }, []);

  /**
   * Start sharing - create a shared session
   */
  const startSharing = useCallback((savedCode?: string) => {
    if (!workerRef.current) {
      console.warn('⚠️ Worker not initialized, cannot start sharing');
      return;
    }

    workerRef.current.postMessage({
      type: 'START_SHARING',
      data: { savedCode },
    });
  }, []);

  /**
   * Stop sharing
   */
  const stopSharing = useCallback(() => {
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'STOP_SHARING',
      data: {},
    });
  }, []);

  /**
   * Update share state (for host)
   */
  const updateShareState = useCallback((state: any) => {
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'UPDATE_SHARE_STATE',
      data: state,
    });
  }, []);

  /**
   * Join sharing (for viewer)
   */
  const joinSharing = useCallback((code: string) => {
    if (!workerRef.current) {
      console.warn('⚠️ Worker not initialized, cannot join sharing');
      return;
    }

    workerRef.current.postMessage({
      type: 'JOIN_SHARING',
      data: { code },
    });
  }, []);

  /**
   * Leave sharing (for viewer)
   */
  const leaveSharing = useCallback(() => {
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'LEAVE_SHARING',
      data: {},
    });
  }, []);

  return {
    fetchLyrics,
    prefetchQueue,
    startPolling,
    stopPolling,
    updatePollingState,
    startSharing,
    stopSharing,
    updateShareState,
    joinSharing,
    leaveSharing,
    isWorkerReady: !!workerRef.current,
  };
}

