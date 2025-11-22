"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useShareManager } from "@/hooks/useShareManager";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import MusicVisualization from "@/components/MusicVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import AnimatedSceneVisualization from "@/components/AnimatedSceneVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
import WaveSpectrum3DVisualization from "@/components/WaveSpectrum3DVisualization";
import YouTubeVisualization from "@/components/YouTubeVisualization";
import CustomVisualization from "@/components/CustomVisualization";
import DSLVisualization from "@/components/DSLVisualization";
import CompiledVisualization from "@/components/CompiledVisualization";
import { isDSLFormat } from "@/lib/visualizationDSL/schema";
import { getAllCustomVisualizations, CustomVisualization as CustomVizType } from "@/lib/customVisualizations";
import styles from "./share.module.css";

function SharePageContent() {
  const searchParams = useSearchParams();
  const hostPeerIdParam = searchParams.get("host");
  
  const shareManager = useShareManager();
  const [customVisualizations, setCustomVisualizations] = useState<CustomVizType[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState<number>(0);
  
  // Code input state
  const [codeInput, setCodeInput] = useState<string[]>(['', '', '', '', '', '']);
  const [showCodeInput, setShowCodeInput] = useState(!hostPeerIdParam);
  const [hostPeerId, setHostPeerId] = useState<string | null>(hostPeerIdParam);
  
  // Use local microphone (each viewer hears music through speakers)
  const { micData, isEnabled: isMicEnabled, enable: enableMic, error: micHookError } = useMicrophoneAnalysis();

  // Connect to host on mount
  useEffect(() => {
    if (hostPeerId && !shareManager.isViewer) {
      console.log("🔗 Connecting to host:", hostPeerId);
      shareManager.connectToHost(hostPeerId);
      setIsConnecting(true);
    }
  }, [hostPeerId]);

  // Update connecting state
  useEffect(() => {
    if (shareManager.isViewer) {
      setIsConnecting(false);
    }
  }, [shareManager.isViewer]);

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

  // Auto-enable microphone on viewer
  useEffect(() => {
    // Check if mediaDevices API is available
    const checkAndEnableMic = async () => {
      const isHttps = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '[::1]';
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!isHttps && !isLocalhost) {
          setMicError(
            'Microphone requires HTTPS when accessing via IP address. ' +
            'Enable Chrome flag to allow HTTP access for development.'
          );
        } else {
          setMicError('Browser does not support microphone access.');
        }
        return;
      }

      if (!isMicEnabled && !micHookError) {
        console.log('🎤 Auto-enabling microphone for viewer...');
        try {
          await enableMic();
        } catch (err) {
          console.error('❌ Failed to enable microphone:', err);
          
          if (!isHttps && !isLocalhost) {
            setMicError(
              'Microphone requires HTTPS when accessing via IP address. ' +
              'Enable Chrome flag to allow HTTP access for development.'
            );
          } else {
            setMicError('Failed to access microphone. Please check browser permissions.');
          }
        }
      }
    };

    checkAndEnableMic();
  }, [isMicEnabled, enableMic, micHookError]);
  
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
  const hasLoggedRef = useRef(false);
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
  const visualizationType = state?.visualizationType || "fftspectrum";
  
  // Adjust current time to compensate for network latency
  // This ensures lyrics appear in sync with what viewer hears through their mic
  const rawCurrentTimeMs = state?.currentTimeMs || 0;
  const currentTimeMs = rawCurrentTimeMs + latency;

  // Render visualization based on type
  const renderVisualization = () => {
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
                lyrics={lyrics}
                currentTimeMs={currentTimeMs}
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
              lyrics={lyrics}
              currentTimeMs={currentTimeMs}
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
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            micData={micData}
          />
        );
      case "fractal":
        return (
          <FractalVisualization
            key="fractal"
            isPlaying={isPlaying}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            micData={micData}
          />
        );
      case "psychedelic":
        return (
          <PsychedelicVisualization
            key="psychedelic"
            isPlaying={isPlaying}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            micData={micData}
          />
        );
      case "waves":
        return (
          <WavyLinesVisualization
            key="waves"
            isPlaying={isPlaying}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            micData={micData}
          />
        );
      case "animated":
        return (
          <AnimatedSceneVisualization
            key="animated"
            micData={micData}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
          />
        );
      case "spectrum3d":
        return (
          <Spectrum3DVisualization
            key="spectrum3d"
            micData={micData}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
          />
        );
      case "wavespectrum":
        return (
          <WaveSpectrum3DVisualization
            key="wavespectrum"
            micData={micData}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
          />
        );
      case "fftspectrum":
        return (
          <FFTSpectrumVisualization
            key="fftspectrum"
            micData={micData}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
          />
        );
      case "youtube":
        return (
          <YouTubeVisualization
            key="youtube"
            trackName={playbackState?.trackName}
            artistName={playbackState?.artistName}
            spotifyId={playbackState?.trackId}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            micData={micData}
          />
        );
      default:
        return (
          <FFTSpectrumVisualization
            key="default"
            micData={micData}
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
          />
        );
    }
  };

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

  if (shareManager.connectionError) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <h1>❌ Connection Error</h1>
          <p>{shareManager.connectionError}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (micError) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <h1>🎤 Microphone Access Required</h1>
          <p style={{ marginBottom: '1rem' }}>{micError}</p>
          
          {window.location.protocol !== 'https:' && 
           window.location.hostname !== 'localhost' && 
           window.location.hostname !== '127.0.0.1' && (
            <div style={{ 
              textAlign: 'left', 
              background: 'rgba(255,255,255,0.05)', 
              padding: '1rem', 
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}>
              <p><strong>Quick Fix for Chrome/Edge:</strong></p>
              <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <li>Open: <code style={{ 
                  background: 'rgba(0,0,0,0.5)', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px'
                }}>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code></li>
                <li>Add: <code style={{ 
                  background: 'rgba(0,0,0,0.5)', 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px'
                }}>{window.location.origin}</code></li>
                <li>Enable the flag and restart browser</li>
              </ol>
            </div>
          )}
          
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

  if (isConnecting || !shareManager.isViewer) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <h1>🔗 Connecting...</h1>
          <p>Establishing connection to host</p>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className={styles.container}>
        <div className={styles.message}>
          <h1>⏳ Waiting for data...</h1>
          <p>Connected! Waiting for host to start broadcasting</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Visualization */}
      {renderVisualization()}

      {/* Now Playing Info (overlay) */}
      {playbackState && (
        <div className={styles.nowPlaying}>
          <div className={styles.albumArt}>
            {playbackState.albumArt && (
              <img 
                src={playbackState.albumArt} 
                alt="Album Art"
              />
            )}
          </div>
          <div className={styles.trackInfo}>
            <div className={styles.trackName}>{playbackState.trackName}</div>
            <div className={styles.artistName}>{playbackState.artistName}</div>
          </div>
          <div className={styles.playState}>
            {playbackState.is_playing ? "▶" : "⏸"}
          </div>
        </div>
      )}

      {/* Queue - Next 2 songs */}
      {queue && queue.length > 0 && (
        <div className={styles.queueOverlay}>
          <div className={styles.queueHeader}>Next Up</div>
          {queue.map((track, index) => (
            <div key={track.id} className={styles.queueItem}>
              <div className={styles.queueAlbumArt}>
                {track.albumArt && (
                  <img src={track.albumArt} alt="Album Art" />
                )}
              </div>
              <div className={styles.queueTrackInfo}>
                <div className={styles.queueTrackName}>{track.name}</div>
                <div className={styles.queueArtistName}>{track.artistName}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewer Badge */}
      <div className={styles.viewerBadgeContainer}>
        <div 
          className={styles.viewerBadge}
          onClick={() => {
            if (!isMicEnabled) {
              enableMic().catch(err => {
                console.error('Failed to enable mic:', err);
                setMicError('Failed to access microphone. Check browser permissions.');
              });
            }
          }}
          title={!isMicEnabled ? "Click to enable microphone" : "Viewer Mode"}
        >
          <span>👀 Viewer Mode</span>
          {!isMicEnabled && (
            <span className={styles.micWarning}>🎤 Click to enable mic</span>
          )}
        </div>
        
        {/* Latency indicator */}
        <div className={styles.latencyIndicator}>
          <span className={styles.latencyLabel}>Latency:</span>
          <span className={`${styles.latencyValue} ${
            latency < 100 ? styles.latencyGood :
            latency < 300 ? styles.latencyOk :
            styles.latencyBad
          }`}>
            {latency}ms
          </span>
          <span className={styles.updateCounter}>
            ({updateCount} updates)
          </span>
        </div>
      </div>
    </div>
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
      <SharePageContent />
    </Suspense>
  );
}

