import { useEffect, useRef, useCallback } from 'react';
import { LyricLine } from '@/lib/lyrics';

interface LyricsWorkerMessage {
  type: 'FETCH_LYRICS' | 'PREFETCH_QUEUE' | 'START_POLLING' | 'STOP_POLLING' | 'UPDATE_POLLING_STATE';
  data: any;
}

interface LyricsWorkerResponse {
  type: 'LYRICS_RESULT' | 'QUEUE_PREFETCHED' | 'ERROR' | 'PLAYBACK_STATE' | 'POLLING_ERROR';
  requestId?: string;
  spotifyId?: string;
  lyrics?: LyricLine[] | null;
  results?: Array<{ trackId: string; lyrics: LyricLine[] | null; success: boolean }>;
  error?: string;
  data?: any; // For playback state
}

interface UseLyricsWorkerOptions {
  onLyricsReceived?: (spotifyId: string, lyrics: LyricLine[] | null) => void;
  onQueuePrefetched?: (results: Array<{ trackId: string; lyrics: LyricLine[] | null; success: boolean }>) => void;
  onPlaybackState?: (data: any) => void;
  onPollingError?: (error: string) => void;
  onError?: (error: string) => void;
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
  
  // Update refs when callbacks change
  useEffect(() => {
    onLyricsReceivedRef.current = options.onLyricsReceived;
    onQueuePrefetchedRef.current = options.onQueuePrefetched;
    onPlaybackStateRef.current = options.onPlaybackState;
    onPollingErrorRef.current = options.onPollingError;
    onErrorRef.current = options.onError;
  }, [options.onLyricsReceived, options.onQueuePrefetched, options.onPlaybackState, options.onPollingError, options.onError]);

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
        const { type, spotifyId, lyrics, results, error, data } = event.data;

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

  return {
    fetchLyrics,
    prefetchQueue,
    startPolling,
    stopPolling,
    updatePollingState,
    isWorkerReady: !!workerRef.current,
  };
}

