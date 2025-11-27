"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, MeshDistortMaterial } from "@react-three/drei";
import { Vector3, Mesh, PointLight, MeshStandardMaterial, CylinderGeometry, Color, InstancedMesh, Object3D, Group } from "three";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

interface VisualizationProps {
  micData?: MicrophoneData;
  fps?: number;
}

// Camera shake component
export function CameraShake({ micData }: { micData?: MicrophoneData }) {
  const { camera } = useThree();
  const originalPosition = useRef(new Vector3(0, 0, 30));
  const shakeIntensity = useRef(0);

  useFrame(() => {
    const bass = micData?.bass || 0;
    
    // Smooth shake intensity with more dampening
    shakeIntensity.current = shakeIntensity.current * 0.9 + bass * 0.1;
    
    // Apply subtle shake
    if (shakeIntensity.current > 0.01) {
      const shake = shakeIntensity.current * 0.3; // Reduced from 2 to 0.3
      camera.position.x = originalPosition.current.x + (Math.random() - 0.5) * shake;
      camera.position.y = originalPosition.current.y + (Math.random() - 0.5) * shake;
      camera.position.z = originalPosition.current.z + (Math.random() - 0.5) * shake * 0.3;
    } else {
      camera.position.lerp(originalPosition.current, 0.15);
    }
  });

  return null;
}

// Frequency band circle - follows its orbital ring
function FrequencyCircle({ 
  index, 
  total, 
  micData,
  ringPositions,
  useDistortion = true
}: { 
  index: number; 
  total: number; 
  micData?: MicrophoneData;
  ringPositions: React.MutableRefObject<Map<number, Float32Array>>;
  useDistortion?: boolean;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<any>(null);

  // Get the frequency band for this circle
  const getFrequencyIntensity = () => {
    if (!micData?.frequencyData) return 0;
    
    const numBins = micData.frequencyData.length;
    const bandSize = Math.floor(numBins / total);
    const startIdx = index * bandSize;
    const endIdx = Math.min(startIdx + bandSize, numBins);
    
    // Average the frequency band
    let sum = 0;
    for (let i = startIdx; i < endIdx; i++) {
      sum += micData.frequencyData[i];
    }
    return (sum / (endIdx - startIdx)) / 255; // Normalize to 0-1
  };

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();
    const intensity = getFrequencyIntensity();
    
    // Get the ring positions for this band
    const positions = ringPositions.current.get(index);
    if (positions) {
      const segments = positions.length / 3;
      
      // Orbital speed varies by band
      const orbitSpeed = 0.5 + (index / total) * 0.5;
      const angle = time * orbitSpeed + (index / total) * Math.PI * 2;
      
      // Map angle to segment index (0 to segments-1)
      const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const segmentFloat = (normalizedAngle / (Math.PI * 2)) * segments;
      const segment = Math.floor(segmentFloat) % segments;
      
      // Get position from the ring at this segment
      const idx = segment * 3;
      meshRef.current.position.x = positions[idx];
      meshRef.current.position.y = positions[idx + 1];
      meshRef.current.position.z = positions[idx + 2];
    }
    
    // Size varies with intensity - MORE dramatic
    const size = 0.8 + intensity * 2;
    meshRef.current.scale.set(size, size, size);
    
    // Color shifts based on frequency band and intensity
    const hue = (index / total);
    const saturation = 0.8 + intensity * 0.2;
    const lightness = 0.3 + intensity * 0.5;
    
    materialRef.current.color.setHSL(hue, saturation, lightness);
    materialRef.current.emissive.setHSL(hue, saturation, lightness * 0.5);
    materialRef.current.emissiveIntensity = 0.5 + intensity * 3;
    
    // Rotation - faster with intensity
    meshRef.current.rotation.x += 0.02 * (1 + intensity * 2);
    meshRef.current.rotation.y += 0.03 * (1 + intensity * 2);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 2]} />
      {useDistortion ? (
        <MeshDistortMaterial
          ref={materialRef}
          color="#ff00ff"
          emissive="#ff00ff"
          distort={0.3}
          speed={1.5}
          roughness={0.1}
          metalness={1.0}
        />
      ) : (
        <meshStandardMaterial
          ref={materialRef}
          color="#ff00ff"
          emissive="#ff00ff"
          roughness={0.1}
          metalness={1.0}
        />
      )}
    </mesh>
  );
}

