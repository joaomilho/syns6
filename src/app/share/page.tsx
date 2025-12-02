"use client";

import { useEffect, useState, useRef, Suspense, useCallback, PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";
import { useShareManager } from "@/hooks/useShareManager";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useCamera } from "@/hooks/useCamera";
import { useWakeLock } from "@/hooks/useWakeLock";
import VisualizationDropdown, { VisualizationType } from "@/components/VisualizationDropdown";
import NowPlayingFooter from "@/components/NowPlayingFooter";
import { Logo } from "@/components/ds";
import { PlaybackStatusButton, MicrophoneButton, CameraButton } from "@/components/ToolsMenu";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import OrbitalVisualization from "@/components/OrbitalVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import LavaLampVisualization from "@/components/LavaLampVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
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
          setHostPeerId(savedHostPeerId);
          setShowCodeInput(false);
        }
      } catch (error) {
        // Silent fail - will show code input
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
      shareManager.connectToHost(hostPeerId);
      setIsConnecting(true);
      setConnectionAttempts(prev => prev + 1);

      // Save to IndexedDB for auto-reconnect
      saveHostPeerId(hostPeerId).catch(() => {});
    }
  }, [hostPeerId, shareManager, maxAttemptsReached, MAX_CONNECTION_ATTEMPTS]); // Removed connectionAttempts from deps

  // Update connecting state
  useEffect(() => {
    if (shareManager.isViewer) {
      setIsConnecting(false);
      setConnectionAttempts(0); // Reset attempts on successful connection
      // DON'T reset hasAttemptedConnection here - it causes double connection!
    }
  }, [shareManager.isViewer, shareManager.viewerState]);

  // Monitor connection errors and stop after max attempts
  useEffect(() => {
    if (shareManager.connectionError) {
      if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
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

  // Force body to be black
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
        return;
      }

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
      }

      if (!isMicEnabled && !micHookError) {
        try {
          await enableMic();
        } catch {
          // Silent fail - continue without mic
        }
      }
    };

    checkAndEnableMic();
  }, [isMicEnabled, enableMic, micHookError, webglChecked]);

  // Convert received state to component props
  const state = shareManager.viewerState;

  // Calculate and update latency from poll round-trip time
  // RTT/2 gives us an estimate of one-way network latency
  useEffect(() => {
    if (state?.roundTripTime !== undefined) {
      const estimatedLatency = Math.round(state.roundTripTime / 2);
      setLatency(estimatedLatency);
      setUpdateCount(prev => prev + 1);
    }
  }, [state?.roundTripTime]);

  // Track first state received
  useEffect(() => {
    if (state && !hasLoggedRef.current) {
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
              />
            );
          }

          // Fallback to DSL interpreter
          return (
            <DSLVisualization
              key={`dsl-${vizType}`}
              config={config}
              micData={micData}
            />
          );
        } catch (error) {
          // Failed to parse DSL
          return null;
        }
      } else {
        // JavaScript custom visualization
        return (
          <CustomVisualization
            key={`custom-${vizType}`}
            code={customViz.code}
            micData={micData} 
          />
        );
      }
    }

    // Built-in visualizations
    switch (vizType) {
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
      case "fractal":
        return (
          <FractalVisualization
            key="fractal"
            energy={micData.energy}
            bass={micData.bass}
          />
        );
      case "psychedelic":
        return (
          <PsychedelicVisualization
            key="psychedelic"
            // Note: This viz doesn't need micData at all!
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
            frequencyData={micData.frequencyData}
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

  // Handle single input change for code entry
  const handleCodeInputChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 6);
    const newCode = sanitized.split('').concat(Array(6).fill('')).slice(0, 6);
    setCodeInput(newCode);

    // Auto-connect when all 6 digits entered
    if (sanitized.length === 6) {
      hasAttemptedConnection.current = false;
      setHostPeerId(sanitized);
      setShowCodeInput(false);
    }
  };

  // Show code input if no host ID
  if (showCodeInput && !hostPeerId) {
    const codeValue = codeInput.join('');
    
    return (
      <div className={styles.container}>
        <div className={styles.codeInputContainer}>
          <h1>Enter Share Code</h1>
          <p className={styles.codeInputInstructions}>
            Enter the 6-digit code from the host screen
          </p>

          {/* Hidden single input for mobile keyboard persistence */}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            value={codeValue}
            onChange={(e) => handleCodeInputChange(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
              handleCodeInputChange(pastedText);
            }}
            className={styles.hiddenCodeInput}
            autoFocus
          />

          {/* Visual digit boxes (click focuses hidden input) */}
          <div 
            className={styles.codeInputs}
            onClick={() => {
              const hiddenInput = document.querySelector(`.${styles.hiddenCodeInput}`) as HTMLInputElement;
              hiddenInput?.focus();
            }}
          >
            {codeInput.map((digit, index) => (
              <div
                key={index}
                className={`${styles.codeDigit} ${index === codeValue.length ? styles.codeDigitActive : ''} ${digit ? styles.codeDigitFilled : ''}`}
              >
                {digit}
              </div>
            ))}
          </div>

          <button
            className={styles.connectButton}
            disabled={codeValue.length !== 6}
            onClick={() => {
             
              hasAttemptedConnection.current = false;
              setHostPeerId(codeValue);
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

          {/* Hidden single input for mobile keyboard persistence */}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            value={codeInput.join('')}
            onChange={(e) => {
              const sanitized = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
              const newCode = sanitized.split('').concat(Array(6).fill('')).slice(0, 6);
              setCodeInput(newCode);

              // Auto-connect when all 6 digits entered
              if (sanitized.length === 6) {
               
                setConnectionAttempts(0);
                setMaxAttemptsReached(false);
                hasAttemptedConnection.current = false;
                setHostPeerId(sanitized);
                setShowCodeInput(false);
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
              const newCode = pastedText.split('').concat(Array(6).fill('')).slice(0, 6);
              setCodeInput(newCode);
              if (pastedText.length === 6) {
                setConnectionAttempts(0);
                setMaxAttemptsReached(false);
                hasAttemptedConnection.current = false;
                setHostPeerId(pastedText);
                setShowCodeInput(false);
              }
            }}
            className={styles.hiddenCodeInput}
          />

          {/* Visual digit boxes (click focuses hidden input) */}
          <div 
            className={styles.codeInputs}
            onClick={() => {
              const hiddenInput = document.querySelector(`.${styles.hiddenCodeInput}`) as HTMLInputElement;
              hiddenInput?.focus();
            }}
          >
            {codeInput.map((digit, index) => (
              <div
                key={index}
                className={`${styles.codeDigit} ${index === codeInput.join('').length ? styles.codeDigitActive : ''} ${digit ? styles.codeDigitFilled : ''}`}
              >
                {digit}
              </div>
            ))}
          </div>

          <button
            className={styles.connectButton}
            disabled={codeInput.join('').length !== 6}
            onClick={() => {
              const code = codeInput.join('');
              setConnectionAttempts(0);
              setMaxAttemptsReached(false);
              hasAttemptedConnection.current = false;
              setHostPeerId(code);
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
        <Logo />

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

          {/* Playback Status */}
          <PlaybackStatusButton
            isPlaying={playbackState ? playbackState.is_playing : null}
          />

          {/* Microphone Toggle */}
          {!webglUnavailable && (
            <MicrophoneButton
              enabled={isMicEnabled}
              onToggle={() => (isMicEnabled ? disableMic() : enableMic())}
            />
          )}

          {/* Camera Toggle */}
          {!webglUnavailable && (
            <CameraButton
              enabled={isCameraEnabled}
              onToggle={() => (isCameraEnabled ? disableCamera() : enableCamera())}
            />
          )}

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

