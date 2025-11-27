"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { LyricLine, getCurrentLyricIndex, getVisibleLines } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

// Pre-cache common characters for Text component performance
export const COMMON_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/~ ";

interface Lyrics3DProps {
  lyrics: LyricLine[] | null;
  currentTimeMs: number;
  isPlaying: boolean;
  syncedData?: null; // Deprecated, kept for compatibility (optional)
  font?: string; // Optional custom font URL
  color?: string; // Optional color, defaults to green
  micData?: MicrophoneData; // Optional microphone data
  position?: [number, number, number]; // Optional position override, defaults to [0, 3, 0]
}

/**
 * Split long text into multiple lines at word boundaries
 */
function splitLongText(text: string, maxLength: number = 60): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  // Find best break point (space) near the middle
  const middle = text.length / 2;
  let bestBreak = -1;
  let minDistance = Infinity;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      const distance = Math.abs(i - middle);
      if (distance < minDistance && distance < maxLength / 2) {
        minDistance = distance;
        bestBreak = i;
      }
    }
  }

  // Use the break point if found
  if (bestBreak > 0) {
    return [
      text.substring(0, bestBreak).trim(),
      text.substring(bestBreak + 1).trim(),
    ];
  }

  // Otherwise split at maxLength
  return [
    text.substring(0, maxLength).trim(),
    text.substring(maxLength).trim(),
  ];
}

function LyricText3D({
  text,
  position,
  isCurrent,
  isPast,
  offset,
  font,
  color = "#0f0",
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
  color?: string;
  showCountdown?: boolean;
  countdownSeconds?: number;
  micData?: MicrophoneData;
}) {
  const groupRef = useRef<THREE.Group>(null);
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
      const voiceStrength = micData?.voiceStrength || 0;
      const voiceScale = 1 + voiceStrength/2;
      targetScale = 2.2 * voiceScale; // Reduced from 2.0 to 1.7
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
            fontWeight={600}
            outlineWidth={color !== "#000000" ? 0.02 : 0}
            outlineColor="#000000"
            letterSpacing={0}
            characters={COMMON_CHARS}
          >
            {line}
            <meshBasicMaterial
              toneMapped={false}
              color={color}
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
          <meshBasicMaterial
            color="#ffffff"
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
  isPlaying,
  syncedData, // Deprecated, ignored
  font,
  color = "#1ed760",
  micData,
  position = [0, 5, 0],
}: Lyrics3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetYRef = useRef(0);

  const currentIndex = useMemo(() => {
    if (!lyrics) return -1;
    return getCurrentLyricIndex(lyrics, currentTimeMs);
  }, [lyrics, currentTimeMs]);

  const visibleLines = useMemo(() => {
    if (!lyrics) return [];
    // Show fewer lines for better performance: 1 before, current, 3 after = 5 total
    return getVisibleLines(lyrics, currentIndex, 1, 3);
  }, [lyrics, currentIndex]);

  // Update target position when current line changes
  useEffect(() => {
    // Each line is spaced 6 units apart
    // Move the group UP by 6 units for each lyric progression
    targetYRef.current = currentIndex * 6;
  }, [currentIndex]);

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
          <meshBasicMaterial
            color="#ff3333"
            transparent
            opacity={0.9}
          />
        </Text>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={position}>
      {visibleLines.map(({ line, index, isAdjacent }, i) => {
        const isPast = index < currentIndex;
        const offset = index - currentIndex;

        // Position ALL lines in absolute positions
        // Each line is 6 units apart vertically
        const yPos = -index * 6;

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
