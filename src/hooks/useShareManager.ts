"use client";

import { useState, useCallback, useRef } from "react";
import { useLyricsWorker } from "./useLyricsWorker";

export interface SharedState {
  // Current playing track
  playbackState?: {
    trackId: string;
    trackName: string;
    artistName: string;
    albumArt: string;
    duration_ms: number;
    progress_ms: number;
    is_playing: boolean;
  };
  
  // Queue - next 2 songs
  queue?: Array<{
    id: string;
    name: string;
    artistName: string;
    albumArt: string;
    duration_ms: number;
  }>;
  
  // Synced lyrics for current song
  lyrics?: Array<{ time: number; text: string }> | null;
  
  // Visualization settings (optional - viewers can use their own)
  visualizationType?: string;
  visualizationMode?: string;
  
  // Current playback position (for lyrics sync)
  currentTimeMs: number;
  
  // Timestamp for measuring latency
  timestamp?: number;
}

interface UseShareManagerReturn {
  // Host mode
  shareCode: string | null;
  isHosting: boolean;
  connectedViewers: number;
  startHosting: () => void;
  stopHosting: () => void;
  broadcastState: (state: SharedState) => void;
  isShareActive: boolean;
  
  // Viewer mode
  isViewer: boolean;
  viewerState: SharedState | null;
  connectToHost: (code: string) => void;
  disconnectFromHost: () => void;
  connectionError: string | null;
}

export function useShareManager(): UseShareManagerReturn {
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isHosting, setIsHosting] = useState(false);
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [isViewer, setIsViewer] = useState(false);
  const [viewerState, setViewerState] = useState<SharedState | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isShareActive, setIsShareActive] = useState<boolean>(() => {
    // Check if sharing was previously active
    if (typeof window !== 'undefined') {
      return localStorage.getItem('syns-share-active') === 'true';
    }
    return false;
  });

  // Throttle state updates to avoid spamming the backend
  const lastUpdateRef = useRef<number>(0);
  const UPDATE_THROTTLE = 500; // 500ms = 2 updates per second

  // Use lyrics worker for sharing functionality
  const lyricsWorker = useLyricsWorker({
    onSharingStarted: useCallback((code: string) => {
      console.log('✅ [HOST] Sharing started with code:', code);
      setShareCode(code);
      setIsHosting(true);
      setIsShareActive(true);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('syns-share-active', 'true');
        localStorage.setItem('syns-share-code', code);
      }
    }, []),
    
    onSharingStopped: useCallback(() => {
      console.log('👋 [HOST] Sharing stopped');
      setShareCode(null);
      setIsHosting(false);
      setConnectedViewers(0);
      setIsShareActive(false);
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('syns-share-active', 'false');
        localStorage.removeItem('syns-share-code');
      }
    }, []),
    
    onSharingError: useCallback((error: string) => {
      console.error('❌ [HOST] Sharing error:', error);
      setConnectionError(error);
    }, []),
    
    onConnectedClientsUpdate: useCallback((count: number) => {
      setConnectedViewers(count);
    }, []),
    
    onViewingStarted: useCallback((code: string) => {
      console.log('✅ [VIEWER] Viewing started for code:', code);
      setIsViewer(true);
      setConnectionError(null);
    }, []),
    
    onViewingStopped: useCallback(() => {
      console.log('👋 [VIEWER] Viewing stopped');
      setIsViewer(false);
      setViewerState(null);
    }, []),
    
    onViewingError: useCallback((error: string) => {
      console.error('❌ [VIEWER] Viewing error:', error);
      setConnectionError(error);
      setIsViewer(false);
      setViewerState(null);
    }, []),
    
    onSharedStateUpdate: useCallback((state: any) => {
      // Convert backend state to SharedState format
      const sharedState: SharedState = {
        currentTimeMs: state.progress || 0,
        playbackState: state.trackId ? {
          trackId: state.trackId,
          trackName: state.trackName,
          artistName: state.artistName,
          albumArt: state.albumArt,
          duration_ms: state.duration,
          progress_ms: state.progress,
          is_playing: state.isPlaying,
        } : undefined,
        queue: state.queue,
        lyrics: state.lyrics,
        visualizationType: state.visualizationType,
        visualizationMode: state.visualizationMode,
      };
      
      setViewerState(sharedState);
    }, []),
  });

  // Start hosting
  const startHosting = useCallback(() => {
    if (isHosting) {
      console.log('⚠️ Already hosting');
      return;
    }
    
    // Check if we have a saved code to reuse
    const savedCode = typeof window !== 'undefined' 
      ? localStorage.getItem('syns-share-code') 
      : null;
    
    if (savedCode) {
      console.log('🔄 Reusing saved share code:', savedCode);
      lyricsWorker.startSharing(savedCode);
    } else {
      console.log('✨ Creating new share session');
      lyricsWorker.startSharing();
    }
  }, [isHosting, lyricsWorker]);

  // Stop hosting
  const stopHosting = useCallback(() => {
    if (!isHosting) {
      return;
    }
    
    lyricsWorker.stopSharing();
  }, [isHosting, lyricsWorker]);

  // Broadcast state to all connected viewers
  const broadcastState = useCallback((state: SharedState) => {
    if (!isHosting) {
      return;
    }

    // Throttle updates
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_THROTTLE) {
      return;
    }
    lastUpdateRef.current = now;

    // Convert SharedState to backend format
    const backendState = {
      trackId: state.playbackState?.trackId,
      trackName: state.playbackState?.trackName,
      artistName: state.playbackState?.artistName,
      albumArt: state.playbackState?.albumArt,
      duration: state.playbackState?.duration_ms,
      progress: state.playbackState?.progress_ms,
      isPlaying: state.playbackState?.is_playing || false,
      queue: state.queue,
      lyrics: state.lyrics,
      visualizationType: state.visualizationType,
      visualizationMode: state.visualizationMode,
    };

    lyricsWorker.updateShareState(backendState);
  }, [isHosting, lyricsWorker]);

  // Connect to host (viewer mode)
  const connectToHost = useCallback((code: string) => {
    if (isViewer) {
      console.log('⚠️ Already viewing a session');
      return;
    }
    
    setConnectionError(null);
    lyricsWorker.joinSharing(code);
  }, [isViewer, lyricsWorker]);

  // Disconnect from host (viewer mode)
  const disconnectFromHost = useCallback(() => {
    if (!isViewer) {
      return;
    }
    
    lyricsWorker.leaveSharing();
  }, [isViewer, lyricsWorker]);

  return {
    // Host mode
    shareCode,
    isHosting,
    connectedViewers,
    startHosting,
    stopHosting,
    broadcastState,
    isShareActive,
    
    // Viewer mode
    isViewer,
    viewerState,
    connectToHost,
    disconnectFromHost,
    connectionError,
  };
}
