"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import BlackHoleScene from "./BlackHoleScene";

interface BlackHoleVisualizationProps {
  energy?: number;
  bass?: number;
  mid?: number;
  treble?: number;
  volume?: number;
}

export default function BlackHoleVisualization({
  energy,
  bass,
  mid,
  treble,
  volume,
}: BlackHoleVisualizationProps) {
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
        camera={{ position: [0, 0, 30], fov: 75, near: 0.1, far: 1000 }}
        dpr={1}
      >
        <BlackHoleScene
          micData={{
            energy,
            bass,
            mid,
            treble,
            volume,
          }}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.035}
          rotateSpeed={0.4}
          autoRotate
          autoRotateSpeed={0.3}
          minDistance={10}
          maxDistance={150}
          enablePan={false}
          target={[0, 0, -80]}
        />
      </Canvas>
    </div>
  );
}

