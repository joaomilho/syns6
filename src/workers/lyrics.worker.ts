/**
 * Lyrics Worker - TypeScript implementation
 * Handles background lyrics fetching and queue prefetching
 */

import { fetchSyncedLyrics, LyricLine } from '@/lib/lyrics';

console.log('[Worker] Module loaded, fetchSyncedLyrics available:', typeof fetchSyncedLyrics);

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
  console.log('[Worker] 🔔 Message received, type:', event.data?.type);
  
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'FETCH_LYRICS': {
        const { trackName, artistName, duration, spotifyId, requestId } = data as LyricsRequest;
        
        console.log(`[Worker] 📥 Received FETCH_LYRICS request for: ${trackName}`);
        console.log(`[Worker] Data:`, { trackName, artistName, duration, spotifyId });
        console.log(`[Worker] fetchSyncedLyrics function:`, fetchSyncedLyrics);
        console.log(`[Worker] 🔄 Starting fetchSyncedLyrics...`);
        
        try {
          const startTime = Date.now();
          const lyrics = await fetchSyncedLyrics(trackName, artistName, duration, spotifyId);
          const duration_ms = Date.now() - startTime;
          
          console.log(`[Worker] ✅ Fetch complete in ${duration_ms}ms! Result:`, lyrics);
          console.log(`[Worker] Lyrics type:`, typeof lyrics, 'Is array:', Array.isArray(lyrics), 'Length:', lyrics?.length);
          
          self.postMessage({
            type: 'LYRICS_RESULT',
            requestId,
            spotifyId,
            lyrics,
          });
          
          console.log(`[Worker] 📤 Response sent back to main thread`);
        } catch (fetchError) {
          console.error(`[Worker] ❌ Error in fetchSyncedLyrics:`, fetchError);
          console.error(`[Worker] Error stack:`, (fetchError as Error).stack);
          self.postMessage({
            type: 'LYRICS_RESULT',
            requestId,
            spotifyId,
            lyrics: null,
          });
        }
        break;
      }

      case 'PREFETCH_QUEUE': {
        const { queue, maxTracks = 5 } = data as QueuePrefetchRequest;
        
        console.log(`[Worker] Prefetching lyrics for ${Math.min(queue.length, maxTracks)} tracks...`);
        
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
            console.error(`[Worker] Failed to prefetch lyrics for ${track.name}:`, error);
            return { trackId: track.id, lyrics: null, success: false, error: error.message };
          }
        });
        
        const results = await Promise.all(prefetchPromises);
        
        const successCount = results.filter(r => r.success).length;
        console.log(`[Worker] Prefetched ${successCount}/${results.length} tracks`);
        
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

console.log('[Worker] Lyrics worker initialized and ready');

// Export empty object to make TypeScript happy
export {};

