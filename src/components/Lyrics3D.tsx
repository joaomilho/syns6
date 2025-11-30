"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Group } from "three";
import { LyricLine, getCurrentLyricIndex, getVisibleLines } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

// Pre-cache common characters for Text component performance
export const COMMON_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/~ ";

/**
 * Calculate appropriate character limit based on screen width
 * Uses viewport width breakpoints
 */
function getCharacterLimit(viewportWidth: number): number {
  if (viewportWidth < 640) return 25;        // Mobile
  if (viewportWidth < 1024) return 35;       // Tablet
  if (viewportWidth < 1920) return 42;       // Desktop
  if (viewportWidth < 2560) return 50;       // Large desktop
  return 60;                                  // Ultrawide
}

interface Lyrics3DProps {
  lyrics: LyricLine[] | null;
  currentTimeMs: number;
  font?: string; // Optional custom font URL
  color?: string; // Optional color, defaults to green
  micData?: MicrophoneData; // Optional microphone data
  position?: [number, number, number]; // Optional position override, defaults to [0, 3, 0]
  trackName?: string; // Current track name
  artistName?: string; // Current artist name
  nextTrackName?: string; // Next track name
  nextArtistName?: string; // Next artist name
  timeUntilNextTrack?: number; // Time remaining in current track (when showing next lyrics early)
}

/**
 * Title and Artist as a single animated group
 */
function TitleArtistGroup({
  trackName,
  artistName,
  position,
  isCurrent,
  isPast,
  offset,
  font,
  micData,
  maxLength,
}: {
  trackName: string;
  artistName: string;
  position: [number, number, number];
  isCurrent: boolean;
  isPast: boolean;
  offset: number;
  font?: string;
  micData?: MicrophoneData;
  maxLength: number;
}) {
  const groupRef = useRef<Group>(null);
  const targetScaleRef = useRef(1);
  
  const isReallyShortText = trackName.length < maxLength * 0.5;
  const isShortText = trackName.length < maxLength * 0.75;

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // OSCILLATING rotation
    const maxRotation = 0.15;
    const rotationSpeed = 0.3;
    groupRef.current.rotation.y = Math.sin(time * rotationSpeed) * maxRotation;
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;

    // Calculate target scale based on position - same logic as LyricText3D
    let targetScale = 1.0;
    if (isCurrent) {
      const voiceStrength = 1 + (micData?.voiceStrength || 0) / 1.6;
      const baseScale = isReallyShortText ? 3.5 : isShortText ? 2.5 : 1.8;
      targetScale = baseScale * voiceStrength;
      groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.01;
    } else if (isPast) {
      targetScale = 1.0;
      groupRef.current.position.y = position[1];
    } else if (offset === 1) {
      targetScale = 1.8;
      groupRef.current.position.y = position[1];
    } else if (offset === 2) {
      targetScale = 1.0;
      groupRef.current.position.y = position[1];
    } else if (offset >= 3) {
      targetScale = 0.7;
      groupRef.current.position.y = position[1];
    } else {
      targetScale = 0.4;
      groupRef.current.position.y = position[1];
    }

    // Smoothly lerp to target scale
    const currentScale = groupRef.current.scale.x;
    const scaleLerpFactor = 0.04;
    const newScale = currentScale + (targetScale - currentScale) * scaleLerpFactor;
    groupRef.current.scale.set(newScale, newScale, newScale);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Song title - bold */}
      <Text
        position={[0, 0.6, 0]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font='/fonts/Poppins/Poppins-Bold.ttf'
        outlineWidth={isCurrent ? 0.1 : 0.05}
        outlineColor="black"
        letterSpacing={0}
        characters={COMMON_CHARS}
      >
        {trackName}
        <meshStandardMaterial
          color="#ffffff"
          emissive="#000000"
          emissiveIntensity={0}
          metalness={0}
          roughness={1}
          transparent
          opacity={isCurrent ? 1.0 : isPast ? 0.8 : 0.9}
        />
      </Text>
      
      {/* Artist name - light, smaller, below */}
      <group position={[0, -0.3, 0]} scale={0.6}>
        <Text
          fontSize={1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font='/fonts/Poppins/Poppins-Light.ttf'
          outlineWidth={isCurrent ? 0.1 : 0.05}
          outlineColor="black"
          letterSpacing={0}
          characters={COMMON_CHARS}
        >
          {artistName}
          <meshStandardMaterial
            color="#ffffff"
            emissive="#000000"
            emissiveIntensity={0}
            metalness={0}
            roughness={1}
            transparent
            opacity={isCurrent ? 1.0 : isPast ? 0.8 : 0.9}
          />
        </Text>
      </group>
    </group>
  );
}

