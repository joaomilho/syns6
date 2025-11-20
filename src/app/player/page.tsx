"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { getCurrentlyPlaying, getUserQueue, QueueItem } from "@/lib/spotify";
import { fetchSyncedLyrics, LyricLine } from "@/lib/lyrics";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useHueLights } from "@/hooks/useHueLights";
import { useCamera } from "@/hooks/useCamera";
import { useFPS } from "@/hooks/useFPS";
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
import HueControls from "@/components/HueControls";
import styles from "./player.module.css";
import Link from "next/link";
import Image from "next/image";

type VisualizationType =
  | "particles"
  | "fractal"
  | "psychedelic"
  | "waves"
  | "blackmetal"
  | "animated"
  | "spectrum3d"
  | "wavespectrum"
  | "fftspectrum"
  | "camera"
  | "debug";

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
  const [showHueControls, setShowHueControls] = useState(false);
  
  // Load saved visualization type on mount
  useEffect(() => {
    const loadVisualizationType = async () => {
      const { getVisualizationType } = await import('@/lib/storage');
      const savedType = await getVisualizationType();
      if (savedType) {
        console.log(`🎨 Restoring visualization: ${savedType}`);
        setVisualizationType(savedType as VisualizationType);
      }
    };
    loadVisualizationType();
  }, []);
  
  // Save visualization type when it changes
  useEffect(() => {
    const saveVisualizationType = async () => {
      const { saveVisualizationType: save } = await import('@/lib/storage');
      await save(visualizationType);
    };
    saveVisualizationType();
  }, [visualizationType]);
  const [tokenRefreshAttempts, setTokenRefreshAttempts] = useState(0);
  const [lastFetchedTrackId, setLastFetchedTrackId] = useState<string | null>(
    null
  );
  const lyricsCache = useRef<Map<string, LyricLine[] | null>>(new Map());
  const [hueDebugData, setHueDebugData] = useState<{
    bass: number;
    brightness: number;
  } | null>(null);
  const fps = useFPS();
  const [fftRows, setFftRows] = useState<number>(200); // Track FFT visualization rows

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
          <p>Please sign in to use the player</p>
          <Link href="/" className={styles.link}>
            Go to Home
          </Link>
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

  return (
    <div className={styles.fullscreenPage}>
      {/* Background Visualization with 3D Lyrics - Always render */}
      {visualizationType === "particles" && (
        <MusicVisualization
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
          fps={fps}
        />
      )}
      {visualizationType === "fractal" && (
        <FractalVisualization
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
          fps={fps}
        />
      )}
      {visualizationType === "psychedelic" && (
        <PsychedelicVisualization
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
        />
      )}
      {visualizationType === "waves" && (
        <WavyLinesVisualization
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
        />
      )}
      {visualizationType === "animated" && (
        <AnimatedSceneVisualization
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
      )}
      {visualizationType === "spectrum3d" && (
        <Spectrum3DVisualization
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
      )}
      {visualizationType === "wavespectrum" && (
        <WaveSpectrum3DVisualization
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
      )}
      {visualizationType === "fftspectrum" && (
        <FFTSpectrumVisualization
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
          fps={fps}
          onRowsChange={setFftRows}
        />
      )}
      {visualizationType === "camera" && (
        <CameraVisualization
          videoElement={videoElement}
          micData={micData}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          isPlaying={playbackState?.is_playing || false}
        />
      )}
      {visualizationType === "debug" && (
        <DebugVisualization
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
          hueDebugData={hue.debugData}
          hueIsActive={hue.isActive}
          hueConfig={hue.config}
        />
      )}


      {/* Top Controls */}
      <div className={styles.topBar}>
        <div className={styles.logo}>Syns</div>

        <div className={styles.controlGroups}>
        {/* Actions Group */}
        <div className={styles.vizSelector}>
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

        {/* Visualization Selector */}
        <div className={styles.vizSelector}>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "fftspectrum" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("fftspectrum")}
            title="FFT Spectrum Grid"
          >
            ▥
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "particles" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("particles")}
            title="Particles & Rings"
          >
            ◯
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "fractal" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("fractal")}
            title="Fractal Tree"
          >
            ❋
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "psychedelic" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("psychedelic")}
            title="Psychedelic"
          >
            ✧
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "waves" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("waves")}
            title="Wavy Lines"
          >
            ≋
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "animated" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("animated")}
            title="Morphing Blobs"
          >
            ◉
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "spectrum3d" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("spectrum3d")}
            title="3D Spectrum"
          >
            ▦
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "wavespectrum" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("wavespectrum")}
            title="Wave Spectrum"
          >
            ▬
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "camera" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("camera")}
            title="Camera Effects"
          >
            ⊡
          </button>
          <button
            className={`${styles.vizButton} ${
              visualizationType === "debug" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("debug")}
            title="Debug View"
          >
            ▤
          </button>
        </div>

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

                      {/* Bottom Row: Stats & Status */}
                      <div className={styles.metaRow}>
                        <div className={styles.statsRow}>
                          <span className={styles.statBadge}>{fps} FPS</span>
                          {visualizationType === "fftspectrum" && (
                            <span className={styles.statBadge}>{fftRows} Rows</span>
                          )}
                        </div>

                        <div className={styles.playbackStatus}>
                          {playbackState?.is_playing ? (
                            <span className={styles.statusBadge}>▶ Playing</span>
                          ) : (
                            <span className={styles.statusBadge}>⏸ Paused / Not Active</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Next Songs Queue */}
                  {queue.length > 0 && (
                    <div className={styles.queueSection}>
                      <div className={styles.queueList}>
                        {queue.slice(0, 3).map((track, index) => (
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
    </div>
  );
}
