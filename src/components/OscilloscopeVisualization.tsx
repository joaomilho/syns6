"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { LyricLine } from "@/lib/lyrics";

interface OscilloscopeVisualizationProps {
  micData?: MicrophoneData;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  isPlaying?: boolean;
  fps?: number;
}

// Vertex shader - creates thick lines by offsetting vertices perpendicular to line direction
const vertexShader = `
precision highp float;

attribute float aIdx;
attribute vec2 aStart;
attribute vec2 aEnd;

uniform float uInvert;
uniform float uSize;

varying float vIntensity;

void main() {
  vec2 diff = aEnd - aStart;
  float len = length(diff);
  
  // Handle zero-length segments
  vec2 dir = len > 0.0001 ? diff / len : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x) * uSize;
  
  // Offset vertices perpendicular to create thick line
  vec2 pos = aStart + normal * (aIdx * 2.0 - 1.0);
  
  vIntensity = 1.0;
  gl_Position = vec4(pos.x, pos.y * uInvert, 0.0, 1.0);
}
`;

// Fragment shader - simple color output
const fragmentShader = `
precision mediump float;

uniform vec4 uColor;
uniform float uIntensity;

varying float vIntensity;

void main() {
  gl_FragColor = uColor * uIntensity * vIntensity;
}
`;

