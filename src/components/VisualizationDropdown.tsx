"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./VisualizationDropdown.module.css";
import { CustomVisualization } from "@/lib/customVisualizations";

export type VisualizationType =
  | "particles"
  | "fractal"
  | "psychedelic"
  | "youtube"
  | "waves"
  | "blackmetal"
  | "animated"
  | "spectrum3d"
  | "wavespectrum"
  | "fftspectrum"
  | "camera"
  | "debug"
  | string; // Allow custom IDs

interface VisualizationOption {
  id: VisualizationType;
  name: string;
  icon: string;
  thumbnail: string; // SVG or emoji representation
}

interface VisualizationAssets {
  static: string;
  animated: string;
}

const visualizations: (VisualizationOption & { assets: VisualizationAssets })[] = [
  {
    id: "fftspectrum",
    name: "FFT Spectrum Grid",
    icon: "▥",
    thumbnail: "/viz-thumbnails/fftspectrum.png",
    assets: {
      static: "/viz-thumbnails/fftspectrum.png",
      animated: "/viz-thumbnails/fftspectrum.webp",
    },
  },
  {
    id: "particles",
    name: "Particles & Rings",
    icon: "◯",
    thumbnail: "/viz-thumbnails/particles.png",
    assets: {
      static: "/viz-thumbnails/particles.png",
      animated: "/viz-thumbnails/particles.webp",
    },
  },
  {
    id: "fractal",
    name: "Fractal Tree",
    icon: "❋",
    thumbnail: "/viz-thumbnails/fractal.png",
    assets: {
      static: "/viz-thumbnails/fractal.png",
      animated: "/viz-thumbnails/fractal.webp",
    },
  },
  {
    id: "psychedelic",
    name: "Psychedelic",
    icon: "✧",
    thumbnail: "/viz-thumbnails/psychedelic.png",
    assets: {
      static: "/viz-thumbnails/psychedelic.png",
      animated: "/viz-thumbnails/psychedelic.webp",
    },
  },
  {
    id: "waves",
    name: "Wavy Lines",
    icon: "≋",
    thumbnail: "/viz-thumbnails/waves.png",
    assets: {
      static: "/viz-thumbnails/waves.png",
      animated: "/viz-thumbnails/waves.webp",
    },
  },
  {
    id: "animated",
    name: "Morphing Blobs",
    icon: "◉",
    thumbnail: "/viz-thumbnails/animated.png",
    assets: {
      static: "/viz-thumbnails/animated.png",
      animated: "/viz-thumbnails/animated.webp",
    },
  },
  {
    id: "spectrum3d",
    name: "3D Spectrum",
    icon: "▦",
    thumbnail: "/viz-thumbnails/spectrum3d.png",
    assets: {
      static: "/viz-thumbnails/spectrum3d.png",
      animated: "/viz-thumbnails/spectrum3d.webp",
    },
  },
  {
    id: "wavespectrum",
    name: "Wave Spectrum",
    icon: "▬",
    thumbnail: "/viz-thumbnails/wavespectrum.png",
    assets: {
      static: "/viz-thumbnails/wavespectrum.png",
      animated: "/viz-thumbnails/wavespectrum.webp",
    },
  },
  {
    id: "camera",
    name: "Camera Effects",
    icon: "⊡",
    thumbnail: "/viz-thumbnails/camera.png",
    assets: {
      static: "/viz-thumbnails/camera.png",
      animated: "/viz-thumbnails/camera.webp",
    },
  },
  {
    id: "youtube",
    name: "YouTube Videos",
    icon: "▶",
    thumbnail: "/viz-thumbnails/youtube.png",
    assets: {
      static: "/viz-thumbnails/youtube.png",
      animated: "/viz-thumbnails/youtube.webp",
    },
  },
  {
    id: "debug",
    name: "Debug View",
    icon: "▤",
    thumbnail: "/viz-thumbnails/debug.png",
    assets: {
      static: "/viz-thumbnails/debug.png",
      animated: "/viz-thumbnails/debug.webp",
    },
  },
];

interface VisualizationDropdownProps {
  value: VisualizationType;
  onChange: (value: VisualizationType) => void;
  customVisualizations?: CustomVisualization[];
}

export default function VisualizationDropdown({
  value,
  onChange,
  customVisualizations = [],
}: VisualizationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentViz = visualizations.find((v) => v.id === value);
  const currentCustom = customVisualizations.find((v) => v.id === value);

  // Debug: Log when custom visualizations change
  useEffect(() => {
    console.log('🎨 Dropdown received custom visualizations:', customVisualizations.length);
  }, [customVisualizations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (vizId: VisualizationType) => {
    onChange(vizId);
    setIsOpen(false);
  };


  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Select Visualization"
      >
        <span className={styles.icon}>
          {currentCustom?.icon || currentViz?.icon || "◯"}
        </span>
        <span className={styles.label}>
          {currentCustom?.name || currentViz?.name || "Custom"}
        </span>
        <span className={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.menuHeader}>Select Visualization</div>
          
          {/* Built-in Visualizations */}
          <div className={styles.visualizationGrid}>
            {visualizations.map((viz) => (
              <button
                key={viz.id}
                className={`${styles.vizOption} ${
                  viz.id === value ? styles.active : ""
                }`}
                onClick={() => handleSelect(viz.id)}
              >
                <div className={styles.thumbnailContainer}>
                  <div
                    className={styles.thumbnail}
                    style={{ 
                      backgroundImage: `url(${viz.assets.static})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                  <div
                    className={`${styles.thumbnail} ${styles.thumbnailAnimated}`}
                    style={{ 
                      backgroundImage: `url(${viz.assets.animated})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  />
                </div>
                <span className={styles.vizName}>{viz.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Visualizations */}
          {customVisualizations.length > 0 && (
            <>
              <div className={styles.menuHeader} style={{ marginTop: "16px" }}>
                Your Creations
              </div>
              <div className={styles.visualizationGrid}>
                {customVisualizations.map((viz) => (
                  <button
                    key={viz.id}
                    className={`${styles.vizOption} ${
                      viz.id === value ? styles.active : ""
                    } ${styles.customViz}`}
                    onClick={() => handleSelect(viz.id as VisualizationType)}
                  >
                    <div className={styles.thumbnailContainer}>
                      <div
                        className={styles.thumbnail}
                        style={
                          viz.thumbnail?.startsWith('data:image/')
                            ? {
                                backgroundImage: `url(${viz.thumbnail})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }
                            : {
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              }
                        }
                      >
                      </div>
                    </div>
                    <span className={styles.vizName}>{viz.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}

