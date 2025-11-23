"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Peer, { DataConnection } from "peerjs";

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
  peerId: string | null;
  isHosting: boolean;
  connectedViewers: number;
  startHosting: () => void;
  stopHosting: () => void;
  broadcastState: (state: SharedState) => void;
  
  // Viewer mode
  isViewer: boolean;
  viewerState: SharedState | null;
  connectToHost: (hostPeerId: string) => void;
  disconnectFromHost: () => void;
  connectionError: string | null;
}

export function useShareManager(): UseShareManagerReturn {
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isHosting, setIsHosting] = useState(false);
  const [connectedViewers, setConnectedViewers] = useState(0);
  const [isViewer, setIsViewer] = useState(false);
  const [viewerState, setViewerState] = useState<SharedState | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const hostConnectionRef = useRef<DataConnection | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hostConnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hostRetryCountRef = useRef<number>(0);
  const MAX_HOST_RETRIES = 3;

  // Start hosting (create peer and accept connections)
  const startHosting = useCallback(() => {
    if (peerRef.current) {
      return;
    }
    
    // Try to reuse existing peer ID from localStorage
    let customPeerId: string;
    let code: number;
    
    const savedPeerId = typeof window !== 'undefined' ? localStorage.getItem('syns-host-peer-id') : null;
    
    if (savedPeerId && savedPeerId.startsWith('syns-')) {
      // Reuse existing peer ID
      customPeerId = savedPeerId;
      code = parseInt(savedPeerId.replace('syns-', ''));
      console.log(`✅ [HOST] Reusing saved peer ID - Code: ${code}`);
    } else {
      // Generate new 6-digit code
      code = Math.floor(100000 + Math.random() * 900000);
      customPeerId = `syns-${code}`;
      console.log(`✅ [HOST] Generated new peer ID - Code: ${code}`);
      
      // Save to localStorage for future reloads
      if (typeof window !== 'undefined') {
        localStorage.setItem('syns-host-peer-id', customPeerId);
      }
    }
    
    // Set connection timeout (15 seconds)
    hostConnectionTimeoutRef.current = setTimeout(() => {
      const currentRetry = hostRetryCountRef.current;
      
      if (currentRetry < MAX_HOST_RETRIES - 1) {
        // Retry
        hostRetryCountRef.current++;
        console.log(`🔄 [HOST] Connection timeout - retrying (${hostRetryCountRef.current}/${MAX_HOST_RETRIES})...`);
        
        // Destroy current peer
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
        
        // Clear saved ID for fresh attempt
        if (typeof window !== 'undefined') {
          localStorage.removeItem('syns-host-peer-id');
        }
        
        // Retry after short delay
        setTimeout(() => {
          startHosting();
        }, 1000);
      } else {
        // Max retries reached
        console.error(`❌ [HOST] Connection timeout - failed after ${MAX_HOST_RETRIES} attempts`);
        setConnectionError(`Failed to connect to signaling server after ${MAX_HOST_RETRIES} attempts`);
        
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
        
        // Clear saved ID
        if (typeof window !== 'undefined') {
          localStorage.removeItem('syns-host-peer-id');
        }
        
        // Reset retry count for next manual attempt
        hostRetryCountRef.current = 0;
      }
    }, 15000);
    
    console.log(`🔌 [HOST] Creating PeerJS connection with ID: ${customPeerId}`);
    
    const peer = new Peer(customPeerId, {
      debug: 0,
    });

    peer.on("open", (id) => {
      console.log(`✅ [HOST] Hosting active - Code: ${code}, Peer ID: ${id}`);
      setPeerId(id);
      setIsHosting(true);
      
      // Clear timeout on successful connection
      if (hostConnectionTimeoutRef.current) {
        clearTimeout(hostConnectionTimeoutRef.current);
        hostConnectionTimeoutRef.current = null;
      }
      
      // Reset retry count on success
      hostRetryCountRef.current = 0;
      
      // Clear any connection errors
      setConnectionError(null);
    });

    peer.on("connection", (conn) => {
      // Add to connections list
      connectionsRef.current.push(conn);
      setConnectedViewers(connectionsRef.current.length);

      conn.on("open", () => {
        console.log(`✅ [HOST] Viewer connected: ${conn.peer} (Total: ${connectionsRef.current.length})`);
      });

      conn.on("close", () => {
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
        setConnectedViewers(connectionsRef.current.length);
        console.log(`👋 [HOST] Viewer disconnected: ${conn.peer} (Remaining: ${connectionsRef.current.length})`);
      });

      conn.on("error", (err) => {
        console.error(`❌ [HOST] Connection error with ${conn.peer}:`, err.message);
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
        setConnectedViewers(connectionsRef.current.length);
      });
    });

    peer.on("error", (err) => {
      console.error("❌ [HOST] Peer error:", err.message, err);
      setConnectionError(err.message);
      
      // Clear timeout on error
      if (hostConnectionTimeoutRef.current) {
        clearTimeout(hostConnectionTimeoutRef.current);
        hostConnectionTimeoutRef.current = null;
      }
      
      // If peer ID is already taken, clear saved ID and retry
      if (err.message?.includes('already taken') || err.message?.includes('unavailable') || err.message?.includes('ID is taken')) {
        console.log("🔄 [HOST] Peer ID unavailable, clearing and retrying...");
        if (typeof window !== 'undefined') {
          localStorage.removeItem('syns-host-peer-id');
        }
        // Destroy the peer
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
        // Retry with new ID
        setTimeout(() => {
          startHosting();
        }, 500);
      }
    });

    peerRef.current = peer;
  }, []);

  // Stop hosting
  const stopHosting = useCallback(() => {
    // Close all viewer connections
    connectionsRef.current.forEach((conn) => {
      conn.close();
    });
    connectionsRef.current = [];
    setConnectedViewers(0);

    // Destroy peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setPeerId(null);
    setIsHosting(false);
  }, []);

  // Broadcast state to all connected viewers
  const broadcastState = useCallback((state: SharedState) => {
    if (!isHosting || connectionsRef.current.length === 0) {
      return;
    }

    const message = {
      type: "state_update",
      data: {
        ...state,
        timestamp: Date.now() // Add timestamp for latency measurement
      },
      timestamp: Date.now(),
    };

    connectionsRef.current.forEach((conn) => {
      try {
        if (conn.open) {
          conn.send(message);
        }
      } catch (err) {
        console.error("❌ Failed to send to viewer:", err);
      }
    });
  }, [isHosting]);

  // Connect to host (viewer mode)
  const connectToHost = useCallback((hostPeerId: string) => {
    // Clear any existing connection
    if (hostConnectionRef.current) {
      disconnectFromHost();
    }

    setConnectionError(null);

    // Try to reuse existing viewer peer ID from localStorage
    let viewerPeerId: string | undefined;
    const savedViewerPeerId = typeof window !== 'undefined' ? localStorage.getItem('syns-viewer-peer-id') : null;
    
    if (savedViewerPeerId) {
      viewerPeerId = savedViewerPeerId;
      console.log(`🔄 [VIEWER] Reusing saved peer ID: ${viewerPeerId}`);
    } else {
      // Generate new viewer ID and save it
      viewerPeerId = `viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      if (typeof window !== 'undefined') {
        localStorage.setItem('syns-viewer-peer-id', viewerPeerId);
      }
      console.log(`✅ [VIEWER] Generated new peer ID: ${viewerPeerId}`);
    }

    // Create peer for viewer with consistent ID
    const peer = new Peer(viewerPeerId, {
      debug: 0,
    });

    // Set connection timeout (30 seconds)
    connectionTimeoutRef.current = setTimeout(() => {
      console.error(`⏱️ [VIEWER] Connection timeout to ${hostPeerId}`);
      setConnectionError("Connection timeout - host may be offline");
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    }, 30000);

    peer.on("open", (id) => {
      // Connect to host
      const conn = peer.connect(hostPeerId, {
        reliable: true,
        serialization: 'json',
      });

      conn.on("open", () => {
        console.log(`✅ [VIEWER] Connected to host ${hostPeerId} (Viewer ID: ${id})`);
        setIsViewer(true);
        hostConnectionRef.current = conn;
        
        // Clear timeout on successful connection
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      conn.on("data", (data: any) => {
        try {
          if (data.type === "state_update") {
            setViewerState(data.data);
          }
        } catch (err) {
          console.error("❌ [VIEWER] Error processing data:", err);
        }
      });

      conn.on("close", () => {
        console.log(`👋 [VIEWER] Disconnected from host ${hostPeerId}`);
        setIsViewer(false);
        setViewerState(null);
        hostConnectionRef.current = null;
        
        // Clear timeout if still active
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      conn.on("error", (err) => {
        console.error(`❌ [VIEWER] Connection error to ${hostPeerId}:`, err.message, err);
        setConnectionError(err.message);
        
        // Clear timeout on error
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });
    });

    peer.on("error", (err) => {
      console.error(`❌ [VIEWER] Peer error connecting to ${hostPeerId}:`, err.message, err);
      
      // Clear timeout on error
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      // If peer ID is taken, clear it and automatically retry with new ID
      if (err.message?.includes('already taken') || err.message?.includes('unavailable') || err.message?.includes('ID is taken')) {
        console.log("🔄 [VIEWER] Peer ID unavailable, clearing and retrying with new ID...");
        if (typeof window !== 'undefined') {
          localStorage.removeItem('syns-viewer-peer-id');
        }
        
        // Destroy the current peer
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }
        
        // Automatically retry with a new ID after a short delay
        setTimeout(() => {
          connectToHost(hostPeerId);
        }, 500);
        return;
      }
      
      // For other errors, set the error message
      setConnectionError(err.message);
    });

    peerRef.current = peer;
  }, []);

  // Disconnect from host (viewer mode)
  const disconnectFromHost = useCallback(() => {
    // Clear timeout if active
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    if (hostConnectionRef.current) {
      hostConnectionRef.current.close();
      hostConnectionRef.current = null;
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setIsViewer(false);
    setViewerState(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isHosting) {
        stopHosting();
      } else if (isViewer) {
        disconnectFromHost();
      }
      
      // Clear timeouts on unmount
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      if (hostConnectionTimeoutRef.current) {
        clearTimeout(hostConnectionTimeoutRef.current);
        hostConnectionTimeoutRef.current = null;
      }
    };
  }, [isHosting, isViewer, stopHosting, disconnectFromHost]);

  return {
    // Host mode
    peerId,
    isHosting,
    connectedViewers,
    startHosting,
    stopHosting,
    broadcastState,
    
    // Viewer mode
    isViewer,
    viewerState,
    connectToHost,
    disconnectFromHost,
    connectionError,
  };
}
