"use client";

import { useEffect, useState, useRef, Suspense, useCallback, PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";
import { useShareManager } from "@/hooks/useShareManager";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useCamera } from "@/hooks/useCamera";
import { useWakeLock } from "@/hooks/useWakeLock";
import VisualizationDropdown, { VisualizationType } from "@/components/VisualizationDropdown";
import NowPlayingFooter from "@/components/NowPlayingFooter";
import Syns6Logo from "@/components/Syns6Logo";
import ToolsMenu from "@/components/ToolsMenu";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import MusicVisualization from "@/components/MusicVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import LavaLampVisualization from "@/components/LavaLampVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
import WaveSpectrum3DVisualization from "@/components/WaveSpectrum3DVisualization";
import YouTubeVisualization from "@/components/YouTubeVisualization";
import CameraVisualization from "@/components/CameraVisualization";
import CustomVisualization from "@/components/CustomVisualization";
import DSLVisualization from "@/components/DSLVisualization";
import CompiledVisualization from "@/components/CompiledVisualization";
import { isDSLFormat } from "@/lib/visualizationDSL/schema";
import { getAllCustomVisualizations, CustomVisualization as CustomVizType } from "@/lib/customVisualizations";
import { loadHostPeerId, saveHostPeerId, clearHostPeerId } from "@/lib/viewerStorage";
import styles from "./share.module.css";

function CenteredMessage({ title, message, children }: PropsWithChildren<{ title: string, message: string }>) {

  return (
    <div className={styles.container}>
      <div className={styles.message}>
        <h1>{title}</h1>
        <p>{message}</p>

        {children}
      </div>
    </div>
  );
}
interface SharePageContentProps {
  hostPeerIdParam: string | null;
  textOnlyParam: boolean;
}

