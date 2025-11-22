"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { LyricLine } from "@/lib/lyrics";
import Lyrics3D from "./Lyrics3D";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { calculateBassIntensity } from "@/lib/audioAnalysis";

interface FFTSpectrumVisualizationProps {
  micData?: MicrophoneData;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  isPlaying?: boolean;
  fps?: number;
  onRowsChange?: (rows: number) => void;
  isLandingPage?: boolean;
}


/**
 * Calculate target row count based on FPS
 * Goal: Maintain 60 FPS
 * - If FPS < 60: Reduce rows to improve performance
 * - If FPS >= 60: Can increase rows (up to 800 max)
 */
function calculateTargetRows(fps: number, currentRows: number): number {
  const TARGET_FPS = 60;
  const MIN_ROWS = 100;
  const MAX_ROWS = 800;
  
  if (fps >= TARGET_FPS) {
    // FPS is good, we can increase rows towards maximum
    // Gradually increase based on how much above 60 we are
    const excessFPS = fps - TARGET_FPS;
    const maxIncrease = Math.min(MAX_ROWS - currentRows, excessFPS * 10); // 10 rows per FPS above 60
    return Math.min(MAX_ROWS, currentRows + maxIncrease);
  } else {
    // FPS is below target, REDUCE rows to improve performance
    // Reduce more aggressively the further below 60 we are
    const fpsDeficit = TARGET_FPS - fps;
    const reductionFactor = fpsDeficit / TARGET_FPS; // 0 to 1, how far below target
    const reduction = Math.max(50, currentRows * reductionFactor * 0.3); // Reduce by up to 30% of current
    return Math.max(MIN_ROWS, currentRows - reduction);
  }
}

