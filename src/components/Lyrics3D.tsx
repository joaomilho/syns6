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
  color = "#0f0",
  showCountdown,
  countdownSeconds,
}: {
  text: string;
  position: [number, number, number];
  isCurrent: boolean;
  isPast: boolean;
  syncedData: SyncedAudioData | null;
  offset: number;
  font?: string;
  color?: string;
  showCountdown?: boolean;
  countdownSeconds?: number;
}) {
  const textRef = useRef<THREE.Mesh>(null);
  const targetScaleRef = useRef(1);
  const currentColorRef = useRef(new THREE.Color(color));
  const currentEmissiveRef = useRef(new THREE.Color(color));
  const currentOpacityRef = useRef(1);
  const currentEmissiveIntensityRef = useRef(1);

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
    const scaleLerpFactor = 0.04; // Even slower = even smoother transition
    const newScale =
      currentScale + (targetScale - currentScale) * scaleLerpFactor;

    textRef.current.scale.set(newScale, newScale, newScale);

    // Smoothly lerp colors and opacity for MUCH slower transitions
    // Access the material from the mesh's children (Text component structure)
    if (textRef.current.children && textRef.current.children.length > 0) {
      const textMesh = textRef.current.children[0] as THREE.Mesh;
      const material = textMesh?.material as THREE.MeshStandardMaterial;

      if (material && material.color && material.emissive) {
        // Determine target colors based on state
        let targetColor: THREE.Color;
        let targetEmissive: THREE.Color;
        let targetOpacity: number;
        let targetEmissiveIntensity: number;

        if (isCurrent) {
          targetColor = new THREE.Color(color);
          targetEmissive = new THREE.Color(color);
          targetOpacity = 1.0;
          targetEmissiveIntensity = 1.0;
        } else if (isPast) {
          targetColor = new THREE.Color("#cccccc");
          targetEmissive = new THREE.Color(color);
          targetOpacity = 0.3;
          targetEmissiveIntensity = 0.15;
        } else if (offset === 1) {
          targetColor = new THREE.Color("#999999");
          targetEmissive = new THREE.Color(color);
          targetOpacity = 0.7;
          targetEmissiveIntensity = 0.4;
        } else if (offset === 2) {
          targetColor = new THREE.Color("#777777");
          targetEmissive = new THREE.Color(color);
          targetOpacity = 0.5;
          targetEmissiveIntensity = 0.2;
        } else if (offset >= 3) {
          targetColor = new THREE.Color("#555555");
          targetEmissive = new THREE.Color(color);
          targetOpacity = 0.3;
          targetEmissiveIntensity = 0.1;
        } else {
          targetColor = new THREE.Color("#444444");
          targetEmissive = new THREE.Color("#000000");
          targetOpacity = 0.15;
          targetEmissiveIntensity = 0.05;
        }

        // VERY SLOW color lerp for smooth transition from current to past
        const colorLerpFactor = 0.001; // Even slower (was 0.003)
        currentColorRef.current.lerp(targetColor, colorLerpFactor);
        currentEmissiveRef.current.lerp(targetEmissive, colorLerpFactor);
        currentOpacityRef.current +=
          (targetOpacity - currentOpacityRef.current) * colorLerpFactor;
        currentEmissiveIntensityRef.current +=
          (targetEmissiveIntensity - currentEmissiveIntensityRef.current) *
          colorLerpFactor;

        // Apply lerped values
        material.color.copy(currentColorRef.current);
        material.emissive.copy(currentEmissiveRef.current);
        material.opacity = currentOpacityRef.current;
        material.emissiveIntensity = currentEmissiveIntensityRef.current;
      }
    }
  });

  const textElement = (
    <Text
      ref={textRef}
      position={position}
      fontSize={1}
      color={color}
      anchorX="center"
      anchorY="middle"
      font={font}
      outlineWidth={isCurrent ? 0.04 : 0}
      letterSpacing={isCurrent ? 0.04 : 0}
      outlineColor={color}
      characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/~ "
    >
      {text}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isCurrent ? 0.9 : isPast ? 0.2 : 0.7}
        transparent
        opacity={isCurrent ? 1.0 : isPast ? 0.5 : 0.8}
        side={THREE.FrontSide}
      />
    </Text>
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
        >
          {Math.ceil(countdownSeconds)}
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1.5}
            transparent
            opacity={1.0}
            side={THREE.DoubleSide}
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
            syncedData={syncedData}
            offset={offset}
            font={font}
            color={color}
            showCountdown={showCountdown}
            countdownSeconds={countdownSeconds}
          />
        );
      })}
    </group>
  );
}
