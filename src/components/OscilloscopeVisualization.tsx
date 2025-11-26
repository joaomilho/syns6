"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

interface OscilloscopeVisualizationProps {
  micData?: MicrophoneData;
  fps?: number;
}

// Vertex shader - woscope style with quads and tangent extension
const vertexShader = `
precision highp float;
#define EPS 1E-6

uniform float uInvert;
uniform float uSize;

attribute vec2 aStart, aEnd;
attribute float aIdx;

varying vec4 uvl;
varying float vLen;

void main() {
  float tang;
  vec2 current;
  
  // Determine position from quad index (0-3)
  float idx = mod(aIdx, 4.0);
  if (idx >= 2.0) {
    current = aEnd;
    tang = 1.0;
  } else {
    current = aStart;
    tang = -1.0;
  }
  
  float side = (mod(idx, 2.0) - 0.5) * 2.0;
  uvl.xy = vec2(tang, side);
  uvl.w = floor(aIdx / 4.0 + 0.5);
  
  vec2 dir = aEnd - aStart;
  uvl.z = length(dir);
  
  if (uvl.z > EPS) {
    dir = dir / uvl.z;
  } else {
    // If segment is too short, draw a square
    dir = vec2(1.0, 0.0);
  }
  
  vec2 norm = vec2(-dir.y, dir.x);
  vec2 pos = current + (tang * dir + norm * side) * uSize;
  
  gl_Position = vec4(pos.x, pos.y * uInvert, 0.0, 1.0);
}
`;

// Fragment shader - woscope style with Gaussian antialiasing
const fragmentShader = `
precision highp float;
#define EPS 0.0001
#define SQRT2 1.4142135623730951

uniform float uSize;
uniform float uIntensity;
uniform vec4 uColor;

varying vec4 uvl;

// Error function approximation for Gaussian integration
float erf(float x) {
  float s = sign(x), a = abs(x);
  x = 1.0 + (0.278393 + (0.230389 + (0.000972 + 0.078108 * a) * a) * a) * a;
  x *= x;
  return s - s / (x * x);
}

void main() {
  float len = uvl.z;
  vec2 xy = vec2((len/2.0 + uSize) * uvl.x + len/2.0, uSize * uvl.y);
  float alpha;
  
  float sigma = uSize / 4.0;
  
  if (len < EPS) {
    // Very short segment: skip rendering to avoid dots
    alpha = 0.0;
  } else {
    // Normal segment: use analytical integral for smooth antialiasing
    alpha = erf((len - xy.x) / SQRT2 / sigma) + erf(xy.x / SQRT2 / sigma);
    alpha *= exp(-xy.y * xy.y / (2.0 * sigma * sigma)) / 2.0 / len * uSize;
  }
  
  // Afterglow effect (fade older segments)
  float afterglow = smoothstep(0.0, 0.33, uvl.w / 2048.0);
  alpha *= afterglow * uIntensity;
  
  gl_FragColor = vec4(vec3(uColor), uColor.a * alpha);
}
`;

