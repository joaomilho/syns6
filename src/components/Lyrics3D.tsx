"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { LyricLine, getCurrentLyricIndex, getVisibleLines } from "@/lib/lyrics";
import { SyncedAudioData } from "@/lib/audioSync";

interface Lyrics3DProps {
  lyrics: LyricLine[] | null;
  currentTimeMs: number;
  isPlaying: boolean;
  syncedData: SyncedAudioData | null;
  font?: string; // Optional custom font URL
  color?: string; // Optional color, defaults to green
}

function LyricText3D({
  text,
  position,
  isCurrent,
  isPast,
  syncedData,
  offset,
  font,
  color = "#1ed760",
}: {
  text: string;
  position: [number, number, number];
  isCurrent: boolean;
  isPast: boolean;
  syncedData: SyncedAudioData | null;
  offset: number;
  font?: string;
  color?: string;
}) {
  const textRef = useRef<THREE.Mesh>(null);
  const targetScaleRef = useRef(1);

  useFrame((state) => {
    if (!textRef.current) return;

    const time = state.clock.getElapsedTime();

    // OSCILLATING rotation instead of continuous spin
    // Slowly sways back and forth between -0.15 and +0.15 radians (~8 degrees each way)
    const maxRotation = 0.15;
    const rotationSpeed = 0.3; // How fast it oscillates
    textRef.current.rotation.y = Math.sin(time * rotationSpeed) * maxRotation;
    textRef.current.rotation.x = 0;
    textRef.current.rotation.z = 0;

    // Calculate target scale based on position
    let targetScale = 1.0;
    if (isCurrent) {
      // CURRENT LINE - HUGE with beat pulse
      const beatPulse = syncedData?.isOnBeat ? 1.15 : 1.0;
      const beatDecay = 1 - (syncedData?.beatProgress || 0);
      targetScale = 3.5 * (1 + beatDecay * (beatPulse - 1) * 0.2);
      
      // Barely any wave motion
      textRef.current.position.y = position[1] + Math.sin(time * 2) * 0.01;
    } else if (isPast) {
      targetScale = 0.8;
      textRef.current.position.y = position[1];
    } else if (offset === 1) {
      targetScale = 2.5;
      textRef.current.position.y = position[1];
    } else if (offset === 2) {
      targetScale = 1.5;
      textRef.current.position.y = position[1];
    } else if (offset >= 3) {
      targetScale = 1.0;
      textRef.current.position.y = position[1];
    } else {
      targetScale = 0.6;
      textRef.current.position.y = position[1];
    }

    // Smoothly lerp to target scale instead of instant change
    targetScaleRef.current = targetScale;
    const currentScale = textRef.current.scale.x;
    const lerpFactor = 0.04; // Even slower = even smoother transition
    const newScale = currentScale + (targetScale - currentScale) * lerpFactor;
    
    textRef.current.scale.set(newScale, newScale, newScale);
  });

  // Color based on state and offset
  const textColor = useMemo(() => {
    if (isCurrent) {
      return color; // Use prop color - BRIGHT
    } else if (isPast) {
      return "#666666"; // Dim gray for previous
    } else if (offset === 1) {
      return "#999999"; // Slightly darker gray for next (50%)
    } else if (offset === 2) {
      return "#777777"; // Darker gray for next-next (30%)
    } else if (offset >= 3) {
      return "#555555"; // Even darker for far future
    }
    return "#444444"; // Very dim for far past
  }, [isCurrent, isPast, offset, color]);

  const emissiveColor = useMemo(() => {
    if (isCurrent) {
      return color; // Use prop color for emissive
    } else if (isPast) {
      return color; // Subtle for previous
    } else if (offset === 1) {
      return color; // Medium emissive for next
    } else if (offset === 2) {
      return color; // Weaker emissive for next-next
    } else if (offset >= 3) {
      return color; // Very weak for far future
    }
    return "#000000";
  }, [isCurrent, isPast, offset, color]);

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={1}
      color={textColor}
      anchorX="center"
      anchorY="middle"
      font={font}
      outlineWidth={
        isCurrent ? 0.04 : 
        isPast ? 0.01 : 
        offset === 1 ? 0.025 : 
        offset === 2 ? 0.015 : 
        offset >= 3 ? 0.01 :
        0.005
      }
      outlineColor="#000000"
      characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/~ "
    >
      {text}
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={
          isCurrent ? 1.0 : 
          isPast ? 0.15 : 
          offset === 1 ? 0.4 : 
          offset === 2 ? 0.2 : 
          offset >= 3 ? 0.1 :
          0.05
        }
        transparent
        opacity={
          isCurrent ? 1 : 
          isPast ? 0.3 : 
          offset === 1 ? 0.7 : 
          offset === 2 ? 0.5 : 
          offset >= 3 ? 0.3 :
          0.15
        }
        side={THREE.DoubleSide}
      />
    </Text>
  );
}

export default function Lyrics3D({
  lyrics,
  currentTimeMs,
  isPlaying,
  syncedData,
  font,
  color = "#1ed760",
}: Lyrics3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetYRef = useRef(0);
  
  const currentIndex = useMemo(() => {
    if (!lyrics) return -1;
    return getCurrentLyricIndex(lyrics, currentTimeMs);
  }, [lyrics, currentTimeMs]);

  const visibleLines = useMemo(() => {
    if (!lyrics) return [];
    // Show MORE lines: 2 before, current, 5 after for smooth scrolling effect
    return getVisibleLines(lyrics, currentIndex, 2, 5);
  }, [lyrics, currentIndex]);

  // Update target position when current line changes
  useMemo(() => {
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
      <group position={[0, 3, 0]}>
        <Text
          position={[0, 0, 5]}
          fontSize={2}
          color="#ff3333"
          anchorX="center"
          anchorY="middle"
          font={font}
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          Lyrics not found
          <meshStandardMaterial
            color="#ff3333"
            emissive="#ff3333"
            emissiveIntensity={0.8}
            transparent
            opacity={0.9}
          />
        </Text>
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[0, 3, 0]}>
      {visibleLines.map(({ line, index, isAdjacent }, i) => {
        const isPast = index < currentIndex;
        const offset = index - currentIndex;
        
        // Position ALL lines in absolute positions
        // Each line is 6 units apart vertically
        const yPos = -index * 6;
        
        const isCurrent = index === currentIndex;

        return (
          <LyricText3D
            key={`${index}-${line.text}`}
            text={line.text}
            position={[0, yPos, 5]}
            isCurrent={isCurrent}
            isPast={isPast}
            syncedData={syncedData}
            offset={offset}
            font={font}
            color={color}
          />
        );
      })}
    </group>
  );
}