// Multiple frequency circles
export function FrequencyCircles({ 
  micData,
  ringPositions,
  fps = 60
}: { 
  micData?: MicrophoneData;
  ringPositions: React.MutableRefObject<Map<number, Float32Array>>;
  fps?: number;
}) {
  const circleCount = 16; // Number of frequency bands
  
  // Disable distortion if FPS is low
  const useDistortion = fps > 50;

  return (
    <group>
      {Array.from({ length: circleCount }).map((_, i) => (
        <FrequencyCircle
          key={i}
          index={i}
          total={circleCount}
          micData={micData}
          ringPositions={ringPositions}
          useDistortion={useDistortion}
        />
      ))}
    </group>
  );
}

// Center core that reacts to overall energy
export function CenterCore({ micData }: { micData?: MicrophoneData }) {
  const meshRef = useRef<Mesh>(null);
  const pointLightRef = useRef<PointLight>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const bass = micData?.bass || 0;
    const energy = micData?.energy || 0;

    // Pulse with music
    const scale = 1 + bass * 0.8 + energy * 0.3;
    meshRef.current.scale.setScalar(scale);

    // Rotate slowly
    meshRef.current.rotation.x = time * 0.2;
    meshRef.current.rotation.y = time * 0.3;

    // Change color with energy
    const material = meshRef.current.material as MeshStandardMaterial;
    const hue = (time * 0.1 + energy * 0.5) % 1;
    material.color.setHSL(hue, 0.8, 0.5);
    material.emissive.setHSL(hue, 0.8, 0.3);

    // Emissive intensity based on energy
    material.emissiveIntensity = 0.5 + energy * 0.5;

    // Update point light at sphere center
    if (pointLightRef.current) {
      pointLightRef.current.color.setHSL(hue, 1.0, 0.5);
      pointLightRef.current.intensity = 50 + energy * 50;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[3, 3]} />
        <meshStandardMaterial
          metalness={0.9}
          roughness={0.1}
          emissiveIntensity={0.5}
        />
      </mesh>
      <pointLight
        ref={pointLightRef}
        position={[0, 0, 0]}
        intensity={50}
        decay={2}
      />
    </group>
  );
}

