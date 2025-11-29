"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Group } from "three";
import { LyricLine, getCurrentLyricIndex, getVisibleLines } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

// Pre-cache common characters for Text component performance
export const COMMON_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/~ ";

interface Lyrics3DProps {
  lyrics: LyricLine[] | null;
  currentTimeMs: number;
  font?: string; // Optional custom font URL
  color?: string; // Optional color, defaults to green
  micData?: MicrophoneData; // Optional microphone data
  position?: [number, number, number]; // Optional position override, defaults to [0, 3, 0]
}

/**
 * Split long text into multiple lines at word boundaries
 * Recursively splits text into as many lines as needed
 */
function splitLongText(text: string, maxLength: number = 60): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  // Find best break point (space) near maxLength
  let bestBreak = -1;
  
  // Look for the last space before maxLength
  for (let i = Math.min(maxLength, text.length - 1); i >= 0; i--) {
    if (text[i] === " ") {
      bestBreak = i;
      break;
    }
  }

  // If no space found in reasonable range, try to find first space after maxLength
  if (bestBreak === -1) {
    for (let i = maxLength; i < text.length; i++) {
      if (text[i] === " ") {
        bestBreak = i;
        break;
      }
    }
  }

  // Use the break point if found
  if (bestBreak > 0) {
    const firstLine = text.substring(0, bestBreak).trim();
    const remaining = text.substring(bestBreak + 1).trim();
    
    // Recursively split the remaining text if it's still too long
    return [firstLine, ...splitLongText(remaining, maxLength)];
  }

  // Otherwise split at maxLength (fallback for text without spaces)
  const firstLine = text.substring(0, maxLength).trim();
  const remaining = text.substring(maxLength).trim();
  
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
}) {
  const groupRef = useRef<Group>(null);
  const targetScaleRef = useRef(1);

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
      targetScale = 2 * voiceStrength; // Reduced from 2.0 to 1.7
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
  const textLines = useMemo(() => splitLongText(text), [text]);
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
            font={font}
            fontWeight={400}
            outlineWidth={isCurrent ? 0.1 : isPast? 0 : 0.05 }
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
  position = [0, 5, 0],
}: Lyrics3DProps) {
  const groupRef = useRef<Group>(null);
  const targetYRef = useRef(0);

  const currentIndex = useMemo(() => {
    if (!lyrics) return -1;
    return getCurrentLyricIndex(lyrics, currentTimeMs);
  }, [lyrics, currentTimeMs]);

  // Calculate cumulative positions for each lyric, accounting for line breaks AND scale
  const lyricPositions = useMemo(() => {
    if (!lyrics) return [];
    
    const positions: number[] = [];
    let cumulativeY = 0;
    const baseSpacing = 6; // Base spacing between lyrics
    const lineSpacing = 1.3; // Spacing between split lines within same lyric
    
    for (let i = 0; i < lyrics.length; i++) {
      positions.push(cumulativeY);
      
      // Calculate how many lines this lyric will have
      const textLines = splitLongText(lyrics[i].text);
      const numLines = textLines.length;
      
      // Determine scale factor based on position relative to current
      let scaleFactor = 1.0;
      const offset = i - currentIndex;
      if (i === currentIndex) {
        scaleFactor = 2.0; // Current line is scaled to 2x
      } else if (offset === 1) {
        scaleFactor = 1.8; // Next line is scaled to 1.8x
      } else if (offset === 2) {
        scaleFactor = 1.0;
      } else if (offset >= 3) {
        scaleFactor = 0.7;
      } else {
        scaleFactor = 0.4; // Past lines
      }
      
      // Calculate actual height needed for this lyric
      const fontSize = 1; // Base font size
      
      // Height = (number of lines * scaled font size) + (gaps between lines * scaled spacing)
      const textHeight = numLines * fontSize * scaleFactor;
      const gapHeight = (numLines - 1) * lineSpacing * scaleFactor;
      const totalHeight = textHeight + gapHeight;
      
      // Base spacing + extra space for the actual scaled height
      let spacing = baseSpacing;
      
      // For multi-line or scaled lyrics, add the extra height beyond a single line
      const singleLineHeight = fontSize * 1.0; // Normal single line height
      if (totalHeight > singleLineHeight) {
        spacing += (totalHeight - singleLineHeight);
      }
      
      cumulativeY += spacing;
    }
    
    return positions;
  }, [lyrics, currentIndex]);

  const visibleLines = useMemo(() => {
    if (!lyrics) return [];
    // Show fewer lines for better performance: 1 before, current, 3 after = 5 total
    return getVisibleLines(lyrics, currentIndex, 1, 3);
  }, [lyrics, currentIndex]);

  // Update target position when current line changes
  useEffect(() => {
    // Use the pre-calculated cumulative position for the current line
    if (currentIndex >= 0 && currentIndex < lyricPositions.length) {
      targetYRef.current = lyricPositions[currentIndex];
    } else {
      targetYRef.current = 0;
    }
  }, [currentIndex, lyricPositions]);

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
      
      {visibleLines.map(({ line, index, isAdjacent }, i) => {
        const isPast = index < currentIndex;
        const offset = index - currentIndex;

        // Position using pre-calculated cumulative positions
        const yPos = -(lyricPositions[index] || 0);

        const isCurrent = index === currentIndex;

        // Check if next line has a long wait (>10s)
        let showCountdown = false;
        let countdownSeconds = 0;

        // Special case: First line when song hasn't started (currentIndex === -1)
        if (currentIndex === -1 && index === 0 && lyrics && lyrics.length > 0) {
          const firstLine = lyrics[0];
          const waitTime = firstLine.time - currentTimeMs;

          if (waitTime > 0 && firstLine.time > 10000) {
            showCountdown = true;
            countdownSeconds = waitTime / 1000;
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
              countdownSeconds = timeUntilNext / 1000;
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
            color={color}
            showCountdown={showCountdown}
            countdownSeconds={countdownSeconds}
            micData={micData}
          />
        );
      })}
    </group>
  );
}
