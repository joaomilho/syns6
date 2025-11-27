/**
 * DSL to JavaScript Compiler
 * 
 * Compiles declarative DSL JSON into optimized JavaScript code
 * that can be executed directly without runtime interpretation.
 * 
 * Performance benefits:
 * - No runtime JSON parsing per frame
 * - No expression evaluation overhead
 * - Direct property access instead of string parsing
 * - Optimized by JS engine (JIT compilation)
 */

import { VisualizationDSL, VisualizationObject, Animation, ColorExpression } from './schema';
// Note: Generated code expects THREE to be passed in as a parameter

/**
 * Compile DSL configuration to executable JavaScript code
 */
export function compileDSL(dsl: VisualizationDSL): string {
  const objectInits: string[] = [];
  const objectUpdates: string[] = [];
  let objectIndex = 0; // Track index in the compiled objects array
  
  // Generate initialization code for each object
  dsl.objects.forEach((obj, index) => {
    const varName = `obj_${obj.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    if (obj.type === 'single') {
      objectInits.push(generateSingleObjectInit(obj, varName));
      objectUpdates.push(generateObjectUpdate(obj, `objects[${objectIndex}]`, 0, 1));
      objectIndex++;
    } else if (obj.type === 'group') {
      const count = obj.count || 10;
      objectInits.push(generateGroupInit(obj, varName, count));
      
      // Generate update code as a LOOP for groups (not individual statements)
      objectUpdates.push(generateGroupUpdate(obj, objectIndex, count));
      objectIndex += count;
    }
  });
  
  // Generate complete function
  return `
// Compiled DSL Visualization: ${dsl.name}
// Generated at: ${new Date().toISOString()}

function initVisualization(scene, THREE) {
  // Clear any previous objects and create fresh array
  scene.userData.compiledObjects = [];
  
  ${objectInits.join('\n  ')}
  
  return scene.userData.compiledObjects;
}

function updateVisualization(scene, camera, renderer, micData, time, THREE) {
  const objects = scene.userData.compiledObjects;
  if (!objects) return;
  
  ${objectUpdates.join('\n  ')}
}

// Export both functions
return { init: initVisualization, update: updateVisualization };
`;
}

/**
 * Generate initialization code for a single object
 */
function generateSingleObjectInit(obj: VisualizationObject, varName: string): string {
  const geometryCode = generateGeometryCode(obj.geometry);
  const materialCode = generateMaterialCode(obj.material);
  
  let code = `
  // Create ${obj.id}
  const ${varName}_geometry = ${geometryCode};
  const ${varName}_material = ${materialCode};
  const ${varName} = new THREE.Mesh(${varName}_geometry, ${varName}_material);
  `;
  
  // Set initial position
  if (obj.position) {
    if (typeof obj.position.x === 'number') code += `${varName}.position.x = ${obj.position.x};\n  `;
    if (typeof obj.position.y === 'number') code += `${varName}.position.y = ${obj.position.y};\n  `;
    if (typeof obj.position.z === 'number') code += `${varName}.position.z = ${obj.position.z};\n  `;
  }
  
  // Set initial rotation
  if (obj.rotation) {
    if (typeof obj.rotation.x === 'number') code += `${varName}.rotation.x = ${obj.rotation.x};\n  `;
    if (typeof obj.rotation.y === 'number') code += `${varName}.rotation.y = ${obj.rotation.y};\n  `;
    if (typeof obj.rotation.z === 'number') code += `${varName}.rotation.z = ${obj.rotation.z};\n  `;
  }
  
  // Set initial scale
  if (obj.scale) {
    if (obj.scale.uniform !== undefined) {
      code += `${varName}.scale.setScalar(${obj.scale.uniform});\n  `;
    } else {
      if (typeof obj.scale.x === 'number') code += `${varName}.scale.x = ${obj.scale.x};\n  `;
      if (typeof obj.scale.y === 'number') code += `${varName}.scale.y = ${obj.scale.y};\n  `;
      if (typeof obj.scale.z === 'number') code += `${varName}.scale.z = ${obj.scale.z};\n  `;
    }
  }
  
  code += `
  scene.add(${varName});
  scene.userData.compiledObjects.push(${varName});
  `;
  
  return code;
}

/**
 * Generate initialization code for a group of objects
 */
function generateGroupInit(obj: VisualizationObject, varName: string, count: number): string {
  const geometryCode = generateGeometryCode(obj.geometry);
  const materialCode = generateMaterialCode(obj.material);
  
  let code = `
  // Create group: ${obj.id} (${count} objects)
  const ${varName} = [];
  const ${varName}_geometry = ${geometryCode};
  
  for (let index = 0; index < ${count}; index++) {
    const count = ${count};
    const ${varName}_material = ${materialCode}; // Create material per object for independent colors
    const mesh = new THREE.Mesh(${varName}_geometry, ${varName}_material);
    `;
  
  // Set initial position based on expressions (with time = 0 for init)
  if (obj.position) {
    if (obj.position.x) {
      const expr = typeof obj.position.x === 'string' ? obj.position.x : obj.position.x.toString();
      code += `mesh.position.x = ${compileExpression(expr, 'index', 'count', false, true)};\n    `;
    }
    if (obj.position.y) {
      const expr = typeof obj.position.y === 'string' ? obj.position.y : obj.position.y.toString();
      code += `mesh.position.y = ${compileExpression(expr, 'index', 'count', false, true)};\n    `;
    }
    if (obj.position.z) {
      const expr = typeof obj.position.z === 'string' ? obj.position.z : obj.position.z.toString();
      code += `mesh.position.z = ${compileExpression(expr, 'index', 'count', false, true)};\n    `;
    }
  }
  
  // Set initial rotation (with time = 0 for init)
  if (obj.rotation) {
    if (obj.rotation.x) {
      const expr = typeof obj.rotation.x === 'string' ? obj.rotation.x : obj.rotation.x.toString();
      code += `mesh.rotation.x = ${compileExpression(expr, 'index', 'count', false, true)};\n    `;
    }
    if (obj.rotation.y) {
      const expr = typeof obj.rotation.y === 'string' ? obj.rotation.y : obj.rotation.y.toString();
      code += `mesh.rotation.y = ${compileExpression(expr, 'index', 'count', false, true)};\n    `;
    }
    if (obj.rotation.z) {
      const expr = typeof obj.rotation.z === 'string' ? obj.rotation.z : obj.rotation.z.toString();
      code += `mesh.rotation.z = ${compileExpression(expr, 'index', 'count', false, true)};\n    `;
    }
  }
  
  // Set initial color if it's an expression
  if (obj.material.color && typeof obj.material.color === 'object') {
    code += generateColorInitCode('mesh.material.color', obj.material.color, 'index', 'count');
  }
  
  // Set initial emissive if it's an expression
  if (obj.material.emissive && typeof obj.material.emissive === 'object') {
    code += generateColorInitCode('mesh.material.emissive', obj.material.emissive, 'index', 'count');
  }
  
  // Set needsUpdate if we set colors
  if (obj.material.color && typeof obj.material.color === 'object' || 
      obj.material.emissive && typeof obj.material.emissive === 'object') {
    code += `    mesh.material.needsUpdate = true;\n`;
  }
  
  code += `
    scene.add(mesh);
    ${varName}.push(mesh);
  }
  scene.userData.compiledObjects.push(...${varName});
  `;
  
  return code;
}

/**
 * Generate update code for a single object (handles animations)
 */
function generateObjectUpdate(obj: VisualizationObject, objRef: string, index: number, count: number): string {
  if (!obj.animations || obj.animations.length === 0) return '';
  
  let code = `\n  // Update ${obj.id}${count > 1 ? ` [${index}]` : ''}\n`;
  
  obj.animations.forEach(anim => {
    const expr = typeof anim.value === 'string' ? anim.value : anim.value.toString();
    const compiledExpr = compileExpression(expr, index.toString(), count.toString(), true);
    
    // Handle different property types
    if (anim.property === 'scale') {
      code += `  ${objRef}.scale.setScalar(${compiledExpr});\n`;
    } else if (anim.property.startsWith('material.color.')) {
      const component = anim.property.split('.')[2]; // h, s, or l
      code += `  {\n`;
      code += `    const hsl = {};\n`;
      code += `    ${objRef}.material.color.getHSL(hsl);\n`;
      code += `    hsl.${component} = ${compiledExpr};\n`;
      code += `    ${objRef}.material.color.setHSL(hsl.h, hsl.s, hsl.l);\n`;
      code += `  }\n`;
    } else if (anim.property.startsWith('material.')) {
      const prop = anim.property.replace('material.', '');
      code += `  ${objRef}.material.${prop} = ${compiledExpr};\n`;
    } else {
      // position.x, rotation.y, etc.
      code += `  ${objRef}.${anim.property} = ${compiledExpr};\n`;
    }
  });
  
  return code;
}

/**
 * Generate update code for a GROUP of objects using a loop (more efficient than individual statements)
 */
function generateGroupUpdate(obj: VisualizationObject, startIndex: number, count: number): string {
  if (!obj.animations || obj.animations.length === 0) {
    return ''; // No animations
  }
  
  let code = `
  // Update group: ${obj.id} (${count} objects in loop)
  for (let groupIndex = 0; groupIndex < ${count}; groupIndex++) {
    const index = groupIndex;
    const count = ${count};
    const obj = objects[${startIndex} + groupIndex];
    if (!obj) continue;
    `;
  
  // Generate animation code for each property
  obj.animations.forEach((anim) => {
    const expr = typeof anim.value === 'string' ? anim.value : anim.value.toString();
    const compiledExpr = compileExpression(expr, 'index', 'count', true, false);
    
    // Handle different property types
    if (anim.property === 'scale') {
      code += `obj.scale.setScalar(${compiledExpr});\n    `;
    } else if (anim.property.startsWith('position.')) {
      const axis = anim.property.split('.')[1];
      code += `obj.position.${axis} = ${compiledExpr};\n    `;
    } else if (anim.property.startsWith('rotation.')) {
      const axis = anim.property.split('.')[1];
      code += `obj.rotation.${axis} = ${compiledExpr};\n    `;
    } else if (anim.property.startsWith('material.color.')) {
      const colorProp = anim.property.split('.')[2]; // h, s, or l
      code += `{
      const hsl = { h: 0, s: 1, l: 0.5 }; // Default values
      obj.material.color.getHSL(hsl);
      hsl.${colorProp} = ${compiledExpr};
      obj.material.color.setHSL(hsl.h || 0, hsl.s || 1, hsl.l || 0.5);
      obj.material.needsUpdate = true;
    }\n    `;
    } else if (anim.property === 'material.emissiveIntensity') {
      // Lambert doesn't have emissiveIntensity, but we can skip it gracefully
      code += `// Note: emissiveIntensity not supported by MeshLambertMaterial\n    `;
    } else if (anim.property === 'material.opacity') {
      code += `obj.material.opacity = ${compiledExpr};\n    `;
    } else {
      // Generic property access
      code += `obj.${anim.property} = ${compiledExpr};\n    `;
    }
  });
  
  code += `}\n`;
  
  return code;
}

/**
 * Compile a DSL expression to JavaScript code
 * Replaces DSL functions with THREE.js Math equivalents
 */
function compileExpression(
  expr: string, 
  indexValue: string, 
  countValue: string, 
  includeRuntime: boolean = false,
  initTime: boolean = false // Replace time with 0 for initialization
): string {
  let compiled = expr;
  
  // Replace variables
  if (includeRuntime) {
    compiled = compiled.replace(/\bindex\b/g, indexValue);
    compiled = compiled.replace(/\bcount\b/g, countValue);
    compiled = compiled.replace(/\btime\b/g, 'time');
    compiled = compiled.replace(/\bmicData\.(\w+)/g, 'micData.$1');
  } else {
    compiled = compiled.replace(/\bindex\b/g, indexValue);
    compiled = compiled.replace(/\bcount\b/g, countValue);
    
    // For init phase, replace time with 0 or remove time-dependent expressions
    if (initTime) {
      compiled = compiled.replace(/\btime\b/g, '0');
      compiled = compiled.replace(/\bmicData\.(\w+)/g, '0'); // No mic data during init
    }
  }
  
  // Replace math functions with THREE.Math or Math equivalents
  compiled = compiled.replace(/\bsin\(/g, 'Math.sin(');
  compiled = compiled.replace(/\bcos\(/g, 'Math.cos(');
  compiled = compiled.replace(/\babs\(/g, 'Math.abs(');
  compiled = compiled.replace(/\bfloor\(/g, 'Math.floor(');
  compiled = compiled.replace(/\bceil\(/g, 'Math.ceil(');
  compiled = compiled.replace(/\bsqrt\(/g, 'Math.sqrt(');
  compiled = compiled.replace(/\bpow\(/g, 'Math.pow(');
  compiled = compiled.replace(/\bmin\(/g, 'Math.min(');
  compiled = compiled.replace(/\bmax\(/g, 'Math.max(');
  
  return compiled;
}

/**
 * Generate geometry creation code
 */
function generateGeometryCode(geometry: any): string {
  switch (geometry.type) {
    case 'box':
      return `new THREE.BoxGeometry(${geometry.width || 1}, ${geometry.height || 1}, ${geometry.depth || 1})`;
    case 'sphere':
      return `new THREE.SphereGeometry(${geometry.radius || 1}, ${geometry.widthSegments || 32}, ${geometry.heightSegments || 32})`;
    case 'cylinder':
      return `new THREE.CylinderGeometry(${geometry.radiusTop || 1}, ${geometry.radiusBottom || 1}, ${geometry.height || 1})`;
    case 'torus':
      return `new THREE.TorusGeometry(${geometry.radius || 1}, ${geometry.tubeRadius || 0.4})`;
    case 'plane':
      return `new THREE.PlaneGeometry(${geometry.width || 1}, ${geometry.height || 1})`;
    case 'cone':
      return `new THREE.ConeGeometry(${geometry.radius || 1}, ${geometry.height || 1})`;
    case 'dodecahedron':
      return `new THREE.DodecahedronGeometry(${geometry.radius || 1})`;
    case 'icosahedron':
      return `new THREE.IcosahedronGeometry(${geometry.radius || 1})`;
    default:
      return `new THREE.BoxGeometry(1, 1, 1)`;
  }
}

/**
 * Generate material creation code
 */
function generateMaterialCode(material: any): string {
  // Use MeshLambertMaterial - works perfectly with the lighting setup
  let materialType = 'MeshLambertMaterial';
  
  if (material.type === 'basic') {
    materialType = 'MeshBasicMaterial';
  }
  
  const props: string[] = [];
  
  // Handle color - white default
  if (material.color) {
    if (typeof material.color === 'number') {
      props.push(`color: ${material.color}`);
    } else {
      props.push(`color: 0xffffff`);
    }
  } else {
    props.push(`color: 0xffffff`);
  }
  
  // Lambert supports emissive
  if (material.emissive) {
    if (typeof material.emissive === 'number') {
      props.push(`emissive: ${material.emissive}`);
    } else if (typeof material.emissive === 'object') {
      props.push(`emissive: 0x000000`);
    }
  }
  
  if (material.wireframe) {
    props.push(`wireframe: true`);
  }
  
  return `new THREE.${materialType}({ ${props.join(', ')} })`;
}

/**
 * Generate color initialization code for expressions
 */
function generateColorInitCode(target: string, color: ColorExpression, indexVar: string, countVar: string): string {
  const h = typeof color.h === 'string' ? compileExpression(color.h, indexVar, countVar, false, true) : color.h;
  const s = typeof color.s === 'string' ? compileExpression(color.s, indexVar, countVar, false, true) : color.s;
  const l = typeof color.l === 'string' ? compileExpression(color.l, indexVar, countVar, false, true) : color.l;
  
  return `    ${target}.setHSL(${h}, ${s}, ${l});\n`;
}

/**
 * Test if code is safe to execute (basic validation)
 */
export function validateCompiledCode(code: string): boolean {
  // Check for dangerous patterns
  const dangerousPatterns = [
    /\beval\b/,
    /\bFunction\b/,
    /\bimport\b/,
    /\brequire\b/,
    /\bprocess\b/,
    /\b__dirname\b/,
    /\b__filename\b/,
    /\bfs\b/,
    /\bchild_process\b/,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return false;
    }
  }
  
  return true;
}

