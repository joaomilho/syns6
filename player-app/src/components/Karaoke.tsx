"use client";

import { useMemo } from "react";
import { LyricLine, getCurrentLyricIndex, getVisibleLines } from "@/lib/lyrics";
import styles from "./Karaoke.module.css";

interface KaraokeProps {
  lyrics: LyricLine[] | null;
  currentTimeMs: number;
  isPlaying: boolean;
}

export default function Karaoke({ lyrics, currentTimeMs, isPlaying }: KaraokeProps) {
  const currentIndex = useMemo(() => {
    if (!lyrics) return -1;
    return getCurrentLyricIndex(lyrics, currentTimeMs);
  }, [lyrics, currentTimeMs]);

  const visibleLines = useMemo(() => {
    if (!lyrics) return [];
    return getVisibleLines(lyrics, currentIndex, 2, 3);
  }, [lyrics, currentIndex]);

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className={styles.karaoke}>
        <div className={styles.noLyrics}>
          <p>🎤 No synced lyrics available</p>
          <p className={styles.hint}>Try another song</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.karaoke}>
      <div className={styles.lyricsContainer}>
        {visibleLines.map(({ line, index, isCurrent }) => (
          <div
            key={index}
            className={`${styles.lyricLine} ${
              isCurrent ? styles.current : ""
            } ${index < currentIndex ? styles.past : ""}`}
          >
            {line.text}
          </div>
        ))}
      </div>

      {lyrics.length > 0 && (
        <div className={styles.progress}>
          <div className={styles.progressText}>
            {currentIndex + 1} / {lyrics.length}
          </div>
        </div>
      )}
    </div>
  );
}

