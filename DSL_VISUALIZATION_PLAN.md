# Declarative Visualization DSL Plan

## 🎯 The Problem with Current Approach

**Current:** AI generates JavaScript → Execute with `new Function()` → Many issues:
- ❌ Security risks (arbitrary code execution)
- ❌ Syntax errors break everything
- ❌ Hard to debug
- ❌ Cleanup issues (disposing materials, WebGL contexts)
- ❌ No validation
- ❌ Can't version or migrate visualizations

## ✅ The Solution: Declarative DSL

**New:** AI generates JSON config → Safe interpreter executes it

### Benefits:
- ✅ **Safe** - No code execution, just data
- ✅ **Validated** - JSON schema catches errors
- ✅ **Debuggable** - Inspect the config
- ✅ **Portable** - Share as JSON
- ✅ **Versionable** - Upgrade interpreter without breaking old viz
- ✅ **Undo/Redo** - Config is just data
- ✅ **Visual Editor** - Can build UI for editing

---

## 📐 DSL Structure

### Example: "5 spinning cubes that pulse with bass"

```json
{
  "version": "1.0",
  "name": "Pulsing Cubes",
  "objects": [
    {
      "id": "cubes",
      "type": "group",
      "count": 5,
      "geometry": {
        "type": "box",
        "width": 1,
        "height": 1,
        "depth": 1
      },
      "material": {
        "type": "phong",
        "color": { "h": "index / count", "s": 1, "l": 0.5 },
        "emissive": { "h": "index / count", "s": 1, "l": 0.2 }
      },
      "position": {
        "x": "(index - count/2) * 2",
        "y": 0,
        "z": 0
      },
      "animations": [
        {
          "property": "rotation.x",
          "value": "time * 0.5"
        },
        {
          "property": "rotation.y",
          "value": "time * 0.7"
        },
        {
          "property": "scale",
          "value": "1 + micData.bass * 2"
        },
        {
          "property": "material.color.h",
          "value": "(time * 0.1 + index / count) % 1"
        }
      ]
    }
  ],
  "camera": {
    "animations": [
      {
        "property": "position.z",
        "value": "10 + micData.energy * 2"
      }
    ]
  }
}
```

---

## 🏗️ Implementation Plan

### Phase 1: Define the DSL Schema

**File:** `src/lib/visualizationDSL/schema.ts`

```typescript
interface VisualizationDSL {
  version: string;
  name: string;
  objects: VisualizationObject[];
  camera?: CameraConfig;
  postProcessing?: PostProcessingConfig;
}

interface VisualizationObject {
  id: string;
  type: 'single' | 'group';
  count?: number; // For groups
  geometry: GeometryConfig;
  material: MaterialConfig;
  position?: ExpressionOrValue;
  rotation?: ExpressionOrValue;
  scale?: ExpressionOrValue;
  animations?: Animation[];
}

interface GeometryConfig {
  type: 'box' | 'sphere' | 'cylinder' | 'torus' | 'plane' | 'cone';
  // Geometry-specific params
  [key: string]: number | string;
}

interface MaterialConfig {
  type: 'basic' | 'phong' | 'standard' | 'lambert';
  color?: ColorExpression;
  emissive?: ColorExpression;
  emissiveIntensity?: string | number;
  metalness?: string | number;
  roughness?: string | number;
}

interface Animation {
  property: string; // e.g., "position.y", "rotation.x", "scale"
  value: string; // Expression: "time * 2", "micData.bass * 3"
  easing?: 'linear' | 'easeIn' | 'easeOut';
}

interface ColorExpression {
  h: string | number; // Hue: 0-1 or expression
  s: string | number; // Saturation: 0-1
  l: string | number; // Lightness: 0-1
}

type ExpressionOrValue = {
  x?: string | number;
  y?: string | number;
  z?: string | number;
} | string | number;
```

### Phase 2: Build Safe Expression Evaluator

**File:** `src/lib/visualizationDSL/evaluator.ts`

```typescript
// Safe expression evaluator - NO eval() or Function()
// Only allows specific variables and math operations

interface EvalContext {
  time: number;
  micData: MicData;
  index?: number;
  count?: number;
}

export function safeEval(expression: string, context: EvalContext): number {
  // Parse the expression string
  // Allow only: numbers, +, -, *, /, %, (), Math.sin, Math.cos, etc.
  // Allow only whitelisted variables: time, micData.*, index, count
  
  // Option 1: Use a safe expression parser library (e.g., expr-eval)
  // Option 2: Build custom parser with limited operators
  
  // Example with validation:
  const allowedVars = ['time', 'index', 'count', 'micData'];
  const allowedFunctions = ['sin', 'cos', 'abs', 'floor', 'ceil', 'pow'];
  
  // Validate expression only uses allowed tokens
  if (!isExpressionSafe(expression, allowedVars, allowedFunctions)) {
    throw new Error('Unsafe expression');
  }
  
  // Evaluate safely (using a library or custom parser)
  return evaluate(expression, context);
}
```

