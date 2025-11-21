/**
 * DSL Interpreter
 * Creates and animates Three.js objects based on DSL configuration
 */

import * as THREE from 'three';
import { VisualizationDSL, VisualizationObject, GeometryConfig, MaterialConfig, EvalContext, ColorExpression, Animation } from './schema';
import { safeEval } from './evaluator';

export class VisualizationInterpreter {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private config: VisualizationDSL;
  private objects: Map<string, THREE.Object3D[]>;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, config: VisualizationDSL) {
    this.scene = scene;
    this.camera = camera;
    this.config = config;
    this.objects = new Map();
  }
  
  initialize() {
    // Create all objects from config
    this.config.objects.forEach(objConfig => {
      try {
        const objects = this.createObjects(objConfig);
        this.objects.set(objConfig.id, objects);
      } catch (error) {
        console.error(`❌ Failed to create objects for "${objConfig.id}":`, error);
      }
    });
  }
  
  private lastLogTime = 0;
  private frameCount = 0;
  
  update(time: number, micData: any) {
    this.frameCount++;
    
    // Log every 60 frames (once per second at 60fps) to see if animations are changing
    if (this.frameCount % 60 === 0) {
      console.log(`⏱️ Time: ${time.toFixed(2)}s, Bass: ${(micData?.bass || 0).toFixed(3)}, Energy: ${(micData?.energy || 0).toFixed(3)}`);
    }
    
    // Update all objects with their animations
    this.config.objects.forEach(objConfig => {
      const objects = this.objects.get(objConfig.id);
      if (!objects) return;
      
      objects.forEach((obj, index) => {
        const context: EvalContext = {
          time,
          micData: micData || {
            bass: 0, mid: 0, treble: 0, subBass: 0,
            presence: 0, voiceStrength: 0, drums: 0, energy: 0
          },
          index,
          count: objects.length
        };
        
        // Apply animations
        objConfig.animations?.forEach(anim => {
          try {
            const value = safeEval(anim.value, context);
            this.applyAnimation(obj, anim.property, value);
            
            // Debug first object's rotation every second
            if (this.frameCount % 60 === 0 && index === 0 && anim.property === 'rotation.x') {
              console.log(`  🔄 Cube[0] rotation.x = ${value.toFixed(3)}, actual: ${obj.rotation.x.toFixed(3)}`);
            }
          } catch (error) {
            // Silently fail animations to avoid spamming console
          }
        });
      });
    });
    
    // Update camera
    if (this.config.camera?.animations) {
      const context: EvalContext = { time, micData };
      this.config.camera.animations.forEach(anim => {
        try {
          const value = safeEval(anim.value, context);
          this.applyCameraAnimation(anim.property, value);
        } catch (error) {
          // Silently fail
        }
      });
    }
  }
  
  private createObjects(config: VisualizationObject): THREE.Object3D[] {
    const count = config.type === 'group' ? (config.count || 1) : 1;
    const objects: THREE.Object3D[] = [];
    
    for (let i = 0; i < count; i++) {
      const geometry = this.createGeometry(config.geometry);
      const material = this.createMaterial(config.material, i, count);
      const mesh = new THREE.Mesh(geometry, material);
      
      // Set initial position
      if (config.position) {
        const context: EvalContext = {
          time: 0,
          micData: {
            bass: 0, mid: 0, treble: 0, subBass: 0,
            presence: 0, voiceStrength: 0, drums: 0, energy: 0
          },
          index: i,
          count
        };
        const x = safeEval(config.position.x ?? 0, context);
        const y = safeEval(config.position.y ?? 0, context);
        const z = safeEval(config.position.z ?? 0, context);
        mesh.position.set(x, y, z);
      }
      
      // Set initial rotation
      if (config.rotation) {
        const context: EvalContext = {
          time: 0,
          micData: {
            bass: 0, mid: 0, treble: 0, subBass: 0,
            presence: 0, voiceStrength: 0, drums: 0, energy: 0
          },
          index: i,
          count
        };
        const x = safeEval(config.rotation.x ?? 0, context);
        const y = safeEval(config.rotation.y ?? 0, context);
        const z = safeEval(config.rotation.z ?? 0, context);
        mesh.rotation.set(x, y, z);
      }
      
      // Set initial scale
      if (config.scale) {
        const context: EvalContext = {
          time: 0,
          micData: {
            bass: 0, mid: 0, treble: 0, subBass: 0,
            presence: 0, voiceStrength: 0, drums: 0, energy: 0
          },
          index: i,
          count
        };
        
        if (config.scale.uniform !== undefined) {
          const scale = safeEval(config.scale.uniform, context);
          mesh.scale.setScalar(scale);
        } else {
          const x = safeEval(config.scale.x ?? 1, context);
          const y = safeEval(config.scale.y ?? 1, context);
          const z = safeEval(config.scale.z ?? 1, context);
          mesh.scale.set(x, y, z);
        }
      }
      
      this.scene.add(mesh);
      objects.push(mesh);
    }
    
    return objects;
  }
  
  private createGeometry(config: GeometryConfig): THREE.BufferGeometry {
    switch (config.type) {
      case 'box':
        return new THREE.BoxGeometry(
          config.width ?? 1,
          config.height ?? 1,
          config.depth ?? 1
        );
      case 'sphere':
        return new THREE.SphereGeometry(
          config.radius ?? 0.5,
          config.widthSegments ?? 32,
          config.heightSegments ?? 32
        );
      case 'cylinder':
        return new THREE.CylinderGeometry(
          config.radiusTop ?? 0.5,
          config.radiusBottom ?? 0.5,
          config.height ?? 1,
          config.widthSegments ?? 32
        );
      case 'torus':
        return new THREE.TorusGeometry(
          config.radius ?? 0.5,
          config.tubeRadius ?? 0.2,
          config.widthSegments ?? 16,
          config.heightSegments ?? 100
        );
      case 'plane':
        return new THREE.PlaneGeometry(
          config.width ?? 1,
          config.height ?? 1
        );
      case 'cone':
        return new THREE.ConeGeometry(
          config.radius ?? 0.5,
          config.height ?? 1,
          config.widthSegments ?? 32
        );
      case 'dodecahedron':
        return new THREE.DodecahedronGeometry(config.radius ?? 0.5);
      case 'icosahedron':
        return new THREE.IcosahedronGeometry(config.radius ?? 0.5);
      default:
        return new THREE.BoxGeometry(1, 1, 1);
    }
  }
  
  private createMaterial(config: MaterialConfig, index: number, count: number): THREE.Material {
    // Resolve color
    let color = 0xffffff;
    if (typeof config.color === 'number') {
      color = config.color;
    } else if (config.color && typeof config.color === 'object') {
      const context: EvalContext = {
        time: 0,
        micData: { bass: 0, mid: 0, treble: 0, subBass: 0, presence: 0, voiceStrength: 0, drums: 0, energy: 0 },
        index,
        count
      };
      const h = safeEval((config.color as ColorExpression).h, context);
      const s = safeEval((config.color as ColorExpression).s, context);
      const l = safeEval((config.color as ColorExpression).l, context);
      const threeColor = new THREE.Color();
      threeColor.setHSL(h, s, l);
      color = threeColor.getHex();
    }
    
    // Resolve emissive
    let emissive = 0x000000;
    if (typeof config.emissive === 'number') {
      emissive = config.emissive;
    } else if (config.emissive && typeof config.emissive === 'object') {
      const context: EvalContext = {
        time: 0,
        micData: { bass: 0, mid: 0, treble: 0, subBass: 0, presence: 0, voiceStrength: 0, drums: 0, energy: 0 },
        index,
        count
      };
      const h = safeEval((config.emissive as ColorExpression).h, context);
      const s = safeEval((config.emissive as ColorExpression).s, context);
      const l = safeEval((config.emissive as ColorExpression).l, context);
      const threeColor = new THREE.Color();
      threeColor.setHSL(h, s, l);
      emissive = threeColor.getHex();
    }
    
    const params: any = {
      color,
      emissive,
      wireframe: config.wireframe ?? false
    };
    
    switch (config.type) {
      case 'basic':
        return new THREE.MeshBasicMaterial(params);
      case 'lambert':
        return new THREE.MeshLambertMaterial(params);
      case 'phong':
        params.emissiveIntensity = typeof config.emissiveIntensity === 'number' ? config.emissiveIntensity : 0.5;
        return new THREE.MeshPhongMaterial(params);
      case 'standard':
        params.metalness = typeof config.metalness === 'number' ? config.metalness : 0.5;
        params.roughness = typeof config.roughness === 'number' ? config.roughness : 0.5;
        return new THREE.MeshStandardMaterial(params);
      default:
        return new THREE.MeshPhongMaterial(params);
    }
  }
  
  private applyAnimation(obj: THREE.Object3D, property: string, value: number) {
    const parts = property.split('.');
    
    if (parts[0] === 'position' && parts[1] && parts[1] in obj.position) {
      (obj.position as any)[parts[1]] = value;
    } else if (parts[0] === 'rotation' && parts[1] && parts[1] in obj.rotation) {
      (obj.rotation as any)[parts[1]] = value;
    } else if (parts[0] === 'scale') {
      if (parts[1] && parts[1] in obj.scale) {
        (obj.scale as any)[parts[1]] = value;
      } else {
        obj.scale.setScalar(value);
      }
    } else if (parts[0] === 'material' && obj instanceof THREE.Mesh) {
      if (parts[1] === 'color' && parts[2] === 'h') {
        const hsl = { h: 0, s: 0, l: 0 };
        obj.material.color.getHSL(hsl as any);
        obj.material.color.setHSL(value, hsl.s, hsl.l);
      } else if (parts[1] === 'color' && parts[2] === 's') {
        const hsl = { h: 0, s: 0, l: 0 };
        obj.material.color.getHSL(hsl as any);
        obj.material.color.setHSL(hsl.h, value, hsl.l);
      } else if (parts[1] === 'color' && parts[2] === 'l') {
        const hsl = { h: 0, s: 0, l: 0 };
        obj.material.color.getHSL(hsl as any);
        obj.material.color.setHSL(hsl.h, hsl.s, value);
      } else if (parts[1] === 'emissiveIntensity' && 'emissiveIntensity' in obj.material) {
        (obj.material as any).emissiveIntensity = value;
      }
    }
  }
  
  private applyCameraAnimation(property: string, value: number) {
    const parts = property.split('.');
    
    if (parts[0] === 'position' && parts[1] && parts[1] in this.camera.position) {
      (this.camera.position as any)[parts[1]] = value;
    } else if (parts[0] === 'rotation' && parts[1] && parts[1] in this.camera.rotation) {
      (this.camera.rotation as any)[parts[1]] = value;
    }
  }
  
  dispose() {
    this.objects.forEach((objects, id) => {
      objects.forEach(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        this.scene.remove(obj);
      });
    });
    
    this.objects.clear();
  }
}


