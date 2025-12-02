"use client";

import { useRef, useEffect, useState } from "react";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { getWorkingVideo, saveWorkingVideo } from "@/lib/storage";

interface YouTubeVisualizationProps {
  trackName?: string;
  artistName?: string;
  spotifyId?: string;
  micData?: MicrophoneData;
  effect?: 'none' | '3d-flip' | 'black-white' | 'glitch' | 'bloom';
  onVideoIdChange?: (videoId: string | null) => void;
}

export default function YouTubeVisualization({
  trackName,
  artistName,
  spotifyId: spotifyIdProp,
  micData,
  effect = 'none',
  onVideoIdChange,
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

  // Report working video to backend for crowdsourced caching
  const reportWorkingVideo = async (videoId: string) => {
    if (!spotifyId || !trackName || !artistName) {
      console.log('[YouTube] ⚠️ Missing data, cannot report working video');
      return;
    }

    // Don't report the fallback video
    const DEFAULT_VIDEO_ID = "L1vrPpM4eyM";
    if (videoId === DEFAULT_VIDEO_ID) {
      console.log('[YouTube] ⚠️ Skipping fallback video report');
      return;
    }

    try {
      console.log(`[YouTube] 📤 Reporting working video to backend: ${videoId}`);
      const response = await fetch('/api/youtube/report-working', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spotifyId,
          workingVideoId: videoId,
          title: trackName,
          artist: artistName,
        }),
      });

      if (response.ok) {
        console.log(`[YouTube] ✅ Working video reported successfully`);
      } else {
        console.error(`[YouTube] ❌ Failed to report working video: ${response.status}`);
      }
    } catch (error) {
      console.error('[YouTube] ❌ Error reporting working video:', error);
    }
  };

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
      onVideoIdChange?.(null);
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
                onVideoIdChange?.(videoId);
                hasWorkingVideoRef.current = true;
                setIsLoading(false);
                setVideoError(false);
                
                // Report working video to backend for crowdsourced caching
                reportWorkingVideo(videoId);
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
                onVideoIdChange?.(vid);
                setIsLoading(false);
                setVideoError(false);
                
                // Save working video to IndexedDB for future prioritization
                if (spotifyId) {
                  saveWorkingVideo(spotifyId, vid, videoIds).catch(err => {
                    console.error('[YouTube] Error saving working video:', err);
                  });
                }
                
                // Report working video to backend for crowdsourced caching
                reportWorkingVideo(vid);
                
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

  // Get CSS effect styles based on current effect and audio data
  const getEffectStyles = (): React.CSSProperties => {
    const bass = micData?.bass || 0;
    
    switch (effect) {
      case '3d-flip':
        return {
          transform: `rotateY(${bass * 30}deg) rotateX(${Math.sin(Date.now() * 0.001) * 10}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.3s ease-out',
        };
      
      case 'black-white':
        return {
          filter: `grayscale(100%) contrast(${Math.pow(1+bass, bass*8)})`,
        };
      
      case 'glitch':
        const glitchIntensity = bass > 0.6 ? bass : 0;
        return {
          filter: `hue-rotate(${glitchIntensity * 180}deg) saturate(${1 + glitchIntensity * 2})`,
          transform: `translate(${Math.random() * glitchIntensity * 10 - 5}px, ${Math.random() * glitchIntensity * 10 - 5}px)`,
          transition: 'none',
        };

      case 'bloom': {
        return {
          filter: `contrast(${Math.pow(1+bass, bass*4)}) saturate(${Math.pow(bass*2, 20)})`
        };
      }
      
      default:
        return {};
    }
  };


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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={videoContainerRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {/* YouTube player wrapper with CSS effects */}
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            opacity: workingVideoId ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            ...getEffectStyles(),
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

    </div>
  );
}
