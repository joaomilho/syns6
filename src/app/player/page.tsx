"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getCurrentlyPlaying } from "@/lib/spotify";
import styles from "./player.module.css";
import Link from "next/link";

interface Track {
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
  const { data: session, status } = useSession();
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch current playback state
  const fetchPlaybackState = async () => {
    if (!session?.accessToken) return;

    try {
      const data = await getCurrentlyPlaying(session.accessToken);
      if (data && data.item) {
        setPlaybackState(data);
        setCurrentProgress(data.progress_ms || 0);
        setError(null);
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
      const interval = setInterval(fetchPlaybackState, 5000); // Update every 5 seconds
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
      <div className={styles.page}>
        <div className={styles.player}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.player}>
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
    <div className={styles.page}>
      <div className={styles.player}>
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Back to Home
          </Link>
          <h1>Now Playing</h1>
        </div>

        {error && !playbackState ? (
          <div className={styles.error}>
            <p>{error}</p>
            <p className={styles.hint}>
              Open Spotify and start playing a track to see it here
            </p>
          </div>
        ) : playbackState?.item ? (
          <div className={styles.nowPlaying}>
            <div className={styles.albumArt}>
              {playbackState.item.album.images[0] && (
                <img
                  src={playbackState.item.album.images[0].url}
                  alt={playbackState.item.album.name}
                />
              )}
            </div>

            <div className={styles.trackInfo}>
              <h2 className={styles.trackName}>{playbackState.item.name}</h2>
              <p className={styles.artistName}>
                {playbackState.item.artists.map((a) => a.name).join(", ")}
              </p>
              <p className={styles.albumName}>{playbackState.item.album.name}</p>
            </div>

            <div className={styles.progressContainer}>
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
              <div className={styles.timeInfo}>
                <span>{formatTime(currentProgress)}</span>
                <span>{formatTime(playbackState.item.duration_ms)}</span>
              </div>
            </div>

            <div className={styles.playbackStatus}>
              {playbackState.is_playing ? (
                <span className={styles.playing}>▶ Playing</span>
              ) : (
                <span className={styles.paused}>⏸ Paused</span>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.noTrack}>
            <p>No track currently playing</p>
          </div>
        )}
      </div>
    </div>
  );
}