export default function OscilloscopeVisualization({
  micData,
  fps = 60,
}: OscilloscopeVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const updateWaveformRef = useRef(0);
  const micDataRef = useRef(micData); // Keep current micData in a ref
  const isInitializedRef = useRef(false); // Prevent double initialization
  
  const nSamples = 2048;
  const baseLineSize = 0.012; // Woscope default line size
  
  // Update ref whenever micData changes
  useEffect(() => {
    micDataRef.current = micData;
  }, [micData]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Prevent double initialization in React Strict Mode
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 1);
    
    // Make canvas visible with explicit styles
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create orthographic camera for 2D
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    camera.position.z = 1;
    cameraRef.current = camera;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create geometry - WOSCOPE STYLE with 4 vertices per segment
    const geometry = new THREE.BufferGeometry();
    
    const numSegments = nSamples - 1;
    const numVertices = numSegments * 4; // 4 vertices per quad
    
    // aIdx attribute: 0-3 for quad vertices, plus segment index for afterglow
    const idxArray = new Float32Array(numVertices);
    for (let i = 0; i < numSegments; i++) {
      const base = i * 4;
      idxArray[base + 0] = i * 4 + 0;
      idxArray[base + 1] = i * 4 + 1;
      idxArray[base + 2] = i * 4 + 2;
      idxArray[base + 3] = i * 4 + 3;
    }
    
    // aStart and aEnd attributes: positions (will be updated each frame)
    const startArray = new Float32Array(numVertices * 2);
    const endArray = new Float32Array(numVertices * 2);
    
    // Initialize with a circle - one quad per segment
    for (let i = 0; i < numSegments; i++) {
      const angle = (i / nSamples) * Math.PI * 2;
      const x = Math.cos(angle) * 0.5;
      const y = Math.sin(angle) * 0.5;
      
      const nextAngle = ((i + 1) / nSamples) * Math.PI * 2;
      const nextX = Math.cos(nextAngle) * 0.5;
      const nextY = Math.sin(nextAngle) * 0.5;
      
      // All 4 vertices of the quad get the same start and end positions
      const base = i * 4;
      for (let j = 0; j < 4; j++) {
        startArray[(base + j) * 2 + 0] = x;
        startArray[(base + j) * 2 + 1] = y;
        endArray[(base + j) * 2 + 0] = nextX;
        endArray[(base + j) * 2 + 1] = nextY;
      }
    }
    
    // Index buffer: create triangles for quads
    const indices = new Uint16Array(numSegments * 6);
    for (let i = 0; i < numSegments; i++) {
      const vi = i * 4;
      const idx = i * 6;
      
      // Two triangles forming a quad
      indices[idx + 0] = vi + 0;
      indices[idx + 1] = vi + 1;
      indices[idx + 2] = vi + 2;
      
      indices[idx + 3] = vi + 1;
      indices[idx + 4] = vi + 3;
      indices[idx + 5] = vi + 2;
    }
    
    // Set attributes
    geometry.setAttribute('aIdx', new THREE.BufferAttribute(idxArray, 1));
    geometry.setAttribute('aStart', new THREE.BufferAttribute(startArray, 2));
    geometry.setAttribute('aEnd', new THREE.BufferAttribute(endArray, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    
    // Three.js requires a 'position' attribute even if we don't use it in the shader
    // Create dummy position from startArray (convert vec2 to vec3)
    const dummyPositions = new Float32Array(numVertices * 3);
    for (let i = 0; i < numVertices; i++) {
      dummyPositions[i * 3 + 0] = startArray[i * 2 + 0];
      dummyPositions[i * 3 + 1] = startArray[i * 2 + 1];
      dummyPositions[i * 3 + 2] = 0;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(dummyPositions, 3));
    
    // Compute bounding box/sphere so Three.js doesn't cull it
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uInvert: { value: 1.0 },
        uSize: { value: baseLineSize },
        uIntensity: { value: 1.0 },
        uColor: { value: new THREE.Vector4(0.1, 1.0, 0.1, 1.0) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide, // Render both sides
    });
    materialRef.current = material;

    // Create oscilloscope mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // CRITICAL: Always render, don't cull based on bounding box
    scene.add(mesh);
    meshRef.current = mesh;
    
    // Force shader compilation and check for errors
    renderer.compile(scene, camera);
    
    // Check for WebGL errors
    const gl = renderer.getContext();
    const glError = gl.getError();
    if (glError !== gl.NO_ERROR) {
      console.error('❌ WebGL Error after setup:', glError);
    }

    // Force initial waveform update before first render
    let frameCount = 0;
    
    // Animation loop
    const animate = () => {
      frameCount++;
      
      
      updateWaveform();
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();

    // Handle resize
    const handleResize = () => {
      if (!rendererRef.current || !cameraRef.current) return;
      
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const newAspect = newWidth / newHeight;
      
      rendererRef.current.setSize(newWidth, newHeight);
      
      cameraRef.current.left = -newAspect;
      cameraRef.current.right = newAspect;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        if (Array.isArray(meshRef.current.material)) {
          meshRef.current.material.forEach(m => m.dispose());
        } else {
          meshRef.current.material.dispose();
        }
      }
      if (containerRef.current && renderer.domElement && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      // Allow re-initialization if component is truly unmounted and remounted
      isInitializedRef.current = false;
    };
  }, []);

  // Update waveform data each frame
  const updateWaveform = () => {
    if (!meshRef.current || !materialRef.current) {
      console.warn('⚠️ Missing mesh or material ref');
      return;
    }

      const geometry = meshRef.current.geometry as THREE.BufferGeometry;
      const startAttr = geometry.getAttribute('aStart') as THREE.BufferAttribute;
      const endAttr = geometry.getAttribute('aEnd') as THREE.BufferAttribute;
      
      if (!startAttr || !endAttr) {
        console.error('❌ Missing attributes!');
        return;
      }
    
    // Use ref to get current micData (not closed-over value)
    const currentMicData = micDataRef.current;
    const waveform = currentMicData?.waveform;
    const waveformLeft = currentMicData?.waveformLeft; // X-axis
    const waveformRight = currentMicData?.waveformRight; // Y-axis (phase-shifted)
    const bass = currentMicData?.bass || 0;
    const energy = currentMicData?.energy || 0;
    const volume = currentMicData?.volume || 0;
    const treble = currentMicData?.treble || 0;
    
    
    // Dynamic scale based on audio intensity - gets MUCH bigger with bass
    const baseScale = 0.7;
    const scale = baseScale + bass * 0.9 + energy * 0.3 + volume * 0.2;
    
    const time = Date.now() / 1000;
    
    updateWaveformRef.current++;

    if (waveformLeft && waveformRight && waveformLeft.length > 0 && waveformRight.length > 0) {
      // Use phase-shifted waveform data - X/Y mode (woscope style)
      // LEFT = X-axis (direct), RIGHT = Y-axis (phase-shifted)
      const numSegments = nSamples - 1;
      
      for (let i = 0; i < numSegments; i++) {
        // Get X from LEFT channel, Y from RIGHT channel (phase-shifted)
        const idx = Math.floor((i / nSamples) * waveformLeft.length);
        
        // waveform is already Float32Array in -1 to 1 range (like woscope)
        const x = waveformLeft[idx] * scale;
        const y = waveformRight[idx] * scale;
        
        // Get end point (next sample)
        const nextIdx = Math.floor(((i + 1) / nSamples) * waveformLeft.length);
        const nextX = waveformLeft[nextIdx] * scale;
        const nextY = waveformRight[nextIdx] * scale;
        
        // Set all 4 vertices of the quad to the same start/end positions
        const vi = i * 4;
        for (let j = 0; j < 4; j++) {
          startAttr.setXY(vi + j, x, y);
          endAttr.setXY(vi + j, nextX, nextY);
        }
      }
    } else {
      // Animated Lissajous curve fallback
      const numSegments = nSamples - 1;
      
      for (let i = 0; i < numSegments; i++) {
        const t = (i / nSamples) * Math.PI * 2;
        const x = Math.sin(t * 3 + time * 0.5) * scale;
        const y = Math.sin(t * 2 + time * 0.3) * scale;
        
        const nextI = i + 1;
        const nextT = (nextI / nSamples) * Math.PI * 2;
        const nextX = Math.sin(nextT * 3 + time * 0.5) * scale;
        const nextY = Math.sin(nextT * 2 + time * 0.3) * scale;
        
        // Set all 4 vertices of the quad
        const vi = i * 4;
        for (let j = 0; j < 4; j++) {
          startAttr.setXY(vi + j, x, y);
          endAttr.setXY(vi + j, nextX, nextY);
        }
      }
    }
    
    // FORCE geometry update - mark attributes as needing update
    startAttr.needsUpdate = true;
    endAttr.needsUpdate = true;
    
    // CRITICAL: Force version increment to ensure GPU upload
    (startAttr as any).version++;
    (endAttr as any).version++;

    // DRAMATIC color changes based on audio
    // Bass hits: Green -> Yellow -> Red
    // High energy: Cyan/Blue tones
    const bassColor = bass * 1.8; // 0 to 0.5 (green to red via yellow)
    const energyColor = energy * 0.2; // Shift toward cyan
    const hue = 0.33 - bassColor + energyColor; // Green base, moves to red with bass, cyan with energy
    
    const saturation = 0.9 + energy * 0.1;
    const lightness = 0.4 + energy * 0.4 + bass * 0.3; // Much brighter with music
    
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    materialRef.current.uniforms.uColor.value.set(color.r, color.g, color.b, 1.0);
    
    // Dramatic intensity changes
    materialRef.current.uniforms.uIntensity.value = 0.7 + energy * 0.5 + bass * 0.3;
    
    // Dynamic line thickness based on bass (subtle variation)
    // materialRef.current.uniforms.uSize.value = baseLineSize * (1.0 + bass * 0.5 + energy * 0.2);
    materialRef.current.uniforms.uSize.value = baseLineSize;
    
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        background: "#000000",
      }}
    >
    </div>
  );
}
