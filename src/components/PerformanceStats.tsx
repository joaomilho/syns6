"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Performance Stats Monitor
 * Shows FPS, MS, and Memory (if available)
 * Toggle with 'S' key or prop
 */
export default function PerformanceStats({ 
  visible = false,
  position = 'top-left' 
}: { 
  visible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}) {
  const statsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!visible) return;

    // Dynamically import Stats to avoid SSR issues
    const loadStats = async () => {
      try {
        // Import Stats from three.js addons
        const { default: Stats } = await import('three/addons/libs/stats.module.js');
        
        if (!containerRef.current || statsRef.current) return;

        // Create FPS panel
        const fpsStats = new Stats();
        fpsStats.showPanel(0); // 0: fps, 1: ms, 2: mb
        fpsStats.dom.style.position = 'relative';
        
        // Create MS panel
        const msStats = new Stats();
        msStats.showPanel(1);
        msStats.dom.style.position = 'relative';
        
        // Create Memory panel (if available)
        const memStats = new Stats();
        memStats.showPanel(2);
        memStats.dom.style.position = 'relative';

        // Add all panels to container
        if (containerRef.current) {
          containerRef.current.appendChild(fpsStats.dom);
          containerRef.current.appendChild(msStats.dom);
          containerRef.current.appendChild(memStats.dom);
        }

        // Store refs
        statsRef.current = [fpsStats, msStats, memStats];
        setIsLoaded(true);

        // Animation loop to update stats
        let animationFrameId: number;
        const animate = () => {
          if (statsRef.current) {
            statsRef.current.forEach((stat: any) => {
              stat.begin();
              stat.end();
            });
          }
          animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        // Cleanup
        return () => {
          cancelAnimationFrame(animationFrameId);
          if (statsRef.current) {
            statsRef.current.forEach((stat: any) => {
              stat.dom.remove();
            });
            statsRef.current = null;
          }
        };
      } catch (error) {
        console.error('Failed to load Stats:', error);
      }
    };

    loadStats();
  }, [visible]);

  if (!visible) return null;

  // Position styles
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 0, left: 0 },
    'top-right': { top: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
    'bottom-right': { bottom: 0, right: 0 },
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)',
      }}
    >
      {!isLoaded && (
        <div style={{ color: '#fff', fontSize: '12px', padding: '4px' }}>
          Loading stats...
        </div>
      )}
    </div>
  );
}

