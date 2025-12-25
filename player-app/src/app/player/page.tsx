"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { getLocallyPlaying, getLocalPosition, isTauriEnvironment, onUiReady, LocalPlaybackState } from "@/lib/spotifyLocal";
import { fetchSyncedLyrics, LyricLine } from "@/lib/lyrics";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useHueLights } from "@/hooks/useHueLights";
import { useCamera } from "@/hooks/useCamera";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useShareManager, SharedState } from "@/hooks/useShareManager";
import { useLyricsWorker } from "@/hooks/useLyricsWorker";
import { useFullscreen } from "@/hooks/useFullscreen";
import HueDropdown from "@/components/HueDropdown";
import PerformanceStats from "@/components/PerformanceStats";
import Lyrics3D from "@/components/Lyrics3D";
import { parseSongTitle } from "@/lib/songParser";
import { Canvas } from "@react-three/fiber";
import { isDSLFormat } from "@/lib/visualizationDSL/schema";
import VisualizationDropdown, {
  VisualizationType,
} from "@/components/VisualizationDropdown";
import ConfigDropdown, { VisualizationMode, LyricsFont, LyricsColor, getFontPath } from "@/components/ConfigDropdown";
import { PlaybackStatusButton, MicrophoneButton, CameraButton, FullscreenButton } from "@/components/ToolsMenu";
import { getShaderControls, saveShaderControls, getLavaLampControls, saveLavaLampControls, getFFTControls, saveFFTControls, getKaleidoscopeControls, saveKaleidoscopeControls, getOrbitalControls, saveOrbitalControls, getWavyLinesControls, saveWavyLinesControls, getSpectrum3DControls, saveSpectrum3DControls, getYouTubeControls, saveYouTubeControls, getBlackHoleControls, saveBlackHoleControls } from "@/lib/storage";

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
const BlackHoleScene = dynamic(() => import("@/components/BlackHoleScene"), { ssr: false });
import {
  CustomVisualization as CustomVizType,
  getAllCustomVisualizations,
  saveCustomVisualization,
} from "@/lib/customVisualizations";
import styles from "./player.module.css";
import Link from "next/link";
import ShareQRCode from "@/components/ShareQRCode";
import ShareButton from "@/components/ShareButton";
import { Logo } from "@/components/ds";
import {
  trackSongPlay,
  trackVisualizationChange,
  trackConfigChange,
  trackCamToggle,
  trackMicToggle,
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
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(
    null
  );
  const [lastKnownTrack, setLastKnownTrack] = useState<PlaybackState | null>(
    null
  ); // Keep last track even when Spotify stops reporting
  const [currentProgress, setCurrentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isTauri, setIsTauri] = useState(false);
  const [fetchTimeFullMs, setFetchTimeFullMs] = useState(0);
  const [fetchTimePosMs, setFetchTimePosMs] = useState(0);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
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
  
  // Lyrics worker for background fetching (keeps main thread smooth)
  const lyricsWorker = useLyricsWorker({
    onLyricsReceived: useCallback((spotifyId: string, receivedLyrics: LyricLine[] | null) => {
      lyricsCache.current.set(spotifyId, receivedLyrics);
      
      // Only update UI if this is the currently playing track
      if (playbackState?.item?.id === spotifyId) {
        setLyrics(receivedLyrics);
        setLastFetchedTrackId(spotifyId);
      }
    }, [playbackState?.item?.id]),
    
    onError: useCallback(() => {}, []),
  });
  const [visualizationType, setVisualizationType] =
    useState<VisualizationType>("fftspectrum");
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("STATIC");
  
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
  const [blackHoleControls, setBlackHoleControls] = useState<{
    intensity: number;
    psychedelia: number;
    lensingStrength: number;
    diskSize: number;
  }>({
    intensity: 0.6,
    psychedelia: 0.5,
    lensingStrength: 5,
    diskSize: 8,
  });
  const [currentYouTubeVideoId, setCurrentYouTubeVideoId] = useState<string | null>(null);
  const [useCompiledMode, setUseCompiledMode] = useState(true); // Performance mode toggle
  const lastRandomTrackId = useRef<string | null>(null); // Track last track for RANDOM mode
  const hasStartedHosting = useRef(false); // Track if we've already called startHosting
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [micAvailable, setMicAvailable] = useState(true);
  const [showQRCodeOnConnect, setShowQRCodeOnConnect] = useState(false); // Auto-expand QR on first manual share
  const [showPerformanceStats, setShowPerformanceStats] = useState(false); // Toggle performance monitor
  const [showWelcomeNotice, setShowWelcomeNotice] = useState(false); // First-time welcome notice
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  
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
  
  // Load Black Hole controls on mount
  useEffect(() => {
    getBlackHoleControls().then((savedControls) => {
      if (savedControls) {
        setBlackHoleControls(savedControls);
      }
    }).catch(() => {});
  }, []);
  
  // Save Black Hole controls whenever they change
  useEffect(() => {
    saveBlackHoleControls(blackHoleControls).catch(() => {});
  }, [blackHoleControls]);
  
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
  
  
  // Check if running in Tauri environment - with retries
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkTauri = async () => {
      const result = isTauriEnvironment();
      
      if (result) {
        setIsTauri(true);
        // UI is ready - ensure Spotify is running
        await onUiReady();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(checkTauri, 100);
      } else {
        setError("This app requires the Tauri desktop environment.");
      }
    };
    
    checkTauri();
  }, []);
  
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
  
  // Check if this is first time usage (show welcome notice)
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('syns6_has_seen_welcome');
    if (!hasSeenWelcome) {
      setShowWelcomeNotice(true);
    }
  }, []);
  
  // Hide welcome notice and mark as seen when song starts playing
  useEffect(() => {
    if (playbackState?.item && showWelcomeNotice) {
      setShowWelcomeNotice(false);
      localStorage.setItem('syns6_has_seen_welcome', 'true');
    }
  }, [playbackState?.item, showWelcomeNotice]);
  
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
      if (e.key === 'd' || e.key === 'D') {
        setShowDebugPanel(prev => !prev);
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
        
        // No queue in local Spotify mode
        queue: [],
        
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

  // Fetch current playback state from local Spotify app via Tauri
  const fetchPlaybackState = useCallback(async () => {
    if (!isTauri) return;

    try {
      const data = await getLocallyPlaying();
      if (data && data.item) {
        setPlaybackState(data);
        // Only update lastKnownTrack if it's a different track
        if (!lastKnownTrack?.item || lastKnownTrack.item.id !== data.item.id) {
          setLastKnownTrack(data);
          trackSongPlay(
            undefined,
            `${data.item.name} - ${data.item.artists[0]?.name || 'Unknown'}`
          );
        }
        setCurrentProgress(data.progress_ms || 0);
        setFetchTimeFullMs(data.fetch_time_ms || 0);
        setError(null);

        // Fetch synced lyrics only if track changed
        if (data.item.id && data.item.id !== lastFetchedTrackId) {
          if (lyricsCache.current.has(data.item.id)) {
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
            } else {
              // Fallback to main thread if worker not ready
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
            }
          }
        }
      } else {
        // No current track from Spotify, but keep showing last known track
        setPlaybackState(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch Spotify state:", err);
      setError("Failed to connect to Spotify app. Is Spotify running?");
    }
  }, [isTauri, lastKnownTrack?.item, lastFetchedTrackId, lyricsWorker]);

  // Ref to hold the fetchPlaybackState function to avoid dependency issues
  const fetchPlaybackStateRef = useRef(fetchPlaybackState);
  fetchPlaybackStateRef.current = fetchPlaybackState;
  
  // Dual polling strategy:
  // 1. Full state (track, artist, album, etc.) every 5 seconds - slow but complete
  // 2. Position only every 500ms - fast for smooth progress bar
  useEffect(() => {
    if (!isTauri) return;
    
    let isActive = true;
    let lastFullPoll = 0;
    const FULL_POLL_INTERVAL = 5000;
    const POSITION_POLL_INTERVAL = 500;
    
    const poll = async () => {
      if (!isActive) return;
      
      const now = Date.now();
      
      try {
        if (now - lastFullPoll >= FULL_POLL_INTERVAL) {
          await fetchPlaybackStateRef.current();
          lastFullPoll = now;
        } else {
          const posData = await getLocalPosition();
          if (posData) {
            setCurrentProgress(posData.progress_ms);
            setFetchTimePosMs(posData.fetch_time_ms);
            setPlaybackState(prev => prev ? { ...prev, is_playing: posData.is_playing } : null);
          }
        }
      } catch {
        // Silent fail - will retry on next poll
      }
      
      if (isActive) {
        setTimeout(poll, POSITION_POLL_INTERVAL);
      }
    };
    
    fetchPlaybackStateRef.current().then(() => {
      lastFullPoll = Date.now();
      poll();
    });
    
    return () => {
      isActive = false;
    };
  }, [isTauri]);


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

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Debug info for development
  const debugInfo = process.env.NODE_ENV === 'development' ? {
    isTauri,
    hasPlayback: !!playbackState,
    trackName: playbackState?.item?.name || 'none',
    progress: currentProgress,
    duration: playbackState?.item?.duration_ms || 0,
    fetchTimeFull: fetchTimeFullMs,
    fetchTimePos: fetchTimePosMs,
    error,
  } : null;

  // Show loading state while checking Tauri environment
  if (!isTauri) {
    return (
      <div className={styles.fullscreenPage}>
        <div className={styles.centerMessage}>
          <Logo loading={true} />
          <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.6)' }}>
            Connecting to Spotify...
          </p>
          <p style={{ marginTop: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            This app requires the Tauri desktop app to communicate with Spotify.
          </p>
          {error && (
            <p style={{ marginTop: '16px', color: '#ff6b6b', fontSize: '14px' }}>
              {error}
            </p>
          )}
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
    // Priority 1: Custom visualizations
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
      case 'blackhole': return { position: [0, 0, 30] as [number, number, number], fov: 75 };
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
      case 'blackhole': return "#000002"; // Deep space black
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
      {/* Debug Panel - only in development, toggle with 'D' key */}
      {debugInfo && showDebugPanel && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '10px',
          background: 'rgba(0,0,0,0.9)',
          color: '#0f0',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontFamily: 'monospace',
          zIndex: 99999,
          maxWidth: '300px',
          border: '1px solid #0f0',
        }}>
          <div><strong>DEBUG</strong></div>
          <div>Tauri: {debugInfo.isTauri ? '✓' : '✗'}</div>
          <div>Track: {debugInfo.trackName}</div>
          <div>Progress: {debugInfo.progress}ms</div>
          <div>Duration: {debugInfo.duration}ms</div>
          <div>Full: {debugInfo.fetchTimeFull}ms | Pos: {debugInfo.fetchTimePos}ms</div>
          <div>Error: {debugInfo.error || 'none'}</div>
        </div>
      )}

      {/* Error Overlay - when Spotify app is not running */}
      {error && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          gap: '24px',
          padding: '20px',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '8px',
          }}>
            🎵
          </div>
          <h2 style={{
            color: '#fff',
            fontSize: '24px',
            fontWeight: 600,
            margin: 0,
            textAlign: 'center',
          }}>
            Spotify Not Running
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '16px',
            margin: 0,
            textAlign: 'center',
            maxWidth: '400px',
          }}>
            Please open the Spotify app and start playing a song.
          </p>
        </div>
      )}

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
            {visualizationType === 'blackhole' && <BlackHoleScene micData={micData} blackHoleControls={blackHoleControls} />}
          </>
        )}

        {/* LYRICS - Always in this canvas, never unmounts! */}
        {lyrics && lyrics.length > 0 && (
          <group 
            position={visualizationType === 'lyricsonly' ? [0, 0, 0] : [0, 0, 8]} 
            scale={visualizationType === 'lyricsonly' ? 1.0 : 0.7}
          >
            {(() => {
              const currentTrackName = playbackState?.item?.name || lastKnownTrack?.item?.name;
              const currentArtistName = playbackState?.item?.artists?.[0]?.name || lastKnownTrack?.item?.artists?.[0]?.name;
              
              const parsedCurrent = currentTrackName && currentArtistName 
                ? parseSongTitle(currentTrackName, currentArtistName) 
                : null;
              
              return (
                <Lyrics3D
                  lyrics={lyrics}
                  currentTimeMs={currentProgress}
                  micData={micData}
                  font={getFontPath(lyricsFont)}
                  color={lyricsColor}
                  trackName={parsedCurrent?.title || currentTrackName}
                  artistName={parsedCurrent?.artist || currentArtistName}
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
        <Logo loading={false} />
        
        {/* DEV indicator */}
        {process.env.NODE_ENV === 'development' && (
          <span style={{
            background: 'rgba(255, 100, 0, 0.8)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',
          }}>
            DEV
          </span>
        )}

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
              trackMicToggle(undefined, newEnabled);
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
              trackCamToggle(undefined, newEnabled);
            }}
          />
        )}

        {/* Hue Dropdown */}
        <HueDropdown hue={hue} />

        {/* Share Controls */}
        {!shareManager.isShareActive ? (
          // Not sharing yet - show Share button
          <ShareButton onStartSharing={() => {
            trackShareClick(undefined);
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
            trackVisualizationChange(undefined, viz);
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
            trackConfigChange(undefined, `mode:${mode}`);
          }}
          onFontChange={(font) => {
            setLyricsFont(font);
            trackConfigChange(undefined, `font:${font}`);
          }}
          onColorChange={(color) => {
            setLyricsColor(color);
            trackConfigChange(undefined, `color:${color}`);
          }}
          onShaderControlsChange={setShaderControls}
          onLavaLampControlsChange={setLavaLampControls}
          onFFTControlsChange={setFFTControls}
          onKaleidoscopeControlsChange={setKaleidoscopeControls}
          onOrbitalControlsChange={setOrbitalControls}
          onWavyLinesControlsChange={setWavyLinesControls}
          onSpectrum3DControlsChange={setSpectrum3DControls}
          onYouTubeControlsChange={setYouTubeControls}
          blackHoleControls={blackHoleControls}
          onBlackHoleControlsChange={setBlackHoleControls}
        />

        {/* Fullscreen Toggle */}
        <FullscreenButton
          isFullscreen={isFullscreen}
          onToggle={toggleFullscreen}
        />
        </div>
      </div>

      {/* Bottom Player Controls - with transition */}
      <div 
        className={`${styles.bottomControls} ${
          (playbackState?.item || lastKnownTrack?.item) && !error ? styles.visible : styles.hidden
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

      {/* Spotify Welcome Notice - shown on first time + no song playing */}
      {showWelcomeNotice && !playbackState?.item && !lastKnownTrack?.item && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '48px 64px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              pointerEvents: 'auto',
            }}
          >
            <h2 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#fff',
              margin: '0 0 12px 0',
            }}>
              Go ahead, play a song on Spotify
            </h2>
            <p style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0,
              maxWidth: '480px',
            }}>
              Turn your mic on. Play a song on Spotify and you're ready to go.
              Got that bass? Crank it up and bring it closer to your mic.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
