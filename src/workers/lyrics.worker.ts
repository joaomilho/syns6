/**
 * Lyrics Worker - TypeScript implementation
 * Handles background lyrics fetching, queue prefetching, and Spotify polling
 */

import { fetchSyncedLyrics, LyricLine } from '@/lib/lyrics';

interface WorkerMessage {
  type: 'FETCH_LYRICS' | 'PREFETCH_QUEUE' | 'START_POLLING' | 'STOP_POLLING' | 'UPDATE_POLLING_STATE' 
    | 'START_SHARING' | 'STOP_SHARING' | 'UPDATE_SHARE_STATE' | 'JOIN_SHARING' | 'LEAVE_SHARING';
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

interface SharedSessionState {
  trackId?: string;
  trackName?: string;
  artistName?: string;
  albumArt?: string;
  duration?: number;
  progress?: number;
  isPlaying: boolean;
  queue?: Array<{
    id: string;
    name: string;
    artistName: string;
    albumArt: string;
    duration_ms: number;
  }>;
  lyrics?: Array<{ time: number; text: string }> | null;
  visualizationType?: string;
  visualizationMode?: string;
}

interface UpdateShareStateRequest extends SharedSessionState {
  // All fields from SharedSessionState
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

// Sharing state
let shareCode: string | null = null;
let isSharing = false;
let shareUpdateTimeout: NodeJS.Timeout | null = null;
let shareCheckTimeout: NodeJS.Timeout | null = null;
let currentShareState: SharedSessionState | null = null;

// Viewing state
let viewShareCode: string | null = null;
let isViewing = false;
let viewPollTimeout: NodeJS.Timeout | null = null;

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

/**
 * Start sharing - create a shared session or reuse existing one
 */
async function startSharing() {
  if (isSharing && shareCode) {
    console.log('[Worker] Already sharing with code:', shareCode);
    return;
  }
  
  try {
    // Try to get saved session code from a message (will be sent from main thread)
    // For now, just create a new session
    // The main thread (useShareManager) will handle persistence via localStorage
    
    // Create a new shared session
    // Use self.location.origin to get absolute URL in worker context
    const apiUrl = `${self.location.origin}/api/share/create`;
    const response = await fetch(apiUrl, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }
    
    const data = await response.json();
    shareCode = data.code;
    isSharing = true;
    
    console.log('[Worker] Sharing started with code:', shareCode);
    
    // Send the code back to the main thread
    self.postMessage({
      type: 'SHARING_STARTED',
      code: shareCode,
    });
    
    // Start checking for connected clients
    checkConnectedClients();
  } catch (error: any) {
    console.error('[Worker] Error starting sharing:', error);
    self.postMessage({
      type: 'SHARING_ERROR',
      error: error.message,
    });
  }
}

/**
 * Stop sharing
 */
function stopSharing() {
  isSharing = false;
  shareCode = null;
  currentShareState = null;
  
  if (shareUpdateTimeout) {
    clearTimeout(shareUpdateTimeout);
    shareUpdateTimeout = null;
  }
  
  if (shareCheckTimeout) {
    clearTimeout(shareCheckTimeout);
    shareCheckTimeout = null;
  }
  
  console.log('[Worker] Sharing stopped');
  
  self.postMessage({
    type: 'SHARING_STOPPED',
  });
}

/**
 * Update share state - send to backend
 */
async function updateShareState(state: SharedSessionState) {
  if (!isSharing || !shareCode) {
    return;
  }
  
  currentShareState = state;
  
  try {
    const apiUrl = `${self.location.origin}/api/share/update`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: shareCode,
        ...state,
      }),
    });
    
    if (response.status === 410) {
      // Session expired or closed - stop sharing
      console.log('[Worker] Session expired or closed by server');
      stopSharing();
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Send back the number of connected clients
    self.postMessage({
      type: 'CONNECTED_CLIENTS_UPDATE',
      connectedClients: data.connectedClients,
    });
  } catch (error: any) {
    console.error('[Worker] Error updating share state:', error);
  }
}

/**
 * Check connected clients periodically
 */
