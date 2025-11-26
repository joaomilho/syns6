"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

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
  const [videoId, setVideoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const spotifyId = spotifyIdProp;

  // Fetch video when track changes
  useEffect(() => {
    if (!trackName || !artistName) return;

    const fetchVideo = async () => {
      const query = `${trackName} ${artistName}`;
      console.log("[YouTube] 🔍 Fetching video for:", query);
      console.log(`[YouTube] 🆔 Spotify ID: ${spotifyId || 'NOT PROVIDED'}`);
      setSearchQuery(query);

      try {
        const params = new URLSearchParams({
          q: query,
          title: trackName,
          artist: artistName,
        });
        
        if (spotifyId) {
          params.append('spotifyId', spotifyId);
          console.log(`[YouTube] ✅ Including spotifyId in request: ${spotifyId}`);
        } else {
          console.log("[YouTube] ⚠️ No spotifyId available for this track");
        }
        
        const url = `/api/youtube/search?${params.toString()}`;
        console.log("[YouTube] 📡 Making request to:", url);
        
        const response = await fetch(url);
        console.log("[YouTube] 📥 Response status:", response.status, response.statusText);
        
        if (!response.ok) {
          console.error(`[YouTube] ❌ API returned error: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error("[YouTube] Error body:", errorText);
          setVideoId(null);
          return;
        }
        
        const data = await response.json();
        console.log("[YouTube] 📦 Response data:", data);
        console.log(`[YouTube] ✅ Video ID: ${data.videoId || "No video found"} (source: ${data.source || 'unknown'})`);
        setVideoId(data.videoId);
      } catch (error) {
        console.error(`[YouTube] ❌ Error fetching video:`, error);
        console.error("[YouTube] Error details:", error instanceof Error ? error.message : String(error));
        setVideoId(null);
      }
    };

    fetchVideo();
  }, [trackName, artistName, spotifyId]);

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
        
        // Scale effect on bass - KEEP the translate to stay centered!
        const scale = 1 + bass * 0.1;
        videoContainerRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
      } else {
        // No audio data - just keep centered with no effects
        videoContainerRef.current.style.filter = 'none';
        videoContainerRef.current.style.transform = 'translate(-50%, -50%)';
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
      {/* Video layer - simple and centered */}
      <div
        ref={videoContainerRef}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "96vw",
          height: "54vw", // 16:9 aspect ratio
          maxWidth: "1536px",
          maxHeight: "864px",
          zIndex: 1,
        }}
      >
        {videoId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 12px 48px rgba(0, 0, 0, 0.9)",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div
            style={{
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
            }}
            onClick={() => {
              if (searchQuery) {
                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, "_blank");
              }
            }}
          >
            <div style={{ fontSize: "80px", color: "#ff0000", marginBottom: "20px" }}>▶</div>
            <div style={{ fontSize: "20px", fontWeight: "600" }}>No embeddable video</div>
            <div style={{ fontSize: "15px", opacity: 0.7, marginTop: "10px" }}>{searchQuery}</div>
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
          style={{
            background: "transparent",
          }}
        >
        </Canvas>
      </div>
    </div>
  );
}
