"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface CompiledVisualizationProps {
  compiledCode: string;
  micData?: any;
  isPlaying?: boolean;
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
}: CompiledVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const errorRef = useRef<string | null>(null);
  const updateFunctionRef = useRef<((
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    micData: any,
    time: number,
    THREE: any
  ) => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const instanceId = Math.random().toString(36).substring(7);
    console.log(`🎬 COMPILED_VIZ_STARTING [${instanceId}]`);
    
    // Ensure THREE is loaded
    if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) {
      console.error('❌ THREE.js not loaded properly');
      errorRef.current = 'THREE.js library failed to load';
      return;
    }

    // Scene setup - create fresh scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    scene.userData = { compiledObjects: [] }; // Initialize empty array
    sceneRef.current = scene;
    console.log('🎭 Created new scene');

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 15); // Match DSL visualization camera position
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    console.log('🎮 COMPILED_VIZ_CREATING_WEBGL');
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    console.log('✅ COMPILED_VIZ_WEBGL_SUCCESS');
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.backgroundColor = '#000';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 50;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Much brighter ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Back light
    const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    console.log('💡 Lights added (compiled mode)');

    // Execute compiled code
    try {
      console.log('📝 Compiled code length:', compiledCode.length);
      console.log('📝 Compiled code preview:', compiledCode.substring(0, 200));
      
      // The compiled code returns {init, update} functions
      const compiledFunction = new Function('THREE', compiledCode);
      console.log('✅ Compiled function created successfully');
      
      const result = compiledFunction(THREE);
      console.log('✅ Compiled function executed, result:', typeof result, result);
      
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
      console.log('✅ Successfully executed compiled visualization code');
      console.log('📊 Scene setup:', {
        sceneChildren: scene.children.length,
        compiledObjects: scene.userData.compiledObjects?.length || 0,
        cameraPosition: camera.position,
        hasLights: scene.children.some(c => c instanceof THREE.Light),
        firstObjectPosition: scene.userData.compiledObjects?.[0]?.position,
        firstObjectColor: scene.userData.compiledObjects?.[0]?.material?.color?.getHex(),
        firstObjectMaterialType: scene.userData.compiledObjects?.[0]?.material?.type
      });
    } catch (error) {
      console.error('❌ Error executing compiled code:', error);
      console.error('❌ Compiled code was:', compiledCode);
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
          updateFunctionRef.current(
            sceneRef.current,
            cameraRef.current,
            rendererRef.current,
            micData || {
              bass: 0,
              mid: 0,
              treble: 0,
              subBass: 0,
              presence: 0,
              voiceStrength: 0,
              drums: 0,
              energy: 0,
              frequencyData: new Uint8Array(128),
            },
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
      
      // Debug log once per second
      if (Math.floor(time) % 5 === 0 && time > 0 && Math.abs(time - Math.floor(time)) < 0.1) {
        console.log(`🔄 Animation running [${instanceId}]:`, {
          time: time.toFixed(1),
          sceneChildren: sceneRef.current?.children.length,
          compiledObjects: sceneRef.current?.userData.compiledObjects?.length,
          firstObjectScale: sceneRef.current?.userData.compiledObjects?.[0]?.scale.x
        });
      }
    };
    animate();

    // Cleanup
    return () => {
      console.log(`🧹 COMPILED_VIZ_CLEANUP [${instanceId}] - Canvases before cleanup:`, containerRef.current?.children.length);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (rendererRef.current) {
        const canvas = rendererRef.current.domElement;
        rendererRef.current.dispose();
        // Forcefully remove the canvas from DOM
        if (canvas && canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
          console.log('🗑️ Removed canvas from parent');
        }
        rendererRef.current = null;
      }

      // Also clear the container
      if (containerRef.current) {
        const childCount = containerRef.current.children.length;
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
        console.log(`🗑️ Removed ${childCount} children from container`);
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

