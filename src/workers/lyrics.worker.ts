/**
 * Lyrics Worker - TypeScript implementation
 * Handles background lyrics fetching, queue prefetching, and Spotify polling
 */

import { fetchSyncedLyrics, LyricLine } from '@/lib/lyrics';

interface WorkerMessage {
  type: 'FETCH_LYRICS' | 'PREFETCH_QUEUE' | 'START_POLLING' | 'STOP_POLLING' | 'UPDATE_POLLING_STATE';
  data: any;
}

interface LyricsRequest {
  trackName: string;
  artistName: string;
  duration: number;
  spotifyId?: string;
  requestId?: string;
}

interface QueuePrefetchRequest {
  queue: Array<{
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    duration_ms: number;
  }>;
  maxTracks?: number;
}

interface StartPollingRequest {
  accessToken: string;
}

interface UpdatePollingStateRequest {
  isPlaying: boolean;
  currentProgress: number;
  duration: number;
}

// Polling state
let pollingTimeout: NodeJS.Timeout | null = null;
let accessToken: string | null = null;
let isPollingActive = false;
let currentPlaybackState: {
  isPlaying: boolean;
  currentProgress: number;
  duration: number;
} = {
  isPlaying: false,
  currentProgress: 0,
  duration: 0,
};

/**
 * Fetch currently playing track from Spotify
 */
async function fetchCurrentlyPlaying(token: string) {
  const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    // No content - nothing playing
    return null;
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return await response.json();
}

/**
 * Smart polling logic (same as useSmartPolling but in worker)
 */
function calculateNextInterval(): number {
  const { isPlaying, currentProgress, duration } = currentPlaybackState;
  
  if (!duration || duration === 0) {
    // No song playing - poll to detect start
    return 666; // 0.666 seconds
  }
  
  if (isPlaying) {
    const timeRemaining = duration - currentProgress;
    
    if (timeRemaining <= 1000 && timeRemaining > 0) {
      // Song ending in 1 second - poll very frequently
      return 333; // 0.333 seconds
    } else if (timeRemaining <= 3000) {
      // Song ending in 3 seconds - poll frequently
      return 666; // 0.666 seconds
    } else if (timeRemaining <= 15000) {
      // Song ending in 15 seconds - poll a bit more
      return 3000; // 3 seconds
    } else {
      // Normal playback - standard polling
      return 5000; // 5 seconds
    }
  } else {
    // Paused - poll less frequently
    return 666; // 0.666 seconds
  }
}

/**
 * Start the polling loop
 */
async function pollSpotify() {
  if (!isPollingActive || !accessToken) {
    return;
  }

  try {
    const data = await fetchCurrentlyPlaying(accessToken);
    
    // Send result back to main thread
    self.postMessage({
      type: 'PLAYBACK_STATE',
      data,
    });
    
    // Calculate next interval
    const nextInterval = calculateNextInterval();
    
    // Schedule next poll
    pollingTimeout = setTimeout(pollSpotify, nextInterval);
  } catch (error: any) {
    console.error('[Worker] Spotify polling error:', error);
    
    // Send error to main thread
    self.postMessage({
      type: 'POLLING_ERROR',
      error: error.message,
    });
    
    // Retry with backoff (5 seconds)
    pollingTimeout = setTimeout(pollSpotify, 5000);
  }
}

/**
 * Start polling
 */
function startPolling(token: string) {
  accessToken = token;
  isPollingActive = true;
  
  // Clear any existing timeout
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
  }
  
  // Start polling immediately
  pollSpotify();
}

/**
 * Stop polling
 */
function stopPolling() {
  isPollingActive = false;
  
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }
}

// Message handler
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'FETCH_LYRICS': {
        const { trackName, artistName, duration, spotifyId, requestId } = data as LyricsRequest;
        
        const lyrics = await fetchSyncedLyrics(trackName, artistName, duration, spotifyId);
        
        self.postMessage({
          type: 'LYRICS_RESULT',
          requestId,
          spotifyId,
          lyrics,
        });
        break;
      }

      case 'PREFETCH_QUEUE': {
        const { queue, maxTracks = 5 } = data as QueuePrefetchRequest;
        
        // Fetch lyrics for first N tracks in parallel
        const prefetchPromises = queue.slice(0, maxTracks).map(async (track) => {
          try {
            const lyrics = await fetchSyncedLyrics(
              track.name,
              track.artists?.[0]?.name || 'Unknown Artist',
              track.duration_ms,
              track.id
            );
            return { trackId: track.id, lyrics, success: true };
          } catch (error: any) {
            return { trackId: track.id, lyrics: null, success: false, error: error.message };
          }
        });
        
        const results = await Promise.all(prefetchPromises);
        
        self.postMessage({
          type: 'QUEUE_PREFETCHED',
          results,
        });
        break;
      }

      case 'START_POLLING': {
        const { accessToken: token } = data as StartPollingRequest;
        startPolling(token);
        break;
      }

      case 'STOP_POLLING': {
        stopPolling();
        break;
      }

      case 'UPDATE_POLLING_STATE': {
        const { isPlaying, currentProgress, duration } = data as UpdatePollingStateRequest;
        currentPlaybackState = { isPlaying, currentProgress, duration };
        break;
      }

      default:
        console.warn(`[Worker] Unknown message type: ${type}`);
    }
  } catch (error: any) {
    console.error('[Worker] Error:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      originalType: type,
    });
  }
});

// Export empty object to make TypeScript happy
export {};

