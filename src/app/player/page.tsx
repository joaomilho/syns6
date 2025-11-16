"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getCurrentlyPlaying, getAudioFeatures } from "@/lib/spotify";
import MusicVisualization from "@/components/MusicVisualization";
import styles from "./player.module.css";
import Link from "next/link";

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

  // Fetch current playback state
  const fetchPlaybackState = async () => {
    if (!session?.accessToken) return;

    try {
      const data = await getCurrentlyPlaying(session.accessToken);
      if (data && data.item) {
        setPlaybackState(data);
        setCurrentProgress(data.progress_ms || 0);
        setError(null);

        // Fetch audio features for the current track
        if (data.item.id) {
          try {
            const features = await getAudioFeatures(session.accessToken, data.item.id);
            setAudioFeatures(features);
          } catch (err) {
            console.error("Error fetching audio features:", err);
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
      {/* Background Visualization */}
      {playbackState?.item && (
        <MusicVisualization
          audioFeatures={audioFeatures}
          isPlaying={playbackState.is_playing}
        />
      )}

      {/* Top Controls */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          ← Back
        </Link>
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
