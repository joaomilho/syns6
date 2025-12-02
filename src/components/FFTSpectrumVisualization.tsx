"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Group, Object3D, Color, InstancedMesh, Material, CylinderGeometry, MeshBasicMaterial } from "three";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { calculateBassIntensity } from "@/lib/audioAnalysis";

interface FFTSpectrumVisualizationProps {
  frequencyData?: Uint8Array;
  
}


export function FFTSpectrumPlanes({ 
  frequencyData, 
  bassIntensity,
  rows,
  colorPalette = 'default',
  lineWidth = 0.04

}: { 
  frequencyData?: Uint8Array; 
  bassIntensity?: number;
  rows: number;
  colorPalette?: string;
  lineWidth?: number;
}) {
  const groupRef = useRef<Group>(null);
  
  // Store frequencyData in ref so useFrame sees latest value (fix closure issue)
  const frequencyDataRef = useRef(frequencyData);
  useEffect(() => {
    frequencyDataRef.current = frequencyData;
  }, [frequencyData]);
  
  // Reuse objects outside useFrame to avoid allocations every frame
  const dummy = useRef(new Object3D());
  const tempColor = useRef(new Color());
  const silentFrequencyData = useRef(new Uint8Array(512).fill(0)); // Reuse silent data
  const currentFrequencies = useRef<number[]>(new Array(64).fill(0)); // Reuse frequency array

  // Grid configuration - similar to the original project
  const cols = 64; // Number of frequency bars
  const spacingX = 0.45;
  const spacingZ = 0.5;

  // Store previous meshes for cleanup
  const prevInstancedMeshes = useRef<{
    mesh: InstancedMesh;
    baseColor: Color;
    col: number;
  }[]>([]);
  const prevGeometry = useRef<CylinderGeometry | null>(null);

  // Create instanced mesh for thick lines using cylinders
  const instancedMeshes = useMemo(() => {
    // Dispose previous meshes before creating new ones
    if (prevInstancedMeshes.current.length > 0) {
      console.log(`[perf] 🧹 Disposing ${prevInstancedMeshes.current.length} old instanced meshes`);
      prevInstancedMeshes.current.forEach(({ mesh }) => {
        if (mesh.material instanceof Material) {
          mesh.material.dispose();
        }
        // Note: geometry is shared and disposed separately
      });
      prevInstancedMeshes.current = [];
    }
    
    if (prevGeometry.current) {
      prevGeometry.current.dispose();
      prevGeometry.current = null;
    }

    // Create a cylinder geometry for line segments (rotated to be vertical)
    const cylGeo = new CylinderGeometry(lineWidth, lineWidth, 1, 8);
    prevGeometry.current = cylGeo;

    // Color palette helper - based on column index for Fibonacci distribution
    // 5, 11, 21, rest (Fibonacci-based)
    const getColorForColumn = (colIndex: number, totalCols: number): [number, number, number] => {
      switch (colorPalette) {
        case 'vaporwave':
          if (colIndex < 5) return [1, 0.44, 0.81]; // Hot pink (FF71CE)
          if (colIndex < 16) return [0.73, 0.33, 0.83]; // Medium purple (5+11)
          if (colIndex < 37) return [0.25, 0.88, 0.82]; // Turquoise (16+21)
          return [0.54, 0.17, 0.89]; // Blue violet
        case 'sunset':
          if (colIndex < 5) return [1, 0.3, 0]; // Orange
          if (colIndex < 16) return [1, 0.5, 0.7]; // Pink
          if (colIndex < 37) return [0.8, 0.3, 1]; // Purple
          return [0.6, 0.2, 1]; // Deep purple
        case 'fire':
          if (colIndex < 5) return [1, 1, 0.6]; // Pale yellow
          if (colIndex < 16) return [1, 0.65, 0]; // Orange (5+11)
          if (colIndex < 37) return [1, 0.27, 0]; // Red-orange (16+21)
          return [0.55, 0, 0]; // Dark red
        case 'neon':
          if (colIndex < 5) return [1, 0.1, 0.8]; // Hot pink
          if (colIndex < 16) return [0.8, 0.2, 1]; // Purple
          if (colIndex < 37) return [0.2, 0.8, 1]; // Cyan
          return [0.1, 1, 1]; // Bright cyan
        default: // 'default'
          if (colIndex < 5) return [1, 0.1, 0.3]; // Red/Pink
          if (colIndex < 16) return [1, 0.5, 0]; // Orange (5+11)
          if (colIndex < 37) return [0.2, 1, 0.8]; // Cyan (16+21)
          return [0.3, 0.3, 1]; // Blue
      }
    };

    // Create one instanced mesh per column
    const meshes: {
      mesh: InstancedMesh;
      baseColor: Color;
      col: number;
    }[] = [];

    for (let col = 0; col < cols; col++) {
      // Get base color based on column index and palette
      const [r, g, b] = getColorForColumn(col, cols);

      // Reuse single Color object instead of creating two
      const baseColor = new Color(r, g, b);
      
      const material = new MeshBasicMaterial({
        color: baseColor,
        transparent: true,
      });

      const instancedMesh = new InstancedMesh(
        cylGeo,
        material,
        rows - 1 // One cylinder per segment (rows - 1 segments)
      );

      meshes.push({
        mesh: instancedMesh,
        baseColor: baseColor, // Reuse same Color object
        col,
      });
    }

    // Store for next cleanup
    prevInstancedMeshes.current = meshes;

    return meshes;
  }, [cols, rows, spacingX, spacingZ, colorPalette, lineWidth]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[perf] 🧹 FFTSpectrumPlanes unmounting, disposing resources');
      if (prevInstancedMeshes.current.length > 0) {
        prevInstancedMeshes.current.forEach(({ mesh }) => {
          if (mesh.material instanceof Material) {
            mesh.material.dispose();
          }
        });
        prevInstancedMeshes.current = [];
      }
      if (prevGeometry.current) {
        prevGeometry.current.dispose();
        prevGeometry.current = null;
      }
    };
  }, []);

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

    // Use ref to get latest frequencyData (fixes closure issue!)
    const currentFreqData = frequencyDataRef.current;
    const freqData = currentFreqData || silentFrequencyData.current;
    const binsPerBar = Math.floor(freqData.length / cols);

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

    // Calculate current frequency values for all columns (REUSE array!)
    const currentFreqs = currentFrequencies.current;
    for (let col = 0; col < cols; col++) {
      let sum = 0;
      const startBin = col * binsPerBar;
      const endBin = Math.min(startBin + binsPerBar, freqData.length);

      for (let j = startBin; j < endBin; j++) {
        sum += freqData[j];
      }
      const avgValue = sum / (endBin - startBin);
      currentFreqs[col] = avgValue / 255;
    }

    // Add current frequencies to history (newest at front)
    // Clone the array since we're reusing currentFreqs
    frequencyHistory.current.unshift([...currentFreqs]);
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
  frequencyData,
  
}: FFTSpectrumVisualizationProps) {
  const rows = 100; // Fixed at 100 rows for performance
  const bassIntensity = calculateBassIntensity(frequencyData || new Uint8Array(512).fill(0));

  // Render FFT visualization with bloom
  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 75 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: "linear-gradient(to bottom, #000000 0%, #0a0020 100%)",
      }}
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      dpr={1} // Fixed 1x for performance (was [1, 2])
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
        <FFTSpectrumPlanes 
          frequencyData={frequencyData} 
          bassIntensity={bassIntensity} 
          rows={rows}
        />
      
        {/* Grid floor */}
        <gridHelper
          args={[80, 80, "#333344", "#111122"]}
          position={[0, -0.1, 0]}
        />
      </group>
      
      {/* Bloom Effect */}
      <EffectComposer>
        <Bloom 
          intensity={bassIntensity * 2}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </Canvas>
  );
}
