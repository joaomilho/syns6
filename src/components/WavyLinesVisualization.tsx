"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Line, LineBasicMaterial, Points, PointsMaterial, Vector3 } from "three";
import { SyncedAudioData } from "@/lib/audioSync";

// Camera shake component
function CameraShake({ micData }: { micData?: MicrophoneData }) {
  const { camera } = useThree();
  const originalPosition = useRef(new Vector3(0, 0, 25));
  const shakeIntensity = useRef(0);

  useFrame(() => {
    const bass = micData?.bass || 0;
    
    // Smooth shake intensity with dampening
    shakeIntensity.current = shakeIntensity.current * 0.9 + bass * 0.1;
    
    // Apply subtle shake
    if (shakeIntensity.current > 0.01) {
      const shake = shakeIntensity.current * 0.3;
      camera.position.x = originalPosition.current.x + (Math.random() - 0.5) * shake;
      camera.position.y = originalPosition.current.y + (Math.random() - 0.5) * shake;
      camera.position.z = originalPosition.current.z + (Math.random() - 0.5) * shake * 0.3;
    } else {
      camera.position.lerp(originalPosition.current, 0.15);
    }
  });

  return null;
}

interface AudioFeatures {
  energy: number;
  tempo: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

interface WavyLinesControls {
  numLines: number;
  colorPalette: 'default' | 'neon' | 'sunset' | 'forest' | 'candy';
  particleCount: number;
}

interface VisualizationProps {
  audioFeatures?: AudioFeatures | null;
  syncedData?: SyncedAudioData | null;
  energy?: number;
  volume?: number;
  bass?: number;
  drums?: number;
  vocalStrength?: number;
  wavyLinesControls?: WavyLinesControls;
}

// Get colors for palette - defines ONLY the "activated" target colors
// All lines start at BLUE (0.6-0.7), palette controls where they go when activated
function getWavyLinesPalette(palette: string): { bass: number, vocal: number, drums: number } {
  const palettes: Record<string, { bass: number, vocal: number, drums: number }> = {
    default: { bass: 0, vocal: 0.65, drums: 0.15 }, // ORIGINAL: Red, DarkBlue, Orange
    neon: { bass: 0.9, vocal: 0.5, drums: 0.15 }, // Magenta, Cyan, Yellow
    sunset: { bass: 0.08, vocal: 0.12, drums: 0.03 }, // Orange, Yellow, RedOrange
    forest: { bass: 0.3, vocal: 0.45, drums: 0.5 }, // Greens
    candy: { bass: 0.9, vocal: 0.55, drums: 0.13 }, // Pink, Cyan, Gold
  };
  return palettes[palette] || palettes.default;
}

function WavyLine({
  yPosition,
  zPosition,
  audioFeatures,
  syncedData,
  offset,
  energy = 0,
  volume = 0,
  bass = 0,
  drums = 0,
  vocalStrength = 0,
  instrumentType = "bass",
  paletteColors,
  colorPalette = 'default',
}: {
  yPosition: number;
  zPosition: number;
  audioFeatures: AudioFeatures | null;
  syncedData: SyncedAudioData | null;
  offset: number;
  energy?: number;
  volume?: number;
  bass?: number;
  drums?: number;
  vocalStrength?: number;
  instrumentType?: "bass" | "vocal" | "drums";
  paletteColors: { bass: number, vocal: number, drums: number };
  colorPalette?: string;
}) {
  const lineRef = useRef<Line | null>(null);
  const materialRef = useRef<LineBasicMaterial | null>(null);
  const pointCount = 200;

  // Create line geometry and material
  const [line, geometry, material] = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const x = (i / pointCount) * 60 - 30; // -30 to 30 (left to right)
      positions[i * 3] = x;
      positions[i * 3 + 1] = yPosition;
      positions[i * 3 + 2] = zPosition;
    }

    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    
    const material = new LineBasicMaterial({
      color: "#6666ff",
      transparent: true,
      opacity: 0.6,
    });
    