/**
 * Next Up group - label and title that scale together
 */
function NextUpGroup({
  trackName,
  artistName,
  position,
  offset,
  labelToTitleSpacing,
  font,
  micData,
  maxLength,
}: {
  trackName: string;
  artistName: string;
  position: [number, number, number];
  offset: number;
  labelToTitleSpacing: number;
  font?: string;
  micData?: MicrophoneData;
  maxLength: number;
}) {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // OSCILLATING rotation
    const maxRotation = 0.15;
    const rotationSpeed = 0.3;
    groupRef.current.rotation.y = Math.sin(time * rotationSpeed) * maxRotation;
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;

    // Calculate target scale based on offset - same as lyrics
    let targetScale = 1.0;
    if (offset === 1) {
      targetScale = 1.8;
      groupRef.current.position.y = position[1];
    } else if (offset === 2) {
      targetScale = 1.0;
      groupRef.current.position.y = position[1];
    } else if (offset >= 3) {
      targetScale = 0.7;
      groupRef.current.position.y = position[1];
    } else {
      targetScale = 0.4;
      groupRef.current.position.y = position[1];
    }

    // Smoothly lerp to target scale
    const currentScale = groupRef.current.scale.x;
    const scaleLerpFactor = 0.04;
    const newScale = currentScale + (targetScale - currentScale) * scaleLerpFactor;
    groupRef.current.scale.set(newScale, newScale, newScale);
  });

  return (
    <group ref={groupRef} position={position}>
      {/* "Next up:" label - smaller */}
      <group scale={0.8}>
        <LyricText3D
          text="Next up:"
          position={[0, 0, 0]}
          isCurrent={false}
          isPast={false}
          offset={999} // Don't let it scale internally
          font={font}
          color="#ffffff"
          micData={micData}
          maxLength={maxLength}
          fontWeight={300}
        />
      </group>
      {/* Next song name and artist - bigger */}
      <group position={[0, -labelToTitleSpacing, 0]} scale={1.5}>
        <TitleArtistGroup
          trackName={trackName}
          artistName={artistName}
          position={[0, 0, 0]}
          isCurrent={false}
          isPast={false}
          offset={999} // Don't let it scale internally
          font={font}
          micData={micData}
          maxLength={maxLength}
        />
      </group>
    </group>
  );
}

/**
 * Split long text into multiple lines at word boundaries
 * Splits at maxLength intervals for consistent line sizes
 */
function splitLongText(text: string, maxLength: number = 42): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  // For 2-line splits only, try to balance by splitting near the middle
  // This makes 2-line lyrics look more balanced
  const numLinesNeeded = Math.ceil(text.length / maxLength);
  const useBalancedSplit = numLinesNeeded === 2;
  
  // Find the ideal split point
  const idealSplit = useBalancedSplit 
    ? Math.floor(text.length / 2)  // Middle for 2 lines
    : maxLength;                    // maxLength for 3+ lines
  
  // Find all spaces in the text
  const spaces: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      spaces.push(i);
    }
  }
  
  // If no spaces found, split at maxLength
  if (spaces.length === 0) {
    const firstLine = text.substring(0, maxLength).trim();
    const remaining = text.substring(maxLength).trim();
    if (remaining.length === 0) return [firstLine];
    return [firstLine, ...splitLongText(remaining, maxLength)];
  }
  
  // Find the space closest to the ideal split point
  let bestBreak = spaces[0];
  let minDistance = Math.abs(idealSplit - spaces[0]);
  
  for (const spacePos of spaces) {
    const distance = Math.abs(idealSplit - spacePos);
    if (distance < minDistance) {
      minDistance = distance;
      bestBreak = spacePos;
    }
  }
  
  // Split at the best break point
  const firstLine = text.substring(0, bestBreak).trim();
  const remaining = text.substring(bestBreak + 1).trim();
  
  // Recursively split the remaining text if it's still too long
  if (remaining.length === 0) {
    return [firstLine];
  }
  
  return [firstLine, ...splitLongText(remaining, maxLength)];
}

