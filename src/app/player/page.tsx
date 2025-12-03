"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getCurrentlyPlaying, getUserQueue, QueueItem } from "@/lib/spotify";
import { fetchSyncedLyrics, LyricLine } from "@/lib/lyrics";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useHueLights } from "@/hooks/useHueLights";
import { useCamera } from "@/hooks/useCamera";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useShareManager, SharedState } from "@/hooks/useShareManager";
import { useSubscription } from "@/hooks/useSubscription";
import { useLyricsWorker } from "@/hooks/useLyricsWorker";
import { useSmartPolling } from "@/hooks/useSmartPolling";
import { useYouTubePreloader } from "@/hooks/useYouTubePreloader";
import HueDropdown from "@/components/HueDropdown";
import PerformanceStats from "@/components/PerformanceStats";
import Lyrics3D from "@/components/Lyrics3D";
import { getPlanFromPriceId, getPriceForPlan, formatPrice } from "@/lib/prices";
import { parseSongTitle } from "@/lib/songParser";
import { CurrencyCode } from "@/components/CurrencyDropdown";
import { Canvas } from "@react-three/fiber";
import { isDSLFormat } from "@/lib/visualizationDSL/schema";
import VisualizationDropdown, {
  VisualizationType,
} from "@/components/VisualizationDropdown";
import ConfigDropdown, { VisualizationMode, LyricsFont, LyricsColor, getFontPath } from "@/components/ConfigDropdown";
import VisualizationCreator from "@/components/VisualizationCreator";
import { PlaybackStatusButton, MicrophoneButton, CameraButton } from "@/components/ToolsMenu";
import { getShaderControls, saveShaderControls, getLavaLampControls, saveLavaLampControls, getFFTControls, saveFFTControls, getKaleidoscopeControls, saveKaleidoscopeControls, getOrbitalControls, saveOrbitalControls, getWavyLinesControls, saveWavyLinesControls, getSpectrum3DControls, saveSpectrum3DControls, getYouTubeControls, saveYouTubeControls } from "@/lib/storage";

// Lazy load all visualization components (only loaded when needed)
const OrbitalVisualization = dynamic(() => import("@/components/OrbitalVisualization"), { ssr: false });
const PsychedelicVisualization = dynamic(() => import("@/components/PsychedelicVisualization"), { ssr: false });
const KaleidoscopeVisualization = dynamic(() => import("@/components/KaleidoscopeVisualization"), { ssr: false });
const WavyLinesVisualization = dynamic(() => import("@/components/WavyLinesVisualization"), { ssr: false });
const LavaLampVisualization = dynamic(() => import("@/components/LavaLampVisualization"), { ssr: false });
const Spectrum3DVisualization = dynamic(() => import("@/components/Spectrum3DVisualization"), { ssr: false });
const FFTSpectrumVisualization = dynamic(() => import("@/components/FFTSpectrumVisualization"), { ssr: false });
const OscilloscopeVisualization = dynamic(() => import("@/components/OscilloscopeVisualization"), { ssr: false });
const LyricsOnlyVisualization = dynamic(() => import("@/components/LyricsOnlyVisualization"), { ssr: false });
const CameraVisualization = dynamic(() => import("@/components/CameraVisualization"), { ssr: false });
const DebugVisualization = dynamic(() => import("@/components/DebugVisualization"), { ssr: false });
const YouTubeVisualization = dynamic(() => import("@/components/YouTubeVisualization"), { ssr: false });
const CustomVisualization = dynamic(() => import("@/components/CustomVisualization"), { ssr: false });
const DSLVisualization = dynamic(() => import("@/components/DSLVisualization"), { ssr: false });
const CompiledVisualization = dynamic(() => import("@/components/CompiledVisualization"), { ssr: false });
const BlankGridVisualization = dynamic(() => import("@/components/BlankGridVisualization"), { ssr: false });

