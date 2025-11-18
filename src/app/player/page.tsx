"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { getCurrentlyPlaying } from "@/lib/spotify";
import { fetchSyncedLyrics, LyricLine } from "@/lib/lyrics";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import { useHueLights } from "@/hooks/useHueLights";
import { useCamera } from "@/hooks/useCamera";
import MusicVisualization from "@/components/MusicVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import BlackMetalVisualization from "@/components/BlackMetalVisualization";
import AnimatedSceneVisualization from "@/components/AnimatedSceneVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
import WaveSpectrum3DVisualization from "@/components/WaveSpectrum3DVisualization";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import CameraVisualization from "@/components/CameraVisualization";
import DebugVisualization from "@/components/DebugVisualization";
import HueControls from "@/components/HueControls";
import styles from "./player.module.css";
import Link from "next/link";

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
  const [currentProgress, setCurrentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
    useState<VisualizationType>("particles");
  const [showHueControls, setShowHueControls] = useState(false);
  const [tokenRefreshAttempts, setTokenRefreshAttempts] = useState(0);
  const [lastFetchedTrackId, setLastFetchedTrackId] = useState<string | null>(
    null
  );
  const lyricsCache = useRef<Map<string, LyricLine[] | null>>(new Map());
  const [hueDebugData, setHueDebugData] = useState<{
    bass: number;
    brightness: number;
  } | null>(null);

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
            console.log("📦 Using cached lyrics for track:", data.item.id);
          } else {
            // Fetch from backend API
            try {
              const lyricsLines = await fetchSyncedLyrics(
                data.item.name,
                data.item.artists[0].name,
                data.item.duration_ms
              );

              // Cache the result (even if null)
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
        setPlaybackState(null);
        setError("No track currently playing");
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
        setPlaybackState(null); // Clear old playback state
        setError(
          "Session expired. Please sign out and sign in again to refresh your Spotify connection."
        );
      } else if (tokenRefreshAttempts >= 1) {
        setPlaybackState(null); // Clear old playback state
        setError("Session expired. Please sign out and sign in again.");
      } else {
        setError("Failed to fetch playback state");
      }
    }
  };

  // Initial fetch and periodic updates
  useEffect(() => {
    if (session?.accessToken) {
      fetchPlaybackState();
      const interval = setInterval(fetchPlaybackState, 5000);
      return () => clearInterval(interval);
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
        />
      )}
      {visualizationType === "fractal" && (
        <FractalVisualization
          isPlaying={playbackState?.is_playing || false}
          lyrics={lyrics || noTrackLyrics}
          currentTimeMs={currentProgress}
          micData={micData}
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
      {visualizationType === "blackmetal" && (
        <BlackMetalVisualization
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
        />
      )}

      {/* Top Controls */}
      <div className={styles.topBar}>
        <div className={styles.logo}>Syns</div>

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
              visualizationType === "blackmetal" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("blackmetal")}
            title="Black Metal"
          >
            ⛧
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
              visualizationType === "fftspectrum" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("fftspectrum")}
            title="FFT Spectrum Grid"
          >
            ▥
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
      </div>

      {/* Hue Controls Panel */}
      {showHueControls && (
        <div className={styles.huePanel}>
          <HueControls hue={hue} />
        </div>
      )}

      {/* Hue Debug Display */}
      {hue.debugData && hue.isActive && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "15px",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "14px",
            zIndex: 1000,
            minWidth: "220px",
          }}
        >
          <div
            style={{
              marginBottom: "8px",
              fontWeight: "bold",
              borderBottom: "1px solid #666",
              paddingBottom: "5px",
            }}
          >
            💡 Hue Light Debug
          </div>
          <div style={{ marginBottom: "5px" }}>
            Bass Input:{" "}
            <span style={{ color: "#ff6b6b", fontWeight: "bold" }}>
              {(hue.debugData.bass * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ marginBottom: "5px" }}>
            Brightness:{" "}
            <span style={{ color: "#4ecdc4", fontWeight: "bold" }}>
              {hue.debugData.brightness}/254
            </span>
          </div>
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#999" }}>
            ({((hue.debugData.brightness / 254) * 100).toFixed(0)}% bright)
          </div>
           <div
             style={{
               marginTop: "10px",
               fontSize: "11px",
               color: "#666",
               borderTop: "1px solid #444",
               paddingTop: "8px",
             }}
           >
             Bucket: {Math.round(hue.debugData.brightness / (254 / 12))} / 12
           </div>
           <div style={{ marginTop: "5px", fontSize: "10px", color: "#888" }}>
             Lights: {hue.config?.selectedLights.length || 0} selected
           </div>
        </div>
      )}

      {/* Bottom Player Controls */}
      {playbackState?.item ? (
        <div className={styles.bottomControls}>
          <div className={styles.controlsContainer}>
            {/* Album Art */}
            <div className={styles.albumArt}>
              {playbackState.item.album.images[0] && (
                <img
                  src={playbackState.item.album.images[0].url}
                  alt={playbackState.item.album.name}
                />
              )}
            </div>

            {/* Track Info & Controls */}
            <div className={styles.trackInfoContainer}>
              <div className={styles.trackInfo}>
                <h2 className={styles.trackName}>{playbackState.item.name}</h2>
                <p className={styles.artistName}>
                  {playbackState.item.artists.map((a) => a.name).join(", ")}
                </p>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressContainer}>
                <span className={styles.timeText}>
                  {formatTime(currentProgress)}
                </span>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${
                        (currentProgress / playbackState.item.duration_ms) * 100
                      }%`,
                    }}
                  />
                </div>
                <span className={styles.timeText}>
                  {formatTime(playbackState.item.duration_ms)}
                </span>
              </div>

              {/* Playback Status */}
              <div className={styles.playbackStatus}>
                {playbackState.is_playing ? (
                  <span className={styles.statusBadge}>▶ Playing</span>
                ) : (
                  <span className={styles.statusBadge}>⏸ Paused</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : error || sessionError ? (
        <div className={styles.bottomControls}>
          <div className={styles.errorMessage}>
            <p>{error || sessionError}</p>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className={styles.link}
              style={{ marginTop: "16px", cursor: "pointer", border: "none" }}
            >
              Sign Out & Re-authenticate
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.bottomControls}>
          <div className={styles.errorMessage}>
            <p>No track currently playing</p>
            <p className={styles.hint}>
              Open Spotify and start playing a track
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