    const line = new Line(geometry, material);
    return [line, geometry, material];
  }, [yPosition, zPosition]);
  
  // Set refs after line is created
  lineRef.current = line;
  materialRef.current = material;

  useFrame((state) => {
    if (!lineRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const tempo = audioFeatures?.tempo || 120;

    // ENHANCED: Use ALL the new synced data!
    const loudness = syncedData?.interpolatedLoudness || 0.5;
    const beatIntensity = syncedData?.beatIntensity || 1.0;
    const timbreEnergy = syncedData?.timbreEnergy || 0.5;
    const anticipation = syncedData?.anticipation || 0;

    // MIC DATA - instrument-specific (now passed as props)

    // Get instrument-specific intensity
    let instrumentIntensity = 0;
    let micBoost = 0;
    
    switch (instrumentType) {
      case "bass":
        // Bass reacts to OVERALL energy + bass specifically
        instrumentIntensity = energy + bass;
        micBoost = bass + volume;
        break;
      case "drums":
        instrumentIntensity = drums;
        micBoost = drums;
        break;
      case "vocal":
        instrumentIntensity = vocalStrength;
        micBoost = vocalStrength;
        break;
    }

    // Beat pulse - more reactive
    const onBeatMultiplier = syncedData?.isOnBeat ? 2.0 : 1.0;
    const beatDecay = Math.pow(1 - (syncedData?.beatProgress || 0), 2);
    const beatPulse = 1 + (onBeatMultiplier - 1) * beatDecay;

    // Anticipation effect
    const anticipationBoost = 1 + anticipation * 0.4;

    // Instrument-specific wave boost - more reactive
    const instrumentWaveBoost = 1 + instrumentIntensity * 1.2;

    // Calculate wave intensity - GUARANTEE minimum movement
    const baseWaveAmount = (tempo / 100) * 0.8;
    const musicIntensity = energy * loudness * beatPulse * anticipationBoost * instrumentWaveBoost;
    
    // Always have at least 1.0 wave intensity, scale up with music
    const waveIntensity = Math.max(1.0, baseWaveAmount + musicIntensity * 3);

    // Update line positions to create waves
    const positionAttribute = lineRef.current.geometry.attributes.position;

    for (let i = 0; i < pointCount; i++) {
      const x = (i / pointCount) * 60 - 30;
      
      // Multiple wave frequencies - calm baseline, reactive with music
      const wave1 = Math.sin(x * 0.3 + time * 1 + offset) * waveIntensity * 2.5;
      const wave2 = Math.sin(x * 0.5 - time * 0.8 + offset * 2) * waveIntensity * 1.5;
      const wave3 = Math.sin(x * 0.8 + time * 1.2 + offset * 1.5) * waveIntensity * 1;
      
      // Add beat pulse directly to y position
      const beatWave = syncedData?.isOnBeat ? Math.sin(x * 0.2) * beatPulse * 1 : 0;
      
      const y = yPosition + wave1 + wave2 + wave3 + beatWave;

      positionAttribute.setXYZ(i, x, y, zPosition);
    }

    positionAttribute.needsUpdate = true;

    // Color based on instrument type - ALL START BLUE, palette defines activated colors
    let intensity, clampedIntensity, hue, saturation, lightness;
    
    switch (instrumentType) {
      case "bass":
        // ALL BASS LINES START BLUE (0.7) → Activated color from palette
        intensity = energy * loudness * beatPulse * (1 + anticipation);
        clampedIntensity = Math.min(1, intensity);
        
        const bassStart = 0.7; // Always start at blue
        const bassEnd = paletteColors.bass; // Palette defines activated color
        const micRedForce = volume * 3;
        const baseHue = bassStart - clampedIntensity * (bassStart - bassEnd);
        hue = volume > 0.1 ? Math.max(bassEnd, bassEnd - micRedForce) : baseHue; // MIC OVERRIDES!
        saturation = 0.7 + clampedIntensity * 0.3 + energy * 0.3;
        lightness = 0.35 + clampedIntensity * 0.45 + volume * 0.4;
        break;
        
      case "vocal":
        // ALL VOCAL LINES START BLUE (0.6) → Activated color from palette
        intensity = (vocalStrength + energy * 0.3) * loudness;
        clampedIntensity = Math.min(1, intensity);
        const vocalStart = 0.6; // Always start at blue
        const vocalEnd = paletteColors.vocal; // Palette defines activated color
        hue = vocalStart + clampedIntensity * (vocalEnd - vocalStart);
        saturation = 0.8 + clampedIntensity * 0.2;
        lightness = 0.5 - clampedIntensity * 0.3; // Gets darker
        break;
        
      case "drums":
        // ALL DRUM LINES START BLUE (0.6) → Activated color from palette
        intensity = (drums + energy * 0.3) * loudness * beatPulse;
        clampedIntensity = Math.min(1, intensity);
        const drumStart = 0.6; // Always start at blue
        const drumEnd = paletteColors.drums; // Palette defines activated color
        hue = drumStart - clampedIntensity * (drumStart - drumEnd);
        saturation = 0.8 + clampedIntensity * 0.2;
        lightness = 0.45 + clampedIntensity * 0.4;
        break;
    }

    materialRef.current.color.setHSL(hue, saturation, lightness);
    materialRef.current.opacity = 0.5 + clampedIntensity * 0.45 + micBoost * 0.2;
  });

  return <primitive object={line} />;
}