function SharePageContent({ hostPeerIdParam, textOnlyParam }: SharePageContentProps) {

  const shareManager = useShareManager();
  const wakeLock = useWakeLock();
  const [customVisualizations, setCustomVisualizations] = useState<CustomVizType[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState<number>(0);
  const [webglUnavailable, setWebglUnavailable] = useState(textOnlyParam);
  const [webglChecked, setWebglChecked] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const MAX_CONNECTION_ATTEMPTS = 3;

  // Visualization state - allow viewer to override master's visualization
  const [localVisualizationType, setLocalVisualizationType] = useState<VisualizationType | null>(null);

  // Code input state
  const [codeInput, setCodeInput] = useState<string[]>(['', '', '', '', '', '']);
  const [showCodeInput, setShowCodeInput] = useState(!hostPeerIdParam);
  const [hostPeerId, setHostPeerId] = useState<string | null>(hostPeerIdParam);
  const [isLoadingSavedConnection, setIsLoadingSavedConnection] = useState(!hostPeerIdParam);

  // Use local microphone (each viewer hears music through speakers)
  const { micData, isEnabled: isMicEnabled, enable: enableMic, disable: disableMic, error: micHookError } = useMicrophoneAnalysis();

  // Use local camera (viewers can enable their own camera)
  const {
    isEnabled: isCameraEnabled,
    enable: enableCamera,
    disable: disableCamera,
    videoElement,
  } = useCamera();

  // Refs
  const hasAttemptedConnection = useRef(false);
  const hasLoggedRef = useRef(false);
  const hasLoggedWaitingRef = useRef(false);

  // Memoize the WebGL unavailable callback to prevent unnecessary re-renders
  const handleWebGLUnavailable = useCallback(() => {
    setWebglUnavailable(true);
  }, []);

  // Check WebGL support immediately on mount (before mic access)
  useEffect(() => {
    // If textOnly mode is forced via query param, skip WebGL check
    if (textOnlyParam) {
      setWebglUnavailable(true);
      setWebglChecked(true);
      return;
    }

    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl');

        if (!gl) {
          setWebglUnavailable(true);
          setWebglChecked(true);
          return;
        }

        // Test if we can actually use the context
        try {
          const testGl = gl as WebGLRenderingContext;
          const precision = testGl.getShaderPrecisionFormat(testGl.VERTEX_SHADER, testGl.HIGH_FLOAT);
          if (!precision) {
            setWebglUnavailable(true);
          } else {
            setWebglUnavailable(false);
          }
        } catch (e) {
          setWebglUnavailable(true);
        }
      } catch (e) {
        setWebglUnavailable(true);
      }
      setWebglChecked(true);
    };

    checkWebGL();
  }, [textOnlyParam]);

  // Load saved host peer ID from IndexedDB on mount
  useEffect(() => {
    const loadSavedConnection = async () => {
      // Skip if we already have a host ID from URL
      if (hostPeerIdParam) {
        setIsLoadingSavedConnection(false);
        return;
      }

      try {
        const savedHostPeerId = await loadHostPeerId();
        if (savedHostPeerId) {
          console.log('🔄 Auto-connecting to saved host:', savedHostPeerId);
          setHostPeerId(savedHostPeerId);
          setShowCodeInput(false);
        }
      } catch (error) {
        console.error('Failed to load saved connection:', error);
      } finally {
        setIsLoadingSavedConnection(false);
      }
    };

    loadSavedConnection();
  }, [hostPeerIdParam]);

  // Connect to host and save to IndexedDB
  useEffect(() => {
    if (hostPeerId && !shareManager.isViewer && !maxAttemptsReached && !hasAttemptedConnection.current) {
      hasAttemptedConnection.current = true;
      console.log("🔗 Connecting to host:", hostPeerId, `(Attempt ${connectionAttempts + 1}/${MAX_CONNECTION_ATTEMPTS})`);
      shareManager.connectToHost(hostPeerId);
      setIsConnecting(true);
      setConnectionAttempts(prev => prev + 1);

      // Save to IndexedDB for auto-reconnect
      saveHostPeerId(hostPeerId).catch(err => {
        console.error('Failed to save host peer ID:', err);
      });
    }
  }, [hostPeerId, shareManager, maxAttemptsReached, MAX_CONNECTION_ATTEMPTS]); // Removed connectionAttempts from deps

  // Update connecting state
  useEffect(() => {
    console.log(`🔄 [VIEWER] Connection state: isViewer=${shareManager.isViewer}, hasState=${!!shareManager.viewerState}`);
    if (shareManager.isViewer) {
      setIsConnecting(false);
      setConnectionAttempts(0); // Reset attempts on successful connection
      // DON'T reset hasAttemptedConnection here - it causes double connection!
      console.log('✅ [VIEWER] Connected! Waiting for data...');
    }
  }, [shareManager.isViewer, shareManager.viewerState]);

  // Monitor connection errors and stop after max attempts
  useEffect(() => {
    if (shareManager.connectionError) {
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
        console.error(`❌ [VIEWER] Max connection attempts (${MAX_CONNECTION_ATTEMPTS}) reached`);
        setMaxAttemptsReached(true);
        setIsConnecting(false);
      } else {
        // Allow retry on error
        hasAttemptedConnection.current = false;
      }
    }
  }, [shareManager.connectionError, connectionAttempts, MAX_CONNECTION_ATTEMPTS]);

  // Load custom visualizations
  useEffect(() => {
    const loadCustomViz = async () => {
      const customViz = await getAllCustomVisualizations();
      setCustomVisualizations(customViz);
    };
    loadCustomViz();
  }, []);

  // Force body to be black and log lifecycle
  useEffect(() => {
    console.log('🎬 [VIEWER] SharePageContent mounted');
    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    // Detect page reloads
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      console.log('🔄 [VIEWER] Page is reloading/closing!');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      console.log('💀 [VIEWER] SharePageContent unmounting - this should NOT happen during normal operation!');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-enable microphone on viewer (for text-only mode audio reactivity and WebGL visualizations)
  useEffect(() => {
    // Wait for WebGL check to complete
    if (!webglChecked) {
      return;
    }

    // Check if mic access is possible (HTTPS or localhost)
    const checkAndEnableMic = async () => {
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]';

      // If not HTTPS and not localhost, skip mic setup silently
      if (!isHttps && !isLocalhost) {
        console.log('⏭️ Skipping microphone - HTTP context (not localhost)');
        return;
      }

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('⏭️ Skipping microphone - not supported by browser');
        return;
      }

      if (!isMicEnabled && !micHookError) {
        console.log('🎤 Auto-enabling microphone for viewer...');
        try {
          await enableMic();
        } catch (err) {
          console.error('❌ Failed to enable microphone:', err);
          // Don't show error, just continue without mic
        }
      }
    };

    checkAndEnableMic();
  }, [isMicEnabled, enableMic, micHookError, webglChecked]);

  // Convert received state to component props
  const state = shareManager.viewerState;

  // Calculate and update latency
  useEffect(() => {
    if (state?.timestamp) {
      const now = Date.now();
      const calculatedLatency = now - state.timestamp;
      setLatency(calculatedLatency);
      setUpdateCount(prev => prev + 1);
    }
  }, [state]);

  // Debug: Log received state on first receive
  useEffect(() => {
    if (state && !hasLoggedRef.current) {
      console.log('✅ First state received:', {
        hasPlayback: !!state.playbackState,
        hasLyrics: !!state.lyrics,
        hasQueue: !!state.queue,
        queueLength: state.queue?.length,
      });
      hasLoggedRef.current = true;
    }
  }, [state]);

  // Extract state values
  const lyrics = state?.lyrics || undefined;
  const playbackState = state?.playbackState;
  const queue = state?.queue || [];
  const isPlaying = playbackState?.is_playing || false;
  // Use local visualization if set, otherwise use master's visualization
  const visualizationType = localVisualizationType || state?.visualizationType || "fftspectrum";

  // Adjust current time to compensate for network latency
  // This ensures lyrics appear in sync with what viewer hears through their mic
  const rawCurrentTimeMs = state?.currentTimeMs || 0;
  const currentTimeMs = rawCurrentTimeMs + latency;

  // Render visualization based on type
  const renderVisualization = () => {
    // Don't render any visualization if WebGL is unavailable
    if (webglUnavailable) return null;

    if (!state && !micData) return null;

    const vizType = visualizationType;

    // Check for custom visualization
    const customViz = customVisualizations.find((v) => v.id === vizType);
    if (customViz) {
      const isDSL = isDSLFormat(customViz.code);

      if (isDSL) {
        try {
          const config = JSON.parse(customViz.code);

          // Use compiled version if available
          if (customViz.compiledCode) {
            return (
              <CompiledVisualization
                key={`compiled-${vizType}`}
                compiledCode={customViz.compiledCode}
                micData={micData}
                isPlaying={isPlaying}
              />
            );
          }

          // Fallback to DSL interpreter
          return (
            <DSLVisualization
              key={`dsl-${vizType}`}
              config={config}
              micData={micData}
              isPlaying={isPlaying}
            />
          );
        } catch (error) {
          console.error("Failed to parse custom DSL:", error);
          return null;
        }
      } else {
        // JavaScript custom visualization
        return (
          <CustomVisualization
            key={`custom-${vizType}`}
            code={customViz.code}
            micData={micData}
            isPlaying={isPlaying}
          />
        );
      }
    }

    // Built-in visualizations
    switch (vizType) {
      case "particles":
        return (
          <MusicVisualization
            key="particles"
            isPlaying={isPlaying}
            micData={micData}
          />
        );
      case "fractal":
        return (
          <FractalVisualization
            key="fractal"
            isPlaying={isPlaying}
            micData={micData}
          />
        );
      case "psychedelic":
        return (
          <PsychedelicVisualization
            key="psychedelic"
            isPlaying={isPlaying}
            micData={micData}
          />
        );
      case "waves":
        return (
          <WavyLinesVisualization
            key="waves"
            isPlaying={isPlaying}
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
      case "wavespectrum":
        return (
          <WaveSpectrum3DVisualization
            key="wavespectrum"
            micData={micData}
          />
        );
      case "fftspectrum":
        return (
          <FFTSpectrumVisualization
            key="fftspectrum"
            micData={micData}
            // TODO remove this
            onWebGLUnavailable={handleWebGLUnavailable}
          />
        );
      case "youtube":
        return (
          <YouTubeVisualization
            key="youtube"
            trackName={playbackState?.trackName}
            artistName={playbackState?.artistName}
            spotifyId={playbackState?.trackId}
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
      default:
        return (
          <FFTSpectrumVisualization
            key="default"
            micData={micData}
            onWebGLUnavailable={handleWebGLUnavailable}
          />
        );
    }
  };

  // Show loading while checking for saved connection
  if (isLoadingSavedConnection) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <h1>Loading...</h1>
          <p>Checking for saved connection</p>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  // Show code input if no host ID
  if (showCodeInput && !hostPeerId) {
    return (
      <div className={styles.container}>
        <div className={styles.codeInputContainer}>
          <h1>Enter Share Code</h1>
          <p className={styles.codeInputInstructions}>
            Enter the 6-digit code from the host screen
          </p>

          <div className={styles.codeInputs}>
            {codeInput.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digit}
                className={styles.codeDigit}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 1) {
                    const newCode = [...codeInput];
                    newCode[index] = value;
                    setCodeInput(newCode);

                    // Auto-focus next input
                    if (value && index < 5) {
                      const nextInput = e.target.parentElement?.children[index + 1] as HTMLInputElement;
                      nextInput?.focus();
                    }

                    // Auto-connect when all 6 digits entered
                    if (index === 5 && value && newCode.every(d => d)) {
                      const code = newCode.join('');
                      const peerId = `syns-${code}`;
                      console.log('🔗 Connecting with code:', code);
                      hasAttemptedConnection.current = false; // Allow new connection attempt
                      setHostPeerId(peerId);
                      setShowCodeInput(false);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  // Backspace: move to previous input
                  if (e.key === 'Backspace' && !codeInput[index] && index > 0) {
                    const prevInput = e.currentTarget.parentElement?.children[index - 1] as HTMLInputElement;
                    prevInput?.focus();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                  if (pastedText.length === 6) {
                    const newCode = pastedText.split('');
                    setCodeInput(newCode);
                    // Auto-connect
                    const code = newCode.join('');
                    const peerId = `syns-${code}`;
                    console.log('🔗 Connecting with code:', code);
                    hasAttemptedConnection.current = false;
                    setHostPeerId(peerId);
                    setShowCodeInput(false);
                  }
                }}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          <button
            className={styles.connectButton}
            disabled={!codeInput.every(d => d)}
            onClick={() => {
              const code = codeInput.join('');
              const peerId = `syns-${code}`;
              console.log('🔗 Connecting with code:', code);
              hasAttemptedConnection.current = false; // Allow new connection attempt
              setHostPeerId(peerId);
              setShowCodeInput(false);
            }}
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  if (shareManager.connectionError || maxAttemptsReached) {
    return (
      <div className={styles.container}>
        <div className={styles.codeInputContainer}>
          <h1 style={{ color: '#ff4444', marginBottom: '0.5rem' }}>Connection Failed</h1>
          <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
            {shareManager.connectionError || 'Unable to connect to host after multiple attempts'}
          </p>
          {maxAttemptsReached && (
            <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '2rem' }}>
              The host may be offline or the connection code may have expired.
            </p>
          )}

          {/* Show retry button if we still have a host peer ID */}
          {hostPeerId && (
            <button
              onClick={async () => {
                setConnectionAttempts(0);
                setMaxAttemptsReached(false);
                hasAttemptedConnection.current = false;
                shareManager.connectToHost(hostPeerId);
                setIsConnecting(true);
              }}
              className={styles.retryConnectionButton}
              style={{ marginBottom: '2rem' }}
            >
              Retry Connection
            </button>
          )}

          {/* Code input form */}
          <p className={styles.codeInputInstructions}>
            Enter a new 6-digit code
          </p>

          <div className={styles.codeInputs}>
            {codeInput.map((digit, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                pattern="[0-9]"
                maxLength={1}
                value={digit}
                className={styles.codeDigit}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value.length <= 1) {
                    const newCode = [...codeInput];
                    newCode[index] = value;
                    setCodeInput(newCode);

                    // Auto-focus next input
                    if (value && index < 5) {
                      const nextInput = e.target.parentElement?.children[index + 1] as HTMLInputElement;
                      nextInput?.focus();
                    }

                    // Auto-connect when all 6 digits entered
                    if (index === 5 && value && newCode.every(d => d)) {
                      const code = newCode.join('');
                      const peerId = `syns-${code}`;
                      console.log('🔗 Connecting with code:', code);
                      setConnectionAttempts(0);
                      setMaxAttemptsReached(false);
                      hasAttemptedConnection.current = false;
                      setHostPeerId(peerId);
                      setShowCodeInput(false);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  // Backspace: move to previous input
                  if (e.key === 'Backspace' && !codeInput[index] && index > 0) {
                    const prevInput = e.currentTarget.parentElement?.children[index - 1] as HTMLInputElement;
                    prevInput?.focus();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
                  if (pastedText.length === 6) {
                    const newCode = pastedText.split('');
                    setCodeInput(newCode);
                    // Auto-connect
                    const code = newCode.join('');
                    const peerId = `syns-${code}`;
                    console.log('🔗 Connecting with code:', code);
                    setConnectionAttempts(0);
                    setMaxAttemptsReached(false);
                    hasAttemptedConnection.current = false;
                    setHostPeerId(peerId);
                    setShowCodeInput(false);
                  }
                }}
                onFocus={(e) => e.target.select()}
              />
            ))}
          </div>

          <button
            className={styles.connectButton}
            disabled={!codeInput.every(d => d)}
            onClick={() => {
              const code = codeInput.join('');
              const peerId = `syns-${code}`;
              console.log('🔗 Connecting with code:', code);
              setConnectionAttempts(0);
              setMaxAttemptsReached(false);
              hasAttemptedConnection.current = false;
              setHostPeerId(peerId);
              setShowCodeInput(false);
            }}
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  // Skip mic error screen if WebGL is unavailable (we don't need mic for plain lyrics)
  // Also skip if not on HTTPS/localhost (mic won't work anyway)
  if (micError && !webglUnavailable) {
    const isHttps = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';

    // Only show error if we're in a context where mic should work
    if (isHttps || isLocalhost) {
      return (
        <div className={styles.container}>
          <div className={styles.message}>
            <h1>🎤 Microphone Access Required</h1>
            <p style={{ marginBottom: '1rem' }}>{micError}</p>

            <button
              onClick={() => {
                setMicError(null);
                enableMic();
              }}
              className={styles.retryButton}
              style={{ marginTop: '1rem' }}
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      );
    }
    // If not HTTPS/localhost, just clear the error and continue
    setMicError(null);
  }

  if (isConnecting || !shareManager.isViewer) {
    return (
      <CenteredMessage title="Connecting..." message="Establishing connection to host">
        <button
          onClick={async () => {
            // Disconnect from current attempt
            shareManager.disconnectFromHost();
            // Clear saved code
            await clearHostPeerId();
            // Reset states
            setHostPeerId(null);
            setShowCodeInput(true);
            setConnectionAttempts(0);
            setMaxAttemptsReached(false);
            hasAttemptedConnection.current = false;
          }}
          className={styles.cancelButton}
        >
          Cancel
        </button>

      </CenteredMessage>
    );
  }

  if (!state) {
    // Only log once when we first enter "waiting for data" state
    if (!hasLoggedWaitingRef.current) {
      console.log('⏳ [VIEWER] Connected but no state yet. isViewer:', shareManager.isViewer);
      hasLoggedWaitingRef.current = true;
    }
    return (
      <CenteredMessage title="Waiting for data..." message="Connected! Waiting for host to start broadcasting" >
        <p style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '1rem' }}>
          Check console for connection details
        </p>
      </CenteredMessage>

    );
  }

  // Helper to get current lyric line with context
  const getLyricLines = () => {
    if (!lyrics || lyrics.length === 0) {
      return { previous: null, current: null, next: null };
    }

    // Find the current line based on currentTimeMs
    let currentIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTimeMs) {
        currentIndex = i;
      } else {
        break;
      }
    }

    // If before first lyric (currentIndex = -1), show first lyric as "next"
    if (currentIndex === -1) {
      return {
        previous: null,
        current: null,
        next: lyrics[0],
      };
    }

    return {
      previous: currentIndex > 0 ? lyrics[currentIndex - 1] : null,
      current: lyrics[currentIndex],
      next: currentIndex < lyrics.length - 1 ? lyrics[currentIndex + 1] : null,
    };
  };

  const lyricLines = getLyricLines();

  // Calculate time until next lyric and show countdown if gap > 10s
  // Works for first line (when current is null) and between lines
  const timeUntilNext = lyricLines.next
    ? lyricLines.next.time - currentTimeMs
    : 0;
  // Show countdown if the TOTAL gap is > 10s, but keep showing it even when counting down below 10
  const gapDuration = lyricLines.next && lyricLines.current
    ? lyricLines.next.time - lyricLines.current.time
    : lyricLines.next && !lyricLines.current
      ? lyricLines.next.time  // For first line, gap is from start to first line
      : 0;
  const showCountdown = gapDuration > 10000 && timeUntilNext > 0;
  const secondsUntilNext = Math.ceil(timeUntilNext / 1000);

  // Calculate audio intensity for text scaling (when mic is available in text-only mode)
  const audioIntensity = webglUnavailable && micData?.frequencyData
    ? (() => {
      const data = micData.frequencyData;
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
      }
      return (sum / data.length) / 255; // Normalize to 0-1
    })()
    : 0;

  // Scale factor: 1.0 to 1.3 based on audio intensity
  const textScale = webglUnavailable && audioIntensity > 0
    ? 1 + (audioIntensity * 0.3)
    : 1;

  return (
    <div className={styles.container}>
      {/* Visualization */}
      {renderVisualization()}

      {/* Plain HTML Lyrics when WebGL is unavailable */}
      {webglUnavailable && lyrics && lyrics.length > 0 && (
        <div className={styles.lyricsContainer}>
          <div className={styles.lyricsWrapper}>
            {lyricLines.previous && (
              <div
                className={styles.previousLyric}
              >
                {lyricLines.previous.text}
              </div>
            )}
            {lyricLines.current && (
              <div
                className={styles.currentLyric}
                style={{ transform: `scale(${textScale})` }}
              >
                {lyricLines.current.text}
              </div>
            )}



            {lyricLines.next && (
              <div
                className={styles.nextLyric}

              >
                {/* Show countdown if next lyric is more than 10 seconds away */}
                {showCountdown && (
                  <div className={styles.lyricCountdown}>
                    {secondsUntilNext}s
                  </div>
                )}
                <div className={styles.nextLyricText}>
                    
                  
                {lyricLines.next.text}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Bar - matching master view */}
      <div className={styles.topBar}>
        <Syns6Logo />

        <div className={styles.viewerControls}>
          {/* Latency indicator */}
          <div className={styles.latencyIndicator}>
            <span className={`${styles.latencyValue} ${latency < 100 ? styles.latencyGood :
              latency < 300 ? styles.latencyOk :
                styles.latencyBad
              }`}>
              {latency}ms
            </span>
          </div>

          {/* Tools Menu - shared component */}
          <ToolsMenu
            isPlaying={playbackState ? playbackState.is_playing : null}
            isMicEnabled={isMicEnabled}
            isCameraEnabled={isCameraEnabled}
            onMicToggle={() => (isMicEnabled ? disableMic() : enableMic())}
            onCameraToggle={() => (isCameraEnabled ? disableCamera() : enableCamera())}
            showMic={!webglUnavailable}
            showCamera={!webglUnavailable}
          />

          {/* Visualization Dropdown - allow viewer to override master's viz */}
          {!webglUnavailable && (
            <VisualizationDropdown
              value={visualizationType}
              onChange={(viz) => setLocalVisualizationType(viz)}
              customVisualizations={customVisualizations}
            />
          )}

          {/* Disconnect button */}
          <button
            className={styles.disconnectButton}
            onClick={async () => {
              await clearHostPeerId();
              window.location.reload();
            }}
            title="Disconnect and enter new code"
          >
            Disconnect
          </button>

          {/* Viewer Mode Badge */}
          <div
            className={styles.viewerBadge}
            title="Viewer Mode"
          >
            <span className={styles.viewerIcon}>⧉</span>
            Viewer{webglUnavailable && ' (Lyrics)'}
          </div>
        </div>
      </div>

      {/* Now Playing Footer - matching master view */}
      {playbackState && (
        <NowPlayingFooter
          currentTrack={{
            name: playbackState.trackName,
            artistName: playbackState.artistName,
            albumArt: playbackState.albumArt,
            duration_ms: playbackState.duration_ms,
          }}
          currentProgress={currentTimeMs}
          queue={queue}
          isPlaying={isPlaying}
        />
      )}
    </div>
  );
}

function SharePageWrapper() {
  // Read search params here - this component will be wrapped in Suspense
  const searchParams = useSearchParams();
  const hostPeerIdParam = searchParams.get("host");
  const textOnlyParam = searchParams.get("textOnly") === "true";

  return (
    <SharePageContent
      hostPeerIdParam={hostPeerIdParam}
      textOnlyParam={textOnlyParam}
    />
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className={styles.container}>
        <div className={styles.message}>
          <h1>Loading...</h1>
        </div>
      </div>
    }>
      <SharePageWrapper />
    </Suspense>
  );
}