function LyricText3D({
  text,
  position,
  isCurrent,
  isPast,
  offset,
  font,
  color,
  showCountdown,
  countdownSeconds,
  micData,
  maxLength,
  fontWeight = 400,
}: {
  text: string;
  position: [number, number, number];
  isCurrent: boolean;
  isPast: boolean;
  offset: number;
  font?: string;
  color: string;
  showCountdown?: boolean;
  countdownSeconds?: number;
  micData?: MicrophoneData;
  maxLength: number;
  fontWeight?: number;
}) {
  const groupRef = useRef<Group>(null);
  const targetScaleRef = useRef(1);
  
  // Check if text is short (less than 75% of max length)
  const isReallyShortText = text.length < maxLength * 0.5;
  const isShortText = text.length < maxLength * 0.75;

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // OSCILLATING rotation instead of continuous spin
    const maxRotation = 0.15;
    const rotationSpeed = 0.3;
    groupRef.current.rotation.y = Math.sin(time * rotationSpeed) * maxRotation;
    groupRef.current.rotation.x = 0;
    groupRef.current.rotation.z = 0;

    // Calculate target scale based on position
    let targetScale = 1.0;
    if (isCurrent) {
      const voiceStrength = 1 + (micData?.voiceStrength || 0) / 1.6;
      // Make short text bigger when current (2.5x instead of 2x)
      const baseScale = isReallyShortText ? 3.5 : isShortText ? 2.5 : 1.8;
      targetScale = baseScale * voiceStrength;
      groupRef.current.position.y = position[1] + Math.sin(time * 2) * 0.01;
    } else if (isPast) {
      targetScale = 1.0;
      groupRef.current.position.y = position[1];
    } else if (offset === 1) {
      targetScale = 1.8;
      groupRef.current.position.y = position[1];
    } else if (offset === 2) {
      targetScale = 1.0;
      groupRef.current.position.y = position[1];
    } else if (offset >= 3) {
      targetScale = 0.7;
      groupRef.current.position.y = position[1];
    } else {
      targetScale = 0.4;
      groupRef.current.position.y = position[1];
    }

    // Smoothly lerp to target scale
    targetScaleRef.current = targetScale;
    const currentScale = groupRef.current.scale.x;
    const scaleLerpFactor = 0.04;
    const newScale =
      currentScale + (targetScale - currentScale) * scaleLerpFactor;
    groupRef.current.scale.set(newScale, newScale, newScale);

    // Color and material updates are handled by the Text component's props
    // No need to manually update materials since we're using declarative props
  });

  // Split text into lines if needed
  const textLines = useMemo(() => splitLongText(text, maxLength), [text, maxLength]);
  const lineSpacing = 1.3; // Vertical spacing between lines

  const textElement = (
    <group ref={groupRef} position={position}>
      {textLines.map((line, lineIndex) => (
        <group key={lineIndex} position={[0, -lineIndex * lineSpacing, 0]}>
          {/* Single text with built-in outline - 50% fewer draw calls! */}
          <Text
            fontSize={1}
            color={color}
            anchorX="center"
            anchorY="middle"
            font={fontWeight === 700 ? '/fonts/Poppins/Poppins-Bold.ttf' : fontWeight === 300 ? '/fonts/Poppins/Poppins-Light.ttf' : font}
            outlineWidth={isCurrent ? 0.1 : 0.05}
            outlineColor="black"
            letterSpacing={0}
            characters={COMMON_CHARS}
          >
            {line}
            <meshStandardMaterial
              color={color}
              emissive="#000000" // BLACK emission = NO bloom trigger!
              emissiveIntensity={0}
              metalness={0}
              roughness={1}
              transparent
              opacity={isCurrent ? 1.0 : isPast ? 0.8 : 0.9}
            />
          </Text>
        </group>
      ))}
    </group>
  );

  // Render countdown if needed
  if (showCountdown && countdownSeconds !== undefined && countdownSeconds > 0) {
    return (
      <>
        {textElement}
        <Text
          position={[position[0], position[1] + 2, position[2]]}
          fontSize={1.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font={font}
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {Math.ceil(countdownSeconds)}
          <meshStandardMaterial
            color="#ffffff"
            emissive="#000000" // BLACK emission = NO bloom trigger!
            emissiveIntensity={0}
            metalness={0}
            roughness={1}
            transparent
            opacity={1.0}
          />
        </Text>
      </>
    );
  }

  return textElement;
}

