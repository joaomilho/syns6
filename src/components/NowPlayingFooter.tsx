"use client";

import { useState, useEffect } from "react";
import styles from "./NowPlayingFooter.module.css";

interface Track {
  id: string;
  name: string;
  artistName: string;
  albumArt: string;
  duration_ms: number;
}

interface NowPlayingFooterProps {
  currentTrack: {
    name: string;
    artistName: string;
    albumArt: string;
    duration_ms: number;
  } | null;
  currentProgress: number;
  queue?: Track[];
  isPlaying?: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function NowPlayingFooter({
  currentTrack,
  currentProgress,
  queue = [],
  isPlaying = false,
}: NowPlayingFooterProps) {
  if (!currentTrack) return null;

  const timeRemaining = currentTrack.duration_ms - currentProgress;
  const isNearEnd = timeRemaining <= 30000; // 30 seconds
  const secondsRemaining = Math.ceil(timeRemaining / 1000);

  return (
    <div className={`${styles.bottomControls} ${styles.visible}`}>
      <div className={styles.controlsContainer}>
        {/* LEFT: Current Song */}
        <div className={styles.currentSection}>
          {/* Album Art */}
          <div className={styles.albumArt}>
            {currentTrack.albumArt && (
              <img src={currentTrack.albumArt} alt="Album Art" />
            )}
          </div>

          {/* Track Info & Controls */}
          <div className={styles.trackInfoContainer}>
            <div className={styles.trackInfo}>
              <h2 className={styles.trackName}>{currentTrack.name}</h2>
              <p className={styles.artistName}>{currentTrack.artistName}</p>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressContainer}>
              <span className={styles.timeText}>
                {formatTime(currentProgress)}
              </span>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${
                    isNearEnd ? styles.nearEnd : ""
                  }`}
                  style={{
                    width: `${
                      (currentProgress / currentTrack.duration_ms) * 100
                    }%`,
                  }}
                />
              </div>
              <span className={styles.timeText}>
                {formatTime(currentTrack.duration_ms)}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Next Songs Queue */}
        {queue.length > 0 && (
          <div className={styles.queueSection}>
            <div className={styles.queueList}>
              {queue.slice(0, 2).map((track, index) => (
                <div
                  key={track.id}
                  className={`${styles.queueItem} ${
                    index === 0 && isNearEnd ? styles.upcoming : ""
                  }`}
                >
                  {/* Album Art - smaller for 2nd track */}
                  <div
                    className={`${styles.queueAlbumArt} ${
                      index > 0 ? styles.smaller : ""
                    }`}
                  >
                    {track.albumArt && (
                      <img src={track.albumArt} alt="Album Art" />
                    )}
                  </div>

                  {/* Track Info */}
                  <div className={styles.queueTrackInfo}>
                    <span className={styles.queueTrackName}>{track.name}</span>
                    <span className={styles.queueArtistName}>
                      {track.artistName}
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
      </div>
    </div>
  );
}