export default function OscilloscopeVisualization({
  micData,
  lyrics,
  currentTimeMs,
  isPlaying,
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
  const baseLineSize = 0.0015; // Much thinner lines
  
  // Update ref whenever micData changes
  useEffect(() => {
    micDataRef.current = micData;
  }, [micData]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Prevent double initialization in React Strict Mode
    if (isInitializedRef.current) {
      console.log('⚠️ Skipping re-initialization (already initialized)');
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
    
    console.log('🖼️ Canvas appended to DOM:', {
      canvasWidth: renderer.domElement.width,
      canvasHeight: renderer.domElement.height,
      styleWidth: renderer.domElement.style.width,
      styleHeight: renderer.domElement.style.height,
    });

    // Create orthographic camera for 2D
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    camera.position.z = 1;
    cameraRef.current = camera;

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    
    // Number of vertices: 2 per sample point (for the quad)
    const numVertices = nSamples * 2;
    
    // aIdx attribute: 0 or 1 for each vertex (which side of the line)
    const idxArray = new Float32Array(numVertices);
    for (let i = 0; i < nSamples; i++) {
      idxArray[i * 2 + 0] = 0.0;
      idxArray[i * 2 + 1] = 1.0;
    }
    
    // aStart and aEnd attributes: positions (will be updated each frame)
    const startArray = new Float32Array(numVertices * 2);
    const endArray = new Float32Array(numVertices * 2);
    
    // Initialize with a circle
    for (let i = 0; i < nSamples; i++) {
      const angle = (i / nSamples) * Math.PI * 2;
      const x = Math.cos(angle) * 0.5;
      const y = Math.sin(angle) * 0.5;
      
      // Both vertices of this sample get the same start position
      startArray[(i * 2 + 0) * 2 + 0] = x;
      startArray[(i * 2 + 0) * 2 + 1] = y;
      startArray[(i * 2 + 1) * 2 + 0] = x;
      startArray[(i * 2 + 1) * 2 + 1] = y;
      
      // End position (next point)
      const nextI = (i + 1) % nSamples;
      const nextAngle = (nextI / nSamples) * Math.PI * 2;
      const nextX = Math.cos(nextAngle) * 0.5;
      const nextY = Math.sin(nextAngle) * 0.5;
      
      endArray[(i * 2 + 0) * 2 + 0] = nextX;
      endArray[(i * 2 + 0) * 2 + 1] = nextY;
      endArray[(i * 2 + 1) * 2 + 0] = nextX;
      endArray[(i * 2 + 1) * 2 + 1] = nextY;
    }
    
    // Index buffer: create triangles for quads
    const indices = new Uint16Array((nSamples - 1) * 6);
    for (let i = 0; i < nSamples - 1; i++) {
      const vi = i * 2;
      const idx = i * 6;
      
      // First triangle
      indices[idx + 0] = vi + 0;
      indices[idx + 1] = vi + 1;
      indices[idx + 2] = vi + 2;
      
      // Second triangle
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
    
    console.log('🎨 Material created with uniforms:', material.uniforms);

    // Create oscilloscope mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false; // CRITICAL: Always render, don't cull based on bounding box
    scene.add(mesh);
    meshRef.current = mesh;
    
    console.log('🎯 Mesh frustumCulled:', mesh.frustumCulled);
    
    // Force shader compilation and check for errors
    renderer.compile(scene, camera);
    
    // Check for WebGL errors
    const gl = renderer.getContext();
    const glError = gl.getError();
    if (glError !== gl.NO_ERROR) {
      console.error('❌ WebGL Error after setup:', glError);
    } else {
      console.log('✅ No WebGL errors detected');
    }
    
    // Check if shader compiled successfully
    material.addEventListener('dispose', () => {
      console.log('🗑️ Material disposed');
    });
    
    // Log shader info
    console.log('📝 Vertex shader length:', vertexShader.length);
    console.log('📝 Fragment shader length:', fragmentShader.length);

    console.log('✅ Oscilloscope initialized:', {
      vertices: numVertices,
      triangles: indices.length / 3,
      samples: nSamples,
      camera: {
        left: camera.left,
        right: camera.right,
        top: camera.top,
        bottom: camera.bottom,
      },
    });

    // Force initial waveform update before first render
    let frameCount = 0;
    
    // Animation loop
    const animate = () => {
      frameCount++;
      
      
      updateWaveform();
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        
        // Debug render call
        if (frameCount === 120) {
          console.log('🎥 Render at frame 120:', {
            sceneChildren: sceneRef.current.children.length,
            meshVisible: meshRef.current?.visible,
            meshInScene: sceneRef.current.children.includes(meshRef.current!),
            rendererInfo: rendererRef.current.info.render,
          });
        }
      }
      
      // Debug first few frames
      if (frameCount <= 5) {
        if (frameCount === 1) {
          console.log('🎬 First frame rendered');
          console.log('Material uniforms:', materialRef.current?.uniforms);
          console.log('Geometry attributes:', {
            aIdx: geometry.getAttribute('aIdx'),
            aStart: geometry.getAttribute('aStart'),
            aEnd: geometry.getAttribute('aEnd'),
          });
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    console.log('🚀 Starting animation loop...');
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
      console.log('🧹 Cleaning up oscilloscope...');
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
    const bass = currentMicData?.bass || 0;
    const energy = currentMicData?.energy || 0;
    const volume = currentMicData?.volume || 0;
    const treble = currentMicData?.treble || 0;
    
    
    // Dynamic scale based on audio intensity - gets MUCH bigger with bass
    const baseScale = 0.7;
    const scale = baseScale + bass * 0.5 + energy * 0.3 + volume * 0.2;
    
    const time = Date.now() / 1000;
    
    updateWaveformRef.current++;

    if (waveform && waveform.length > 0) {
      // Use real waveform data - X/Y mode (Lissajous patterns)
      
      for (let i = 0; i < nSamples; i++) {
        // Get X from waveform
        const idx1 = Math.floor((i / nSamples) * waveform.length);
        // Get Y from phase-shifted waveform
        const idx2 = Math.floor(((i + nSamples / 4) / nSamples) * waveform.length) % waveform.length;
        
        // Convert 0-255 to -1 to 1, then AMPLIFY by 3x for visibility
        const amplification = 3.0;
        const x = (waveform[idx1] / 127.5 - 1) * scale * amplification;
        const y = (waveform[idx2] / 127.5 - 1) * scale * amplification;
        
        // Set start position for both vertices
        const vi = i * 2;
        startAttr.setXY(vi + 0, x, y);
        startAttr.setXY(vi + 1, x, y);
        
        // Set end position (next point)
        const nextI = (i + 1) % nSamples;
        const nextIdx1 = Math.floor((nextI / nSamples) * waveform.length);
        const nextIdx2 = Math.floor(((nextI + nSamples / 4) / nSamples) * waveform.length) % waveform.length;
        
        const nextX = (waveform[nextIdx1] / 127.5 - 1) * scale;
        const nextY = (waveform[nextIdx2] / 127.5 - 1) * scale;
        
        endAttr.setXY(vi + 0, nextX, nextY);
        endAttr.setXY(vi + 1, nextX, nextY);
      }
    } else {
      // Animated Lissajous curve fallback
      for (let i = 0; i < nSamples; i++) {
        const t = (i / nSamples) * Math.PI * 2;
        const x = Math.sin(t * 3 + time * 0.5) * scale;
        const y = Math.sin(t * 2 + time * 0.3) * scale;
        
        const vi = i * 2;
        startAttr.setXY(vi + 0, x, y);
        startAttr.setXY(vi + 1, x, y);
        
        const nextI = (i + 1) % nSamples;
        const nextT = (nextI / nSamples) * Math.PI * 2;
        const nextX = Math.sin(nextT * 3 + time * 0.5) * scale;
        const nextY = Math.sin(nextT * 2 + time * 0.3) * scale;
        
        endAttr.setXY(vi + 0, nextX, nextY);
        endAttr.setXY(vi + 1, nextX, nextY);
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
    const bassColor = bass * 0.5; // 0 to 0.5 (green to red via yellow)
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
      {/* Overlay lyrics if available */}
      {lyrics && lyrics.length > 0 && currentTimeMs !== undefined && (
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            color: "#00ff00",
            fontSize: "2rem",
            textShadow: "0 0 10px #00ff00",
            pointerEvents: "none",
            zIndex: 1,
            maxWidth: "80%",
          }}
        >
          {(() => {
            const currentLine = lyrics.find((line, index) => {
              const nextLine = lyrics[index + 1];
              return currentTimeMs >= line.time && (!nextLine || currentTimeMs < nextLine.time);
            });
            return currentLine?.text || "";
          })()}
        </div>
      )}
    </div>
  );
}
