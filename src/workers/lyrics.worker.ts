/**
 * Lyrics Worker - TypeScript implementation
 * Handles background lyrics fetching and queue prefetching
 */

import { fetchSyncedLyrics, LyricLine } from '@/lib/lyrics';

interface WorkerMessage {
  type: 'FETCH_LYRICS' | 'PREFETCH_QUEUE';
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

