"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getCurrentlyPlaying, getAudioFeatures, getAudioAnalysis } from "@/lib/spotify";
import { AudioAnalysis, SyncedAudioData, syncAudioAnalysis } from "@/lib/audioSync";
import { SyncedLyrics, fetchSyncedLyrics, LyricLine } from "@/lib/lyrics";
import { useMicrophoneAnalysis } from "@/hooks/useMicrophoneAnalysis";
import MusicVisualization from "@/components/MusicVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import BlackMetalVisualization from "@/components/BlackMetalVisualization";
import DebugVisualization from "@/components/DebugVisualization";
import Karaoke from "@/components/Karaoke";
import styles from "./player.module.css";
import Link from "next/link";

type VisualizationType = "particles" | "fractal" | "psychedelic" | "waves" | "blackmetal" | "debug";

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

interface AudioFeatures {
  energy: number;
  tempo: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

export default function PlayerPage() {
  const { data: session, status } = useSession();
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<AudioAnalysis | null>(null);
  const { micData, isEnabled: isMicEnabled, enable: enableMic, disable: disableMic } = useMicrophoneAnalysis();
  const [syncedData, setSyncedData] = useState<SyncedAudioData | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[] | null>(null);
  const [visualizationType, setVisualizationType] = useState<VisualizationType>("particles");

  // Fetch current playback state
  const fetchPlaybackState = async () => {
    if (!session?.accessToken) return;

    try {
      const data = await getCurrentlyPlaying(session.accessToken);
      if (data && data.item) {
        setPlaybackState(data);
        setCurrentProgress(data.progress_ms || 0);
        setError(null);

        // NOTE: Audio features and analysis endpoints were deprecated for new apps on Nov 27, 2024
        // We'll use fallback values based on playback state and microphone input instead
        if (data.item.id) {
          console.log("ℹ️ Audio features/analysis not available (deprecated for new Spotify apps)");
          console.log("ℹ️ Using fallback values based on playback state + microphone");
          
          // Set fallback audio features with reasonable defaults
          // These will be enhanced by microphone input for reactivity
          setAudioFeatures({
            energy: 0.7, // Default medium-high energy
            tempo: 120, // Default 120 BPM
            valence: 0.6, // Default slightly positive
            danceability: 0.7, // Default danceable
            acousticness: 0.3, // Default mostly electronic
          });
          
          // No audio analysis available
          setAudioAnalysis(null);
        }

          // Fetch synced lyrics
          try {
            const syncedLyrics = await fetchSyncedLyrics(
              data.item.name,
              data.item.artists[0].name,
              data.item.duration_ms
            );
            if (syncedLyrics) {
              setLyrics(syncedLyrics.lines);
              console.log("Synced lyrics loaded:", syncedLyrics.lines.length, "lines");
            } else {
              setLyrics(null);
              console.log("No synced lyrics found");
            }
          } catch (err) {
            console.error("Error fetching lyrics:", err);
            setLyrics(null);
          }
        }
      } else {
        setPlaybackState(null);
        setError("No track currently playing");
      }
    } catch (err) {
      console.error("Error fetching playback:", err);
      setError("Failed to fetch playback state");
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

  // Sync audio analysis with current playback position (60fps for smooth reactions)
  useEffect(() => {
    if (playbackState?.is_playing && audioAnalysis) {
      const interval = setInterval(() => {
        const synced = syncAudioAnalysis(currentProgress, audioAnalysis);
        setSyncedData(synced);
      }, 16); // Update 60 times per second for ultra-smooth beat detection
      return () => clearInterval(interval);
    }
  }, [currentProgress, audioAnalysis, playbackState?.is_playing]);

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

  return (
    <div className={styles.fullscreenPage}>
      {/* Background Visualization with 3D Lyrics */}
      {playbackState?.item && (
        <>
          {visualizationType === "particles" && (
            <MusicVisualization
              audioFeatures={audioFeatures}
              isPlaying={playbackState.is_playing}
              syncedData={syncedData}
              lyrics={lyrics}
              currentTimeMs={currentProgress}
              micData={micData}
            />
          )}
          {visualizationType === "fractal" && (
            <FractalVisualization
              audioFeatures={audioFeatures}
              isPlaying={playbackState.is_playing}
              syncedData={syncedData}
              lyrics={lyrics}
              currentTimeMs={currentProgress}
              micData={micData}
            />
          )}
          {visualizationType === "psychedelic" && (
            <PsychedelicVisualization
              audioFeatures={audioFeatures}
              isPlaying={playbackState.is_playing}
              syncedData={syncedData}
              lyrics={lyrics}
              currentTimeMs={currentProgress}
              micData={micData}
            />
          )}
          {visualizationType === "waves" && (
            <WavyLinesVisualization
              audioFeatures={audioFeatures}
              isPlaying={playbackState.is_playing}
              syncedData={syncedData}
              lyrics={lyrics}
              currentTimeMs={currentProgress}
              micData={micData}
            />
          )}
          {visualizationType === "blackmetal" && (
            <BlackMetalVisualization
              audioFeatures={audioFeatures}
              isPlaying={playbackState.is_playing}
              syncedData={syncedData}
              lyrics={lyrics}
              currentTimeMs={currentProgress}
              micData={micData}
            />
          )}
          {visualizationType === "debug" && (
            <DebugVisualization
              audioFeatures={audioFeatures}
              isPlaying={playbackState.is_playing}
              syncedData={syncedData}
              lyrics={lyrics}
              currentTimeMs={currentProgress}
              micData={micData}
            />
          )}
        </>
      )}

      {/* Top Controls */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          ← Back
        </Link>
        
        {/* Microphone Toggle */}
        <button
          className={`${styles.vizButton} ${isMicEnabled ? styles.active : ""}`}
          onClick={() => isMicEnabled ? disableMic() : enableMic()}
          title={isMicEnabled ? "Disable Microphone" : "Enable Microphone"}
          style={{ marginLeft: '10px' }}
        >
          🎤
        </button>
        
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
              visualizationType === "debug" ? styles.active : ""
            }`}
            onClick={() => setVisualizationType("debug")}
            title="Debug View"
          >
            🔍
          </button>
        </div>
      </div>

      {/* Bottom Player Controls */}
      {error && !playbackState ? (
        <div className={styles.bottomControls}>
          <div className={styles.errorMessage}>
            <p>{error}</p>
            <p className={styles.hint}>
              Open Spotify and start playing a track
            </p>
          </div>
        </div>
      ) : playbackState?.item ? (
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
      ) : (
        <div className={styles.bottomControls}>
          <div className={styles.errorMessage}>
            <p>No track currently playing</p>
          </div>
        </div>
      )}
    </div>
  );
}
