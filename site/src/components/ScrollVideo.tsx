"use client";

import { useRef, useState } from "react";

interface ScrollVideoProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function ScrollVideo({ src, alt, className, style }: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (video && !videoError) {
      video.play().catch(err => console.log('Play error:', err));
    }
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (video && !videoError) {
      video.pause();
      video.currentTime = 0; // Reset to beginning
    }
  };

  const handleError = () => {
    console.log('Video failed to load:', src);
    setVideoError(true);
  };

  // Generate fallback sources
  const webmSrc = src;
  const pngSrc = src.replace('.webm', '.png');

  // If video fails to load, show static image
  if (videoError) {
    return (
      <img
        src={pngSrc}
        alt={alt}
        className={className}
        style={style}
      />
    );
  }

  return (
    <div 
      style={{ width: '100%', height: 'auto' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        className={className}
        style={style}
        muted
        loop
        playsInline
        preload="metadata"
        poster={pngSrc}
        aria-label={alt}
        onError={handleError}
      >
        {/* WebM for modern browsers (smaller file size) */}
        <source src={webmSrc} type="video/webm" />
      </video>
    </div>
  );
}