### Phase 3: Build DSL Interpreter

**File:** `src/lib/visualizationDSL/interpreter.ts`

```typescript
export class VisualizationInterpreter {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private objects: Map<string, THREE.Object3D[]>;
  private config: VisualizationDSL;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, config: VisualizationDSL) {
    this.scene = scene;
    this.camera = camera;
    this.config = config;
    this.objects = new Map();
  }
  
  initialize() {
    // Create all objects from config
    this.config.objects.forEach(objConfig => {
      const objects = this.createObjects(objConfig);
      this.objects.set(objConfig.id, objects);
    });
  }
  
  update(time: number, micData: MicData) {
    // Update all animations
    this.config.objects.forEach(objConfig => {
      const objects = this.objects.get(objConfig.id);
      if (!objects) return;
      
      objects.forEach((obj, index) => {
        objConfig.animations?.forEach(anim => {
          const context = { time, micData, index, count: objects.length };
          const value = safeEval(anim.value, context);
          this.applyAnimation(obj, anim.property, value);
        });
      });
    });
    
    // Update camera
    if (this.config.camera?.animations) {
      // ... apply camera animations
    }
  }
  
  private createObjects(config: VisualizationObject): THREE.Object3D[] {
    const count = config.type === 'group' ? (config.count || 1) : 1;
    const objects: THREE.Object3D[] = [];
    
    for (let i = 0; i < count; i++) {
      const geometry = this.createGeometry(config.geometry);
      const material = this.createMaterial(config.material);
      const mesh = new THREE.Mesh(geometry, material);
      
      // Set initial position/rotation/scale
      if (config.position) {
        const pos = this.evalPosition(config.position, { index: i, count });
        mesh.position.set(pos.x, pos.y, pos.z);
      }
      
      this.scene.add(mesh);
      objects.push(mesh);
    }
    
    return objects;
  }
  
  private applyAnimation(obj: THREE.Object3D, property: string, value: number) {
    // Parse property path: "position.y", "rotation.x", "scale"
    const parts = property.split('.');
    
    if (parts[0] === 'position' && parts[1]) {
      obj.position[parts[1]] = value;
    } else if (parts[0] === 'rotation' && parts[1]) {
      obj.rotation[parts[1]] = value;
    } else if (parts[0] === 'scale') {
      obj.scale.setScalar(value);
    } else if (parts[0] === 'material' && parts[1] === 'color') {
      // Handle color changes...
    }
  }
  
  dispose() {
    // Clean up all objects properly
    this.objects.forEach(objects => {
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
```

### Phase 4: Update CustomVisualization Component

**File:** `src/components/CustomVisualization.tsx` (refactored)

```typescript
import { VisualizationInterpreter } from '@/lib/visualizationDSL/interpreter';

// Instead of executing code:
const [interpreter, setInterpreter] = useState<VisualizationInterpreter | null>(null);

useEffect(() => {
  // Parse DSL config
  const config = JSON.parse(code); // code is now JSON, not JavaScript!
  
  // Create interpreter
  const interp = new VisualizationInterpreter(scene, camera, config);
  interp.initialize();
  setInterpreter(interp);
  
  return () => {
    interp.dispose();
  };
}, [code]);

// In animation loop:
if (interpreter) {
  interpreter.update(time, micData);
}
```

### Phase 5: Update AI Prompt

**File:** `src/app/api/generate-visualization/route.ts`

```typescript
const SYSTEM_PROMPT = `You are a visualization configuration generator.

Generate a JSON configuration (not JavaScript code) for a music-reactive 3D visualization.

OUTPUT FORMAT: Valid JSON only, no code blocks, no explanations.

SCHEMA:
{
  "version": "1.0",
  "name": "Visualization Name",
  "objects": [
    {
      "id": "unique-id",
      "type": "group",
      "count": 5,
      "geometry": { "type": "box", "width": 1, "height": 1, "depth": 1 },
      "material": { 
        "type": "phong",
        "color": { "h": "index / count", "s": 1, "l": 0.5 }
      },
      "position": { "x": "(index - count/2) * 2", "y": 0, "z": 0 },
      "animations": [
        { "property": "scale", "value": "1 + micData.bass * 2" },
        { "property": "rotation.y", "value": "time * 0.5" }
      ]
    }
  ]
}

