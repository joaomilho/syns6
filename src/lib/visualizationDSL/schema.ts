/**
 * Visualization DSL Schema
 * Declarative JSON-based format for music-reactive 3D visualizations
 */

export interface VisualizationDSL {
  version: string;
  name: string;
  objects: VisualizationObject[];
  camera?: CameraConfig;
}

export interface VisualizationObject {
  id: string;
  type: 'single' | 'group';
  count?: number; // For groups, how many instances
  geometry: GeometryConfig;
  material: MaterialConfig;
  position?: PositionConfig;
  rotation?: RotationConfig;
  scale?: ScaleConfig;
  animations?: Animation[];
}

export interface GeometryConfig {
  type: 'box' | 'sphere' | 'cylinder' | 'torus' | 'plane' | 'cone' | 'dodecahedron' | 'icosahedron';
  // Box
  width?: number;
  height?: number;
  depth?: number;
  // Sphere
  radius?: number;
  widthSegments?: number;
  heightSegments?: number;
  // Cylinder
  radiusTop?: number;
  radiusBottom?: number;
  // Torus
  tubeRadius?: number;
}

export interface MaterialConfig {
  type: 'basic' | 'phong' | 'standard' | 'lambert';
  color?: ColorExpression | number;
  emissive?: ColorExpression | number;
  emissiveIntensity?: string | number;
  metalness?: string | number;
  roughness?: string | number;
  wireframe?: boolean;
}

export interface ColorExpression {
  h: string | number; // Hue: 0-1 or expression
  s: string | number; // Saturation: 0-1
  l: string | number; // Lightness: 0-1
}

export interface PositionConfig {
  x?: string | number;
  y?: string | number;
  z?: string | number;
}

export interface RotationConfig {
  x?: string | number;
  y?: string | number;
  z?: string | number;
}

export interface ScaleConfig {
  x?: string | number;
  y?: string | number;
  z?: string | number;
  uniform?: string | number; // Same scale for x, y, z
}

export interface Animation {
  property: string; // e.g., "position.y", "rotation.x", "scale"
  value: string | number; // Expression or constant
  easing?: 'linear' | 'easeIn' | 'easeOut';
}

export interface CameraConfig {
  position?: PositionConfig;
  lookAt?: PositionConfig;
  animations?: Animation[];
}

export interface EvalContext {
  time: number;
  micData: {
    bass: number;
    mid: number;
    treble: number;
    subBass: number;
    presence: number;
    voiceStrength: number;
    drums: number;
    energy: number;
  };
  index?: number;
  count?: number;
}

// Validation
export function validateDSL(dsl: any): dsl is VisualizationDSL {
  if (!dsl || typeof dsl !== 'object') return false;
  if (!dsl.version || !dsl.name) return false;
  if (!Array.isArray(dsl.objects)) return false;
  
  // Basic validation - could be more thorough
  for (const obj of dsl.objects) {
    if (!obj.id || !obj.type || !obj.geometry || !obj.material) {
      return false;
    }
  }
  
  return true;
}

// Type guard to check if code is DSL or JavaScript
export function isDSLFormat(code: string): boolean {
  try {
    const parsed = JSON.parse(code);
    return validateDSL(parsed);
  } catch {
    return false;
  }
}


