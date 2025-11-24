"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface CustomVisualizationProps {
  code: string;
  micData?: any;
  isPlaying?: boolean;
}

export default function CustomVisualization({
  code,
  micData,
  isPlaying,
}: CustomVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const errorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 50);
    scene.userData = {}; // Initialize userData for custom code to store objects
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
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

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Add another light from opposite side for better visibility
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(-5, 5, -5);
    scene.add(backLight);

    console.log('💡 Lights added:', {
      ambient: ambientLight.intensity,
      directional: directionalLight.intensity,
      backLight: backLight.intensity
    });

    // Compile user code into a function
    let userAnimateFunction: ((
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
      renderer: THREE.WebGLRenderer,
      micData: any,
      time: number,
      THREE: any
    ) => void) | null = null;

    try {
      // Validate code is not empty
      if (!code || code.trim().length === 0) {
        throw new Error('Visualization code is empty');
      }

      // Strip markdown code fences if present
      const stripCodeFences = (c: string): string => {
        return c.replace(/^```(?:json|javascript|js)?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
      };
      const cleanCode = stripCodeFences(code);

      // Check if code looks like JSON (DSL format) - should be handled by DSLVisualization instead
      const trimmedCode = cleanCode.trim();
      if (trimmedCode.startsWith('{') || trimmedCode.startsWith('[')) {
        try {
          JSON.parse(trimmedCode);
          throw new Error('This appears to be JSON DSL format. It should be handled by DSLVisualization component, not CustomVisualization.');
        } catch (jsonError) {
          if (jsonError instanceof SyntaxError) {
            // Not valid JSON, continue with JavaScript execution
          } else {
            // Valid JSON, throw the error
            throw jsonError;
          }
        }
      }

      // Create function from user code - DON'T wrap with try-catch here
      // We'll wrap the function CALL instead
      userAnimateFunction = new Function(
        'scene',
        'camera',
        'renderer',
        'micData',
        'time',
        'THREE',
        cleanCode // Use cleaned code without fences
      ) as any;
      errorRef.current = null;
      console.log('✅ Successfully compiled visualization code');
      console.log('📊 Scene setup:', {
        sceneChildren: scene.children.length,
        cameraPosition: camera.position,
        hasLights: scene.children.some(c => c instanceof THREE.Light)
      });
    } catch (error) {
      console.error('❌ Error compiling visualization code:', error);
      console.error('Code that failed:', code);
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

      // Execute user code with error handling
      if (userAnimateFunction && sceneRef.current && cameraRef.current && rendererRef.current) {
        try {
          userAnimateFunction(
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
          
          // Log scene info every 3 seconds
          if (Math.floor(time) % 3 === 0 && Math.floor(time) !== Math.floor((Date.now() - startTimeRef.current) / 1000 - 1)) {
            console.log('🎨 Visualization running:', {
              time: time.toFixed(1),
              objects: sceneRef.current.children.length,
              userDataKeys: Object.keys(sceneRef.current.userData),
              cameraPos: cameraRef.current.position,
              micData: {
                bass: micData?.bass?.toFixed(2),
                energy: micData?.energy?.toFixed(2)
              }
            });
          }
        } catch (error) {
          // Catch runtime errors in user code
          console.error('⚠️ Runtime error in custom visualization:', error);
          console.error('Scene state:', {
            children: sceneRef.current.children.length,
            userData: Object.keys(sceneRef.current.userData)
          });
          // Don't spam console - only log once per second
          if (!errorRef.current || Date.now() - startTimeRef.current > 1000) {
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
      console.log('[perf] 🧹 CustomVisualization unmounting, disposing resources');
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
        // Clear userData to release references
        sceneRef.current.userData = {};
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
        rendererRef.current = null;
      }

      if (containerRef.current && containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [code]);

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
          <strong>❌ Visualization Error:</strong>
          <br />
          {errorRef.current}
        </div>
      )}
    </>
  );
}

