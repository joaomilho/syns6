"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, ShaderMaterial, Vector2, Vector4, Mesh, TextureLoader } from "three";
import { SyncedAudioData } from "@/lib/audioSync";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

interface AudioFeatures {
  energy: number;
  tempo: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

interface VisualizationProps {
  audioFeatures?: AudioFeatures | null;
  syncedData?: SyncedAudioData | null;
  micData?: MicrophoneData;
  albumArt?: string;
}

// EXACT shader from https://raw.githubusercontent.com/the-lazy-god/tlg-kaleidoscope/refs/heads/main/tlg-kaleidoscope.js
const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec4 resolution;
uniform float uOpacity;
varying vec2 vUv;
const float PI = 3.14159265359;
uniform float segments;
uniform vec2 uOffset;
uniform float uRotation;
uniform float uOffsetAmount;
uniform float uRotationAmount;
uniform float uScaleFactor;
uniform float uImageAspect;

vec2 adjustUV(vec2 uv, vec2 offset, float rotation) {
  vec2 uvOffset = uv + offset * uOffsetAmount;
  float cosRot = cos(rotation * uRotationAmount);
  float sinRot = sin(rotation * uRotationAmount);
  mat2 rotMat = mat2(cosRot, -sinRot, sinRot, cosRot);
  return rotMat * (uvOffset - vec2(0.5)) + vec2(0.5);
}

void main() {
  vec2 newUV = (vUv - vec2(0.5)) * resolution.zw + vec2(0.5);
  vec2 uv = newUV * 2.0 - 1.0;
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  float segment = PI * 2.0 / segments;
  angle = mod(angle, segment);
  angle = segment - abs(segment / 2.0 - angle);
  uv = radius * vec2(cos(angle), sin(angle));
  float scale = 1.0 / uScaleFactor;
  vec2 adjustedUV = adjustUV(uv * scale + scale, uOffset, uRotation);
  vec2 aspectCorrectedUV = vec2(adjustedUV.x, adjustedUV.y * uImageAspect);
  vec2 tileIndex = floor(aspectCorrectedUV);
  vec2 oddTile = mod(tileIndex, 2.0);
  vec2 mirroredUV = mix(fract(aspectCorrectedUV), 1.0 - fract(aspectCorrectedUV), oddTile);
  vec4 color = texture2D(uTexture, mirroredUV);
  color.a *= uOpacity;
  gl_FragColor = color;
}
`;

export function KaleidoscopeShader({ audioFeatures, syncedData, micData, albumArt }: VisualizationProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const { size, camera } = useThree();
  const [texture, setTexture] = useState<any>(null);
  
  // Load album art or fallback image
  useEffect(() => {
    const loader = new TextureLoader();
    const imageUrl = albumArt || '/Kaleidoscope/a3fcd0d7e20e42e687962a3d4519f7a7.jpg';
    
    // Set crossOrigin for Spotify images
    loader.setCrossOrigin('anonymous');
    
    loader.load(
      imageUrl, 
      (loadedTexture) => {
        loadedTexture.generateMipmaps = false;
        setTexture(loadedTexture);
      }, 
      undefined, 
      (error) => {
        // Fallback if album art fails to load
        console.warn('Failed to load album art, using fallback:', error);
        loader.load('/Kaleidoscope/a3fcd0d7e20e42e687962a3d4519f7a7.jpg', (loadedTexture) => {
          loadedTexture.generateMipmaps = false;
          setTexture(loadedTexture);
        });
      }
    );
  }, [albumArt]);

  const uniforms = useMemo(() => ({
    resolution: { value: new Vector4() },
    uTexture: { value: texture },
    uOpacity: { value: 1.0 },
    uOffset: { value: new Vector2(0, 0) },
    uRotation: { value: 0 },
    uRotationAmount: { value: 0.2 },
    uOffsetAmount: { value: 0.2 },
    segments: { value: 12.0 },  // More segments for more kaleidoscope symmetry
    uScaleFactor: { value: 0.5 },  // Smaller scale = more detailed patterns
    uImageAspect: { value: 1.0 },
  }), []);
  
  // Update texture when it loads
  useEffect(() => {
    if (materialRef.current && texture) {
      materialRef.current.uniforms.uTexture.value = texture;
    }
  }, [texture]);

  // Update resolution and camera on resize
  useEffect(() => {
    if (!materialRef.current) return;
    
    const width = size.width;
    const height = size.height;
    const aspect = width / height;
    
    let a1, a2;
    if (height / width > 1) {
      a1 = (width / height);
      a2 = 1;
    } else {
      a1 = 1;
      a2 = (height / width);
    }
    
    materialRef.current.uniforms.resolution.value.x = width;
    materialRef.current.uniforms.resolution.value.y = height;
    materialRef.current.uniforms.resolution.value.z = a1;
    materialRef.current.uniforms.resolution.value.w = a2;
    
    // Update orthographic camera to fill screen
    if ('left' in camera) {
      camera.left = -aspect / 2;
      camera.right = aspect / 2;
      camera.top = 0.5;
      camera.bottom = -0.5;
      camera.updateProjectionMatrix();
    }
  }, [size, camera]);

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Audio reactivity - VERY SUBTLE
    const bass = micData?.bass || 0;
    const isOnBeat = syncedData?.isOnBeat || false;
    
    // Continuous rotation - like the reference "loop" mode
    const rotationSpeed = 0.1;
    materialRef.current.uniforms.uRotation.value = time * rotationSpeed;
    
    // VERY SUBTLE bass bounce - just a tiny scale variation
    const bassBounce = 1.0 + (bass * 0.03); // Only 3% max bounce
    const beatPulse = isOnBeat ? 1.01 : 1.0; // Only 1% beat pulse
    meshRef.current.scale.setScalar(bassBounce * beatPulse);
    
    // Subtle tilt animation like Lyrics3D
    const maxTilt = 0.1;
    const tiltSpeed = 0.25;
    meshRef.current.rotation.y = Math.sin(time * tiltSpeed) * maxTilt;
    meshRef.current.rotation.x = Math.cos(time * tiltSpeed * 0.7) * maxTilt * 0.5; // Slower, less tilt on X
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[100, 100]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={DoubleSide}
        transparent
      />
    </mesh>
  );
}

export default function PsychedelicVisualization({
  audioFeatures,
  syncedData,
  micData,
  albumArt,
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
        camera={{ 
          position: [0, 0, 50],
          zoom: 1
        }}
        style={{ background: "#000000" }}
        dpr={window.devicePixelRatio}  // Full device pixel ratio for crisp rendering
        orthographic
        gl={{ antialias: true }}  // Enable antialiasing for smoother edges
      >
        <KaleidoscopeShader audioFeatures={audioFeatures} syncedData={syncedData} micData={micData} albumArt={albumArt} />
      </Canvas>
    </div>
  );
}