export function WavyLineField({ 
  audioFeatures, 
  syncedData, 
  energy,
  volume,
  bass,
  drums,
  vocalStrength,
  wavyLinesControls,
}: VisualizationProps) {
  const linesPerSet = wavyLinesControls?.numLines ?? 60; // Configurable number of lines
  const colorPalette = wavyLinesControls?.colorPalette ?? 'default';
  const paletteColors = getWavyLinesPalette(colorPalette);
  
  // Original bass-reactive waves (Blue → Red) - main layer
  const bassLines = useMemo(() => {
    return Array.from({ length: linesPerSet }, (_, i) => ({
      key: `bass-${i}`,
      yPosition: (i / linesPerSet) * 25 - 12.5,
      zPosition: -5 + (i / linesPerSet) * 10, // Center layer
      offset: i * 0.1,
      type: "bass" as const,
    }));
  }, [linesPerSet]);

  // Vocal waves (Blue → Dark Blue) - back layer
  const vocalLines = useMemo(() => {
    return Array.from({ length: linesPerSet }, (_, i) => ({
      key: `vocal-${i}`,
      yPosition: (i / linesPerSet) * 25 - 12.5,
      zPosition: -10 + (i / linesPerSet) * 8, // Further back
      offset: i * 0.08 + 1,
      type: "vocal" as const,
    }));
  }, [linesPerSet]);

  // Drum waves (Blue → Yellow → Orange) - front layer
  const drumLines = useMemo(() => {
    return Array.from({ length: linesPerSet }, (_, i) => ({
      key: `drum-${i}`,
      yPosition: (i / linesPerSet) * 25 - 12.5,
      zPosition: 2 + (i / linesPerSet) * 8, // Front
      offset: i * 0.12 + 2,
      type: "drums" as const,
    }));
  }, [linesPerSet]);

  const allLines = [...vocalLines, ...bassLines, ...drumLines];

  return (
    <>
      {allLines.map((line) => (
        <WavyLine
          key={line.key}
          yPosition={line.yPosition}
          zPosition={line.zPosition}
          audioFeatures={audioFeatures || null}
          syncedData={syncedData || null}
          offset={line.offset}
          energy={energy}
          volume={volume}
          bass={bass}
          drums={drums}
          vocalStrength={vocalStrength}
          instrumentType={line.type}
          paletteColors={paletteColors}
          colorPalette={colorPalette}
        />
      ))}
    </>
  );
}

// Particle accents that move left to right
export function FlowingParticles({ audioFeatures, syncedData, wavyLinesControls }: VisualizationProps) {
  const pointsRef = useRef<Points>(null);
  const particleCount = wavyLinesControls?.particleCount ?? 500;

  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = Math.random() * 60 - 30; // x: -30 to 30
      positions[i * 3 + 1] = Math.random() * 30 - 15; // y: -15 to 15
      positions[i * 3 + 2] = Math.random() * 15 - 5; // z: -5 to 10
    }
    return positions;
  }, [particleCount]);

  const velocities = useMemo(() => {
    return new Float32Array(particleCount).fill(0).map(() => Math.random() * 0.5 + 0.5);
  }, [particleCount]);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const energy = audioFeatures?.energy || 0.5;
    const loudness = syncedData?.interpolatedLoudness || 0.5;
    const beatPulse = syncedData?.isOnBeat ? 2.0 : 1.0;

    // MUCH faster speed with beats
    const speed = 0.2 * energy * loudness * beatPulse;

    const positionAttribute = pointsRef.current.geometry.attributes.position;

    for (let i = 0; i < particleCount; i++) {
      let x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      // Move left to right - FASTER
      x += speed * velocities[i];

      // Wrap around when reaching right edge
      if (x > 30) {
        x = -30;
      }

      positionAttribute.setXYZ(i, x, y, z);
    }

    positionAttribute.needsUpdate = true;

    // Color matches wave intensity - MORE DRAMATIC
    const material = pointsRef.current.material as PointsMaterial;
    const intensity = Math.min(1, energy * loudness * beatPulse);
    const hue = 0.7 - intensity * 0.7;
    material.color.setHSL(hue, 0.9, 0.6 + intensity * 0.3);
    material.opacity = 0.4 + intensity * 0.5;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#6666ff"
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={AdditiveBlending}
      />
    </points>
  );
}

export default function WavyLinesVisualization({
  audioFeatures,
  syncedData,
  energy,
  volume,
  bass,
  drums,
  vocalStrength,
}: VisualizationProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 25], fov: 75 }}
        style={{ background: "linear-gradient(to bottom, #0a0015 0%, #000000 100%)" }}
        dpr={1}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 20]} intensity={0.5} color="#6666ff" />

        <WavyLineField 
          audioFeatures={audioFeatures || null} 
          syncedData={syncedData || null}
          energy={energy}
          volume={volume}
          bass={bass}
          drums={drums}
          vocalStrength={vocalStrength}
        />
        <FlowingParticles audioFeatures={audioFeatures || null} syncedData={syncedData || null} />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={10}
          maxDistance={50}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

