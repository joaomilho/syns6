// Initialize the spiral spheres
// if they haven't been created yet for this visualization

if (!scene.userData.spiralSpheresInitialized) {
    // Robust cleanup: Remove all existing objects from the scene
    // This ensures a clean slate if a previous visualization left objects behind.
    while (scene.children.length > 0) {
        const object = scene.children[0];
        scene.remove(object);
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }
    }

    scene.userData.spheres = [];
    const numSpheres = 70; // Number of spheres in the spiral
    const baseSphereSize = 0.1;
    const spiralRadiusStart = 0.5;
    const spiralRadiusGrowth = 0.12; // How much the spiral radius grows per sphere
    const spiralHeightGrowth = 0.08; // How much the spiral height grows per sphere
    const spiralAngleStep = Math.PI * 0.12; // Angle increment between spheres

    // Create a single geometry to share among all spheres for efficiency
    const sphereGeometry = new THREE.SphereGeometry(baseSphereSize, 16, 16);
    scene.userData.sphereGeometry = sphereGeometry; // Store for later disposal

    for (let i = 0; i < numSpheres; i++) {
        const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(i / numSpheres, 1, 0.6), // Initial hue based on index
            emissive: new THREE.Color().setHSL(i / numSpheres, 1, 0.4), // Glowing effect
            emissiveIntensity: 0.8 // Base emissive intensity
        });
        const sphere = new THREE.Mesh(sphereGeometry, material);
        scene.add(sphere);
        scene.userData.spheres.push(sphere);
    }
    scene.userData.spiralSpheresInitialized = true; // Mark as initialized
}

const spheres = scene.userData.spheres;
const numSpheres = spheres.length;

// Audio reactive parameters
const rotationSpeedTreble = micData.treble * 1.5; // Spheres rotate faster with treble
const bassScaleFactor = 1 + micData.bass * 2.5; // Spheres expand with bass
const overallSpiralRotationSpeed = time * 0.1 + micData.energy * 0.3; // Overall spiral rotates with time and energy

// Spiral configuration parameters (re-declared for clarity in animation loop)
const baseSphereSize = 0.1;
const spiralRadiusStart = 0.5;
const spiralRadiusGrowth = 0.12;
const spiralHeightGrowth = 0.08;
const spiralAngleStep = Math.PI * 0.12;

spheres.forEach((sphere, i) => {
    // Calculate spiral position for each sphere
    const r = spiralRadiusStart + i * spiralRadiusGrowth;
    const theta = i * spiralAngleStep + overallSpiralRotationSpeed;

    sphere.position.x = r * Math.cos(theta);
    sphere.position.y = r * Math.sin(theta);
    // Center the spiral vertically
    sphere.position.z = (i - numSpheres / 2) * spiralHeightGrowth;

    // Scale with bass and add a subtle breathing/pulsing effect based on time
    const scale = baseSphereSize * bassScaleFactor * (1 + Math.sin(time * 5 + i * 0.2) * 0.2);
    sphere.scale.setScalar(scale);

    // Rotate individual spheres faster with treble
    sphere.rotation.x = time * 0.5 + rotationSpeedTreble;
    sphere.rotation.y = time * 0.7 + rotationSpeedTreble * 0.8;
    sphere.rotation.z = time * 0.3 + rotationSpeedTreble * 0.6;

    // Update color based on audio data
    const hue = (i / numSpheres + time * 0.05 + micData.mid * 0.1) % 1; // Color shift with mid frequencies and time
    const saturation = 0.8 + micData.energy * 0.2; // Saturation increases with overall energy
    const lightness = 0.5 + micData.bass * 0.3; // Brightness increases with bass
    
    sphere.material.color.setHSL(hue, saturation, lightness);
    sphere.material.emissive.setHSL(hue, saturation, lightness * 0.7);
    sphere.material.emissiveIntensity = 1 + micData.treble * 2; // Emissive glow intensifies with treble
});

// Animate camera for a more dynamic perspective
camera.position.x = Math.sin(time * 0.07) * 8;
camera.position.y = Math.cos(time * 0.06) * 8;
camera.position.z = 15 + micData.energy * 3; // Camera moves closer with overall energy
camera.lookAt(new THREE.Vector3(0, 0, 0)); // Always point the camera at the center of the spiral"
