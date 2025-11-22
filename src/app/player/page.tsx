"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useRef, useMemo } from "react";
import { getCurrentlyPlaying, getUserQueue, QueueItem } from "@/lib/spotify";
import { fetchSyncedLyrics, LyricLine } from "@/lib/lyrics";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useHueLights } from "@/hooks/useHueLights";
import { useCamera } from "@/hooks/useCamera";
import { useFPS } from "@/hooks/useFPS";
import { useShareManager, SharedState } from "@/hooks/useShareManager";
import MusicVisualization from "@/components/MusicVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import AnimatedSceneVisualization from "@/components/AnimatedSceneVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
import WaveSpectrum3DVisualization from "@/components/WaveSpectrum3DVisualization";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import CameraVisualization from "@/components/CameraVisualization";
import DebugVisualization from "@/components/DebugVisualization";
import YouTubeVisualization from "@/components/YouTubeVisualization";
import CustomVisualization from "@/components/CustomVisualization";
import DSLVisualization from "@/components/DSLVisualization";
import CompiledVisualization from "@/components/CompiledVisualization";
import BlankGridVisualization from "@/components/BlankGridVisualization";
import HueControls from "@/components/HueControls";
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
  const fps = useFPS();
  const [fftRows, setFftRows] = useState<number>(200); // Track FFT visualization rows
  const lastRandomTrackId = useRef<string | null>(null); // Track last track for RANDOM mode
  
  // Share Manager for broadcasting to viewers
  const shareManager = useShareManager();
  
  // Start hosting when component mounts
  useEffect(() => {
    shareManager.startHosting();
    console.log("🎭 Started hosting mode for screen sharing");
    
    return () => {
      shareManager.stopHosting();
      console.log("🛑 Stopped hosting mode");
    };
  }, []);
  
  // Broadcast state to viewers (lightweight - only song/lyrics/queue info)
  useEffect(() => {
    if (!shareManager.isHosting || shareManager.connectedViewers === 0) {
      return;
    }

    let broadcastCount = 0;
    const broadcastInterval = setInterval(() => {
      const displayTrack = playbackState?.item || lastKnownTrack?.item;
      
      const state: SharedState = {
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

      shareManager.broadcastState(state);
      broadcastCount++;
      
      if (broadcastCount % 5 === 0) {
        console.log(`📡 [HOST] Broadcasted ${broadcastCount} updates to ${shareManager.connectedViewers} viewers`);
      }
    }, 2000); // 0.5fps - reduce network traffic

    return () => clearInterval(broadcastInterval);
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
        "particles",
        "fractal",
        "psychedelic",
        "waves",
        "animated",
        "spectrum3d",
        "wavespectrum",
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
            if (cachedLyrics && cachedLyrics.length > 0) {
              console.log(`📦 Using cached lyrics for: ${data.item.name} (${cachedLyrics.length} lines)`);
            } else {
              console.log(`📦 Cached lyrics for: ${data.item.name} is null/empty`);
            }
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

              if (lyricsLines) {
                console.log(
                  "✅ Synced lyrics loaded:",
                  lyricsLines.length,
                  "lines"
                );
              } else {
                console.log("⚠️ No synced lyrics found");
              }
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
          
          // Check if already cached
          if (lyricsCache.current.has(track.id)) {
            console.log(`📦 Lyrics already cached for: ${track.name}`);
            return;
          }
          
          try {
            console.log(`🔄 Prefetching lyrics for: ${track.name}`);
            const lyricsLines = await fetchSyncedLyrics(
              track.name,
              track.artists[0].name,
              track.duration_ms,
              track.id
            );
            
            // Cache the result (even if null)
            lyricsCache.current.set(track.id, lyricsLines);
            
            if (lyricsLines && lyricsLines.length > 0) {
              console.log(`✅ Prefetched lyrics for: ${track.name} (${lyricsLines.length} lines)`);
            } else {
              console.log(`⚠️ No lyrics found during prefetch for: ${track.name}`);
              // Don't cache null results - allow retry when song actually plays
              lyricsCache.current.delete(track.id);
            }
          } catch (err) {
            console.error(`❌ Failed to prefetch lyrics for: ${track.name}`, err);
            // Don't cache errors
            lyricsCache.current.delete(track.id);
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
  }, [session]);

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
          <h1>Loading...</h1>
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
            isPlaying={playbackState?.is_playing || false}
            lyrics={(lyrics || noTrackLyrics) ?? undefined}
            currentTimeMs={currentProgress}
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
            isPlaying={playbackState?.is_playing || false}
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
              isPlaying={playbackState?.is_playing || false}
              lyrics={(lyrics || noTrackLyrics) ?? undefined}
              currentTimeMs={playbackState?.progress_ms || 0}
            />
          );
        }
        
        // Fallback to DSL interpreter
        return (
          <DSLVisualization
            key={`dsl-${visualizationType}`}
            config={customVizConfig}
            micData={micData}
            isPlaying={playbackState?.is_playing || false}
            lyrics={(lyrics || noTrackLyrics) ?? undefined}
            currentTimeMs={currentProgress}
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
            isPlaying={playbackState?.is_playing || false}
          />
        );
      }
    }

    // Priority 3: Built-in visualizations
    switch (visualizationType) {
      case "particles":
        return (
        <MusicVisualization
            key="particles"
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
          fps={fps}
        />
        );
      case "fractal":
        return (
        <FractalVisualization
            key="fractal"
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
          fps={fps}
        />
        );
      case "psychedelic":
        return (
        <PsychedelicVisualization
            key="psychedelic"
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
        />
        );
      case "waves":
        return (
        <WavyLinesVisualization
            key="waves"
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
        />
        );
      case "animated":
        return (
        <AnimatedSceneVisualization
            key="animated"
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
        );
      case "spectrum3d":
        return (
        <Spectrum3DVisualization
            key="spectrum3d"
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
        );
      case "wavespectrum":
        return (
        <WaveSpectrum3DVisualization
            key="wavespectrum"
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
        );
      case "fftspectrum":
        return (
        <FFTSpectrumVisualization
            key="fftspectrum"
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
          fps={fps}
          onRowsChange={setFftRows}
        />
        );
      case "camera":
        return (
        <CameraVisualization
            key="camera"
          videoElement={videoElement}
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
        );
      case "debug":
        return (
        <DebugVisualization
            key="debug"
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
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
          lyrics={lyrics}
          currentTimeMs={currentProgress}
          micData={micData}
        />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.fullscreenPage}>
      {/* Background Visualization - Only render ONE at a time */}
      {renderVisualization()}


      {/* Top Controls */}
      <div className={styles.topBar}>
        <div className={styles.logo}>Syns6</div>

        <div className={styles.controlGroups}>
        {/* Share QR Code (leftmost) */}
        {shareManager.peerId && (
          <ShareQRCode 
            peerId={shareManager.peerId}
            connectedViewers={shareManager.connectedViewers}
          />
        )}
        
        {/* Actions Group */}
        <div className={styles.vizSelector}>
          {/* Play/Pause Status Indicator */}
          <div className={styles.statusIcon}>
            {!playbackState?.item && !lastKnownTrack?.item ? (
              <span title="No song playing">⏹</span>
            ) : playbackState?.is_playing ? (
              <span title="Playing">▶</span>
            ) : (
              <span title="Paused">⏸</span>
            )}
          </div>

          {/* Microphone Toggle */}
          <button
            className={`${styles.vizButton} ${
              isMicEnabled ? styles.active : ""
            }`}
            onClick={() => (isMicEnabled ? disableMic() : enableMic())}
            title={isMicEnabled ? "Disable Microphone" : "Enable Microphone"}
          >
            ⦿
          </button>
          {/* Camera Toggle */}
          <button
            className={`${styles.vizButton} ${
              isCameraEnabled ? styles.active : ""
            }`}
            onClick={() => (isCameraEnabled ? disableCamera() : enableCamera())}
            title={isCameraEnabled ? "Disable Camera" : "Enable Camera"}
          >
            ⊡
          </button>
          {/* Hue Lights Toggle */}
          <button
            className={`${styles.vizButton} ${
              hue.isConnected ? styles.active : ""
            } ${showHueControls ? styles.highlighted : ""}`}
            onClick={() => setShowHueControls(!showHueControls)}
            title={hue.isConnected ? "Hue Connected" : "Connect Hue Lights"}
          >
            ◐
          </button>
        </div>

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

      {/* Floating Stats Panel */}
      <div className={styles.floatingStats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>FPS</span>
          <span className={styles.statValue}>{fps}</span>
        </div>
        {visualizationType === "fftspectrum" && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Rows</span>
            <span className={styles.statValue}>{fftRows}</span>
          </div>
        )}
        {(() => {
          const customViz = customVisualizations.find((v) => v.id === visualizationType);
          const isDSL = customViz && isDSLFormat(customViz.code);
          const hasCompiled = customViz?.compiledCode;
          
          if (isDSL) {
            return (
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
            );
          }
          return null;
        })()}
      </div>

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
