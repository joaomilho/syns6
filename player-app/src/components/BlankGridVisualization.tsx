"use client";

import { useEffect, useRef } from "react";
import { AmbientLight, AxesHelper, Color, DirectionalLight, GridHelper, Mesh, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface BlankGridVisualizationProps {
  micData?: any;
}

export default function BlankGridVisualization({
  micData,
}: BlankGridVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear any existing canvases first
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Scene setup
    const scene = new Scene();
    scene.background = new Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera setup
    const camera = new PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1); // Fixed 1x for performance (was Math.min(devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 1);
    
    // Make canvas visible
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
    const gridHelper = new GridHelper(20, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Axes helper (optional, for reference)
    const axesHelper = new AxesHelper(5);
    scene.add(axesHelper);

    // Ambient light
    const ambientLight = new AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

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

      if (controlsRef.current) {
        controlsRef.current.update();
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

      // Dispose of scene objects
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof Mesh) {
            object.geometry?.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material?.dispose();
            }
          }
        });
        while(sceneRef.current.children.length > 0) {
          sceneRef.current.remove(sceneRef.current.children[0]);
        }
      }

      // Dispose of controls
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      // Dispose of renderer and force context loss
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current = null;
      }

      // Remove canvas from DOM
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }

      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, []);

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
        backgroundColor: "#000000",
      }}
    />
  );
}

