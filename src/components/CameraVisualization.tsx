"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, LinearFilter, Mesh, Points, RGBFormat, ShaderMaterial, VideoTexture } from "three";
import { OrbitControls } from "@react-three/drei";

interface ShaderControls {
  rgbSplitAmount: number;
  distortionAmount: number;
  colorShiftR: number;
  colorShiftB: number;
  pixelThreshold: number;
  waveFrequency: number;
}

interface CameraVisualizationProps {
  videoElement?: HTMLVideoElement | null;
  bass?: number;  // Only needs these 3 scalars
  mid?: number;
  treble?: number;
  shaderControls?: ShaderControls;
}

function CameraPlane({
  videoElement,
  bass = 0,
  mid = 0,
  treble = 0,
  controls,
}: {
  videoElement?: HTMLVideoElement | null;
  bass?: number;
  mid?: number;
  treble?: number;
  controls: ShaderControls;
}) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(
    null
  );

  // Create video texture
  useEffect(() => {
    if (!videoElement) {
      setVideoTexture(null);
      return;
    }

    const createTexture = () => {
      const texture = new VideoTexture(videoElement);
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.format = RGBFormat;
      setVideoTexture(texture);
    };

    if (videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
      createTexture();
    } else {
      const handleCanPlay = () => {
        createTexture();
      };
      videoElement.addEventListener("canplay", handleCanPlay);
      return () => videoElement.removeEventListener("canplay", handleCanPlay);
    }
  }, [videoElement]);

  // Create uniforms object that updates when controls or videoTexture change
  const uniforms = useMemo(
    () => ({
      uTexture: { value: videoTexture },
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uHasVideo: { value: !!videoTexture },
      uRgbSplitAmount: { value: controls.rgbSplitAmount },
      uDistortionAmount: { value: controls.distortionAmount },
      uColorShiftR: { value: controls.colorShiftR },
      uColorShiftB: { value: controls.colorShiftB },
      uPixelThreshold: { value: controls.pixelThreshold },
      uWaveFrequency: { value: controls.waveFrequency },
    }),
    [videoTexture, controls]
  );

  // Custom shader for audio-reactive effects
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uTreble;
    
    void main() {
      vUv = uv;
      vPosition = position;
      
      // Create wave distortion based on audio
      vec3 pos = position;
      float wave = sin(position.x * 10.0 + uTime) * cos(position.y * 10.0 + uTime);
      pos.z += wave * uBass * 0.5;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uTexture;
    uniform float uTime;
    uniform float uBass;
    uniform float uMid;
    uniform float uTreble;
    uniform bool uHasVideo;
    uniform float uRgbSplitAmount;
    uniform float uDistortionAmount;
    uniform float uColorShiftR;
    uniform float uColorShiftB;
    uniform float uPixelThreshold;
    uniform float uWaveFrequency;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    // RGB split effect
    vec3 rgbSplit(sampler2D tex, vec2 uv, float amount) {
      float r = texture2D(tex, uv + vec2(amount, 0.0)).r;
      float g = texture2D(tex, uv).g;
      float b = texture2D(tex, uv - vec2(amount, 0.0)).b;
      return vec3(r, g, b);
    }
    
    void main() {
      if (!uHasVideo) {
        // Fallback gradient if no video
        vec3 color1 = vec3(0.1, 0.0, 0.3);
        vec3 color2 = vec3(0.5, 0.0, 0.8);
        vec3 color = mix(color1, color2, vUv.y);
        gl_FragColor = vec4(color, 1.0);
        return;
      }
      
      vec2 uv = vUv;
      
      // Distort UV based on audio (controllable)
      float distortion = sin(uv.x * uWaveFrequency + uTime * 2.0) * cos(uv.y * uWaveFrequency + uTime * 2.0);
      float audioIntensity = max(uBass, 0.3); // Always at least 30% intensity
      uv += distortion * audioIntensity * uDistortionAmount;
      
      // RGB split enhanced by bass (controllable)
      vec3 color = rgbSplit(uTexture, uv, audioIntensity * uRgbSplitAmount);
      
      // Add color shift based on mid/treble (controllable)
      float midIntensity = max(uMid, 0.3);
      float trebleIntensity = max(uTreble, 0.3);
      color.r += midIntensity * uColorShiftR;
      color.b += trebleIntensity * uColorShiftB;
      
      // Pixelation effect on high bass (controllable threshold)
      if (uBass > uPixelThreshold) {
        float pixelSize = 400.0 * (1.0 - uBass);
        vec2 pixelatedUV = floor(vUv * pixelSize) / pixelSize;
        color = texture2D(uTexture, pixelatedUV).rgb;
        
        // Add extra intensity on pixelation
        color *= 1.0 + uBass * 0.3;
      }
      
      // Add vignette effect
      vec2 center = vUv - 0.5;
      float vignette = 1.0 - dot(center, center) * 0.5;
      color *= vignette;
      
      // Boost contrast based on audio
      color = pow(color, vec3(1.0 - uBass * 0.2));
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  // Removed excessive logging

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    const uniforms = materialRef.current.uniforms;

    if (!uniforms) {
      console.error("❌ No uniforms found!");
      return;
    }

    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uBass.value = bass;
    uniforms.uMid.value = mid;
    uniforms.uTreble.value = treble;

    const hasVideo = !!videoTexture;
    uniforms.uHasVideo.value = hasVideo;

    // Update controllable parameters
    uniforms.uRgbSplitAmount.value = controls.rgbSplitAmount;
    uniforms.uDistortionAmount.value = controls.distortionAmount;
    uniforms.uColorShiftR.value = controls.colorShiftR;
    uniforms.uColorShiftB.value = controls.colorShiftB;
    uniforms.uPixelThreshold.value = controls.pixelThreshold;
    uniforms.uWaveFrequency.value = controls.waveFrequency;

    if (videoTexture) {
      uniforms.uTexture.value = videoTexture;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 4, -3.8]}>
      <planeGeometry args={[67.2, 37.8, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        key={`${videoTexture ? "video" : "no-video"}-${
          controls.rgbSplitAmount
        }-${controls.distortionAmount}-${controls.colorShiftR}-${
          controls.colorShiftB
        }-${controls.pixelThreshold}-${controls.waveFrequency}`}
      />
    </mesh>
  );
}

// Particle system that reacts to camera and audio
function CameraParticles({ bass = 0 }: { bass?: number }) {
  const particlesRef = useRef<Points>(null);
  const particleCount = 1000;

  const geometry = useRef(
    (() => {
      const geo = new BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

        colors[i * 3] = Math.random();
        colors[i * 3 + 1] = Math.random();
        colors[i * 3 + 2] = Math.random();
      }

      geo.setAttribute("position", new BufferAttribute(positions, 3));
      geo.setAttribute("color", new BufferAttribute(colors, 3));

      return geo;
    })()
  ).current;

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;

    const positions = geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Rotate particles
      const angle = clock.getElapsedTime() * 0.5 + i * 0.01;
      const radius = 5 + bass * 5;

      positions[i3] += Math.sin(angle) * 0.01;
      positions[i3 + 1] += Math.cos(angle) * 0.01;
      positions[i3 + 2] += Math.sin(angle * 0.5) * 0.01 * (1 + bass);
    }

    geometry.attributes.position.needsUpdate = true;
    particlesRef.current.rotation.y += 0.001 * (1 + bass);
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial size={0.2} vertexColors transparent opacity={0.6} />
    </points>
  );
}

export default function CameraVisualization({
  videoElement,
  bass,
  mid,
  treble,
  shaderControls: externalControls,
}: CameraVisualizationProps) {
  const [localControls, setLocalControls] = useState<ShaderControls>({
    rgbSplitAmount: 0.025,
    distortionAmount: 0.02,
    colorShiftR: 0.2,
    colorShiftB: 0.2,
    pixelThreshold: 0.7,
    waveFrequency: 20.0,
  });

  // Use external controls if provided, otherwise use local state
  const controls = externalControls || localControls;

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
        dpr={1}
        style={{
          background: "#000",
        }}
      >
        <ambientLight intensity={2} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <OrbitControls enableDamping dampingFactor={0.05} />

        {/* Camera feed with audio-reactive effects */}
        <CameraPlane
          videoElement={videoElement}
          bass={bass}
          mid={mid}
          treble={treble}
          controls={controls}
        />

        {/* Particles floating around */}
        <CameraParticles bass={bass} />
      </Canvas>
    </div>
  );
}