// Single orbital ring that shows frequency band history in a circle using cylinders
function OrbitalRing({ 
  index, 
  total, 
  baseRadius, 
  micData,
  bandHistory,
  ringPositions,
  segments
}: { 
  index: number; 
  total: number; 
  baseRadius: number; 
  micData?: MicrophoneData;
  bandHistory: React.MutableRefObject<number[][]>;
  ringPositions: React.MutableRefObject<Map<number, Float32Array>>;
  segments: number;
}) {
  
  // Store positions for each point around the circle
  const positions = useRef(new Float32Array(segments * 3));
  
  // Share positions with planets
  useEffect(() => {
    ringPositions.current.set(index, positions.current);
    return () => {
      ringPositions.current.delete(index);
    };
  }, [index, ringPositions]);
  
  // Create instanced mesh for cylinders
  const instancedMesh = useMemo(() => {
    const geometry = new CylinderGeometry(0.08, 0.08, 1, 8); // Thicker cylinders
    const hue = index / total;
    const color = new Color().setHSL(hue, 0.8, 0.5);
    const material = new MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.7,
    });
    const mesh = new InstancedMesh(geometry, material, segments);
    return mesh;
  }, [index, total, segments]);

  const dummy = useRef(new Object3D());
  const tempColor = useRef(new Color());

  useFrame(() => {
    if (!micData?.frequencyData) return;

    const history = bandHistory.current;
    const pos = positions.current;
    
    // Update positions based on history
    for (let i = 0; i < segments; i++) {
      const historyIndex = Math.min(i, history.length - 1);
      const intensity = history[historyIndex]?.[index] || 0;
      
      // Calculate HEIGHT variation based on intensity
      const height = intensity * 8;
      
      const angle = (i / segments) * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * baseRadius;
      pos[i * 3 + 1] = height;
      pos[i * 3 + 2] = Math.sin(angle) * baseRadius;
    }
    
    // Create cylinders between consecutive points
    const dummyObj = dummy.current;
    const tempColorObj = tempColor.current;
    const hue = index / total;
    const baseColor = new Color().setHSL(hue, 0.8, 0.5);
    
    for (let i = 0; i < segments - 1; i++) {
      const idx1 = i * 3;
      const idx2 = (i + 1) * 3;
      
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
      
      dummyObj.position.set(midX, midY, midZ);
      
      // Calculate length and rotation
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dz = z2 - z1;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      // Point cylinder from point1 to point2
      dummyObj.lookAt(x2, y2, z2);
      dummyObj.rotateX(Math.PI / 2);
      
      // Scale cylinder to match distance
      dummyObj.scale.set(1, length, 1);
      
      // Color intensity based on height
      const intensity = Math.max(y1, y2) / 8;
      const lightness = 0.3 + intensity * 0.5;
      tempColorObj.setHSL(hue, 0.8, lightness);
      
      dummyObj.updateMatrix();
      instancedMesh.setMatrixAt(i, dummyObj.matrix);
      instancedMesh.setColorAt(i, tempColorObj);
    }
    
    // Connect last point to first to close the circle
    const idx1 = (segments - 1) * 3;
    const idx2 = 0;
    
    const x1 = pos[idx1];
    const y1 = pos[idx1 + 1];
    const z1 = pos[idx1 + 2];
    
    const x2 = pos[idx2];
    const y2 = pos[idx2 + 1];
    const z2 = pos[idx2 + 2];
    
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const midZ = (z1 + z2) / 2;
    
    dummyObj.position.set(midX, midY, midZ);
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    dummyObj.lookAt(x2, y2, z2);
    dummyObj.rotateX(Math.PI / 2);
    dummyObj.scale.set(1, length, 1);
    
    const intensity = Math.max(y1, y2) / 8;
    const lightness = 0.3 + intensity * 0.5;
    tempColorObj.setHSL(hue, 0.8, lightness);
    
    dummyObj.updateMatrix();
    instancedMesh.setMatrixAt(segments - 1, dummyObj.matrix);
    instancedMesh.setColorAt(segments - 1, tempColorObj);
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
  });

  return <primitive object={instancedMesh} />;
}

