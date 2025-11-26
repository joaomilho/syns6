"use client";

import { useRef } from "react";

interface ScrollVideoProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function ScrollVideo({ src, alt, className, style }: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(err => console.log('Play error:', err));
    }
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0; // Reset to beginning
    }
  };

  return (
    <div 
      style={{ width: '100%', height: 'auto' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={src}
        className={className}
        style={style}
        muted
        loop
        playsInline
        preload="auto"
        aria-label={alt}
      />
    </div>
  );
}

