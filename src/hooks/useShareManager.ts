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

  // Start hosting (create peer and accept connections)
  const startHosting = useCallback(() => {
    if (peerRef.current) {
      console.log("✅ Already hosting");
      return;
    }

    console.log("🎭 Starting host mode...");
    
    // Generate 6-digit code for easy manual entry
    const code = Math.floor(100000 + Math.random() * 900000);
    const customPeerId = `syns-${code}`;
    console.log(`📱 Share Code: ${code}`);
    
    const peer = new Peer(customPeerId, {
      debug: 0, // Reduce debug verbosity
    });

    peer.on("open", (id) => {
      console.log("✅ Host peer ID:", id);
      setPeerId(id);
      setIsHosting(true);
    });

    peer.on("connection", (conn) => {
      console.log("👀 New viewer connecting:", conn.peer);
      
      // Add to connections list
      connectionsRef.current.push(conn);
      setConnectedViewers(connectionsRef.current.length);

      conn.on("open", () => {
        console.log("✅ Viewer connected:", conn.peer);
      });

      conn.on("close", () => {
        console.log("👋 Viewer disconnected:", conn.peer);
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
        setConnectedViewers(connectionsRef.current.length);
      });

      conn.on("error", (err) => {
        console.error("❌ Connection error:", err);
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
        setConnectedViewers(connectionsRef.current.length);
      });
    });

    peer.on("error", (err) => {
      console.error("❌ Peer error:", err);
      setConnectionError(err.message);
    });

    peerRef.current = peer;
  }, []);

  // Stop hosting
  const stopHosting = useCallback(() => {
    console.log("🛑 Stopping host mode...");
    
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
      console.log("🔄 Disconnecting existing connection before reconnecting");
      disconnectFromHost();
    }

    console.log("👀 [VIEWER] Connecting to host:", hostPeerId);
    setConnectionError(null);

    // Create peer for viewer
    const peer = new Peer({
      debug: 0, // Reduce debug verbosity to avoid console spam
    });

    // Set connection timeout (30 seconds)
    connectionTimeoutRef.current = setTimeout(() => {
      console.error("⏱️ [VIEWER] Connection timeout");
      setConnectionError("Connection timeout - host may be offline");
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
    }, 30000);

    peer.on("open", (id) => {
      console.log("✅ Viewer peer ID:", id);
      
      // Connect to host
      const conn = peer.connect(hostPeerId, {
        reliable: true,
        serialization: 'json',
      });

      conn.on("open", () => {
        console.log("✅ Connected to host! Waiting for data...");
        setIsViewer(true);
        hostConnectionRef.current = conn;
        
        // Clear timeout on successful connection
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });

      let receivedCount = 0;
      conn.on("data", (data: any) => {
        try {
          if (data.type === "state_update") {
            receivedCount++;
            if (receivedCount % 30 === 0) { // Log every 30 frames (1 second at 30fps)
              console.log(`📊 Receiving data (${receivedCount} updates received)`);
            }
            setViewerState(data.data);
          }
        } catch (err) {
          console.error("❌ Error processing data:", err);
          // Don't throw - keep connection alive
        }
      });

      conn.on("close", () => {
        console.log("👋 Disconnected from host");
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
        console.error("❌ Connection error:", err);
        setConnectionError(err.message);
        
        // Clear timeout on error
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      });
    });

    peer.on("error", (err) => {
      console.error("❌ Peer error:", err);
      setConnectionError(err.message);
      
      // Clear timeout on error
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    peerRef.current = peer;
  }, []);

  // Disconnect from host (viewer mode)
  const disconnectFromHost = useCallback(() => {
    console.log("👋 Disconnecting from host...");
    
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
      
      // Clear timeout on unmount
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
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
