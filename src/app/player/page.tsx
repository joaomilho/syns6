"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentlyPlaying, getUserQueue, QueueItem } from "@/lib/spotify";
import { fetchSyncedLyrics, LyricLine } from "@/lib/lyrics";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useHueLights } from "@/hooks/useHueLights";
import { useCamera } from "@/hooks/useCamera";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useShareManager, SharedState } from "@/hooks/useShareManager";
import { useSubscription } from "@/hooks/useSubscription";
import OrbitalVisualization from "@/components/OrbitalVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import LavaLampVisualization from "@/components/LavaLampVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import OscilloscopeVisualization from "@/components/OscilloscopeVisualization";
import LyricsOnlyVisualization from "@/components/LyricsOnlyVisualization";
import CameraVisualization from "@/components/CameraVisualization";
import DebugVisualization from "@/components/DebugVisualization";
import YouTubeVisualization from "@/components/YouTubeVisualization";
import CustomVisualization from "@/components/CustomVisualization";
import DSLVisualization from "@/components/DSLVisualization";
import CompiledVisualization from "@/components/CompiledVisualization";
import BlankGridVisualization from "@/components/BlankGridVisualization";
import HueControls from "@/components/HueControls";
import PerformanceStats from "@/components/PerformanceStats";
import FFTSpectrumScene from "@/components/FFTSpectrumScene";
import OrbitalScene from "@/components/OrbitalScene";
import FractalScene from "@/components/FractalScene";
import PsychedelicScene from "@/components/PsychedelicScene";
import WavyLinesScene from "@/components/WavyLinesScene";
import LavaLampScene from "@/components/LavaLampScene";
import Spectrum3DScene from "@/components/Spectrum3DScene";
import Lyrics3D from "@/components/Lyrics3D";
import { Canvas } from "@react-three/fiber";
import { isDSLFormat } from "@/lib/visualizationDSL/schema";
import VisualizationDropdown, {
  VisualizationType,
} from "@/components/VisualizationDropdown";
import ModeDropdown, { VisualizationMode } from "@/components/ModeDropdown";
import VisualizationCreator from "@/components/VisualizationCreator";
import {
  CustomVisualization as CustomVizType,
  getAllCustomVisualizations,
  saveCustomVisualization,
} from "@/lib/customVisualizations";
import styles from "./player.module.css";
import Link from "next/link";
import Image from "next/image";
import ShareQRCode from "@/components/ShareQRCode";
import ShareButton from "@/components/ShareButton";
import { Logo } from "@/components/ds";
import ToolsMenu from "@/components/ToolsMenu";

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
}

interface PlaybackState {
  item: Track | null;
  progress_ms: number;
  is_playing: boolean;
}