// Orbital paths visualization - shows frequency band history in circles
export function OrbitalPaths({ 
  micData,
  ringPositions,
  fps = 60
}: { 
  micData?: MicrophoneData;
  ringPositions: React.MutableRefObject<Map<number, Float32Array>>;
  fps?: number;
}) {
  const groupRef = useRef<Group>(null);
  const circleCount = 16; // Number of frequency bands
  
  // Dynamic segments based on FPS
  const [segments, setSegments] = React.useState(64); // Start moderate
  
  // Track FPS history for stable averaging
  const fpsHistory = useRef<number[]>([]);
  const lastAdjustTime = useRef<number>(0);
  
  // Adjust segments based on FPS
  useEffect(() => {
    if (fps <= 0) return;
    
    const now = Date.now();
    
    // Add to history
    fpsHistory.current.push(fps);
    if (fpsHistory.current.length > 30) {
      fpsHistory.current.shift();
    }
    
    // Only adjust every 2 seconds
    if (now - lastAdjustTime.current < 2000) return;
    if (fpsHistory.current.length < 10) return;
    
    // Calculate average FPS
    const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
    
    // Adjust segments based on FPS
    if (avgFps < 45 && segments > 16) {
      // Struggling - reduce segments
      const newSegments = Math.max(16, Math.floor(segments * 0.75));
      console.log(`⬇️ FPS too low (${avgFps.toFixed(1)}), reducing segments: ${segments} → ${newSegments}`);
      setSegments(newSegments);
      lastAdjustTime.current = now;
      fpsHistory.current = [];
    } else if (avgFps > 55 && segments < 128) {
      // Doing well - can increase quality
      const newSegments = Math.min(128, Math.floor(segments * 1.25));
      console.log(`⬆️ FPS good (${avgFps.toFixed(1)}), increasing segments: ${segments} → ${newSegments}`);
      setSegments(newSegments);
      lastAdjustTime.current = now;
      fpsHistory.current = [];
    }
  }, [fps, segments]);
  
  const maxHistoryLength = segments; // Match history to segments
  
  // History buffer: array of frequency snapshots [newest...oldest]
  // Each snapshot is an array of frequency band values
  const bandHistory = useRef<number[][]>([]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const treble = micData?.treble || 0;

    // Calculate current frequency values for all bands
    if (micData?.frequencyData) {
      const frequencyData = micData.frequencyData;
      const currentBands: number[] = [];
      
      for (let i = 0; i < circleCount; i++) {
        const numBins = frequencyData.length;
        const bandSize = Math.floor(numBins / circleCount);
        const startIdx = i * bandSize;
        const endIdx = Math.min(startIdx + bandSize, numBins);
        
        // Average the frequency band
        let sum = 0;
        for (let j = startIdx; j < endIdx; j++) {
          sum += frequencyData[j];
        }
        const intensity = (sum / (endIdx - startIdx)) / 255;
        currentBands.push(intensity);
      }
      
      // Add to history (newest at front)
      bandHistory.current.unshift(currentBands);
      if (bandHistory.current.length > maxHistoryLength) {
        bandHistory.current.pop();
      }
    }

    // Slow rotation
    groupRef.current.rotation.y = time * 0.1;
    groupRef.current.rotation.x = Math.sin(time * 0.2) * 0.2 * (1 + treble * 0.5);
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: circleCount }).map((_, i) => {
        const radius = 8 + (i / circleCount) * 30; // Increased spacing: 8-38 instead of 5-20
        return (
          <OrbitalRing
            key={`${i}-${segments}`} // Re-create when segments change
            index={i}
            total={circleCount}
            baseRadius={radius}
            micData={micData}
            bandHistory={bandHistory}
            ringPositions={ringPositions}
            segments={segments}
          />
        );
      })}
    </group>
  );
}

function SceneContent({
  micData,
  fps = 60,
}: VisualizationProps) {
  // Shared positions map so planets can follow their rings
  const ringPositions = useRef(new Map<number, Float32Array>());

  return (
    <>
      <CameraShake micData={micData} />
      
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight
        position={[-10, -10, -10]}
        color="#ff00ff"
        intensity={0.5}
      />

      {/* Orbital path guides - must render first to create positions */}
      <OrbitalPaths micData={micData} ringPositions={ringPositions} fps={fps} />
      
      {/* Frequency circles orbiting - follow the rings */}
      <FrequencyCircles micData={micData} ringPositions={ringPositions} fps={fps} />
      
      {/* Center core */}
      <CenterCore micData={micData} />

      {/* 3D Lyrics - positioned closer to camera */}
      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={20}
        maxDistance={80}
        autoRotate={false}
        autoRotateSpeed={0}
      />
    </>
  );
}

export default function OrbitalVisualization({
  micData,
  fps = 60,
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
        camera={{ position: [0, 0, 40], fov: 80 }}
        style={{
          background: "radial-gradient(circle, #0a0a0a 0%, #000000 100%)",
        }}
        dpr={1}
      >
        <SceneContent
          micData={micData}
          fps={fps}
        />
      </Canvas>
    </div>
  );
}