AVAILABLE VARIABLES IN EXPRESSIONS:
- time: elapsed seconds
- micData.bass, micData.mid, micData.treble (0-1)
- micData.energy, micData.drums (0-1)
- index: object index in group
- count: total objects in group

AVAILABLE MATH:
- Basic: +, -, *, /, %, ()
- Functions: sin(), cos(), abs(), floor(), ceil(), pow()

EXAMPLE: "Create 5 spinning cubes that pulse with bass"
{
  "version": "1.0",
  "name": "Pulsing Cubes",
  "objects": [{
    "id": "cubes",
    "type": "group",
    "count": 5,
    "geometry": { "type": "box", "width": 1, "height": 1, "depth": 1 },
    "material": { "type": "phong", "color": { "h": "index/count", "s": 1, "l": 0.5 } },
    "position": { "x": "(index-count/2)*2.5", "y": 0, "z": 0 },
    "animations": [
      { "property": "scale", "value": "1+micData.bass*2" },
      { "property": "rotation.x", "value": "time*0.5" },
      { "property": "rotation.y", "value": "time*0.7" }
    ]
  }]
}`;
```

---

## 🎨 Extended DSL Features (Future)

### Presets & Modifiers
```json
{
  "objects": [{
    "preset": "spiral",
    "params": {
      "count": 50,
      "radius": 5,
      "height": 10
    },
    "modifiers": ["pulsate-with-bass", "rotate-with-treble"]
  }]
}
```

### Particle Systems
```json
{
  "objects": [{
    "type": "particles",
    "count": 1000,
    "behavior": "orbit",
    "reactTo": "bass"
  }]
}
```

### Post-Processing
```json
{
  "postProcessing": {
    "bloom": { "intensity": "micData.energy" },
    "glitch": { "amount": "micData.drums * 0.5" }
  }
}
```

---

## 📊 Migration Strategy

### Phase 1: Support Both (Hybrid)
- Keep current JavaScript execution
- Add DSL interpreter alongside
- Detect format: JSON vs JS
- Gradually migrate

### Phase 2: Encourage DSL
- Make DSL the default
- Show "Convert to DSL" button for old viz
- Keep JS for power users (with warnings)

### Phase 3: DSL Only
- Deprecate JavaScript execution
- All visualizations use DSL
- Much safer and easier to maintain

---

## 🔐 Security Benefits

**Current (JavaScript):**
- ❌ Can access any global
- ❌ Can require() modules
- ❌ Can make network requests
- ❌ Can access localStorage
- ❌ Infinite loops possible

**DSL:**
- ✅ Only reads allowed data
- ✅ No module access
- ✅ No network access
- ✅ No storage access
- ✅ Validated expressions only

---

## 📦 Deliverables

### Core Files:
1. `src/lib/visualizationDSL/schema.ts` - TypeScript types
2. `src/lib/visualizationDSL/evaluator.ts` - Safe expression evaluator
3. `src/lib/visualizationDSL/interpreter.ts` - DSL interpreter
4. `src/lib/visualizationDSL/validator.ts` - JSON schema validator
5. `src/components/DSLVisualization.tsx` - New component

### Updated Files:
1. `src/app/api/generate-visualization/route.ts` - New AI prompt
2. `src/lib/customVisualizations.ts` - Add format field
3. `src/components/VisualizationDropdown.tsx` - Show format badge

### Documentation:
1. `DSL_SPECIFICATION.md` - Complete DSL reference
2. `DSL_EXAMPLES.md` - Example configurations
3. `MIGRATION_GUIDE.md` - JS to DSL conversion

---

## 🎯 Next Steps

1. **Prototype** - Build basic interpreter with 3-4 object types
2. **Test** - Generate DSL with AI, ensure it works
3. **Iterate** - Add more features based on usage
4. **UI** - Build visual editor for DSL (future)
5. **Share** - Community marketplace of JSON configs

---

## 🚀 Why This is Better

| Aspect | JavaScript | DSL |
|--------|-----------|-----|
| **Safety** | ⚠️ Risky | ✅ Safe |
| **Debug** | ❌ Hard | ✅ Easy |
| **Share** | ⚠️ Scary | ✅ Simple |
| **Edit** | ❌ Code only | ✅ UI possible |
| **Validate** | ❌ Runtime | ✅ Parse-time |
| **Version** | ❌ Breaks | ✅ Upgradeable |
| **Performance** | ⚠️ Varies | ✅ Optimized |

This is the right architecture for a production system! 🎉