export default function PlayerPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { subscription, isActive, loading: subscriptionLoading } = useSubscription();
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(
    null
  );
  const [lastKnownTrack, setLastKnownTrack] = useState<PlaybackState | null>(
    null
  ); // Keep last track even when Spotify stops reporting
  const [currentProgress, setCurrentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [nextTrack, setNextTrack] = useState<QueueItem | null>(null);
  const {
    micData,
    isEnabled: isMicEnabled,
    enable: enableMic,
    disable: disableMic,
  } = useMicrophoneAnalysis();
  const {
    isEnabled: isCameraEnabled,
    enable: enableCamera,
    disable: disableCamera,
    videoElement,
  } = useCamera();
  const hue = useHueLights();
  const wakeLock = useWakeLock();
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [visualizationType, setVisualizationType] =
    useState<VisualizationType>("fftspectrum");
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("STATIC");
  const [showHueControls, setShowHueControls] = useState(false);
  const [customVisualizations, setCustomVisualizations] = useState<CustomVizType[]>([]);
  const [isCreatingVisualization, setIsCreatingVisualization] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [useCompiledMode, setUseCompiledMode] = useState(true); // Performance mode toggle
  const lastRandomTrackId = useRef<string | null>(null); // Track last track for RANDOM mode
  const hasStartedHosting = useRef(false); // Track if we've already called startHosting
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [showQRCodeOnConnect, setShowQRCodeOnConnect] = useState(false); // Auto-expand QR on first manual share
  const [showPerformanceStats, setShowPerformanceStats] = useState(false); // Toggle performance monitor
  
  // Share Manager for broadcasting to viewers
  const shareManager = useShareManager();
  
  // Reset auto-expand flag after QR code is shown
  useEffect(() => {
    if (shareManager.peerId && showQRCodeOnConnect) {
      // Reset the flag after a short delay to allow the component to render
      const timer = setTimeout(() => {
        setShowQRCodeOnConnect(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shareManager.peerId, showQRCodeOnConnect]);
  
  // Check subscription and redirect to pricing if not active
  useEffect(() => {
    // Wait for authentication and subscription data to load
    if (status === 'loading' || subscriptionLoading) {
      return;
    }

    // If authenticated but no active subscription, redirect to pricing
    if (status === 'authenticated' && !isActive) {
      console.log('⚠️ No active subscription detected, redirecting to pricing...');
      router.push('/pricing');
    }
  }, [status, subscriptionLoading, isActive, router]);
  
  // Start hosting when component mounts (only if sharing was previously active)
  useEffect(() => {
    if (!hasStartedHosting.current && shareManager.isShareActive) {
      console.log("🎭 [PLAYER] Auto-reconnecting to screen sharing (was previously active)...");
      shareManager.startHosting();
      hasStartedHosting.current = true;
    }
    
    return () => {
      if (hasStartedHosting.current) {
        console.log("🛑 [PLAYER] Stopping screen sharing");
        shareManager.stopHosting();
        hasStartedHosting.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Check WebGL and Mic availability
  useEffect(() => {
    // Check WebGL
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');
      setWebglAvailable(!!gl);
    } catch (e) {
      setWebglAvailable(false);
    }

    // Check Microphone availability (not on HTTP non-localhost)
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';
    
    setMicAvailable(isHttps || isLocalhost);
  }, []);
  
  // Debug: Log when peerId changes
  useEffect(() => {
    console.log(`🔑 [PLAYER] Peer ID state:`, shareManager.peerId || 'null');
    console.log(`📊 [PLAYER] Is hosting:`, shareManager.isHosting);
    console.log(`👥 [PLAYER] Connected viewers:`, shareManager.connectedViewers);
  }, [shareManager.peerId, shareManager.isHosting, shareManager.connectedViewers]);
  
  // Keyboard shortcut: Press 'S' to toggle performance stats
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 's' || e.key === 'S') {
        setShowPerformanceStats(prev => {
          console.log(`📊 Performance stats ${!prev ? 'enabled' : 'disabled'}`);
          return !prev;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  // Broadcast state to viewers (lightweight - only song/lyrics/queue info)
  useEffect(() => {
    if (!shareManager.isHosting) {
      console.log('🚫 [HOST] Not hosting, skipping broadcast');
      return;
    }
    
    if (shareManager.connectedViewers === 0) {
      console.log('🚫 [HOST] No viewers connected, skipping broadcast');
      return;
    }

    console.log(`🎬 [HOST] Starting broadcast to ${shareManager.connectedViewers} viewer(s)`);

    let broadcastCount = 0;
    
    const buildState = (): SharedState => {
      const displayTrack = playbackState?.item || lastKnownTrack?.item;
      
      return {
        // Current track
        playbackState: displayTrack ? {
          trackId: displayTrack.id,
          trackName: displayTrack.name,
          artistName: displayTrack.artists[0]?.name || "",
          albumArt: displayTrack.album.images[0]?.url || "",
          duration_ms: displayTrack.duration_ms,
          progress_ms: currentProgress,
          is_playing: playbackState?.is_playing || false,
        } : undefined,
        
        // Next 2 songs in queue
        queue: queue.slice(0, 2).map(track => ({
          id: track.id,
          name: track.name,
          artistName: track.artists[0]?.name || "",
          albumArt: track.album.images[0]?.url || "",
          duration_ms: track.duration_ms,
        })),
        
        // Synced lyrics
        lyrics: lyrics || null,
        
        // Visualization settings (optional)
        visualizationType,
        visualizationMode,
        
        // Current position for lyrics sync
        currentTimeMs: currentProgress,
      };
    };
    
    // Send initial state immediately
    const initialState = buildState();
    shareManager.broadcastState(initialState);
    broadcastCount++;
    console.log(`📡 [HOST] Sent initial state to ${shareManager.connectedViewers} viewer(s)`);
    
    // Then broadcast on interval
    const broadcastInterval = setInterval(() => {
      const state = buildState();
      shareManager.broadcastState(state);
      broadcastCount++;
      
      if (broadcastCount % 5 === 0) {
        console.log(`📡 [HOST] Broadcasted ${broadcastCount} updates to ${shareManager.connectedViewers} viewers`);
      }
    }, 2000); // 0.5fps - reduce network traffic

    return () => {
      console.log(`🛑 [HOST] Stopping broadcast (sent ${broadcastCount} updates total)`);
      clearInterval(broadcastInterval);
    };
  }, [
    shareManager.isHosting,
    shareManager.connectedViewers,
    shareManager.broadcastState,
    playbackState,
    lastKnownTrack,
    currentProgress,
    queue,
    lyrics,
    visualizationType,
    visualizationMode,
  ]);
  
  // Load saved visualization type and mode on mount
  useEffect(() => {
    const loadPreferences = async () => {
      const { getVisualizationType, getVisualizationMode } = await import('@/lib/storage');
      const savedType = await getVisualizationType();
      const savedMode = await getVisualizationMode();
      if (savedType) {
        console.log(`🎨 Restoring visualization: ${savedType}`);
        setVisualizationType(savedType as VisualizationType);
      }
      if (savedMode) {
        console.log(`🎯 Restoring mode: ${savedMode}`);
        setVisualizationMode(savedMode as VisualizationMode);
      }
    };
    loadPreferences();
  }, []);

  // Load custom visualizations
  useEffect(() => {
    const loadCustomViz = async () => {
      const customViz = await getAllCustomVisualizations();
      setCustomVisualizations(customViz);
      console.log(`✨ Loaded ${customViz.length} custom visualizations`);
    };
    loadCustomViz();
  }, []);
  
  // Save visualization type when it changes
  useEffect(() => {
    const saveVisualizationType = async () => {
      const { saveVisualizationType: save } = await import('@/lib/storage');
      await save(visualizationType);
    };
    saveVisualizationType();
  }, [visualizationType]);

  // Save visualization mode when it changes
  useEffect(() => {
    const saveMode = async () => {
      const { saveVisualizationMode } = await import('@/lib/storage');
      await saveVisualizationMode(visualizationMode);
    };
    saveMode();
  }, [visualizationMode]);

  // Handle RANDOM mode - change visualization when track changes
  useEffect(() => {
    const currentTrackId = playbackState?.item?.id;
    
    if (
      visualizationMode === "RANDOM" &&
      currentTrackId &&
      currentTrackId !== lastRandomTrackId.current
    ) {
      const visualizations: VisualizationType[] = [
        "fftspectrum",
        "lyricsonly",
        "particles",
        "fractal",
        "psychedelic",
        "waves",
        "animated",
        "spectrum3d",
        "oscilloscope",
        "camera",
        "youtube",
      ];
      
      // Pick a random visualization
      const randomIndex = Math.floor(Math.random() * visualizations.length);
      const newVisualization = visualizations[randomIndex];
      
      console.log(`🎲 RANDOM mode: Switching to ${newVisualization} for new track`);
      setVisualizationType(newVisualization);
      lastRandomTrackId.current = currentTrackId;
    } else if (visualizationMode !== "RANDOM") {
      // Reset tracking when mode changes away from RANDOM
      lastRandomTrackId.current = null;
    }
  }, [playbackState?.item?.id, visualizationMode]);
  const [tokenRefreshAttempts, setTokenRefreshAttempts] = useState(0);
  const [lastFetchedTrackId, setLastFetchedTrackId] = useState<string | null>(
    null
  );
  const lyricsCache = useRef<Map<string, LyricLine[] | null>>(new Map());
  const [hueDebugData, setHueDebugData] = useState<{
    bass: number;
    brightness: number;
  } | null>(null);

  // Helper function to strip markdown code fences
  const stripCodeFences = (code: string): string => {
    return code.replace(/^```(?:json|javascript|js)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
  };

  // Memoize parsed configs to prevent re-renders
  const previewConfig = useMemo(() => {
    if (isCreatingVisualization && generatedCode && isDSLFormat(generatedCode)) {
      try {
        const cleanCode = stripCodeFences(generatedCode);
        return JSON.parse(cleanCode);
      } catch (error) {
        console.error('Failed to parse preview DSL:', error);
        return null;
      }
    }
    return null;
  }, [generatedCode, isCreatingVisualization]);

  // Compile preview DSL immediately for better performance
  const previewCompiledCode = useMemo(() => {
    if (previewConfig) {
      try {
        const { compileDSL } = require('@/lib/visualizationDSL/compiler');
        return compileDSL(previewConfig);
      } catch (error) {
        console.error('Failed to compile preview DSL:', error);
        return null;
      }
    }
    return null;
  }, [previewConfig]);

  const customVizConfig = useMemo(() => {
    const customViz = customVisualizations.find((v) => v.id === visualizationType);
    if (customViz && isDSLFormat(customViz.code)) {
      try {
        const cleanCode = stripCodeFences(customViz.code);
        return JSON.parse(cleanCode);
      } catch (error) {
        console.error('Failed to parse custom DSL:', error);
        return null;
      }
    }
    return null;
  }, [customVisualizations, visualizationType]);

  // Force body to be black (override any light mode styles)
  useEffect(() => {
    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  // Derive error state from session
  const sessionError =
    session?.error === "RefreshAccessTokenError"
      ? "Session expired. Please sign out and sign in again to refresh your Spotify connection."
      : null;

  // Proactively refresh token every 30 minutes
  useEffect(() => {
    if (!session?.accessToken) return;

    const refreshInterval = setInterval(async () => {
      console.log("🔄 Proactively refreshing session...");
      await update();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [session?.accessToken, update]);

  // Fetch current playback state
  const fetchPlaybackState = async () => {
    if (!session?.accessToken) return;

    try {
      const data = await getCurrentlyPlaying(session.accessToken);
      if (data && data.item) {
        setPlaybackState(data);
        setLastKnownTrack(data); // Save as last known track
        setCurrentProgress(data.progress_ms || 0);
        setError(null);
        setTokenRefreshAttempts(0); // Reset on success

        // Fetch synced lyrics only if track changed
        if (data.item.id && data.item.id !== lastFetchedTrackId) {
          // Check cache first
          if (lyricsCache.current.has(data.item.id)) {
            const cachedLyrics = lyricsCache.current.get(data.item.id);
            setLyrics(cachedLyrics || null);
            setLastFetchedTrackId(data.item.id);
          } else {
            // Fetch from backend API (checks IndexedDB → PostgreSQL → Remote APIs)
            try {
              const lyricsLines = await fetchSyncedLyrics(
                data.item.name,
                data.item.artists[0].name,
                data.item.duration_ms,
                data.item.id // Pass Spotify ID for IndexedDB caching
              );

              // Cache the result in memory (even if null)
              lyricsCache.current.set(data.item.id, lyricsLines);
              setLyrics(lyricsLines);
              setLastFetchedTrackId(data.item.id);
            } catch (err) {
              console.error("❌ Error fetching lyrics:", err);
              lyricsCache.current.set(data.item.id, null);
              setLyrics(null);
              setLastFetchedTrackId(data.item.id);
            }
          }
        }
      } else {
        // No current track from Spotify, but keep showing last known track
        setPlaybackState(null);
        console.log("⏸️ No current playback, keeping last known track visible");
        // Don't clear lastKnownTrack - keep it visible!
      }
    } catch (err: any) {
      console.error("Error fetching playback:", err);

      // Check if it's a 401 error (token expired)
      if (
        err.message &&
        err.message.includes("401") &&
        tokenRefreshAttempts < 1
      ) {
        console.log("🔄 Token expired, please re-authenticate...");
        setTokenRefreshAttempts((prev) => prev + 1);
        setPlaybackState(null);
        setLastKnownTrack(null); // Clear on auth error
        setError(
          "Session expired. Please sign out and sign in again to refresh your Spotify connection."
        );
      } else if (tokenRefreshAttempts >= 1) {
        setPlaybackState(null);
        setLastKnownTrack(null); // Clear on auth error
        setError("Session expired. Please sign out and sign in again.");
      } else {
        setError("Failed to fetch playback state");
      }
    }
  };

  // Fetch queue and prefetch lyrics
  const fetchQueueAndPrefetchLyrics = async () => {
    if (!session?.accessToken) return;

    try {
      const queueData = await getUserQueue(session.accessToken);
      
      if (queueData && queueData.queue && queueData.queue.length > 0) {
        setQueue(queueData.queue);
        setNextTrack(queueData.queue[0] || null);
        
        console.log(`🎵 Queue fetched: ${queueData.queue.length} tracks`);
        
        // Prefetch lyrics for all songs in queue (background task)
        queueData.queue.forEach(async (track, index) => {
          // Only prefetch first 5 songs to avoid overwhelming the system
          if (index >= 5) return;
          
          // Check if already cached (including null results)
          if (lyricsCache.current.has(track.id)) {
            return;
          }
          
          try {
            const lyricsLines = await fetchSyncedLyrics(
              track.name,
              track.artists[0].name,
              track.duration_ms,
              track.id
            );
            
            // Cache the result (even if null) to prevent repeated fetches
            lyricsCache.current.set(track.id, lyricsLines);
          } catch (err) {
            // Cache null to prevent repeated failed attempts
            lyricsCache.current.set(track.id, null);
          }
        });
      } else {
        setQueue([]);
        setNextTrack(null);
      }
    } catch (err) {
      console.error("Error fetching queue:", err);
      // Don't set error state - queue is non-critical
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    if (session?.accessToken) {
      fetchPlaybackState();
      fetchQueueAndPrefetchLyrics(); // Fetch queue on mount
      
      const playbackInterval = setInterval(fetchPlaybackState, 5000);
      const queueInterval = setInterval(fetchQueueAndPrefetchLyrics, 10000); // Update queue every 10s
      
      return () => {
        clearInterval(playbackInterval);
        clearInterval(queueInterval);
      };
    }
  }, [session?.accessToken]); // Only depend on access token, not entire session object

  // Update progress bar in real-time
  useEffect(() => {
    if (playbackState?.is_playing) {
      const interval = setInterval(() => {
        setCurrentProgress((prev) => {
          const next = prev + 1000;
          return next <= (playbackState.item?.duration_ms || 0) ? next : prev;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [playbackState?.is_playing, playbackState?.item?.duration_ms]);

  // Hue lights react to mic input only (ignore play state)
  useEffect(() => {
    if (hue.isActive && micData) {
      hue.reactToMusic({
        energy: micData.energy,
        bass: micData.bass,
        mid: micData.mid,
        treble: micData.treble,
        subBass: micData.subBass,
        presence: micData.presence,
        voiceStrength: micData.voiceStrength,
        instruments: micData.instruments, // Add instruments for drums detection
      });
    }
  }, [micData, hue.isActive, hue.reactToMusic]);

  // Handle creating new visualization
  const handleCreateNew = () => {
    setIsCreatingVisualization(true);
    setGeneratedCode("");
    setGenerationError(null);
    setCurrentPrompt("");
  };

  // Handle cancelling visualization creation
  const handleCancelCreate = () => {
    setIsCreatingVisualization(false);
    setGeneratedCode("");
    setGenerationError(null);
    setCurrentPrompt("");
  };

  // Handle generating visualization code from prompt
  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setGenerationError(null);
    setCurrentPrompt(prompt);

    try {
      // If we already have generated code, send it as context for improvements
      const previousCode = generatedCode ? stripCodeFences(generatedCode) : undefined;
      
      const response = await fetch("/api/generate-visualization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt,
          previousCode // Send previous code for iterative improvements
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate visualization");
      }

      const data = await response.json();
      setGeneratedCode(data.code);
      console.log(previousCode ? "✅ Improved visualization code" : "✅ Generated visualization code");
    } catch (error) {
      console.error("Error generating visualization:", error);
      setGenerationError(
        error instanceof Error ? error.message : "Failed to generate"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle saving custom visualization
  const handleSave = async (name: string) => {
    if (!generatedCode) return;

    console.log('💾 Saving custom visualization:', name);

    // Strip markdown code fences before saving
    const cleanCode = stripCodeFences(generatedCode);

    // Try to compile DSL to JS for performance
    let compiledCode: string | undefined;
    if (isDSLFormat(cleanCode)) {
      try {
        const { compileDSL } = await import('@/lib/visualizationDSL/compiler');
        const dslConfig = JSON.parse(cleanCode);
        compiledCode = compileDSL(dslConfig);
        console.log('✅ Compiled DSL to JS code');
      } catch (error) {
        console.error('⚠️ Failed to compile DSL, will use interpreter:', error);
        compiledCode = undefined;
      }
    }

    // Create a clean object with only serializable data (no thumbnail yet)
    const newViz: CustomVizType = {
      id: `custom_${Date.now()}`,
      name: String(name),
      prompt: String(currentPrompt),
      code: String(cleanCode),
      compiledCode: compiledCode,
      createdAt: Date.now(),
      icon: "✦",
      thumbnail: undefined, // Will capture after rendering
    };

    console.log('📦 Object to save:', JSON.stringify(newViz).substring(0, 200));

    try {
      // Save to IndexedDB first
      await saveCustomVisualization(newViz);
      console.log('✅ Saved to IndexedDB');
      
      // Reload custom visualizations
      const customViz = await getAllCustomVisualizations();
      console.log('📦 Loaded custom visualizations:', customViz.length);
      setCustomVisualizations(customViz);

      // Close creator first
      setIsCreatingVisualization(false);
      setGeneratedCode("");
      setCurrentPrompt("");
      setGenerationError(null);

      // Switch to the new visualization to render it
      console.log('🎨 Switching to new visualization:', newViz.id);
      setVisualizationType(newViz.id);

      // Capture screenshot after visualization renders
      setTimeout(async () => {
        try {
          console.log('📸 Capturing screenshot for viz:', newViz.id);
          const { captureAndCompressThumbnail } = await import('@/lib/screenshotCapture');
          const thumbnail = await captureAndCompressThumbnail('body');
          
          console.log('📸 Screenshot captured, size:', thumbnail.length, 'chars');
          console.log('📸 Screenshot preview:', thumbnail.substring(0, 50) + '...');
          
          // Update visualization with thumbnail
          newViz.thumbnail = thumbnail;
          await saveCustomVisualization(newViz);
          console.log('💾 Updated viz with thumbnail in database');
          
          // Reload to show new thumbnail
          const updated = await getAllCustomVisualizations();
          setCustomVisualizations(updated);
          
          console.log('✅ Screenshot captured and saved, updated list has', updated.length, 'vizs');
          console.log('📋 Updated viz:', updated.find(v => v.id === newViz.id));
        } catch (error) {
          console.error('⚠️ Failed to capture screenshot:', error);
          console.error('⚠️ Error details:', error instanceof Error ? error.message : error);
          // Continue anyway - viz is still usable
        }
      }, 3000); // Wait 3 seconds for viz to render

      console.log(`✅ Successfully saved and loaded: ${name}`);
    } catch (error) {
      console.error('❌ Failed to save visualization:', error);
      setGenerationError('Failed to save visualization');
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (status === "loading") {
    return (
      <div className={styles.fullscreenPage}>
        <div className={styles.centerMessage}>
          <Logo loading={true} size={48} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.fullscreenPage}>
        <div className={styles.centerMessage}>
          <h1>Not Authenticated</h1>
          <p>Please sign in with Spotify to use the player</p>
          <button 
            onClick={() => signIn("spotify")} 
            className={styles.link}
            style={{ cursor: "pointer" }}
          >
            Sign in with Spotify
          </button>
        </div>
      </div>
    );
  }

  // Create a placeholder "no track" lyrics for when nothing is playing
  const noTrackLyrics = !playbackState?.item
    ? [
        {
          time: 0,
          text: "No track currently playing",
        },
      ]
    : null;

  // Determine which visualization to show
  const renderVisualization = () => {
    // Priority 1: Create mode overrides everything
    if (isCreatingVisualization && generatedCode) {
      // Check if it's DSL or JavaScript
      const isDSL = isDSLFormat(generatedCode);
      
      // Always use compiled version for AI-generated DSL visualizations
      if (isDSL && previewCompiledCode) {
        return (
          <CompiledVisualization
            key="preview-compiled"
            compiledCode={previewCompiledCode}
            micData={micData}
          />
        );
      } else if (isDSL && !previewConfig) {
        return <BlankGridVisualization key="blank-error" micData={micData} />;
      } else {
        // JavaScript fallback
        return (
          <CustomVisualization
            key="preview"
            code={generatedCode}
            micData={micData}
          />
        );
      }
    }

    if (isCreatingVisualization && !generatedCode) {
      return <BlankGridVisualization key="blank" micData={micData} />;
    }

    // Priority 2: Custom visualizations
    const customViz = customVisualizations.find((v) => v.id === visualizationType);
    if (customViz) {
      // Check if it's DSL JSON or JavaScript
      const isDSL = isDSLFormat(customViz.code);
      
      if (isDSL && customVizConfig) {
        // Use compiled mode if available and enabled
        if (useCompiledMode && customViz.compiledCode) {
          return (
            <CompiledVisualization
              key={`compiled-${visualizationType}`}
              compiledCode={customViz.compiledCode}
              micData={micData}
            />
          );
        }
        
        // Fallback to DSL interpreter
        return (
          <DSLVisualization
            key={`dsl-${visualizationType}`}
            config={customVizConfig}
            micData={micData}
          />
        );
      } else if (isDSL && !customVizConfig) {
        return null; // Failed to parse
      } else {
        // Fallback to JavaScript execution (legacy)
        return (
          <CustomVisualization
            key={`custom-${visualizationType}`}
            code={customViz.code}
            micData={micData}
          />
        );
      }
    }

    // Priority 3: Built-in visualizations
    switch (visualizationType) {
      case "particles":
        return (
        <OrbitalVisualization
            key="particles"
          micData={micData}
        />
        );
      case "fractal":
        return (
        <FractalVisualization
            key="fractal"

          micData={micData}
        />
        );
      case "psychedelic":
        return (
        <PsychedelicVisualization
            key="psychedelic"
          micData={micData}
        />
        );
      case "waves":
        return (
        <WavyLinesVisualization
            key="waves"
          micData={micData}
        />
        );
      case "animated":
        return (
        <LavaLampVisualization
            key="animated"
          micData={micData}
        />
        );
      case "spectrum3d":
        return (
        <Spectrum3DVisualization
            key="spectrum3d"
          micData={micData}
        />
        );
      case "fftspectrum":
        return (
        <FFTSpectrumVisualization
            key="fftspectrum"
          micData={micData}
        />
        );
      case "lyricsonly":
        return (
        <LyricsOnlyVisualization key="lyricsonly" />
        );
      case "oscilloscope":
        return (
        <OscilloscopeVisualization
            key="oscilloscope"
          micData={micData}
        />
        );
      case "camera":
        return (
        <CameraVisualization
            key="camera"
          videoElement={videoElement}
          micData={micData}
        />
        );
      case "debug":
        return (
        <DebugVisualization
            key="debug"
          micData={micData}
          hueDebugData={hue.debugData}
          hueIsActive={hue.isActive}
          hueConfig={hue.config}
        />
        );
      case "youtube":
        return (
        <YouTubeVisualization
            key="youtube"
          trackName={playbackState?.item?.name || lastKnownTrack?.item?.name}
          artistName={playbackState?.item?.artists[0]?.name || lastKnownTrack?.item?.artists[0]?.name}
          spotifyId={(playbackState?.item as any)?.id || (lastKnownTrack?.item as any)?.id}
          micData={micData}
        />
        );
      default:
        return null;
    }
  };

  // Get camera settings for each visualization
  const getCameraSettings = () => {
    switch(visualizationType) {
      case 'fftspectrum': return { position: [0, 0, 30] as [number, number, number], fov: 75 };
      case 'particles': return { position: [0, 0, 40] as [number, number, number], fov: 80 };
      case 'animated': return { position: [0, 0, 30] as [number, number, number], fov: 75 };
      case 'waves': return { position: [0, 0, 25] as [number, number, number], fov: 75 };
      default: return { position: [0, 0, 30] as [number, number, number], fov: 75 };
    }
  };

  // Get background for each visualization
  const getBackground = () => {
    switch(visualizationType) {
      case 'fftspectrum': return "linear-gradient(to bottom, #000000 0%, #0a0020 100%)";
      case 'particles': return "radial-gradient(circle, #0a0a0a 0%, #000000 100%)";
      case 'psychedelic': return "radial-gradient(circle, #330033 0%, #000000 100%)";
      case 'fractal': return "black";
      case 'waves': return "linear-gradient(to bottom, #0a0015 0%, #000000 100%)";
      case 'spectrum3d': return "linear-gradient(to bottom, #000000 0%, #1a0033 100%)";
      case 'lyricsonly': return "linear-gradient(135deg, #0a0015 0%, #1a0033 50%, #000000 100%)";
      case 'animated': return "#050505"; // Lava lamp has fog
      default: return "black";
    }
  };

  // Check if this is a special visualization that needs separate rendering
  const isSpecialVisualization = [
    'oscilloscope',
    'camera', 
    'youtube',
    'debug'
  ].includes(visualizationType) || visualizationType.startsWith('custom-') || visualizationType.startsWith('dsl-');

  return (
    <div className={styles.fullscreenPage}>
      {/* Unified Canvas for regular visualizations (WITHOUT lyrics) */}
      {!isSpecialVisualization && (
        <Canvas
          camera={getCameraSettings()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: getBackground(),
            zIndex: 0,
          }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={1}
        >
          {/* Conditionally render visualization scene - scene swaps independently of lyrics! */}
          {visualizationType === 'fftspectrum' && <FFTSpectrumScene micData={micData} />}
          {visualizationType === 'particles' && <OrbitalScene micData={micData} />}
          {visualizationType === 'fractal' && <FractalScene micData={micData} />}
          {visualizationType === 'psychedelic' && <PsychedelicScene micData={micData} />}
          {visualizationType === 'waves' && <WavyLinesScene micData={micData} />}
          {visualizationType === 'animated' && <LavaLampScene micData={micData} />}
          {visualizationType === 'spectrum3d' && <Spectrum3DScene micData={micData} />}
          {/* lyricsonly has no scene content - just background */}
        </Canvas>
      )}

      {/* Special visualizations - rendered separately */}
      {isSpecialVisualization && renderVisualization()}

      {/* PERSISTENT LYRICS CANVAS - ALWAYS RENDERED, NEVER UNMOUNTS! */}
      {lyrics && lyrics.length > 0 && (
        <Canvas
          camera={{ position: [0, 0, 30] as [number, number, number], fov: 75 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'transparent',
            zIndex: 2, // Above everything
            pointerEvents: 'none', // Allow clicks to pass through
          }}
          gl={{
            antialias: false, // Disabled for performance - less noticeable on text
            alpha: true, // Transparent background
            powerPreference: "high-performance",
          }}
          dpr={1}
        >
          <group 
            position={visualizationType === 'lyricsonly' ? [0, 0, 0] : [0, 0, 8]} 
            scale={visualizationType === 'lyricsonly' ? 1.0 : 0.7}
          >
            <Lyrics3D
              lyrics={lyrics}
              currentTimeMs={currentProgress}
              isPlaying={playbackState?.is_playing ?? false}
              syncedData={null}
              micData={micData}
              color="#1ed760"
            />
          </group>
        </Canvas>
      )}

      {/* Performance Stats Monitor - Toggle with 'S' key */}
      <PerformanceStats 
        visible={showPerformanceStats}
        position="top-left"
      />

      {/* Top Controls */}
      <div className={styles.topBar}>
        <Logo loading={status === "loading" || subscriptionLoading} size={20} />

        <div className={styles.controlGroups}>
        {/* Share Controls (leftmost) */}
        {!shareManager.isShareActive ? (
          // Not sharing yet - show Share button
          <ShareButton onStartSharing={() => {
            console.log("🎭 [PLAYER] User initiated screen sharing");
            shareManager.startHosting();
            hasStartedHosting.current = true;
            setShowQRCodeOnConnect(true); // Auto-expand QR on connect
          }} />
        ) : shareManager.peerId ? (
          // Sharing and connected - show QR code
          <ShareQRCode 
            peerId={shareManager.peerId}
            connectedViewers={shareManager.connectedViewers}
            autoExpand={showQRCodeOnConnect}
          />
        ) : (
          // Sharing but connecting - show connecting badge
          <div 
            className={styles.connectingBadge}
            title="Waiting for peer connection to initialize"
          >
            <span className={styles.connectingIcon}>⧉</span>
            <span>Connecting...</span>
          </div>
        )}
        
        {/* Tools Menu */}
        <ToolsMenu
          isPlaying={
            !playbackState?.item && !lastKnownTrack?.item
              ? null
              : playbackState?.is_playing ?? false
          }
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          onMicToggle={() => (isMicEnabled ? disableMic() : enableMic())}
          onCameraToggle={() => (isCameraEnabled ? disableCamera() : enableCamera())}
          showMic={micAvailable}
          showCamera={webglAvailable}
          showHue={true}
          isHueConnected={hue.isConnected}
          onHueToggle={() => setShowHueControls(!showHueControls)}
          isHueHighlighted={showHueControls}
        />

        {/* AI Create Button */}
        <button
          className={styles.aiButton}
          onClick={handleCreateNew}
          title="Create AI Visualization"
        >
          <span className={styles.sparkles}>✦</span>
          <span>AI</span>
        </button>

        {/* Visualization Dropdown */}
        <VisualizationDropdown
          value={visualizationType}
          onChange={setVisualizationType}
          customVisualizations={customVisualizations}
        />

        {/* Mode Dropdown */}
        <ModeDropdown
          value={visualizationMode}
          onChange={setVisualizationMode}
        />

        {/* User Profile */}
        {session?.user && (
          <Link href="/profile" className={styles.userProfile}>
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={36}
                height={36}
                className={styles.userAvatar}
              />
            ) : (
              <div className={styles.userAvatarPlaceholder}>
                {session.user.name?.charAt(0) || "U"}
              </div>
            )}
          </Link>
        )}
        </div>
      </div>

      {/* Hue Controls Panel */}
      {showHueControls && (
        <div className={styles.huePanel}>
          <HueControls hue={hue} />
        </div>
      )}

      {/* Bottom Player Controls - with transition */}
      <div 
        className={`${styles.bottomControls} ${
          (playbackState?.item || lastKnownTrack?.item) && !error && !sessionError ? styles.visible : styles.hidden
        }`}
      >
        {(playbackState?.item || lastKnownTrack?.item) && (
          <div className={styles.controlsContainer}>
            {(() => {
              // Use current playback if available, otherwise use last known track
              const displayTrack = playbackState?.item || lastKnownTrack?.item;
              if (!displayTrack) return null;
              
              const timeRemaining = displayTrack.duration_ms - currentProgress;
              const isNearEnd = timeRemaining <= 30000; // 30 seconds
              const secondsRemaining = Math.ceil(timeRemaining / 1000);
              
              return (
                <>
                  {/* LEFT: Current Song */}
                  <div className={styles.currentSection}>
                    {/* Album Art */}
                    <div className={styles.albumArt}>
                      {displayTrack.album.images[0] && (
                        <img
                          src={displayTrack.album.images[0].url}
                          alt={displayTrack.album.name}
                        />
                      )}
                      {/* Lyrics Badge */}
                      <div 
                        className={`${styles.lyricsBadge} ${lyrics && lyrics.length > 0 ? styles.hasLyrics : styles.noLyrics}`}
                        title={lyrics && lyrics.length > 0 ? "Has lyrics" : "No lyrics"}
                      />
                    </div>

                    {/* Track Info & Controls */}
                    <div className={styles.trackInfoContainer}>
                      <div className={styles.trackInfo}>
                        <h2 className={styles.trackName}>{displayTrack.name}</h2>
                        <p className={styles.artistName}>
                          {displayTrack.artists.map((a) => a.name).join(", ")}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className={styles.progressContainer}>
                        <span className={styles.timeText}>
                          {formatTime(currentProgress)}
                        </span>
                        <div className={styles.progressBar}>
                          <div
                            className={`${styles.progressFill} ${isNearEnd ? styles.nearEnd : ''}`}
                            style={{
                              width: `${
                                (currentProgress / displayTrack.duration_ms) * 100
                              }%`,
                            }}
                          />
                        </div>
                        <span className={styles.timeText}>
                          {formatTime(displayTrack.duration_ms)}
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* RIGHT: Next Songs Queue */}
                  {queue.length > 0 && (
                    <div className={styles.queueSection}>
                      <div className={styles.queueList}>
                        {queue.slice(0, 2).map((track, index) => (
                          <div 
                            key={track.id} 
                            className={`${styles.queueItem} ${index === 0 && isNearEnd ? styles.upcoming : ''}`}
                          >
                            {/* Album Art - smaller for 2nd/3rd tracks */}
                            <div className={`${styles.queueAlbumArt} ${index > 0 ? styles.smaller : ''}`}>
                              {track.album.images[0] && (
                                <img
                                  src={track.album.images[0].url}
                                  alt={track.album.name}
                                />
                              )}
                              {/* Queue Lyrics Badge */}
                              <div 
                                className={`${styles.queueLyricsBadge} ${lyricsCache.current.has(track.id) && lyricsCache.current.get(track.id) ? styles.hasLyrics : styles.noLyrics}`}
                                title={lyricsCache.current.has(track.id) && lyricsCache.current.get(track.id) ? "Has lyrics" : "No lyrics"}
                              />
                            </div>
                            
                            {/* Track Info */}
                            <div className={styles.queueTrackInfo}>
                              <span className={styles.queueTrackName}>{track.name}</span>
                              <span className={styles.queueArtistName}>
                                {track.artists[0].name}
                              </span>
                            </div>
                            
                            {/* Show countdown on first track when it's about to start */}
                            {index === 0 && isNearEnd && (
                              <div className={styles.nextUpTimer}>{secondsRemaining}s</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Floating Stats Panel - Only show for DSL visualizations */}
      {(() => {
        const customViz = customVisualizations.find((v) => v.id === visualizationType);
        const isDSL = customViz && isDSLFormat(customViz.code);
        const hasCompiled = customViz?.compiledCode;
        
        if (!isDSL) return null;
        
        return (
          <div className={styles.floatingStats}>
            <>
                {hasCompiled && (
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Mode</span>
                    <span className={styles.statValue}>
                      {useCompiledMode ? "⚡ Compiled" : "🐌 Interpreted"}
                    </span>
                  </div>
                )}
                
                {/* Recompile Button */}
                <button
                  className={styles.vizButton}
                  style={{ marginTop: '8px' }}
                  onClick={async () => {
                    if (!customViz) return;
                    try {
                      console.log('🔄 Recompiling visualization...');
                      const cleanCode = stripCodeFences(customViz.code);
                      const { compileDSL } = await import('@/lib/visualizationDSL/compiler');
                      const dslConfig = JSON.parse(cleanCode);
                      const compiledCode = compileDSL(dslConfig);
                      
                      // Save updated visualization
                      const updatedViz = { ...customViz, compiledCode };
                      await saveCustomVisualization(updatedViz);
                      
                      // Update state
                      setCustomVisualizations(prev => 
                        prev.map(v => v.id === customViz.id ? updatedViz : v)
                      );
                      
                      console.log('✅ Recompiled successfully!');
                      alert('✅ Visualization recompiled! The page will refresh.');
                      window.location.reload();
                    } catch (error) {
                      console.error('❌ Recompile failed:', error);
                      alert('❌ Failed to recompile');
                    }
                  }}
                  title="Recompile with latest compiler"
                >
                  🔄 Recompile
                </button>
                
                {/* Retake Screenshot Button */}
                <button
                  className={styles.vizButton}
                  style={{ marginTop: '8px' }}
                  onClick={async () => {
                    if (!customViz) return;
                    try {
                      console.log('📸 Retaking screenshot for:', customViz.name);
                      
                      // Wait a moment for viz to render
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      
                      const { captureAndCompressThumbnail } = await import('@/lib/screenshotCapture');
                      const thumbnail = await captureAndCompressThumbnail('body');
                      
                      console.log('📸 Screenshot captured, size:', thumbnail.length, 'chars');
                      
                      // Save updated visualization with new thumbnail
                      const updatedViz = { ...customViz, thumbnail };
                      await saveCustomVisualization(updatedViz);
                      
                      // Reload custom visualizations
                      const updated = await getAllCustomVisualizations();
                      setCustomVisualizations(updated);
                      
                      console.log('✅ Screenshot updated!');
                      alert('✅ Screenshot captured and saved!');
                    } catch (error) {
                      console.error('❌ Screenshot capture failed:', error);
                      alert('❌ Failed to capture screenshot: ' + (error instanceof Error ? error.message : 'Unknown error'));
                    }
                  }}
                  title="Retake screenshot for this visualization"
                >
                  📸 Retake Screenshot
                </button>
                
                {/* Performance Toggle */}
                {hasCompiled && (
                  <button
                    className={`${styles.vizButton} ${useCompiledMode ? styles.active : ""}`}
                    style={{ marginTop: '8px' }}
                    onClick={() => setUseCompiledMode(!useCompiledMode)}
                    title={useCompiledMode ? "Compiled Mode (Fast)" : "Interpreter Mode (Slow)"}
                  >
                    {useCompiledMode ? "⚡ Use Compiled" : "🐌 Use Interpreted"}
                  </button>
                )}
            </>
          </div>
        );
      })()}

      {/* Visualization Creator */}
      {isCreatingVisualization && (
        <VisualizationCreator
          onGenerate={handleGenerate}
          onSave={handleSave}
          onCancel={handleCancelCreate}
          isGenerating={isGenerating}
          hasCode={!!generatedCode}
          error={generationError}
        />
      )}
    </div>
  );
}