// Lazy load scene components for unified canvas
const FFTSpectrumScene = dynamic(() => import("@/components/FFTSpectrumScene"), { ssr: false });
const OrbitalScene = dynamic(() => import("@/components/OrbitalScene"), { ssr: false });
const PsychedelicScene = dynamic(() => import("@/components/PsychedelicScene"), { ssr: false });
const KaleidoscopeScene = dynamic(() => import("@/components/KaleidoscopeScene"), { ssr: false });
const WavyLinesScene = dynamic(() => import("@/components/WavyLinesScene"), { ssr: false });
const LavaLampScene = dynamic(() => import("@/components/LavaLampScene"), { ssr: false });
const Spectrum3DScene = dynamic(() => import("@/components/Spectrum3DScene"), { ssr: false });
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
import {
  trackSongPlay,
  trackVisualizationChange,
  trackConfigChange,
  trackCamToggle,
  trackMicToggle,
  trackAIClick,
  trackShareClick,
  trackProfileClick,
} from "@/lib/analytics";

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
  const [lyricsTimeOffset, setLyricsTimeOffset] = useState(0); // Offset for showing next track's lyrics early
  const hasSwitchedToNextRef = useRef(false); // Track if we've already switched to next lyrics
  
  // Lyrics worker for background fetching (keeps main thread smooth)
  const lyricsWorker = useLyricsWorker({
    onLyricsReceived: useCallback((spotifyId: string, receivedLyrics: LyricLine[] | null) => {
      lyricsCache.current.set(spotifyId, receivedLyrics);
      
      // DON'T update UI if we've already switched to next track's lyrics
      if (hasSwitchedToNextRef.current) return;
      
      // Only update UI if this is the currently playing track
      if (playbackState?.item?.id === spotifyId) {
        setLyrics(receivedLyrics);
        setLastFetchedTrackId(spotifyId);
      }
    }, [playbackState?.item?.id]),
    
    onQueuePrefetched: useCallback((results: Array<{ trackId: string; lyrics: LyricLine[] | null; videoIds?: string[]; success: boolean }>) => {
      // Cache all prefetched lyrics and update queue with video IDs
      results.forEach(({ trackId, lyrics: prefetchedLyrics }) => {
        lyricsCache.current.set(trackId, prefetchedLyrics);
      });
      
      // Update queue with video IDs
      setQueue(prevQueue => prevQueue.map(track => {
        const result = results.find(r => r.trackId === track.id);
        if (result && result.videoIds) {
          return { ...track, videoIds: result.videoIds };
        }
        return track;
      }));
    }, []),
    
    onError: useCallback(() => {}, []),
  });
  const [visualizationType, setVisualizationType] =
    useState<VisualizationType>("fftspectrum");
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("STATIC");
  
  // YouTube preloader - tests videos in background for queued tracks (only when YouTube viz is active)
  useYouTubePreloader(queue, playbackState?.item?.id, visualizationType === 'youtube');
  
  const [lyricsFont, setLyricsFont] = useState<LyricsFont>("Poppins");
  const [lyricsColor, setLyricsColor] = useState<LyricsColor>("#ff0");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [customVisualizations, setCustomVisualizations] = useState<CustomVizType[]>([]);
  const [shaderControls, setShaderControls] = useState({
    rgbSplit: 0.01,
    distortion: 0.02,
    colorShift: 0.5,
  });
  const [lavaLampControls, setLavaLampControls] = useState<{
    resolution: number;
    blobCount: number;
    globSize?: number;
    reactivity?: number;
  }>({
    resolution: 32,
    blobCount: 18,
    globSize: 1.0,
    reactivity: 1.0,
  });
  const [fftControls, setFFTControls] = useState<{
    neonIntensity: number;
    colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
    lineWidth: number;
  }>({
    neonIntensity: 1.2,
    colorPalette: 'default',
    lineWidth: 0.04,
  });
  const [kaleidoscopeControls, setKaleidoscopeControls] = useState<{
    mode: 'album' | 'video';
    rgbDistance: number;
    reactivity: number;
  }>({
    mode: 'album',
    rgbDistance: 0.1,
    reactivity: 1.0,
  });
  const [orbitalControls, setOrbitalControls] = useState<{
    intensity: number;
    numOrbits: number;
    colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
    orbitDistance: number;
  }>({
    intensity: 2.0,
    numOrbits: 16,
    colorPalette: 'default',
    orbitDistance: 1.5,
  });
  const [wavyLinesControls, setWavyLinesControls] = useState<{
    numLines: number;
    colorPalette: 'default' | 'neon' | 'sunset' | 'forest' | 'candy';
    particleCount: number;
  }>({
    numLines: 60,
    colorPalette: 'default',
    particleCount: 500,
  });
  const [spectrum3DControls, setSpectrum3DControls] = useState<{
    shape: 'circle' | 'row';
    neonIntensity: number;
    colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
  }>({
    shape: 'circle',
    neonIntensity: 2.5,
    colorPalette: 'default',
  });
  const [youtubeControls, setYouTubeControls] = useState<{
    effect: 'none' | '3d-flip' | 'black-white' | 'glitch' | 'bloom';
  }>({
    effect: 'none',
  });
  const [currentYouTubeVideoId, setCurrentYouTubeVideoId] = useState<string | null>(null);
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
  const [showProfileDropdown, setShowProfileDropdown] = useState(false); // Profile dropdown
  
  // Share Manager for broadcasting to viewers
  const shareManager = useShareManager();
  
  // Restore shader controls from storage on mount
  useEffect(() => {
    getShaderControls().then((savedControls) => {
      if (savedControls) {
        setShaderControls(savedControls);
      }
    }).catch(() => {});
  }, []);
  
  // Save shader controls whenever they change
  useEffect(() => {
    saveShaderControls(shaderControls).catch(() => {});
  }, [shaderControls]);

  // Restore lava lamp controls from storage on mount
  useEffect(() => {
    getLavaLampControls().then((savedControls) => {
      if (savedControls) {
        setLavaLampControls(savedControls);
      }
    }).catch(() => {});
  }, []);
  
  // Save lava lamp controls whenever they change
  useEffect(() => {
    saveLavaLampControls(lavaLampControls).catch(() => {});
  }, [lavaLampControls]);

  // Restore FFT controls from storage on mount
  useEffect(() => {
    getFFTControls().then((savedControls) => {
      if (savedControls) {
        setFFTControls(savedControls as any);
      }
    }).catch(() => {});
  }, []);
  
  // Save FFT controls whenever they change
  useEffect(() => {
    saveFFTControls(fftControls).catch(() => {});
  }, [fftControls]);

  // Restore kaleidoscope controls from storage on mount
  useEffect(() => {
    getKaleidoscopeControls().then((savedControls) => {
      if (savedControls) {
        setKaleidoscopeControls(savedControls as any);
      }
    }).catch(() => {});
  }, []);
  
  // Save kaleidoscopeControls whenever they change
  useEffect(() => {
    saveKaleidoscopeControls(kaleidoscopeControls).catch(() => {});
  }, [kaleidoscopeControls]);
  
  // Load orbital controls on mount
  useEffect(() => {
    getOrbitalControls().then((savedControls) => {
      if (savedControls) {
        setOrbitalControls(savedControls as any);
      }
    }).catch(() => {});
  }, []);
  
  // Save orbital controls whenever they change
  useEffect(() => {
    saveOrbitalControls(orbitalControls).catch(() => {});
  }, [orbitalControls]);
  
  // Load wavy lines controls on mount
  useEffect(() => {
    getWavyLinesControls().then((savedControls) => {
      if (savedControls) {
        setWavyLinesControls(savedControls as any);
      }
    }).catch(() => {});
  }, []);
  
  // Save wavy lines controls whenever they change
  useEffect(() => {
    saveWavyLinesControls(wavyLinesControls).catch(() => {});
  }, [wavyLinesControls]);
  
  // Load spectrum3D controls on mount
  useEffect(() => {
    getSpectrum3DControls().then((savedControls) => {
      if (savedControls) {
        setSpectrum3DControls(savedControls as any);
      }
    }).catch(() => {});
  }, []);
  
  // Save spectrum3D controls whenever they change
  useEffect(() => {
    saveSpectrum3DControls(spectrum3DControls).catch(() => {});
  }, [spectrum3DControls]);
  
  // Load YouTube controls on mount
  useEffect(() => {
    getYouTubeControls().then((savedControls) => {
      if (savedControls) {
        setYouTubeControls(savedControls as any);
      }
    }).catch(() => {});
  }, []);
  
  // Save YouTube controls whenever they change
  useEffect(() => {
    saveYouTubeControls(youtubeControls).catch(() => {});
  }, [youtubeControls]);
  
  // Auto-switch to video mode when Kaleidoscope is selected and camera is on
  useEffect(() => {
    if (visualizationType === 'kaleidoscope' && isCameraEnabled && kaleidoscopeControls.mode === 'album') {
      setKaleidoscopeControls(prev => ({
        ...prev,
        mode: 'video'
      }));
    }
  }, [visualizationType, isCameraEnabled]);
  
  // Auto-switch back to album mode when camera is turned off
  useEffect(() => {
    if (!isCameraEnabled && kaleidoscopeControls.mode === 'video') {
      setKaleidoscopeControls(prev => ({
        ...prev,
        mode: 'album'
      }));
    }
  }, [isCameraEnabled]);
  
  // Reset auto-expand flag after QR code is shown
  useEffect(() => {
    if (shareManager.shareCode && showQRCodeOnConnect) {
      // Reset the flag after a short delay to allow the component to render
      const timer = setTimeout(() => {
        setShowQRCodeOnConnect(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shareManager.shareCode, showQRCodeOnConnect]);
  
  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!showProfileDropdown) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profileDropdown') && !target.closest('[class*="userProfile"]')) {
        setShowProfileDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);
  
  // Check subscription and redirect to pricing if not active
  useEffect(() => {
    // Wait for authentication and subscription data to load
    if (status === 'loading' || subscriptionLoading) {
      return;
    }

    // If authenticated but no active subscription, redirect to pricing
    if (status === 'authenticated' && !isActive) {
      router.push('/pricing');
    }
  }, [status, subscriptionLoading, isActive, router]);
  
  // Start hosting when component mounts (only if sharing was previously active)
  useEffect(() => {
    if (!hasStartedHosting.current && shareManager.isShareActive) {
      shareManager.startHosting();
      hasStartedHosting.current = true;
    }
    
    return () => {
      if (hasStartedHosting.current) {
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
  
  
  // Keyboard shortcut: Press 'S' to toggle performance stats
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 's' || e.key === 'S') {
        setShowPerformanceStats(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  // Broadcast state to viewers (lightweight - only song/lyrics/queue info)
  useEffect(() => {
    if (!shareManager.isHosting) {
      return;
    }
    
    if (shareManager.connectedViewers === 0) {
      return;
    }

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
    
    // Then broadcast on interval
    const broadcastInterval = setInterval(() => {
      const state = buildState();
      shareManager.broadcastState(state);
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
      const { getVisualizationType, getVisualizationMode, getLyricsFont, getLyricsColor } = await import('@/lib/storage');
      const savedType = await getVisualizationType();
      const savedMode = await getVisualizationMode();
      const savedFont = await getLyricsFont();
      const savedColor = await getLyricsColor();
      
      if (savedType) {
        setVisualizationType(savedType as VisualizationType);
      }
      if (savedMode) {
        setVisualizationMode(savedMode as VisualizationMode);
      }
      if (savedFont) {
        setLyricsFont(savedFont as LyricsFont);
      }
      if (savedColor) {
        setLyricsColor(savedColor as LyricsColor);
      }
      
      // Mark preferences as loaded
      setPreferencesLoaded(true);
    };
    loadPreferences();
  }, []);

  // Load custom visualizations
  useEffect(() => {
    const loadCustomViz = async () => {
      const customViz = await getAllCustomVisualizations();
      setCustomVisualizations(customViz);
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

  // Save visualization mode when it changes (only after initial load)
  useEffect(() => {
    if (!preferencesLoaded) return; // Don't save until we've loaded preferences
    
    const saveMode = async () => {
      const { saveVisualizationMode } = await import('@/lib/storage');
      await saveVisualizationMode(visualizationMode);
    };
    saveMode();
  }, [visualizationMode, preferencesLoaded]);

  // Save lyrics font when it changes
  useEffect(() => {
    const saveFont = async () => {
      const { saveLyricsFont } = await import('@/lib/storage');
      await saveLyricsFont(lyricsFont);
    };
    saveFont();
  }, [lyricsFont]);

  // Save lyrics color when it changes
  useEffect(() => {
    const saveColor = async () => {
      const { saveLyricsColor } = await import('@/lib/storage');
      await saveLyricsColor(lyricsColor);
    };
    saveColor();
  }, [lyricsColor]);

  // Randomize visualization config (respects actual config bounds)
  const randomizeConfig = (vizType: VisualizationType) => {
    const random = (min: number, max: number) => Math.random() * (max - min) + min;
    const randomInt = (min: number, max: number) => Math.floor(random(min, max + 1));
    const randomChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const randomStep = (min: number, max: number, step: number) => {
      const steps = Math.floor((max - min) / step);
      return min + (Math.floor(Math.random() * (steps + 1)) * step);
    };
    
    
    switch (vizType) {
      case 'particles':
        // Ranges: rgbSplit 0-0.05, distortion 0-0.1, colorShift 0-1
        setShaderControls({
          rgbSplit: random(0, 0.05),
          distortion: random(0, 0.1),
          colorShift: random(0, 1),
        });
        break;
      
      case 'fftspectrum':
        // Ranges: neonIntensity [0,0.4,0.8,1.2,1.6,3.2], lineWidth [0.01,0.02,0.04,0.08,0.16]
        setFFTControls({
          neonIntensity: randomChoice([0, 0.4, 0.8, 1.2, 1.6, 3.2]),
          colorPalette: randomChoice(['default', 'vaporwave', 'sunset', 'fire', 'neon']),
          lineWidth: randomChoice([0.01, 0.02, 0.04, 0.08, 0.16]),
        });
        break;
      
      case 'psychedelic':
        // Ranges: mode [album,video], rgbDistance [0-0.3, step 0.01], reactivity [0-3, step 0.1]
        setKaleidoscopeControls({
          mode: randomChoice(['album', 'video']),
          rgbDistance: randomStep(0, 0.3, 0.01),
          reactivity: randomStep(0, 3, 0.1),
        });
        break;
      
      case 'oscilloscope':
        // Ranges: intensity [0-5, step 0.1], numOrbits [4-24, step 2], orbitDistance [0.5-3, step 0.1]
        setOrbitalControls({
          intensity: randomStep(0, 5, 0.1),
          numOrbits: randomStep(4, 24, 2),
          colorPalette: randomChoice(['default', 'vaporwave', 'sunset', 'fire', 'neon']),
          orbitDistance: randomStep(0.5, 3, 0.1),
        });
        break;
      
      case 'waves':
        // Ranges: numLines [10-100, step 5], particleCount [100-1000, step 50]
        setWavyLinesControls({
          numLines: randomStep(10, 100, 5),
          colorPalette: randomChoice(['default', 'neon', 'sunset', 'forest', 'candy']),
          particleCount: randomStep(100, 1000, 50),
        });
        break;
      
      case 'spectrum3d':
        // Ranges: shape [circle,row], neonIntensity [0, 0.2, 0.4, ... 2.0]
        setSpectrum3DControls({
          shape: randomChoice(['circle', 'row']),
          neonIntensity: randomChoice([0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0]),
          colorPalette: randomChoice(['default', 'vaporwave', 'sunset', 'fire', 'neon']),
        });
        break;
      
      case 'youtube':
        setYouTubeControls({
          effect: randomChoice(['none', '3d-flip', 'black-white', 'glitch', 'bloom']),
        });
        break;
    }
  };

  // Handle RANDOM mode - change visualization when track changes OR when mode is set to RANDOM
  useEffect(() => {
    const currentTrackId = playbackState?.item?.id;
    
    if (visualizationMode === "RANDOM") {
      // Check if we should randomize: either new track OR just switched to RANDOM mode
      const isNewTrack = currentTrackId && currentTrackId !== lastRandomTrackId.current;
      const justSwitchedToRandom = lastRandomTrackId.current === null;
      
      if (isNewTrack || justSwitchedToRandom) {
        const visualizations: VisualizationType[] = [
          "fftspectrum",
          "lyricsonly",
          "particles",
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
        
        setVisualizationType(newVisualization);
        
        // Randomize the config for this visualization
        randomizeConfig(newVisualization);
        
        lastRandomTrackId.current = currentTrackId || 'random-init';
      }
    } else {
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
        // Only update lastKnownTrack if it's a different track (avoid redundant updates)
        if (!lastKnownTrack?.item || lastKnownTrack.item.id !== data.item.id) {
          setLastKnownTrack(data);
          // Track song play
          trackSongPlay(
            session?.user?.email,
            `${data.item.name} - ${data.item.artists[0]?.name || 'Unknown'}`
          );
        }
        setCurrentProgress(data.progress_ms || 0);
        setError(null);
        setTokenRefreshAttempts(0); // Reset on success

        // Fetch synced lyrics only if track changed
        if (data.item.id && data.item.id !== lastFetchedTrackId) {
          // DON'T update lyrics if we've already switched to next track!
          if (hasSwitchedToNextRef.current) {
            // Just update the fetched ID to prevent re-fetching
            setLastFetchedTrackId(data.item.id);
          } else if (lyricsCache.current.has(data.item.id)) {
            // Check cache first
            const cachedLyrics = lyricsCache.current.get(data.item.id);
            setLyrics(cachedLyrics || null);
            setLastFetchedTrackId(data.item.id);
          } else {
            // Use worker to fetch lyrics (off main thread for smooth UI)
            if (lyricsWorker.isWorkerReady) {
              lyricsWorker.fetchLyrics(
                data.item.name,
                data.item.artists[0].name,
                data.item.duration_ms,
                data.item.id
              );
              // Worker will call onLyricsReceived callback when done
            } else {
              // Fallback to main thread if worker not ready
              // DON'T update lyrics if we've already switched to next!
              if (!hasSwitchedToNextRef.current) {
                try {
                  const lyricsLines = await fetchSyncedLyrics(
                    data.item.name,
                    data.item.artists[0].name,
                    data.item.duration_ms,
                    data.item.id
                  );
                  lyricsCache.current.set(data.item.id, lyricsLines);
                  setLyrics(lyricsLines);
                  setLastFetchedTrackId(data.item.id);
                } catch (err) {
                  lyricsCache.current.set(data.item.id, null);
                  setLyrics(null);
                  setLastFetchedTrackId(data.item.id);
                }
              } else {
              }
            }
          }
        }
      } else {
        // No current track from Spotify, but keep showing last known track
        setPlaybackState(null);
        // Don't clear lastKnownTrack - keep it visible!
      }
    } catch (err: any) {
      // Check if it's a token expired error
      const isTokenError = err.message && (
        err.message.includes("401") || 
        err.message.includes("SpotifyTokenExpired")
      );
      
      if (isTokenError && tokenRefreshAttempts < 2) {
        setTokenRefreshAttempts((prev) => prev + 1);
        console.log("🔄 Token error detected, attempting refresh...");
        
        try {
          // Try to force refresh the token
          const refreshResponse = await fetch("/api/auth/refresh-token", {
            method: "POST",
          });
          
          if (refreshResponse.ok) {
            console.log("✅ Token refreshed, updating session...");
            // Update the session to get the new token
            await update();
            // Don't set error - let next poll retry with new token
            return;
          }
        } catch (refreshErr) {
          console.error("❌ Failed to refresh token:", refreshErr);
        }
        
        setError("Refreshing session... please wait");
      } else if (tokenRefreshAttempts >= 2) {
        setPlaybackState(null);
        setLastKnownTrack(null);
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
        
        
        // Filter queue to only uncached tracks
        const uncachedTracks = queueData.queue.filter(track => !lyricsCache.current.has(track.id));
        
        
        if (uncachedTracks.length > 0) {
          if (lyricsWorker.isWorkerReady) {
            // Use worker to prefetch lyrics (off main thread)
            lyricsWorker.prefetchQueue(uncachedTracks, 5);
            // Worker will call onQueuePrefetched callback when done
          } else {
            // Fallback to main thread if worker not ready
            uncachedTracks.forEach(async (track, index) => {
              if (index >= 5) return;
              
              try {
                const lyricsLines = await fetchSyncedLyrics(
                  track.name,
                  track.artists[0].name,
                  track.duration_ms,
                  track.id
                );
                lyricsCache.current.set(track.id, lyricsLines);
              } catch (err) {
                lyricsCache.current.set(track.id, null);
              }
            });
          }
        }
      } else {
        setQueue([]);
        setNextTrack(null);
      }
    } catch (err) {
      // Don't set error state - queue is non-critical
    }
  };

  // Smart adaptive polling based on playback state
  useSmartPolling({
    isEnabled: !!session?.accessToken,
    playbackState,
    currentProgress,
    onFetchPlayback: fetchPlaybackState,
    onFetchQueue: fetchQueueAndPrefetchLyrics,
    queueInterval: 10000,
  });

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

  // Reset the "switched to next" flag when track actually changes
  useEffect(() => {
    if (playbackState?.item?.id) {
      if (hasSwitchedToNextRef.current) {
      }
      hasSwitchedToNextRef.current = false;
      setLyricsTimeOffset(0); // Reset offset when track changes
    }
  }, [playbackState?.item?.id]);

  // Rotating document title: default → song → artist → loop
  const currentTrackName = playbackState?.item?.name || lastKnownTrack?.item?.name;
  const currentArtistName = playbackState?.item?.artists?.[0]?.name || lastKnownTrack?.item?.artists?.[0]?.name;
  
  useEffect(() => {
    if (!currentTrackName || !currentArtistName) {
      document.title = "syns6 - Karaoke, redefined.";
      return;
    }
    
    const titles = [
      "syns6 - Karaoke, redefined.",
      currentTrackName,
      currentArtistName,
    ];
    let index = 0;
    document.title = titles[0];
    
    const interval = setInterval(() => {
      index = (index + 1) % titles.length;
      document.title = titles[index];
    }, 5000);
    
    return () => {
      clearInterval(interval);
      document.title = "syns6 - Karaoke, redefined.";
    };
  }, [currentTrackName, currentArtistName]);

  // SWITCH TO NEXT TRACK'S LYRICS during instrumental outro (SICK TRANSITION!)
  useEffect(() => {
    if (!playbackState?.item || !playbackState?.is_playing || !queue.length || !lyrics || lyrics.length === 0) return;
    if (hasSwitchedToNextRef.current) return; // Already switched, don't do it again!

    const timeRemaining = (playbackState.item.duration_ms || 0) - currentProgress;
    
    // Get the last lyric line's timestamp
    const lastLyric = lyrics[lyrics.length - 1];
    const timeSinceLastLyric = currentProgress - lastLyric.time;
    
    // Smart transition: If last lyric passed 10+ seconds ago AND we have ~15s left in song
    const lastLyricHasPassed = timeSinceLastLyric >= 10000; // 10 seconds after last lyric
    const songIsEnding = timeRemaining <= 15000 && timeRemaining > 0; // Less than 15s remaining
    
    if (lastLyricHasPassed && songIsEnding) {
      const nextTrack = queue[0];
      
      if (nextTrack && lyricsCache.current.has(nextTrack.id)) {
        const nextLyrics = lyricsCache.current.get(nextTrack.id);
        
        if (nextLyrics && nextLyrics.length > 0) {
          
          // Switch to next lyrics WITHOUT touching currentProgress!
          setLyrics(nextLyrics);
          setLastFetchedTrackId(nextTrack.id);
          
          // Set time offset to show next lyrics from beginning
          // The offset is negative of current progress, so lyrics display time = 0
          setLyricsTimeOffset(-currentProgress);
          
          // Mark that we've switched so we don't do it again
          hasSwitchedToNextRef.current = true;
        }
      }
    }
  }, [playbackState?.item, playbackState?.is_playing, currentProgress, queue, lyrics]);

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
    } catch (error) {
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


    // Strip markdown code fences before saving
    const cleanCode = stripCodeFences(generatedCode);

    // Try to compile DSL to JS for performance
    let compiledCode: string | undefined;
    if (isDSLFormat(cleanCode)) {
      try {
        const { compileDSL } = await import('@/lib/visualizationDSL/compiler');
        const dslConfig = JSON.parse(cleanCode);
        compiledCode = compileDSL(dslConfig);
      } catch (error) {
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


    try {
      // Save to IndexedDB first
      await saveCustomVisualization(newViz);
      
      // Reload custom visualizations
      const customViz = await getAllCustomVisualizations();
      setCustomVisualizations(customViz);

      // Close creator first
      setIsCreatingVisualization(false);
      setGeneratedCode("");
      setCurrentPrompt("");
      setGenerationError(null);

      // Switch to the new visualization to render it
      setVisualizationType(newViz.id);

      // Capture screenshot after visualization renders
      setTimeout(async () => {
        try {
          const { captureAndCompressThumbnail } = await import('@/lib/screenshotCapture');
          const thumbnail = await captureAndCompressThumbnail('body');
          
          
          // Update visualization with thumbnail
          newViz.thumbnail = thumbnail;
          await saveCustomVisualization(newViz);
          
          // Reload to show new thumbnail
          const updated = await getAllCustomVisualizations();
          setCustomVisualizations(updated);
          
        } catch (error) {
          // Continue anyway - viz is still usable
        }
      }, 3000); // Wait 3 seconds for viz to render

    } catch (error) {
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
          <Logo loading={true} />
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
          bass={micData.bass}
          energy={micData.energy}
          treble={micData.treble}
          frequencyData={micData.frequencyData}
        />
        );
      case "psychedelic":
        return (
        <PsychedelicVisualization
            key="psychedelic"
          // Note: This viz doesn't need micData at all!
        />
        );
      case "kaleidoscope":
        const kaleidoscopeAlbumArt = playbackState?.item?.album?.images?.[0]?.url || lastKnownTrack?.item?.album?.images?.[0]?.url;
        return (
        <KaleidoscopeVisualization
            key="kaleidoscope"
          bass={micData.bass}
          albumArt={kaleidoscopeAlbumArt}
        />
        );
      case "waves":
        return (
        <WavyLinesVisualization
            key="waves"
          energy={micData.energy}
          volume={micData.volume}
          bass={micData.bass}
          drums={micData.instruments.drums}
          vocalStrength={micData.vocal.strength}
        />
        );
      case "animated":
        return (
        <LavaLampVisualization
            key="animated"
          energy={micData.energy}
          bass={micData.bass}
          mid={micData.mid}
          treble={micData.treble}
          volume={micData.volume}
        />
        );
      case "spectrum3d":
        return (
        <Spectrum3DVisualization
            key="spectrum3d"
          frequencyData={micData.frequencyData}
          sampleRate={micData.sampleRate}
        />
        );
      case "fftspectrum":
        return (
        <FFTSpectrumVisualization
            key="fftspectrum"
          frequencyData={micData.frequencyData}
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
          waveform={micData.waveform}
          waveformLeft={micData.waveformLeft}
          waveformRight={micData.waveformRight}
          bass={micData.bass}
          energy={micData.energy}
          volume={micData.volume}
          treble={micData.treble}
        />
        );
      case "camera":
        return (
        <CameraVisualization
            key="camera"
          videoElement={videoElement}
          micData={micData}
          shaderControls={{
            rgbSplitAmount: shaderControls.rgbSplit,
            distortionAmount: shaderControls.distortion,
            colorShiftR: shaderControls.colorShift,
            colorShiftB: shaderControls.colorShift,
            pixelThreshold: 0.7,
            waveFrequency: 20.0,
          }}
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
      case "youtube": {
        const ytTrackName = playbackState?.item?.name || lastKnownTrack?.item?.name;
        const ytArtistName = playbackState?.item?.artists[0]?.name || lastKnownTrack?.item?.artists[0]?.name;
        const ytParsed = ytTrackName && ytArtistName ? parseSongTitle(ytTrackName, ytArtistName) : null;
        return (
        <YouTubeVisualization
            key="youtube"
          trackName={ytParsed?.title || ytTrackName}
          artistName={ytParsed?.artist || ytArtistName}
          spotifyId={(playbackState?.item as any)?.id || (lastKnownTrack?.item as any)?.id}
          micData={micData}
          effect={youtubeControls.effect}
          onVideoIdChange={setCurrentYouTubeVideoId}
        />
        );
      }
      default:
        return null;
    }
  };

  // Get camera settings for each visualization
  const getCameraSettings = () => {
    switch(visualizationType) {
      case 'fftspectrum': return { position: [0, 3, 30] as [number, number, number], fov: 75 };
      case 'particles': return { position: [0, 0, 30] as [number, number, number], fov: 80 };
      case 'animated': return { position: [0, 3, 30] as [number, number, number], fov: 75 };
      case 'waves': return { position: [0, 0, 30] as [number, number, number], fov: 75 };
      case 'kaleidoscope': return { position: [0, 0, 30] as [number, number, number], fov: 75 };
      default: return { position: [0, 0, 30] as [number, number, number], fov: 75 };
    }
  };

  // Get background for each visualization
  const getBackground = () => {
    switch(visualizationType) {
      case 'fftspectrum': return "linear-gradient(to bottom, #000000 0%, #0a0020 100%)";
      case 'particles': return "radial-gradient(circle, #0a0a0a 0%, #000000 100%)";
      case 'psychedelic': return "radial-gradient(circle, #330033 0%, #000000 100%)";
      case 'kaleidoscope': return "#000000";
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
      {/* Special visualizations render BELOW the unified canvas (they have their own canvas) */}
      {isSpecialVisualization && renderVisualization()}

      {/* UNIFIED CANVAS - Always mounted! Contains viz scenes OR just lyrics overlay */}
      <Canvas
        camera={getCameraSettings()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: isSpecialVisualization ? 'transparent' : getBackground(),
          zIndex: isSpecialVisualization ? 2 : 0,
          pointerEvents: isSpecialVisualization ? 'none' : 'auto',
        }}
        gl={{
          antialias: !isSpecialVisualization,
          alpha: isSpecialVisualization,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={1}
      >
        {/* Visualization Scenes - only render for non-special visualizations */}
        {!isSpecialVisualization && (
          <>
            {visualizationType === 'fftspectrum' && <FFTSpectrumScene micData={micData} fftControls={fftControls} />}
            {visualizationType === 'particles' && <OrbitalScene micData={micData} orbitalControls={orbitalControls} />}
            {visualizationType === 'psychedelic' && <PsychedelicScene micData={micData} />}
            {visualizationType === 'kaleidoscope' && <KaleidoscopeScene micData={micData} albumArt={playbackState?.item?.album?.images?.[0]?.url || lastKnownTrack?.item?.album?.images?.[0]?.url} videoElement={videoElement} kaleidoscopeControls={kaleidoscopeControls} />}
            {visualizationType === 'waves' && <WavyLinesScene micData={micData} wavyLinesControls={wavyLinesControls} />}
            {visualizationType === 'animated' && <LavaLampScene micData={micData} lavaLampControls={lavaLampControls} />}
            {visualizationType === 'spectrum3d' && <Spectrum3DScene micData={micData} spectrum3DControls={spectrum3DControls} />}
          </>
        )}

        {/* LYRICS - Always in this canvas, never unmounts! */}
        {lyrics && lyrics.length > 0 && (
          <group 
            position={visualizationType === 'lyricsonly' ? [0, 0, 0] : [0, 0, 8]} 
            scale={visualizationType === 'lyricsonly' ? 1.0 : 0.7}
          >
            {(() => {
              const currentTrackName = hasSwitchedToNextRef.current ? nextTrack?.name : (playbackState?.item?.name || lastKnownTrack?.item?.name);
              const currentArtistName = hasSwitchedToNextRef.current ? nextTrack?.artists?.[0]?.name : (playbackState?.item?.artists?.[0]?.name || lastKnownTrack?.item?.artists?.[0]?.name);
              const upcomingTrackName = hasSwitchedToNextRef.current ? queue[1]?.name : nextTrack?.name;
              const upcomingArtistName = hasSwitchedToNextRef.current ? queue[1]?.artists?.[0]?.name : nextTrack?.artists?.[0]?.name;
              
              const parsedCurrent = currentTrackName && currentArtistName 
                ? parseSongTitle(currentTrackName, currentArtistName) 
                : null;
              const parsedNext = upcomingTrackName && upcomingArtistName 
                ? parseSongTitle(upcomingTrackName, upcomingArtistName) 
                : null;
              
              return (
                <Lyrics3D
                  lyrics={lyrics}
                  currentTimeMs={currentProgress + lyricsTimeOffset}
                  micData={micData}
                  font={getFontPath(lyricsFont)}
                  color={lyricsColor}
                  trackName={parsedCurrent?.title || currentTrackName}
                  artistName={parsedCurrent?.artist || currentArtistName}
                  nextTrackName={parsedNext?.title || upcomingTrackName}
                  nextArtistName={parsedNext?.artist || upcomingArtistName}
                  timeUntilNextTrack={hasSwitchedToNextRef.current ? ((playbackState?.item?.duration_ms || 0) - currentProgress) : 0}
                />
              );
            })()}
          </group>
        )}
      </Canvas>

      {/* Performance Stats Monitor - Toggle with 'S' key */}
      <PerformanceStats 
        visible={showPerformanceStats}
        position="top-left"
      />

      {/* Top Controls */}
      <div className={styles.topBar}>
        <Logo loading={subscriptionLoading} />

        <div className={styles.controlGroups}>
        {/* Playback Status */}
        <PlaybackStatusButton
          isPlaying={
            !playbackState?.item && !lastKnownTrack?.item
              ? null
              : playbackState?.is_playing ?? false
          }
        />

        {/* Microphone Toggle */}
        {micAvailable && (
          <MicrophoneButton
            enabled={isMicEnabled}
            onToggle={() => {
              const newEnabled = !isMicEnabled;
              isMicEnabled ? disableMic() : enableMic();
              trackMicToggle(session?.user?.email, newEnabled);
            }}
          />
        )}

        {/* Camera Toggle */}
        {webglAvailable && (
          <CameraButton
            enabled={isCameraEnabled}
            onToggle={() => {
              const newEnabled = !isCameraEnabled;
              isCameraEnabled ? disableCamera() : enableCamera();
              trackCamToggle(session?.user?.email, newEnabled);
            }}
          />
        )}

        {/* Hue Dropdown */}
        <HueDropdown hue={hue} userEmail={session?.user?.email} />

        {/* AI Create Button */}
        <button
          className={styles.aiButton}
          onClick={() => {
            trackAIClick(session?.user?.email);
            handleCreateNew();
          }}
          title="Create AI Visualization"
        >
          <span className={styles.sparkles}>✦</span>
          <span>AI</span>
        </button>

        {/* Share Controls */}
        {!shareManager.isShareActive ? (
          // Not sharing yet - show Share button
          <ShareButton onStartSharing={() => {
            trackShareClick(session?.user?.email);
            shareManager.startHosting();
            hasStartedHosting.current = true;
            setShowQRCodeOnConnect(true); // Auto-expand QR on connect
          }} />
        ) : shareManager.shareCode ? (
          // Sharing and connected - show QR code
          <ShareQRCode 
            peerId={shareManager.shareCode}
            connectedViewers={shareManager.connectedViewers}
            autoExpand={showQRCodeOnConnect}
            onDisconnect={() => {
              shareManager.stopHosting();
              setShowQRCodeOnConnect(false);
            }}
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

        {/* Visualization Dropdown */}
        <VisualizationDropdown
          value={visualizationType}
          onChange={(viz) => {
            setVisualizationType(viz);
            trackVisualizationChange(session?.user?.email, viz);
          }}
          customVisualizations={customVisualizations}
        />

        {/* Config Dropdown (Mode + Typography + Viz Config) */}
        <ConfigDropdown
          mode={visualizationMode}
          font={lyricsFont}
          color={lyricsColor}
          shaderControls={shaderControls}
          lavaLampControls={lavaLampControls}
          fftControls={fftControls}
          kaleidoscopeControls={kaleidoscopeControls}
          orbitalControls={orbitalControls}
          wavyLinesControls={wavyLinesControls}
          spectrum3DControls={spectrum3DControls}
          youtubeControls={youtubeControls}
          currentVisualization={visualizationType}
          albumArt={playbackState?.item?.album?.images?.[0]?.url || lastKnownTrack?.item?.album?.images?.[0]?.url}
          videoElement={videoElement}
          isCameraEnabled={isCameraEnabled}
          currentYouTubeUrl={currentYouTubeVideoId ? `https://www.youtube.com/watch?v=${currentYouTubeVideoId}` : null}
          onModeChange={(mode) => {
            setVisualizationMode(mode);
            trackConfigChange(session?.user?.email, `mode:${mode}`);
          }}
          onFontChange={(font) => {
            setLyricsFont(font);
            trackConfigChange(session?.user?.email, `font:${font}`);
          }}
          onColorChange={(color) => {
            setLyricsColor(color);
            trackConfigChange(session?.user?.email, `color:${color}`);
          }}
          onShaderControlsChange={setShaderControls}
          onLavaLampControlsChange={setLavaLampControls}
          onFFTControlsChange={setFFTControls}
          onKaleidoscopeControlsChange={setKaleidoscopeControls}
          onOrbitalControlsChange={setOrbitalControls}
          onWavyLinesControlsChange={setWavyLinesControls}
          onSpectrum3DControlsChange={setSpectrum3DControls}
          onYouTubeControlsChange={setYouTubeControls}
        />

        {/* User Profile */}
        {session?.user && (() => {
          // Get subscription plan details
          const planInfo = subscription?.stripePriceId 
            ? getPlanFromPriceId(subscription.stripePriceId)
            : null;
          const detectedCurrency: CurrencyCode = 'USD'; // Default currency
          
          // Handle Stripe portal for subscription management
          const handleManageSubscription = async () => {
            try {
              const response = await fetch('/api/stripe/portal', {
                method: 'POST',
              });
              const data = await response.json();
              if (response.ok && data.url) {
                window.open(data.url, '_blank');
              } else {
                throw new Error(data.error || 'Failed to open billing portal');
              }
            } catch (error) {
              console.error('[PLAYER] Portal error:', error);
              alert('Failed to open billing portal. Please try again.');
            }
          };

          // return <pre>
          //   {JSON.stringify({planInfo,subscription}, null, 2)}
          // </pre>
          
          return (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => {
                  if (!showProfileDropdown) {
                    trackProfileClick(session?.user?.email);
                  }
                  setShowProfileDropdown(!showProfileDropdown);
                }}
                className={styles.userProfile}
                style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
              >
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
              </button>
              
              {showProfileDropdown && (
                <div 
                  className="profileDropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'transparent',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '16px',
                    padding: '16px',
                    minWidth: '280px',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
                  }}
                >
                  {/* User Info */}
                  <div style={{
                    paddingBottom: '12px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    marginBottom: '12px',
                  }}>
                    <div style={{ 
                      color: '#fff', 
                      fontSize: '15px', 
                      fontWeight: '600',
                      marginBottom: '4px',
                    }}>
                      {session.user.name}
                    </div>
                    <div style={{ 
                      color: 'rgba(255, 255, 255, 0.6)', 
                      fontSize: '13px',
                    }}>
                      {session.user.email}
                    </div>
                  </div>

                  {/* Subscription Status */}
                  {isActive && subscription && planInfo ? (
                    <div style={{
                      padding: '12px',
                      background: 'rgba(29, 185, 84, 0.1)',
                      border: '1px solid rgba(29, 185, 84, 0.3)',
                      borderRadius: '12px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ 
                        color: '#1db954',
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        {planInfo.name} Plan
                      </div>
                      {/* <div style={{ 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        fontSize: '12px',
                        marginBottom: '4px',
                      }}>
                        {formatPrice(
                          getPriceForPlan(planInfo.type, detectedCurrency),
                          detectedCurrency
                        )}/{planInfo.interval}
                      </div> */}
                      {subscription.currentPeriodEnd && (
                        <div style={{ 
                          color: 'rgba(255, 255, 255, 0.5)', 
                          fontSize: '11px',
                          marginBottom: '8px',
                        }}>
                          {subscription.cancelAtPeriodEnd ? 'Expires' : 'Renews'} {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </div>
                      )}
                      <button
                        onClick={handleManageSubscription}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                      >
                        Manage Subscription
                      </button>
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      marginBottom: '12px',
                    }}>
                      <div style={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '13px',
                        marginBottom: '8px',
                      }}>
                        Free Plan
                      </div>
                      <button
                        onClick={() => {
                          router.push('/pricing');
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'rgba(29, 185, 84, 0.2)',
                          border: '1px solid rgba(29, 185, 84, 0.4)',
                          borderRadius: '8px',
                          color: '#1db954',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(29, 185, 84, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(29, 185, 84, 0.2)';
                        }}
                      >
                        Upgrade to Premium
                      </button>
                    </div>
                  )}

                  {/* Sign Out Button */}
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: '/' });
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        </div>
      </div>

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
                  {/* Album Art Column */}
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

                  {/* Track Info + Progress Column */}
                  <div className={styles.trackInfoContainer}>
                    <div className={styles.trackInfo}>
                      {(() => {
                        const parsed = parseSongTitle(
                          displayTrack.name,
                          displayTrack.artists.map((a) => a.name).join(", ")
                        );
                        return (
                          <h2 className={styles.trackName}>
                            {parsed.title}
                            <span className={styles.artistName}>
                              {" — "}{parsed.artist}
                            </span>
                            {parsed.extra && (
                              <span className={styles.trackExtra}> ({parsed.extra})</span>
                            )}
                          </h2>
                        );
                      })()}
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

                  {/* RIGHT: Next Song */}
                  {queue.length > 0 && (
                    <div className={styles.queueSection}>
                      <div className={styles.queueList}>
                        {queue.slice(0, 1).map((track, index) => (
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
                              {(() => {
                                const parsed = parseSongTitle(track.name, track.artists[0].name);
                                return (
                                  <>
                                    <span className={styles.queueTrackName}>{parsed.title}</span>
                                    <span className={styles.queueArtistName}>{parsed.artist}</span>
                                  </>
                                );
                              })()}
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
                      
                      alert('✅ Visualization recompiled! The page will refresh.');
                      window.location.reload();
                    } catch (error) {
                      console.error('[PLAYER] Recompile failed:', error);
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
                      
                      // Wait a moment for viz to render
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      
                      const { captureAndCompressThumbnail } = await import('@/lib/screenshotCapture');
                      const thumbnail = await captureAndCompressThumbnail('body');
                      
                      
                      // Save updated visualization with new thumbnail
                      const updatedViz = { ...customViz, thumbnail };
                      await saveCustomVisualization(updatedViz);
                      
                      // Reload custom visualizations
                      const updated = await getAllCustomVisualizations();
                      setCustomVisualizations(updated);
                      
                      alert('✅ Screenshot captured and saved!');
                    } catch (error) {
                      console.error('[PLAYER] Screenshot failed:', error);
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
          disabled={true}
        />
      )}
    </div>
  );
}
