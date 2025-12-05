"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// Track status of YT.Player tested videos
type PlayerStatus = 'loading' | 'playing' | 'error';

export default function VideoTestPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videos, setVideos] = useState<YouTubeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerStatuses, setPlayerStatuses] = useState<Record<string, PlayerStatus>>({});
  const playersRef = useRef<Map<string, any>>(new Map());
  const [ytApiReady, setYtApiReady] = useState(false);

  const currentSong = songs[currentIndex];
  const remaining = songs.length - currentIndex;

  // Load YouTube IFrame API
  useEffect(() => {
    if ((window as any).YT?.Player) {
      setYtApiReady(true);
      return;
    }

    // Set up callback for when API is ready
    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('[VideoTest] YouTube API ready');
      setYtApiReady(true);
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

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

  // Create YT.Player instances when videos change
  useEffect(() => {
    if (!ytApiReady || videos.length === 0) return;

    // Clean up old players
    playersRef.current.forEach((player) => {
      try {
        player.destroy();
      } catch (e) {}
    });
    playersRef.current.clear();
    
    // Reset statuses
    const initialStatuses: Record<string, PlayerStatus> = {};
    videos.forEach(v => { initialStatuses[v.videoId] = 'loading'; });
    setPlayerStatuses(initialStatuses);

    // Create new players after a short delay to let DOM render
    const timer = setTimeout(() => {
      videos.forEach((video) => {
        const containerId = `yt-api-player-${video.videoId}`;
        const container = document.getElementById(containerId);
        
        if (!container) {
          console.log(`[VideoTest] Container not found: ${containerId}`);
          return;
        }

        try {
          const player = new (window as any).YT.Player(containerId, {
            height: '100%',
            width: '100%',
            videoId: video.videoId,
            playerVars: {
              autoplay: 1,
              mute: 1,
              controls: 1,
              modestbranding: 1,
              rel: 0,
            },
            events: {
              onError: (event: any) => {
                console.log(`[VideoTest] ❌ YT.Player error for ${video.videoId}: ${event.data}`);
                setPlayerStatuses(prev => ({ ...prev, [video.videoId]: 'error' }));
              },
              onStateChange: (event: any) => {
                // State 1 = PLAYING
                if (event.data === 1) {
                  console.log(`[VideoTest] ✅ YT.Player playing: ${video.videoId}`);
                  setPlayerStatuses(prev => ({ ...prev, [video.videoId]: 'playing' }));
                }
              },
            },
          });
          playersRef.current.set(video.videoId, player);
        } catch (e) {
          console.error(`[VideoTest] Error creating player for ${video.videoId}:`, e);
          setPlayerStatuses(prev => ({ ...prev, [video.videoId]: 'error' }));
        }
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      playersRef.current.forEach((player) => {
        try {
          player.destroy();
        } catch (e) {}
      });
      playersRef.current.clear();
    };
  }, [videos, ytApiReady]);

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
          <>
            {/* Section 1: Simple Iframe Embeds */}
            <div className={styles.sectionHeader}>
              <h2>📺 Simple Iframe Embeds</h2>
              <p>These always &quot;load&quot; but may show YouTube error messages inside</p>
            </div>
            <div className={styles.videoGrid}>
              {videos.map((video, index) => (
                <div key={video.videoId} className={styles.videoCard}>
                  <div className={styles.videoEmbed}>
                    <iframe
                      src={`https://www.youtube.com/embed/${video.videoId}?autoplay=${index === 0 ? 1 : 0}&mute=1`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className={styles.videoTitle}>{video.title}</p>
                  <button
                    className={styles.selectButton}
                    onClick={() => selectVideo(video.videoId)}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "✓ Select This Video"}
                  </button>
                </div>
              ))}
            </div>

            {/* Section 2: YT.Player API */}
            <div className={styles.sectionHeader} style={{ marginTop: '48px' }}>
              <h2>🎬 YT.Player API (What Visualization Uses)</h2>
              <p>These detect errors programmatically - green = playing, red = blocked/error</p>
            </div>
            <div className={styles.videoGrid}>
              {videos.map((video) => {
                const status = playerStatuses[video.videoId] || 'loading';
                return (
                  <div key={`api-${video.videoId}`} className={styles.videoCard}>
                    <div 
                      className={styles.videoEmbed}
                      style={{
                        border: status === 'playing' ? '3px solid #0f0' : 
                                status === 'error' ? '3px solid #f00' : 
                                '3px solid #666',
                        position: 'relative',
                      }}
                    >
                      {/* Status badge */}
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        zIndex: 10,
                        background: status === 'playing' ? 'rgba(0, 255, 0, 0.9)' : 
                                    status === 'error' ? 'rgba(255, 0, 0, 0.9)' : 
                                    'rgba(100, 100, 100, 0.9)',
                        color: '#fff',
                      }}>
                        {status === 'playing' ? '✓ PLAYS' : 
                         status === 'error' ? '✗ BLOCKED' : 
                         '⏳ TESTING...'}
                      </div>
                      {/* YT.Player container */}
                      <div 
                        id={`yt-api-player-${video.videoId}`} 
                        style={{ width: '100%', height: '100%' }} 
                      />
                    </div>
                    <p className={styles.videoTitle}>{video.title}</p>
                    <button
                      className={styles.selectButton}
                      onClick={() => selectVideo(video.videoId)}
                      disabled={saving || status !== 'playing'}
                      style={{
                        opacity: status === 'playing' ? 1 : 0.5,
                        background: status === 'playing' ? 'rgba(0, 255, 0, 0.15)' : 'rgba(100, 100, 100, 0.15)',
                        borderColor: status === 'playing' ? 'rgba(0, 255, 0, 0.4)' : 'rgba(100, 100, 100, 0.4)',
                        color: status === 'playing' ? '#0f0' : '#666',
                      }}
                    >
                      {status === 'playing' ? '✓ Select (Works!)' : 
                       status === 'error' ? '✗ Cannot Embed' : 
                       'Testing...'}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

