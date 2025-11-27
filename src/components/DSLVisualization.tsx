"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VisualizationInterpreter } from "@/lib/visualizationDSL/interpreter";
import { VisualizationDSL, validateDSL } from "@/lib/visualizationDSL/schema";

interface DSLVisualizationProps {
  config: VisualizationDSL;
  micData?: any;
}

export default function DSLVisualization({
  config,
  micData,
}: DSLVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const interpreterRef = useRef<VisualizationInterpreter | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const micDataRef = useRef(micData);

  // Update micData ref on every render so animation loop gets fresh data
  useEffect(() => {
    micDataRef.current = micData;
  }, [micData]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear any existing canvases first
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    
    console.log(`🎨 DSL Init: ${config.name}`);

    // Validate config
    if (!validateDSL(config)) {
      console.error('❌ Invalid DSL configuration');
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Camera position to see all cubes clearly
    camera.position.set(0, 5, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false, // Changed to false to ensure opaque background
      preserveDrawingBuffer: true, // Required for screenshots
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1); // Explicitly set clear color to black
    
    // Make canvas visible and on top for debugging
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    
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

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    // Create interpreter and initialize
    const interpreter = new VisualizationInterpreter(scene, camera, config);
    try {
      interpreter.initialize();
      interpreterRef.current = interpreter;
    } catch (error) {
      console.error('❌ Failed to initialize DSL interpreter:', error);
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

      // Update interpreter with audio data
      if (interpreterRef.current) {
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
          
          interpreterRef.current.update(time, currentMicData);
        } catch (error) {
          console.error('⚠️ DSL animation error:', error);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);

      // Dispose interpreter
      if (interpreterRef.current) {
        interpreterRef.current.dispose();
        interpreterRef.current = null;
      }

      // Dispose controls
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }

      // Remove canvas
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }

      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [config]); // Only depend on config, not micData!

  return (
    <>
      {/* Three.js visualization background */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          backgroundColor: "#000000",
        }}
      />
    </>
  );
}

