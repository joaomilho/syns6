"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { DoubleSide, ShaderMaterial, Vector2, Vector4, Mesh, TextureLoader, VideoTexture, CanvasTexture } from "three";
import { SyncedAudioData } from "@/lib/audioSync";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

interface AudioFeatures {
  energy: number;
  tempo: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

interface KaleidoscopeControls {
  mode: 'album' | 'video';
  rgbDistance: number;
  reactivity: number;
}

interface VisualizationProps {
  audioFeatures?: AudioFeatures | null;
  syncedData?: SyncedAudioData | null;
  bass?: number; // Only needs bass value
  albumArt?: string;
  videoElement?: HTMLVideoElement | null;
  kaleidoscopeControls?: KaleidoscopeControls;
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
uniform float uRgbDistance;
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
  
  // Sample base color
  vec4 color = texture2D(uTexture, mirroredUV);
  
  // Add chromatic aberration (RGB split) for trippy effect - use uRgbDistance
  vec4 colorR = texture2D(uTexture, mirroredUV + vec2(uRgbDistance, 0.0));
  vec4 colorB = texture2D(uTexture, mirroredUV - vec2(uRgbDistance, 0.0));
  color.r = colorR.r;
  color.b = colorB.b;
  
  // Strong vignette effect
  vec2 vignetteCenter = vUv - 0.5;
  float vignette = 1.0 - dot(vignetteCenter, vignetteCenter) * 4.5;
  vignette = smoothstep(0.0, 1.0, vignette);
  color.rgb *= vignette;
  
  // Boost brightness significantly
  color.rgb *= 1.8;
  
  // Add glow to bright areas
  float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  if (luminance > 0.4) {
    color.rgb *= 1.0 + (luminance - 0.4) * 3.0;
  }
  
  // Boost saturation
  // float gray = (color.r + color.g + color.b) / 3.0;
  // color.rgb = mix(vec3(gray), color.rgb, 1.4);
  
  color.a *= uOpacity;
  gl_FragColor = color;
}
`;

export function KaleidoscopeShader({ audioFeatures, syncedData, bass = 0, albumArt, videoElement, kaleidoscopeControls }: VisualizationProps) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const { size, camera } = useThree();
  const [texture, setTexture] = useState<any>(null);
  
  const mode = kaleidoscopeControls?.mode ?? 'album';
  const rgbDistance = kaleidoscopeControls?.rgbDistance ?? 0.1;
  const reactivity = kaleidoscopeControls?.reactivity ?? 1.0;
  
  // Load album art when in album mode
  useEffect(() => {
    if (mode !== 'album') return;
    
    const loader = new TextureLoader();
    const imageUrl = albumArt || '/Kaleidoscope/a3fcd0d7e20e42e687962a3d4519f7a7.jpg';
    
    loader.setCrossOrigin('anonymous');
    
    loader.load(
      imageUrl, 
      (loadedTexture) => {
        loadedTexture.generateMipmaps = false;
        setTexture(loadedTexture);
      }, 
      undefined, 
      (error) => {
        console.warn('Failed to load album art, using fallback:', error);
        loader.load('/Kaleidoscope/a3fcd0d7e20e42e687962a3d4519f7a7.jpg', (loadedTexture) => {
          loadedTexture.generateMipmaps = false;
          setTexture(loadedTexture);
        });
      }
    );
  }, [albumArt, mode]);
  
  // Create video texture for video mode
  useEffect(() => {
    if (mode !== 'video' || !videoElement) {
      return;
    }
    
    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      const videoTexture = new VideoTexture(videoElement);
      videoTexture.generateMipmaps = false;
      setTexture(videoTexture);
      console.log('📹 Using continuous video for kaleidoscope');
    } else {
      const handleCanPlay = () => {
        const videoTexture = new VideoTexture(videoElement);
        videoTexture.generateMipmaps = false;
        setTexture(videoTexture);
        console.log('📹 Using continuous video for kaleidoscope');
      };
      videoElement.addEventListener("canplay", handleCanPlay);
      return () => videoElement.removeEventListener("canplay", handleCanPlay);
    }
  }, [videoElement, mode]);

  const uniforms = useMemo(() => ({
    resolution: { value: new Vector4() },
    uTexture: { value: texture },
    uOpacity: { value: 1.0 },
    uOffset: { value: new Vector2(0, 0) },
    uRotation: { value: 0 },
    uRotationAmount: { value: 0.2 },
    uOffsetAmount: { value: 0.2 },
    segments: { value: 12.0 },
    uScaleFactor: { value: 0.5 },
    uImageAspect: { value: 1.0 },
    uRgbDistance: { value: 0.1 },
  }), []);
  
  useEffect(() => {
    if (materialRef.current && texture) {
      materialRef.current.uniforms.uTexture.value = texture;
    }
  }, [texture]);

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
    const isOnBeat = syncedData?.isOnBeat || false;
    
    const rotationSpeed = 0.1;
    materialRef.current.uniforms.uRotation.value = time * rotationSpeed;
    
    // Update RGB distance uniform
    materialRef.current.uniforms.uRgbDistance.value = rgbDistance;
    
    // Apply reactivity to bass response
    const bassBounce = 1.0 + (bass * 0.03 * reactivity);
    const beatPulse = isOnBeat ? 1.01 : 1.0;
    meshRef.current.scale.setScalar(bassBounce * beatPulse);
    
    const maxTilt = 0.1 * reactivity;
    const tiltSpeed = 0.25;
    meshRef.current.rotation.y = Math.sin(time * tiltSpeed) * maxTilt;
    meshRef.current.rotation.x = Math.cos(time * tiltSpeed * 0.7) * maxTilt * 0.5;
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

export default function KaleidoscopeVisualization({
  audioFeatures,
  syncedData,
  bass,
  albumArt,
  videoElement,
  kaleidoscopeControls,
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
        dpr={window.devicePixelRatio}
        orthographic
        gl={{ antialias: true }}
      >
        <KaleidoscopeShader audioFeatures={audioFeatures} syncedData={syncedData} bass={bass} albumArt={albumArt} videoElement={videoElement} kaleidoscopeControls={kaleidoscopeControls} />
        

      </Canvas>
    </div>
  );
}

