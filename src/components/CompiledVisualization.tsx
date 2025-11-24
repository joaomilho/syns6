"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Canvas } from "@react-three/fiber";
import Lyrics3D from "./Lyrics3D";
import { LyricLine } from "@/lib/lyrics";

interface CompiledVisualizationProps {
  compiledCode: string;
  micData?: any;
  isPlaying?: boolean;
  lyrics?: LyricLine[];
  currentTimeMs?: number;
}

/**
 * CompiledVisualization Component
 * 
 * Executes pre-compiled JavaScript code generated from DSL.
 * This is MUCH faster than runtime DSL interpretation because:
 * - No JSON parsing per frame
 * - No expression evaluation overhead
 * - Direct property access
 * - JIT compilation optimizations
 */
export default function CompiledVisualization({
  compiledCode,
  micData,
  isPlaying,
  lyrics,
  currentTimeMs,
}: CompiledVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const errorRef = useRef<string | null>(null);
  const micDataRef = useRef<any>(micData); // EXACT COPY from DSLVisualization - use ref for current value
  const updateFunctionRef = useRef<((
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    micData: any,
    time: number,
    THREE: any
  ) => void) | null>(null);

  // EXACT COPY from DSLVisualization - Keep ref in sync with prop
  useEffect(() => {
    micDataRef.current = micData;
  }, [micData]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log('🚀 Initializing CompiledVisualization');
    
    // EXACT COPY from DSLVisualization - Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    scene.userData = { compiledObjects: [] };
    sceneRef.current = scene;

    // EXACT COPY from DSLVisualization - Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // EXACT COPY from DSLVisualization - Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true, // Required for screenshots
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // EXACT COPY from DSLVisualization - Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 50;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // EXACT COPY from DSLVisualization - Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // EXACT COPY from DSLVisualization - Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);
    

    // Execute compiled code
    try {
      // The compiled code returns {init, update} functions
      const compiledFunction = new Function('THREE', compiledCode);
      const result = compiledFunction(THREE);
      
      if (!result || typeof result !== 'object') {
        throw new Error('Compiled code did not return an object');
      }
      
      const { init, update } = result;
      
      if (typeof init !== 'function' || typeof update !== 'function') {
        throw new Error('Compiled code did not return init/update functions');
      }
      
      // Initialize visualization objects
      init(scene, THREE);
      updateFunctionRef.current = update;
      errorRef.current = null;
      
      // Force scene update
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.material.needsUpdate = true;
        }
      });
      
      console.log(`✅ Compiled visualization initialized: ${scene.userData.compiledObjects?.length || 0} objects`);
      if (scene.userData.compiledObjects?.[0]) {
        console.log('First object material:', {
          type: scene.userData.compiledObjects[0].material.type,
          color: scene.userData.compiledObjects[0].material.color.getHex(),
          emissive: scene.userData.compiledObjects[0].material.emissive?.getHex(),
          emissiveIntensity: scene.userData.compiledObjects[0].material.emissiveIntensity
        });
      }
    } catch (error) {
      console.error('❌ Error executing compiled code:', error);
      errorRef.current = error instanceof Error ? error.message : 'Unknown error';
    }

    // Handle window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;

      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const time = (Date.now() - startTimeRef.current) / 1000;

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Execute compiled update function
      if (updateFunctionRef.current && sceneRef.current && cameraRef.current && rendererRef.current) {
        try {
          // Use ref to get CURRENT micData value (not captured)
          const currentMicData = micDataRef.current || {
            bass: 0,
            mid: 0,
            treble: 0,
            subBass: 0,
            presence: 0,
            voiceStrength: 0,
            drums: 0,
            energy: 0,
          };
          
          updateFunctionRef.current(
            sceneRef.current,
            cameraRef.current,
            rendererRef.current,
            currentMicData,
            time,
            THREE
          );
        } catch (error) {
          console.error('⚠️ Runtime error in compiled visualization:', error);
          console.error('Error details:', error);
          if (!errorRef.current) {
            errorRef.current = error instanceof Error ? error.message : 'Runtime error';
          }
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Cleanup
    return () => {
      console.log('[perf] 🧹 CompiledVisualization unmounting, disposing resources');
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      // Dispose of scene objects (geometries and materials)
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) {
              object.geometry.dispose();
            }
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else if (object.material) {
              object.material.dispose();
            }
          }
        });
        // Clear all children
        while (sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (rendererRef.current) {
        const canvas = rendererRef.current.domElement;
        rendererRef.current.dispose();
        // Force WebGL context loss
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context');
          if (loseContext) {
            loseContext.loseContext();
          }
        }
        // Forcefully remove the canvas from DOM
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        rendererRef.current = null;
      }

      // Also clear the container
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }
      
      // Clear scene userData to release references
      if (sceneRef.current) {
        sceneRef.current.userData = {};
      }
      
      sceneRef.current = null;
      cameraRef.current = null;
      updateFunctionRef.current = null;
    };
  }, [compiledCode]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
        }}
      />
      {/* Lyrics Display - EXACT COPY from DSLVisualization */}
      {lyrics && lyrics.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <Canvas
            camera={{ position: [0, 0, 30], fov: 75 }}
            style={{
              background: "transparent",
            }}
          >
            <group position={[0, -2, -10]} scale={2}>
              <Lyrics3D
                lyrics={lyrics}
                currentTimeMs={currentTimeMs || 0}
                isPlaying={isPlaying || false}
                syncedData={null}
                micData={micData}
              />
            </group>
          </Canvas>
        </div>
      )}
      
      {/* Debug overlay */}
      {errorRef.current && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(220, 38, 38, 0.95)",
            color: "white",
            padding: "20px",
            borderRadius: "12px",
            zIndex: 100,
            maxWidth: "80%",
            fontFamily: "monospace",
            backgroundColor: "#000",
            border: "3px solid #dc2626",
          }}
        >
          <strong>❌ Compiled Visualization Error:</strong>
          <br />
          {errorRef.current}
        </div>
      )}
    </>
  );
}

