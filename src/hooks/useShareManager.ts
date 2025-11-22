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

  // Start hosting (create peer and accept connections)
  const startHosting = useCallback(() => {
    if (peerRef.current) {
      console.log("✅ Already hosting");
      return;
    }

    console.log("🎭 Starting host mode...");
    
    // Generate a 6-digit code for easy sharing
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const customPeerId = `syns-${code}`;
    
    console.log(`📱 Share Code: ${code}`);
    
    const peer = new Peer(customPeerId, {
      debug: 1,
    });

    peer.on("open", (id) => {
      console.log("✅ Host peer ID:", id);
      setPeerId(id);
      setIsHosting(true);
    });

    peer.on("connection", (conn) => {
      console.log("👀 [HOST] New viewer connecting:", conn.peer);
      
      conn.on("open", () => {
        // Add to connections list AFTER connection opens
        connectionsRef.current.push(conn);
        const viewerCount = connectionsRef.current.length;
        setConnectedViewers(viewerCount);
        
        console.log("✅ [HOST] Viewer connected:", conn.peer);
        console.log(`👥 [HOST] Total viewers: ${viewerCount}`);
        console.log(`🔄 [HOST] Connection state: open=${conn.open}, peer=${conn.peer}`);
      });

      conn.on("close", () => {
        console.log("👋 [HOST] Viewer disconnected:", conn.peer);
        connectionsRef.current = connectionsRef.current.filter((c) => c !== conn);
        setConnectedViewers(connectionsRef.current.length);
        console.log(`👥 [HOST] Total viewers: ${connectionsRef.current.length}`);
      });

      conn.on("error", (err) => {
        console.error("❌ [HOST] Connection error with", conn.peer, ":", err);
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
    if (!isHosting || connectionsRef.current.length === 0) return;

    const message = {
      type: "state_update",
      data: { ...state, timestamp: Date.now() },
      timestamp: Date.now(),
    };

    connectionsRef.current.forEach((conn) => {
      try {
        if (conn.open) {
          conn.send(message);
        }
      } catch (err) {
        console.error("❌ [HOST] Failed to send to viewer:", err);
      }
    });
  }, [isHosting]);

  // Connect to host (viewer mode)
  const connectToHost = useCallback((hostPeerId: string) => {
    if (hostConnectionRef.current) {
      console.log("✅ Already connected to host");
      return;
    }

    console.log("👀 Connecting to host:", hostPeerId);
    setConnectionError(null);

    // Create peer for viewer
    const peer = new Peer({
      debug: 1, // Reduce debug verbosity to avoid console spam
    });

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
      });

      let receivedCount = 0;
      let lastReceiveTime = Date.now();
      
      conn.on("data", (data: any) => {
        try {
          if (data.type === "state_update") {
            receivedCount++;
            const now = Date.now();
            const timeSinceLastUpdate = now - lastReceiveTime;
            lastReceiveTime = now;
            
            // Calculate latency
            const latency = data.data.timestamp ? now - data.data.timestamp : 0;
            
            // Log every update (since they're only every 2 seconds anyway)
            console.log(`📊 [VIEWER] Update #${receivedCount}, Latency: ${latency}ms, Gap: ${timeSinceLastUpdate}ms`);
            
            setViewerState(data.data);
          } else {
            console.log(`📦 [VIEWER] Received unknown message type:`, data.type);
          }
        } catch (err) {
          console.error("❌ [VIEWER] Error processing data:", err);
          // Don't throw - keep connection alive
        }
      });
      
      // Add timeout detection - warn if no updates for 10 seconds
      const timeoutCheck = setInterval(() => {
        const now = Date.now();
        const timeSinceLastUpdate = now - lastReceiveTime;
        if (timeSinceLastUpdate > 10000 && receivedCount > 0) {
          console.warn(`⚠️ [VIEWER] No updates for ${Math.round(timeSinceLastUpdate / 1000)}s - connection may be dead`);
        }
      }, 5000);
      
      conn.on("close", () => {
        clearInterval(timeoutCheck);
      });

      conn.on("close", () => {
        console.log("👋 [VIEWER] Disconnected from host");
        clearInterval(timeoutCheck);
        setIsViewer(false);
        setViewerState(null);
        hostConnectionRef.current = null;
      });

      conn.on("error", (err) => {
        console.error("❌ [VIEWER] Connection error:", err);
        // Log error but try to continue connection
        console.warn("⚠️ [VIEWER] Connection error occurred, connection state:", conn.open ? "open" : "closed");
      });
    });

    peer.on("error", (err) => {
      console.error("❌ Peer error:", err);
      setConnectionError(err.message);
    });

    peerRef.current = peer;
  }, []);

  // Disconnect from host (viewer mode)
  const disconnectFromHost = useCallback(() => {
    console.log("👋 Disconnecting from host...");
    
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

