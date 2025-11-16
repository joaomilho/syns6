"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import Lyrics3D from "./Lyrics3D";

interface VisualizationProps {
  isPlaying: boolean;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  micData?: MicrophoneData;
}

function ParticleField({ micData }: { micData?: MicrophoneData }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 2000;

  // Create particle positions
  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 10 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();

    // MIC DATA
    const micEnergy = micData?.energy || 0;
    const micVolume = micData?.volume || 0;
    const micBass = micData?.bass || 0;

    // Rotate based on mic - SUPER CHILL baseline, subtle mic boost
    const micSpinBoost = micEnergy * 2; // 0 to 2x with mic
    const rotationSpeed = 0.002 * (1 + micSpinBoost);
    pointsRef.current.rotation.y = time * rotationSpeed;
    pointsRef.current.rotation.x = time * rotationSpeed * 0.6;
    pointsRef.current.rotation.z = time * micBass * 0.3;

    // Scale with mic
    const micScale = 1 + micVolume * 0.4;
    pointsRef.current.scale.set(micScale, micScale, micScale);

    // Update particle positions for wave effect - SUBTLE baseline, EXPLOSIVE with mic
    const positionAttribute = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // Base wave motion - minimal
      const wave = Math.sin(time * 2 + i * 0.001) * 0.5;

      // MIC WAVE - creates subtle particle movement
      const micWave = Math.sin(time * 5 + i * 0.02) * micEnergy * 1;
      const micBassWave = Math.cos(time * 3 + i * 0.03) * micBass * 0.7;

      positionAttribute.setXYZ(
        i,
        x + wave + micWave,
        y + wave + micBassWave,
        z + wave + micWave
      );
    }

    positionAttribute.needsUpdate = true;
  });

  // Simple color based on mic
  const color = useMemo(() => {
    return new THREE.Color(0.6, 0.6, 1.0); // Blue-ish
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CenterSphere({ micData }: { micData?: MicrophoneData }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();

    // MIC DATA
    const micEnergy = micData?.energy || 0;
    const micVolume = micData?.volume || 0;

    // Rotate - subtle mic boost
    const micSpinBoost = 1 + micEnergy * 0.8;
    meshRef.current.rotation.y += 0.015 * micSpinBoost;
    meshRef.current.rotation.x += 0.008 * micSpinBoost;

    // Pulsate with mic
    const basePulse = 1 + Math.sin(time * 3) * 0.2;
    const micPulse = 1 + micVolume * 0.3;
    const scale = basePulse * micPulse;

    meshRef.current.scale.set(scale, scale, scale);

    // Color shift based on time
    const hue = (time * 0.1) % 1;
    materialRef.current.color.setHSL(hue, 1, 0.5);
    materialRef.current.emissive.setHSL(hue, 1, 0.2);
    materialRef.current.emissiveIntensity = 0.3 + micEnergy * 0.5;
  });

  return (
    <mesh ref={meshRef}>
      <dodecahedronGeometry args={[3, 0]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#ff00ff"
        emissive="#ff00ff"
      />
    </mesh>
  );
}

function WireframeRings({ micData }: { micData?: MicrophoneData }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // MIC DATA
    const micEnergy = micData?.energy || 0;
    const micTreble = micData?.treble || 0;

    // Rotate - subtle mic boost
    const micSpinBoost = 1 + micEnergy * 0.8;
    groupRef.current.rotation.z = time * 0.6 * micSpinBoost;
    groupRef.current.rotation.x =
      Math.sin(time * 0.7) * 0.6 * (1 + micTreble * 0.4);

    // Scale with mic
    const micPulse = 1 + micEnergy * 0.25;
    groupRef.current.scale.setScalar(micPulse);
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8, 0.2, 16, 100]} />
        <meshBasicMaterial color="#00ffff" wireframe />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[8, 0.2, 16, 100]} />
        <meshBasicMaterial color="#ff00ff" wireframe />
      </mesh>
      <mesh>
        <torusGeometry args={[8, 0.2, 16, 100]} />
        <meshBasicMaterial color="#ffff00" wireframe />
      </mesh>
    </group>
  );
}

export default function MusicVisualization({
  isPlaying,
  lyrics,
  currentTimeMs,
  micData,
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
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{
          background: "radial-gradient(circle, #0a0a0a 0%, #000000 100%)",
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight
          position={[-10, -10, -10]}
          color="#ff00ff"
          intensity={0.5}
        />

        <ParticleField micData={micData} />
        <CenterSphere micData={micData} />
        <WireframeRings micData={micData} />

        {/* 3D Lyrics - always show, component handles "not found" */}
        {currentTimeMs !== undefined && (
          <Lyrics3D
            lyrics={lyrics || null}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            syncedData={null}
            micData={micData}
          />
        )}

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={15}
          maxDistance={50}
          autoRotate={false}
          autoRotateSpeed={0}
        />
      </Canvas>
    </div>
  );
}
