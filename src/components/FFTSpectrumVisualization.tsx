"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { LyricLine } from "@/lib/lyrics";
import Lyrics3D from "./Lyrics3D";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { OrbitControls } from "@react-three/drei";

interface FFTSpectrumVisualizationProps {
  micData?: MicrophoneData;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  isPlaying?: boolean;
}

function FFTSpectrumPlanes({ micData }: { micData?: MicrophoneData }) {
  const groupRef = useRef<THREE.Group>(null);

  // Grid configuration - similar to the original project
  const cols = 64; // Number of frequency bars
  const rows = 800; // Number of rows creating depth (more rows = longer wave)
  const spacingX = 0.45;
  const spacingZ = 0.5;

  // Create instanced mesh for thick lines using cylinders
  const { cylinderGeometry, instancedMeshes } = useMemo(() => {
    const sampleRate = 48000;
    const nyquist = sampleRate / 2;
    const binsPerBar = 1024 / cols;

    // Create a cylinder geometry for line segments (rotated to be vertical)
    const cylGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);

    // Create one instanced mesh per column
    const meshes: {
      mesh: THREE.InstancedMesh;
      baseColor: THREE.Color;
      col: number;
    }[] = [];

    for (let col = 0; col < cols; col++) {
      const centerFreq = (col * binsPerBar + binsPerBar / 2) * (nyquist / 1024);

      // Get base color based on frequency
      let r, g, b;
      if (centerFreq <= 250) {
        r = 1;
        g = 0.1;
        b = 0.3; // Red/Pink
      } else if (centerFreq <= 2000) {
        r = 1;
        g = 0.5;
        b = 0; // Orange
      } else if (centerFreq <= 8000) {
        r = 0.2;
        g = 1;
        b = 0.8; // Cyan
      } else {
        r = 0.3;
        g = 0.3;
        b = 1; // Blue
      }

      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(r, g, b),
        transparent: true,
      });

      const instancedMesh = new THREE.InstancedMesh(
        cylGeo,
        material,
        rows - 1 // One cylinder per segment (rows - 1 segments)
      );

      meshes.push({
        mesh: instancedMesh,
        baseColor: new THREE.Color(r, g, b),
        col,
      });
    }

    return { cylinderGeometry: cylGeo, instancedMeshes: meshes };
  }, [cols, rows, spacingX, spacingZ]);

  // Store frequency history for wave effect
  const frequencyHistory = useRef<number[][]>([]);
  const maxHistoryLength = rows;

  // Store positions for each point
  const positions = useRef<Float32Array>(new Float32Array(cols * rows * 3));

  // Initialize positions
  useMemo(() => {
    const pos = positions.current;
    let idx = 0;
    for (let col = 0; col < cols; col++) {
      const x = col * spacingX - (cols * spacingX) / 2;
      for (let row = 0; row < rows; row++) {
        const z = row * spacingZ;
        pos[idx++] = x;
        pos[idx++] = 0;
        pos[idx++] = z;
      }
    }
  }, [cols, rows, spacingX, spacingZ]);

  useFrame(() => {
    if (!micData?.frequencyData || !groupRef.current) return;

    const frequencyData = micData.frequencyData;
    const binsPerBar = Math.floor(frequencyData.length / cols);

    // Calculate bass intensity (first 12 bins for sub-bass/bass)
    let bassSum = 0;
    const bassBins = Math.min(12, frequencyData.length);
    for (let i = 0; i < bassBins; i++) {
      bassSum += frequencyData[i];
    }
    const bassIntensity = bassSum / (bassBins * 255);

    // Apply shake effect when bass hits hard (lower threshold: 0.4)
    if (bassIntensity > 0.6) {
      const shakeAmount = bassIntensity - 0.4; // Much stronger shake
      groupRef.current.position.x = (Math.random() - 0.5) * shakeAmount;
      groupRef.current.position.y = (Math.random() - 0.5) * shakeAmount;
      groupRef.current.position.z = (Math.random() - 0.5) * shakeAmount;
      groupRef.current.rotation.x = (Math.random() - 0.5) * shakeAmount * 0.1;
      groupRef.current.rotation.y = (Math.random() - 0.5) * shakeAmount * 0.1;
      groupRef.current.rotation.z = (Math.random() - 0.5) * shakeAmount * 0.15;
    } else {
      // Smoothly return to center
      groupRef.current.position.x *= 0.85;
      groupRef.current.position.y *= 0.85;
      groupRef.current.position.z *= 0.85;
      groupRef.current.rotation.x *= 0.85;
      groupRef.current.rotation.y *= 0.85;
      groupRef.current.rotation.z *= 0.85;
    }

    // Calculate current frequency values for all columns
    const currentFrequencies: number[] = [];
    for (let col = 0; col < cols; col++) {
      let sum = 0;
      const startBin = col * binsPerBar;
      const endBin = Math.min(startBin + binsPerBar, frequencyData.length);

      for (let j = startBin; j < endBin; j++) {
        sum += frequencyData[j];
      }
      const avgValue = sum / (endBin - startBin);
      currentFrequencies.push(avgValue / 255);
    }

    // Add current frequencies to history
    frequencyHistory.current.unshift(currentFrequencies);
    if (frequencyHistory.current.length > maxHistoryLength) {
      frequencyHistory.current.pop();
    }

    // Update positions based on frequency history
    const pos = positions.current;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const idx = (col * rows + row) * 3;
        const historyIndex = Math.min(row, frequencyHistory.current.length - 1);
        const normalizedValue =
          frequencyHistory.current[historyIndex]?.[col] || 0;

        const height = Math.max(0.1, normalizedValue * 8);
        pos[idx + 1] = height;
      }
    }

    // Update instanced meshes - create cylinders between consecutive points
    const dummy = new THREE.Object3D();
    const tempColor = new THREE.Color();

    instancedMeshes.forEach(({ mesh, baseColor, col }) => {
      for (let row = 0; row < rows - 1; row++) {
        const idx1 = (col * rows + row) * 3;
        const idx2 = (col * rows + row + 1) * 3;

        const x1 = pos[idx1];
        const y1 = pos[idx1 + 1];
        const z1 = pos[idx1 + 2];

        const x2 = pos[idx2];
        const y2 = pos[idx2 + 1];
        const z2 = pos[idx2 + 2];

        // Position cylinder between two points
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const midZ = (z1 + z2) / 2;

        dummy.position.set(midX, midY, midZ);

        // Calculate length and rotation
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Point cylinder from point1 to point2
        dummy.lookAt(x2, y2, z2);
        dummy.rotateX(Math.PI / 2);

        // Scale cylinder to match distance
        dummy.scale.set(1, length, 1);

        // Apply fade based on distance
        const fadeFactor = Math.pow(1 - row / rows, 3);
        tempColor.copy(baseColor).multiplyScalar(fadeFactor);

        dummy.updateMatrix();
        mesh.setMatrixAt(row, dummy.matrix);
        mesh.setColorAt(row, tempColor);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {instancedMeshes.map(({ mesh }, idx) => (
        <primitive key={idx} object={mesh} />
      ))}
    </group>
  );
}

export default function FFTSpectrumVisualization({
  micData,
  lyrics,
  currentTimeMs,
  isPlaying,
}: FFTSpectrumVisualizationProps) {
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
          background: "linear-gradient(to bottom, #000000 0%, #0a0020 100%)",
        }}
      >
        {/* Orbit Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
        />

        {/* FFT Spectrum grid - rotated 180 degrees so wave comes toward you, mirrored on X to fix RTL */}
        <group
          position={[0, -8, 10]}
          rotation={[0.3, Math.PI, 0]}
          scale={[-1.5, 1.5, 1.5]}
        >
          <FFTSpectrumPlanes micData={micData} />
          {/* Grid floor */}
          <gridHelper
            args={[80, 80, "#333344", "#111122"]}
            position={[0, -0.1, 0]}
          />
        </group>

        {/* 3D Lyrics - stays in normal position */}
        {lyrics && lyrics.length > 0 && (
          <Lyrics3D
            lyrics={lyrics}
            currentTimeMs={currentTimeMs || 0}
            micData={micData}
          />
        )}

        {/* Bloom effect for glow */}
        <EffectComposer>
          {/* <Bloom
            intensity={0.1}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.1}
            radius={0}
          /> */}
        </EffectComposer>
      </Canvas>
    </div>
  );
}