export default function Lyrics3D({
  lyrics,
  currentTimeMs,
  
  font,
  color = '#ff0',
  micData,
  position = [0, 0, 0],
  trackName,
  artistName,
  nextTrackName,
  nextArtistName,
  timeUntilNextTrack = 0,
}: Lyrics3DProps) {
  const groupRef = useRef<Group>(null);
  const targetYRef = useRef(-8); // Start with lyrics visible at bottom
  
  // Track viewport width for responsive text wrapping
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate dynamic maxLength based on viewport width
  const maxLength = useMemo(() => getCharacterLimit(viewportWidth), [viewportWidth]);

  const currentIndex = useMemo(() => {
    if (!lyrics) return -1;
    return getCurrentLyricIndex(lyrics, currentTimeMs);
  }, [lyrics, currentTimeMs]);

  // Calculate cumulative positions for each lyric, accounting for line breaks
  // Use a constant scale factor to avoid position jumps when currentIndex changes
  const lyricPositions = useMemo(() => {
    if (!lyrics) return [];
    
    const positions: number[] = [];
    
    const baseSpacing = 6; // Base spacing between lyrics
    const lineSpacing = 1.3; // Spacing between split lines within same lyric
    const constantScaleFactor = 1.5; // Use a constant scale for spacing calculations
    
    let cumulativeY = 0;
    
    for (let i = 0; i < lyrics.length; i++) {
      positions.push(cumulativeY);
      
      // Calculate how many lines this lyric will have (using dynamic maxLength)
      const textLines = splitLongText(lyrics[i].text, maxLength);
      const numLines = textLines.length;
      
      // Calculate actual height needed for this lyric using constant scale
      const fontSize = 1; // Base font size
      
      // Height = (number of lines * scaled font size) + (gaps between lines * scaled spacing)
      const textHeight = numLines * fontSize * constantScaleFactor;
      const gapHeight = (numLines - 1) * lineSpacing * constantScaleFactor;
      const totalHeight = textHeight + gapHeight;
      
      // Base spacing + extra space for the actual scaled height
      let spacing = baseSpacing;
      
      // For multi-line lyrics, add the extra height beyond a single line
      const singleLineHeight = fontSize * constantScaleFactor;
      if (totalHeight > singleLineHeight) {
        spacing += (totalHeight - singleLineHeight);
      }
      
      cumulativeY += spacing;
    }
    
    return positions;
  }, [lyrics, maxLength]);

  const visibleLines = useMemo(() => {
    if (!lyrics) return [];
    // Show fewer lines for better performance: 1 before, current, 5 after = 7 total
    return getVisibleLines(lyrics, currentIndex, 1, 5);
  }, [lyrics, currentIndex]);

  // Track previous lyrics to detect song changes
  const prevLyricsRef = useRef<LyricLine[] | null>(null);
  
  // Update target position when current line changes
  useEffect(() => {
    if (!lyrics || lyrics.length === 0) {
      targetYRef.current = -8;
      return;
    }

    if (currentIndex >= 0 && currentIndex < lyricPositions.length) {
      // Use the pre-calculated cumulative position for the current line
      targetYRef.current = lyricPositions[currentIndex];
    } else {
      // Keep lyrics visible at bottom when no current line (before song starts)
      targetYRef.current = -8;
    }
  }, [currentIndex, lyricPositions, lyrics]);
  
  // Initialize group position at bottom when new song starts
  useEffect(() => {
    if (groupRef.current && lyrics && lyrics !== prevLyricsRef.current) {
      // New song started - reset position to bottom (visible but low)
      groupRef.current.position.y = -8;
      targetYRef.current = -8;
      prevLyricsRef.current = lyrics;
      console.log('🎵 New song - lyrics starting at bottom, will rise to center');
    }
  }, [lyrics]);

  // Smooth animation to keep current line centered
  useFrame(() => {
    if (!groupRef.current) return;

    // Smooth lerp to target position (very slow for smooth scrolling)
    const currentY = groupRef.current.position.y;
    const targetY = targetYRef.current;
    const lerpFactor = 0.03; // Ultra slow for buttery smooth scrolling

    groupRef.current.position.y += (targetY - currentY) * lerpFactor;
  });

  // If no lyrics, show "Lyrics not found" message
  if (!lyrics || lyrics.length === 0) {
    return (
      <group position={position}>
        <Text
          position={[0, 0, 5]}
          fontSize={2}
          color="#ff3333"
          anchorX="center"
          anchorY="middle"
          font={font}
          outlineWidth={0.03}
          outlineColor="#000000"
        >
          Lyrics not found
          <meshStandardMaterial
            color="#ff3333"
            emissive="#000000" // BLACK emission = NO bloom trigger!
            emissiveIntensity={0}
            metalness={0}
            roughness={1}
            transparent
            opacity={0.9}
          />
        </Text>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position}>
      {/* Add lighting so meshStandardMaterial is visible */}
      <ambientLight intensity={1.5} />
      <directionalLight position={[0, 0, 10]} intensity={1.0} />
      
      {/* Header - visible only before song starts and during first lyric - both title and artist behave as ONE line */}
      {trackName && artistName && lyrics && lyrics.length > 0 && currentIndex < 1 && (
        <TitleArtistGroup
          trackName={trackName}
          artistName={artistName}
          position={[0, 8, 5]}
          isCurrent={currentIndex === -1}
          isPast={currentIndex >= 0}
          offset={-1 - currentIndex}
          font={font}
          micData={micData}
          maxLength={maxLength}
        />
      )}
      
      {/* Footer - positioned below last lyric */}
      {nextTrackName && nextArtistName && lyrics && lyrics.length > 0 && (() => {
        // Calculate offset - behave like the NEXT line after current
        const nextUpOffset = lyrics.length - currentIndex;
        
        // Position "Next up" below last lyric - close enough to be visible when last lyric is centered
        const nextUpSpacing = 7; // Spacing from last lyric - closer now
        const labelToTitleSpacing = 1.5; // Spacing between "Next up:" and title (scales with group)
        
        return (
          <NextUpGroup
            trackName={nextTrackName}
            artistName={nextArtistName}
            position={[0, -(lyricPositions[lyrics.length - 1] || 0) - nextUpSpacing, 5]}
            offset={nextUpOffset}
            labelToTitleSpacing={labelToTitleSpacing}
            font={font}
            micData={micData}
            maxLength={maxLength}
          />
        );
      })()}
      
      {visibleLines.map(({ line, index, isAdjacent }, i) => {
        const isPast = index < currentIndex;
        const offset = index - currentIndex;

        // Position using pre-calculated cumulative positions
        const yPos = -(lyricPositions[index] || 0);

        const isCurrent = index === currentIndex;
        
        const lineColor = color;

        // Check if next line has a long wait (>10s)
        let showCountdown = false;
        let countdownSeconds = 0;

        // Special case: First line when song hasn't started (currentIndex === -1)
        if (currentIndex === -1 && index === 0 && lyrics && lyrics.length > 0) {
          const firstLine = lyrics[0];
          const waitTime = firstLine.time - currentTimeMs;

          if (waitTime > 0 && firstLine.time > 10000) {
            showCountdown = true;
            // Add time remaining in current track if showing next lyrics early
            countdownSeconds = (waitTime / 1000) + (timeUntilNextTrack / 1000);
          }
        }
        // Normal case: Next line after current
        else if (offset === 1 && lyrics && index < lyrics.length) {
          const currentLine = lyrics[currentIndex];
          const nextLine = lyrics[index];
          if (currentLine && nextLine) {
            const gap = nextLine.time - currentLine.time;
            const timeUntilNext = nextLine.time - currentTimeMs;

            if (gap > 10000 && timeUntilNext > 0) {
              showCountdown = true;
              // Add time remaining in current track if showing next lyrics early
              countdownSeconds = (timeUntilNext / 1000) + (timeUntilNextTrack / 1000);
            }
          }
        }

        return (
          <LyricText3D
            key={`${index}-${line.text}`}
            text={line.text}
            position={[0, yPos, 5]}
            isCurrent={isCurrent}
            isPast={isPast}
            offset={offset}
            font={font}
            color={lineColor}
            showCountdown={showCountdown}
            countdownSeconds={countdownSeconds}
            micData={micData}
            maxLength={maxLength}
          />
        );
      })}
    </group>
  );
}
