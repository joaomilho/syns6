// EXAMPLE OF COMPILED DSL CODE
// This is what your "Dancing Spirals" DSL compiles to:

function initVisualization(scene, THREE) {
  // Store objects in scene userData for cleanup
  scene.userData.compiledObjects = scene.userData.compiledObjects || [];
  
  // Create group: helix-spheres (40 objects)
  const obj_helix_spheres = [];
  const obj_helix_spheres_geometry = new THREE.SphereGeometry(0.2, 32, 32);
  
  for (let index = 0; index < 40; index++) {
    const count = 40;
    const obj_helix_spheres_material = new THREE.MeshPhongMaterial({ 
      color: new THREE.Color().setHSL(index / count, 1, 0.5), 
      emissive: new THREE.Color().setHSL(index / count, 1, 0.2), 
      emissiveIntensity: 1 
    });
    const mesh = new THREE.Mesh(obj_helix_spheres_geometry, obj_helix_spheres_material);
    
    // Initial position (time = 0, micData = 0)
    mesh.position.x = (0.5 + index * 0.15) * Math.cos(index * 0.3 + 0 * 0.2);
    mesh.position.y = (0.5 + index * 0.15) * Math.sin(index * 0.3 + 0 * 0.2);
    mesh.position.z = (index - count / 2) * 0.2;
    
    scene.add(mesh);
    obj_helix_spheres.push(mesh);
  }
  scene.userData.compiledObjects.push(...obj_helix_spheres);
  
  return scene.userData.compiledObjects;
}

function updateVisualization(scene, camera, renderer, micData, time, THREE) {
  const objects = scene.userData.compiledObjects;
  if (!objects) return;
  
  // Update helix-spheres [0]
  objects[0].scale.setScalar(1 + micData.energy * 0.8);
  {
    const hsl = {};
    objects[0].material.color.getHSL(hsl);
    hsl.h = (time * 0.05 + micData.mid * 0.1 + 0 / 40 * 0.5) % 1;
    objects[0].material.color.setHSL(hsl.h, hsl.s, hsl.l);
  }
  objects[0].material.emissiveIntensity = 1 + micData.treble * 1.5;
  objects[0].position.z = (0 - 40 / 2) * 0.2 + Math.sin(time * 3 + 0 * 0.2) * micData.bass * 0.5;

  // ... repeat for objects[1] through objects[39]
}

// Export both functions
return { init: initVisualization, update: updateVisualization };

