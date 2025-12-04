"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./video-test.module.css";

interface Song {
  spotifyId: string;
  title: string;
  artist: string;
}

interface YouTubeResult {
  videoId: string;
  title: string;
  thumbnail: string;
}

export default function VideoTestPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSong = songs[currentIndex];
  const remaining = songs.length - currentIndex;

  // Load songs that need testing
  useEffect(() => {
    async function loadSongs() {
      try {
        const res = await fetch("/api/video-test/songs");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load songs");
        }
        const data = await res.json();
        setSongs(data.songs);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    loadSongs();
  }, []);

  // Load YouTube videos for current song
  const loadVideos = useCallback(async () => {
    if (!currentSong) return;
    
    setLoadingVideos(true);
    setVideos([]);
    
    try {
      const query = `${currentSong.title} ${currentSong.artist}`;
      const res = await fetch(`/api/video-test/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Failed to search videos");
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (e: any) {
      console.error("Failed to load videos:", e);
      setVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  }, [currentSong]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Select a video as the working one
  const selectVideo = async (videoId: string) => {
    if (!currentSong || saving) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/video-test/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyId: currentSong.spotifyId,
          title: currentSong.title,
          artist: currentSong.artist,
          workingYoutubeId: videoId,
        }),
      });
      
      if (!res.ok) throw new Error("Failed to save");
      
      // Move to next song
      setCurrentIndex(i => i + 1);
    } catch (e: any) {
      console.error("Failed to save:", e);
      alert("Failed to save. Check console.");
    } finally {
      setSaving(false);
    }
  };

  // Skip current song (no matching video)
  const skipSong = async () => {
    if (!currentSong || saving) return;
    
    setSaving(true);
    try {
      // Save with empty workingYoutubeId to mark as "checked but no match"
      const res = await fetch("/api/video-test/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyId: currentSong.spotifyId,
          title: currentSong.title,
          artist: currentSong.artist,
          workingYoutubeId: "NONE",
        }),
      });
      
      if (!res.ok) throw new Error("Failed to save skip");
      
      // Move to next song
      setCurrentIndex(i => i + 1);
    } catch (e: any) {
      console.error("Failed to skip:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading songs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className={styles.container}>
        <div className={styles.done}>
          <h1>🎉 All Done!</h1>
          <p>No more songs to test.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.stats}>
          <span className={styles.remaining}>{remaining} songs remaining</span>
          <span className={styles.progress}>
            {currentIndex + 1} / {songs.length}
          </span>
        </div>
        <div className={styles.currentSong}>
          <h1 className={styles.title}>{currentSong.title}</h1>
          <p className={styles.artist}>{currentSong.artist}</p>
        </div>
        <button 
          className={styles.skipButton}
          onClick={skipSong}
          disabled={saving}
        >
          {saving ? "..." : "No Match Found →"}
        </button>
      </header>

      <main className={styles.main}>
        {loadingVideos ? (
          <div className={styles.loadingVideos}>Searching YouTube...</div>
        ) : videos.length === 0 ? (
          <div className={styles.noVideos}>No videos found</div>
        ) : (
          <div className={styles.videoGrid}>
            {videos.map((video) => (
              <button
                key={video.videoId}
                className={styles.videoCard}
                onClick={() => selectVideo(video.videoId)}
                disabled={saving}
              >
                <div className={styles.videoThumbnail}>
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    loading="lazy"
                  />
                  <div className={styles.playOverlay}>▶</div>
                </div>
                <p className={styles.videoTitle}>{video.title}</p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

