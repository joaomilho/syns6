"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { getWorkingVideo, saveWorkingVideo } from "@/lib/storage";

interface YouTubeVisualizationProps {
  trackName?: string;
  artistName?: string;
  spotifyId?: string;
  micData?: MicrophoneData;
}

export default function YouTubeVisualization({
  trackName,
  artistName,
  spotifyId: spotifyIdProp,
  micData,
}: YouTubeVisualizationProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [workingVideoId, setWorkingVideoId] = useState<string | null>(null); // Confirmed working video
  const [videoIds, setVideoIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [usingCachedVideo, setUsingCachedVideo] = useState<boolean>(false); // Flag for cached video
  const playersRef = useRef<Map<string, any>>(new Map()); // Map of videoId -> player instance
  const hasWorkingVideoRef = useRef<boolean>(false);
  const spotifyId = spotifyIdProp;

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if API is already loaded
    if ((window as any).YT) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  // Fetch video when track changes
  useEffect(() => {
    if (!trackName || !artistName) return;

    const fetchVideo = async () => {
      const query = `${trackName} ${artistName}`;
      console.log("[YouTube] 🔍 Fetching video for:", query);
      console.log(`[YouTube] 🆔 Spotify ID: ${spotifyId || 'NOT PROVIDED'}`);
      setSearchQuery(query);
      setVideoError(false);
      setWorkingVideoId(null);
      hasWorkingVideoRef.current = false;
      setIsLoading(true);
      setUsingCachedVideo(false);

      try {
        // Check IndexedDB for cached working video first
        if (spotifyId) {
          const cached = await getWorkingVideo(spotifyId);
          if (cached) {
            const cachedVideoId = cached.workingVideoId;
            console.log(`[YouTube] 💾 Found cached working video: ${cachedVideoId}, using immediately!`);
            // Use cached winner immediately - set videoIds to trigger player creation
            // Don't set hasWorkingVideoRef yet - let the player load normally
            setVideoIds([cachedVideoId]);
            setUsingCachedVideo(true); // Mark as cached
            setIsLoading(true); // Show loading briefly while player initializes
            setVideoError(false);
            return; // Skip API call - we only need to load the cached video
          }
        }

        const params = new URLSearchParams({
          q: query,
          title: trackName,
          artist: artistName,
        });
        
        if (spotifyId) {
          params.append('spotifyId', spotifyId);
        }
        
        const url = `/api/youtube/search?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`[YouTube] ❌ API returned error: ${response.status}`);
          setVideoIds([]);
          setIsLoading(false);
          setVideoError(true);
          return;
        }
        
        const data = await response.json();
        let ids = data.videoIds || [data.videoId].filter(Boolean);
        
        console.log(`[YouTube] ✅ Testing ${ids.length} video(s)`);
        setVideoIds(ids);
        setIsLoading(true);
        setVideoError(false);
      } catch (error) {
        console.error(`[YouTube] ❌ Error:`, error);
        setVideoIds([]);
        setIsLoading(false);
        setVideoError(true);
      }
    };

    fetchVideo();
  }, [trackName, artistName, spotifyId]);

  // Test ALL videos in parallel - first one to play wins!
  useEffect(() => {
    if (videoIds.length === 0) return;
    if (hasWorkingVideoRef.current) return;

    const initPlayers = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initPlayers, 100);
        return;
      }

      // If using a cached video, load it directly without testing
      if (usingCachedVideo && videoIds.length > 0) {
        const videoId = videoIds[0];
        console.log(`[YouTube] 💾 Loading cached video directly: ${videoId}`);
        
        // Create player in the main container
        const container = document.getElementById('youtube-player-container');
        if (container) {
          const player = new (window as any).YT.Player('youtube-player-container', {
            height: window.innerHeight,
            width: window.innerWidth,
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              mute: 1,
              controls: 1,
              modestbranding: 1,
              rel: 0,
            },
            events: {
              onReady: (event: any) => {
                console.log(`[YouTube] ✅ Cached video loaded: ${videoId}`);
                // Set quality to HD
                event.target.setPlaybackQuality('hd1080');
                console.log(`[YouTube] 🎬 Set quality to HD1080`);
                setWorkingVideoId(videoId);
                hasWorkingVideoRef.current = true;
                setIsLoading(false);
                setVideoError(false);
              },
              onError: (event: any) => {
                // If cached video fails, fall back to full search
                console.error(`[YouTube] ❌ Cached video failed: ${videoId}, falling back to search`);
                setWorkingVideoId(null);
                hasWorkingVideoRef.current = false;
                setIsLoading(false);
                setVideoError(true);
              },
            },
          });
          playersRef.current.set(videoId, player);
        }
        return;
      }

      console.log(`[YouTube] 🚀 Testing ${videoIds.length} videos in parallel...`);
      
      // Create a player for each video ID
      videoIds.forEach((vid, index) => {
        const containerId = `yt-player-${vid}`;
        
        // Create container element if it doesn't exist
        let container = document.getElementById(containerId);
        if (!container) {
          container = document.createElement('div');
          container.id = containerId;
          container.style.display = 'none'; // Hidden until it wins
          document.body.appendChild(container);
        }

        console.log(`[YouTube] 🎬 Creating player ${index + 1}/${videoIds.length} for video: ${vid}`);

        const player = new (window as any).YT.Player(containerId, {
          height: window.innerHeight,
          width: window.innerWidth,
          videoId: vid,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onError: (event: any) => {
              if (hasWorkingVideoRef.current) return;
              console.log(`[YouTube] ❌ Video ${vid} error: ${event.data}`);
              playersRef.current.delete(vid);
            },
            onStateChange: (event: any) => {
              // YT.PlayerState.PLAYING = 1
              if (event.data === 1 && !hasWorkingVideoRef.current) {
                console.log(`[YouTube] ✅ Video ${vid} is playing! This is the winner!`);
                // Set quality to HD
                event.target.setPlaybackQuality('hd1080');
                console.log(`[YouTube] 🎬 Set quality to HD1080`);
                hasWorkingVideoRef.current = true;
                setWorkingVideoId(vid);
                setIsLoading(false);
                setVideoError(false);
                
                // Save working video to IndexedDB for future prioritization
                if (spotifyId) {
                  saveWorkingVideo(spotifyId, vid, videoIds).catch(err => {
                    console.error('[YouTube] Error saving working video:', err);
                  });
                }
                
                // Destroy all other players
                playersRef.current.forEach((p, id) => {
                  if (id !== vid) {
                    try {
                      p.destroy();
                      const elem = document.getElementById(`yt-player-${id}`);
                      elem?.remove();
                    } catch (e) {
                      console.warn('[YouTube] Error destroying player:', e);
                    }
                  }
                });
                
                // Move winning player to our container
                const winnerContainer = document.getElementById(`yt-player-${vid}`);
                const targetContainer = document.getElementById('youtube-player-container');
                if (winnerContainer && targetContainer) {
                  winnerContainer.style.display = 'block';
                  winnerContainer.style.width = '100%';
                  winnerContainer.style.height = '100%';
                  targetContainer.appendChild(winnerContainer);
                }
              }
            },
          },
        });

        playersRef.current.set(vid, player);
      });

      // Set timeout - if no video works in 15 seconds, show error
      setTimeout(() => {
        if (!hasWorkingVideoRef.current) {
          console.error('[YouTube] ⏱️ Timeout - no videos worked');
          setIsLoading(false);
          setVideoError(true);
          
          // Cleanup all players
          playersRef.current.forEach((p, id) => {
            try {
              p.destroy();
              const elem = document.getElementById(`yt-player-${id}`);
              elem?.remove();
            } catch (e) {}
          });
          playersRef.current.clear();
        }
      }, 15000);
    };

    initPlayers();

    return () => {
      // Cleanup on unmount or videoIds change
      playersRef.current.forEach((p, id) => {
        try {
          p.destroy();
          const elem = document.getElementById(`yt-player-${id}`);
          elem?.remove();
        } catch (e) {}
      });
      playersRef.current.clear();
    };
  }, [videoIds, trackName, artistName, usingCachedVideo]);

  // Apply audio-reactive effects
  useEffect(() => {
    if (!videoContainerRef.current) return;

    const animate = () => {
      if (!videoContainerRef.current) return;
      
      if (micData) {
        const bass = micData.bass || 0;
        const mid = micData.mid || 0;
        const treble = micData.treble || 0;
        
        // Apply filters based on audio
        const hueRotate = mid * 360;
        const saturate = 100 + bass * 200;
        const brightness = 100 + treble * 50;
        const contrast = 100 + bass * 50;
        const blur = bass > 0.7 ? (bass - 0.7) * 5 : 0;
        
        videoContainerRef.current.style.filter = `
          hue-rotate(${hueRotate}deg)
          saturate(${saturate}%)
          brightness(${brightness}%)
          contrast(${contrast}%)
          blur(${blur}px)
        `;
        
        // Scale effect on bass
        const scale = 1 + bass * 0.1;
        videoContainerRef.current.style.transform = `scale(${scale})`;
      } else {
        // No audio data - no effects
        videoContainerRef.current.style.filter = 'none';
        videoContainerRef.current.style.transform = 'scale(1)';
      }
      
      requestAnimationFrame(animate);
    };

    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [micData]);


  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        background: "#000000",
      }}
    >
      {/* Video layer - full screen cover */}
      <div
        ref={videoContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1,
        }}
      >
        {/* YouTube player wrapper - controls visibility */}
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            opacity: workingVideoId ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          {/* YouTube replaces this div with iframe - don't touch it after creation */}
          <div id="youtube-player-container" style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Loading state - shown while trying videos */}
        {isLoading && !workingVideoId && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: "white",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: "12px",
              zIndex: 10,
            }}
          >
            <div style={{
              width: "20px",
              height: "20px",
              border: "3px solid rgba(255, 255, 255, 0.1)",
              borderTop: "3px solid #00ff00",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "20px",
            }} />
            <div style={{ fontSize: "18px", fontWeight: "500", opacity: 0.9 }}>
              {usingCachedVideo ? "Loading video..." : "Finding video..."}
            </div>
            <div style={{ fontSize: "14px", opacity: 0.6, marginTop: "8px" }}>
              {!usingCachedVideo && videoIds.length > 0 && `Testing ${videoIds.length} videos...`}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.5, marginTop: "4px" }}>
              {searchQuery}
            </div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Error state - only shown when all videos fail and not loading */}
        {videoError && !isLoading && !workingVideoId && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: "white",
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              borderRadius: "12px",
              cursor: "pointer",
              zIndex: 10,
            }}
            onClick={() => {
              if (searchQuery) {
                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, "_blank");
              }
            }}
          >
            <div style={{ fontSize: "80px", color: "#ff0000", marginBottom: "20px" }}>▶</div>
            <div style={{ fontSize: "20px", fontWeight: "600" }}>
              {videoError ? "Video Unavailable" : "No embeddable video"}
            </div>
            <div style={{ fontSize: "15px", opacity: 0.7, marginTop: "10px" }}>{searchQuery}</div>
            {videoError && (
              <div style={{
                fontSize: "13px",
                opacity: 0.6,
                marginTop: "8px",
                maxWidth: "400px",
                textAlign: "center",
              }}>
                This video may be private, deleted, or embedding may be disabled
              </div>
            )}
            <div style={{
              fontSize: "14px",
              padding: "10px 20px",
              background: "rgba(255, 0, 0, 0.2)",
              borderRadius: "6px",
              border: "1px solid rgba(255, 0, 0, 0.3)",
              marginTop: "15px",
            }}>
              Click to open in YouTube
            </div>
          </div>
        )}
      </div>
      
      {/* Lyrics layer - in front of video */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 30], fov: 75 }}
          dpr={1}
          style={{
            background: "transparent",
          }}
        >
        </Canvas>
      </div>
    </div>
  );
}