function FFTSpectrumPlanes({ 
  micData, 
  fps = 60,
  onRowsChange,
  bassIntensity,
  isLandingPage

}: { 
  micData?: MicrophoneData; 
  fps?: number;
  onRowsChange?: (rows: number) => void;
  bassIntensity?: number;
  isLandingPage?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Dynamic row count based on FPS - start with low rows that work well
  const [rows, setRows] = useState(200); // Start low (user confirmed 100-200 works at 60fps)
  
  // Notify parent when rows change
  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);
  
  // Track FPS history for stable averaging (avoid reacting to temporary spikes/drops)
  const fpsHistory = useRef<number[]>([]);
  const lastRowChangeTime = useRef<number>(0);
  const isChangingRows = useRef<boolean>(false);
  
  // Update rows based on FPS with debouncing and averaging
  useEffect(() => {
    if (fps <= 0) return;
    
    // Add to history (keep last 5 seconds of FPS readings)
    fpsHistory.current.push(fps);
    if (fpsHistory.current.length > 5) {
      fpsHistory.current.shift();
    }
    
    // Only proceed if we have enough history and haven't changed recently
    const now = Date.now();
    const timeSinceLastChange = now - lastRowChangeTime.current;
    const minTimeBetweenChanges = 3000; // Wait at least 3 seconds between changes
    
    if (fpsHistory.current.length < 3 || timeSinceLastChange < minTimeBetweenChanges) {
      return; // Not enough data or too soon after last change
    }
    
    // Calculate average FPS over history
    const avgFPS = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
    
    // Calculate target rows based on FPS
    // If FPS < 60: reduce rows, if FPS >= 60: can increase rows
    const targetRows = isLandingPage ? 100 : calculateTargetRows(avgFPS, rows);
    const rowDiff = Math.abs(targetRows - rows);
    
    // Only change if difference is substantial (at least 100 rows) and sustained
    // This prevents constant recreation which causes the performance issue
    // Be more aggressive when reducing (FPS < 60) - reduce even with smaller differences
    const minDiff = avgFPS < 60 ? 50 : 150;
    if (rowDiff >= minDiff && !isChangingRows.current) {
      isChangingRows.current = true;
      lastRowChangeTime.current = now;
      
      // Update rows
      setRows(targetRows);
      
      // Reset flag after a delay (mesh recreation takes time)
      setTimeout(() => {
        isChangingRows.current = false;
      }, 1000);
    }
  }, [fps, rows]);
  
  // Reuse objects outside useFrame to avoid allocations every frame
  const dummy = useRef(new THREE.Object3D());
  const tempColor = useRef(new THREE.Color());

  // Grid configuration - similar to the original project
  const cols = 64; // Number of frequency bars
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

  // Store positions for each point - resize when rows change
  const positions = useRef<Float32Array>(new Float32Array(cols * rows * 3));
  
  // Initialize/resize positions when rows change
  useMemo(() => {
    // Resize positions array if needed
    const requiredSize = cols * rows * 3;
    if (positions.current.length !== requiredSize) {
      positions.current = new Float32Array(requiredSize);
    }
    
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
    
    // Reset frequency history when rows change significantly
    if (frequencyHistory.current.length > rows * 1.5) {
      frequencyHistory.current = frequencyHistory.current.slice(0, rows);
    }
  }, [cols, rows, spacingX, spacingZ]);

  useFrame(() => {
    if (!groupRef.current) return;

    // Use silent mic data if no mic is available
    const frequencyData = micData?.frequencyData || new Uint8Array(512).fill(0);
    const binsPerBar = Math.floor(frequencyData.length / cols);

    // Calculate bass intensity using shared helper
    

    // Apply shake effect when bass hits hard (lower threshold: 0.4)
    if (bassIntensity && bassIntensity > 0.6) {
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

    // Add current frequencies to history (newest at front)
    // Note: unshift is O(n) but necessary for correct ordering
    // Could be optimized with circular buffer, but this works for now
    frequencyHistory.current.unshift(currentFrequencies);
    if (frequencyHistory.current.length > maxHistoryLength) {
      frequencyHistory.current.pop(); // Remove oldest
    }

    // Update positions based on frequency history
    const pos = positions.current;
    const history = frequencyHistory.current;
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const idx = (col * rows + row) * 3;
        const historyIndex = Math.min(row, history.length - 1);
        const normalizedValue = history[historyIndex]?.[col] || 0;

        const height = Math.max(0.1, normalizedValue * 8);
        pos[idx + 1] = height;
      }
    }

    // Update instanced meshes - create cylinders between consecutive points
    // Reuse objects to avoid allocations every frame
    const dummyObj = dummy.current;
    const tempColorObj = tempColor.current;

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

        // Apply fade based on distance (pre-calculate fade factors could be optimized further)
        const fadeFactor = Math.pow(1 - row / rows, 3);
        tempColorObj.copy(baseColor).multiplyScalar(fadeFactor);

        dummyObj.updateMatrix();
        mesh.setMatrixAt(row, dummyObj.matrix);
        mesh.setColorAt(row, tempColorObj);
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
  fps = 60,
  isLandingPage=false
}: FFTSpectrumVisualizationProps) {
  const [rows, setRows] = useState(200);
  
  const bassIntensity = calculateBassIntensity(micData?.frequencyData || new Uint8Array(512).fill(0));

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
        gl={{ antialias: true }}
      >
        {/* Bloom Effect */}
        
        
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
          {isLandingPage && (
            <EffectComposer>
              <Bloom 
                intensity={Math.pow(bassIntensity*10,3)}
                luminanceThreshold={0}
                luminanceSmoothing={1.8}
                radius={0.3}
              />
            </EffectComposer>
          )}
          
          <FFTSpectrumPlanes micData={micData} fps={fps} onRowsChange={setRows} bassIntensity={bassIntensity} isLandingPage={isLandingPage} />
        
        
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
            isPlaying={isPlaying || false}
            syncedData={null}
            micData={micData}
          />
          
          
        )}
      </Canvas>
    </div>
  );
}
