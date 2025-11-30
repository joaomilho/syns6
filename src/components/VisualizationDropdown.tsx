"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./VisualizationDropdown.module.css";
import { CustomVisualization } from "@/lib/customVisualizations";

export type VisualizationType =
  | "particles"
  | "fractal"
  | "psychedelic"
  | "kaleidoscope"
  | "youtube"
  | "waves"
  | "blackmetal"
  | "animated"
  | "spectrum3d"
  | "fftspectrum"
  | "lyricsonly"
  | "oscilloscope"
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
    thumbnail: "/viz-thumbnails/fftspectrum-static.webp",
    assets: {
      static: "/viz-thumbnails/fftspectrum-static.webp",
      animated: "/viz-thumbnails/fftspectrum.webm",
    },
  },
  {
    id: "lyricsonly",
    name: "Lyrics Only",
    icon: "♪",
    thumbnail: "/viz-thumbnails/lyricsonly.png",
    assets: {
      static: "/viz-thumbnails/lyricsonly.png",
      animated: "/viz-thumbnails/lyricsonly.png",
    },
  },
  {
    id: "particles",
    name: "Particles & Rings",
    icon: "◯",
    thumbnail: "/viz-thumbnails/particles-static.webp",
    assets: {
      static: "/viz-thumbnails/particles-static.webp",
      animated: "/viz-thumbnails/particles.webm",
    },
  },
  {
    id: "fractal",
    name: "Fractal Tree",
    icon: "❋",
    thumbnail: "/viz-thumbnails/fractal-static.webp",
    assets: {
      static: "/viz-thumbnails/fractal-static.webp",
      animated: "/viz-thumbnails/fractal.webm",
    },
  },
  {
    id: "psychedelic",
    name: "Psychedelic",
    icon: "✧",
    thumbnail: "/viz-thumbnails/psychedelic-static.webp",
    assets: {
      static: "/viz-thumbnails/psychedelic-static.webp",
      animated: "/viz-thumbnails/psychedelic.webm",
    },
  },
  {
    id: "kaleidoscope",
    name: "Kaleidoscope",
    icon: "◈",
    thumbnail: "/viz-thumbnails/kaleidoscope-static.webp",
    assets: {
      static: "/viz-thumbnails/kaleidoscope-static.webp",
      animated: "/viz-thumbnails/kaleidoscope.webm",
    },
  },
  {
    id: "waves",
    name: "Wavy Lines",
    icon: "≋",
    thumbnail: "/viz-thumbnails/waves-static.webp",
    assets: {
      static: "/viz-thumbnails/waves-static.webp",
      animated: "/viz-thumbnails/waves.webm",
    },
  },
  {
    id: "animated",
    name: "Lava Lamp",
    icon: "⦿",
    thumbnail: "/viz-thumbnails/animated-static.webp",
    assets: {
      static: "/viz-thumbnails/animated-static.webp",
      animated: "/viz-thumbnails/animated.webm",
    },
  },
  {
    id: "spectrum3d",
    name: "3D Spectrum",
    icon: "▦",
    thumbnail: "/viz-thumbnails/spectrum3d-static.webp",
    assets: {
      static: "/viz-thumbnails/spectrum3d-static.webp",
      animated: "/viz-thumbnails/spectrum3d.webm",
    },
  },
  {
    id: "oscilloscope",
    name: "Oscilloscope X-Y",
    icon: "◉",
    thumbnail: "/viz-thumbnails/oscilloscope-static.webp",
    assets: {
      static: "/viz-thumbnails/oscilloscope-static.webp",
      animated: "/viz-thumbnails/oscilloscope.webm",
    },
  },
  {
    id: "camera",
    name: "Camera Effects",
    icon: "⊡",
    thumbnail: "/viz-thumbnails/camera-static.webp",
    assets: {
      static: "/viz-thumbnails/camera-static.webp",
      animated: "/viz-thumbnails/camera.webm",
    },
  },
  {
    id: "youtube",
    name: "YouTube Videos",
    icon: "▶",
    thumbnail: "/viz-thumbnails/youtube-static.webp",
    assets: {
      static: "/viz-thumbnails/youtube-static.webp",
      animated: "/viz-thumbnails/youtube.webm",
    },
  },
  {
    id: "debug",
    name: "Debug View",
    icon: "▤",
    thumbnail: "/viz-thumbnails/debug-static.webp",
    assets: {
      static: "/viz-thumbnails/debug-static.webp",
      animated: "/viz-thumbnails/debug.webm",
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
                  <video
                    className={`${styles.thumbnail} ${styles.thumbnailAnimated}`}
                    src={viz.assets.animated}
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
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