async function checkConnectedClients() {
  if (!isSharing || !shareCode) {
    return;
  }
  
  try {
    const apiUrl = `${self.location.origin}/api/share/poll?code=${shareCode}`;
    const response = await fetch(apiUrl);
    
    if (response.status === 410 || response.status === 404) {
      // Session expired, closed, or not found - stop sharing
      console.log('[Worker] Session no longer available');
      stopSharing();
      return;
    }
    
    if (response.ok) {
      const data = await response.json();
      
      // Send back the number of connected clients
      self.postMessage({
        type: 'CONNECTED_CLIENTS_UPDATE',
        connectedClients: data.connectedClients,
      });
    }
  } catch (error: any) {
    console.error('[Worker] Error checking connected clients:', error);
  }
  
  // Check again in 2 seconds
  shareCheckTimeout = setTimeout(checkConnectedClients, 2000);
}

/**
 * Join sharing - start polling for shared state
 */
async function joinSharing(code: string) {
  if (isViewing && viewShareCode === code) {
    console.log('[Worker] Already viewing session:', code);
    return;
  }
  
  try {
    // Join the shared session
    const apiUrl = `${self.location.origin}/api/share/join`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to join session: ${response.status}`);
    }
    
    viewShareCode = code;
    isViewing = true;
    
    console.log('[Worker] Joined shared session:', code);
    
    self.postMessage({
      type: 'VIEWING_STARTED',
      code,
    });
    
    // Start polling for state updates
    pollSharedState();
  } catch (error: any) {
    console.error('[Worker] Error joining session:', error);
    self.postMessage({
      type: 'VIEWING_ERROR',
      error: error.message,
    });
  }
}

/**
 * Leave sharing - stop polling
 */
async function leaveSharing() {
  if (!isViewing || !viewShareCode) {
    return;
  }
  
  const code = viewShareCode;
  
  // Clear polling
  if (viewPollTimeout) {
    clearTimeout(viewPollTimeout);
    viewPollTimeout = null;
  }
  
  isViewing = false;
  viewShareCode = null;
  
  // Notify backend we're disconnecting
  try {
    const apiUrl = `${self.location.origin}/api/share/disconnect`;
    await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
  } catch (error) {
    console.error('[Worker] Error disconnecting:', error);
  }
  
  console.log('[Worker] Left shared session');
  
  self.postMessage({
    type: 'VIEWING_STOPPED',
  });
}

/**
 * Poll for shared state updates
 */
async function pollSharedState() {
  if (!isViewing || !viewShareCode) {
    return;
  }
  
  try {
    const apiUrl = `${self.location.origin}/api/share/poll?code=${viewShareCode}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      if (response.status === 404 || response.status === 410) {
        // Session not found or expired
        throw new Error('Session has ended');
      }
      throw new Error(`Failed to poll session: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Send state to main thread
    self.postMessage({
      type: 'SHARED_STATE_UPDATE',
      state: data,
    });
    
    // Poll again in 500ms (2 times per second)
    viewPollTimeout = setTimeout(pollSharedState, 500);
  } catch (error: any) {
    console.error('[Worker] Error polling shared state:', error);
    
    self.postMessage({
      type: 'VIEWING_ERROR',
      error: error.message,
    });
    
    // Stop viewing on error
    leaveSharing();
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

      case 'START_SHARING': {
        // Check if we have a saved code to reuse
        const { savedCode } = data;
        if (savedCode) {
          // Verify the saved code still exists
          try {
            const verifyUrl = `${self.location.origin}/api/share/verify?code=${savedCode}`;
            const response = await fetch(verifyUrl);
            const result = await response.json();
            
            if (result.exists) {
              // Reuse existing session
              shareCode = savedCode;
              isSharing = true;
              console.log('[Worker] ✅ Reusing saved session code:', shareCode);
              
              self.postMessage({
                type: 'SHARING_STARTED',
                code: shareCode,
              });
              
              // Start checking for connected clients
              checkConnectedClients();
            } else {
              // Saved code is invalid, create new session
              console.log('[Worker] ⚠️ Saved code invalid, creating new session');
              await startSharing();
            }
          } catch (error) {
            console.error('[Worker] Error verifying saved code:', error);
            // On error, create new session
            await startSharing();
          }
        } else {
          // Create new session
          await startSharing();
        }
        break;
      }

      case 'STOP_SHARING': {
        stopSharing();
        break;
      }

      case 'UPDATE_SHARE_STATE': {
        const state = data as UpdateShareStateRequest;
        await updateShareState(state);
        break;
      }

      case 'JOIN_SHARING': {
        const { code } = data;
        await joinSharing(code);
        break;
      }

      case 'LEAVE_SHARING': {
        await leaveSharing();
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

