/**
 * Example DSL Visualizations
 * Ready-to-use configurations for testing
 */

export const EXAMPLE_PULSING_CUBES = `{
  "version": "1.0",
  "name": "Pulsing Cubes",
  "objects": [{
    "id": "cubes",
    "type": "group",
    "count": 5,
    "geometry": { "type": "box", "width": 1, "height": 1, "depth": 1 },
    "material": { 
      "type": "phong",
      "color": { "h": "index / count", "s": 1, "l": 0.5 },
      "emissive": { "h": "index / count", "s": 1, "l": 0.2 }
    },
    "position": { "x": "(index - count/2) * 2.5", "y": 0, "z": 0 },
    "animations": [
      { "property": "scale", "value": "1 + micData.bass * 2" },
      { "property": "rotation.x", "value": "time * 0.5" },
      { "property": "rotation.y", "value": "time * 0.7" },
      { "property": "material.color.h", "value": "(time * 0.1 + index / count) % 1" }
    ]
  }]
}`;

export const EXAMPLE_GLOWING_SPHERE = `{
  "version": "1.0",
  "name": "Glowing Sphere",
  "objects": [{
    "id": "sphere",
    "type": "single",
    "geometry": { "type": "sphere", "radius": 1.5 },
    "material": { 
      "type": "phong",
      "color": { "h": "time * 0.1", "s": 1, "l": 0.5 },
      "emissive": { "h": "time * 0.1", "s": 1, "l": 0.3 },
      "emissiveIntensity": 1
    },
    "animations": [
      { "property": "scale", "value": "1 + micData.energy * 0.5" },
      { "property": "rotation.y", "value": "time" },
      { "property": "material.color.h", "value": "(time * 0.05 + micData.mid * 0.2) % 1" },
      { "property": "material.emissiveIntensity", "value": "1 + micData.treble * 2" }
    ]
  }]
}`;

export const EXAMPLE_SPIRAL = `{
  "version": "1.0",
  "name": "Spiral",
  "objects": [{
    "id": "spiral",
    "type": "group",
    "count": 30,
    "geometry": { "type": "sphere", "radius": 0.3 },
    "material": { 
      "type": "phong",
      "color": { "h": "index / count", "s": 1, "l": 0.5 },
      "emissive": { "h": "index / count", "s": 1, "l": 0.2 }
    },
    "position": { 
      "x": "cos(index * 0.5 + time * 0.5) * (1 + index * 0.2)",
      "y": "(index - count/2) * 0.3",
      "z": "sin(index * 0.5 + time * 0.5) * (1 + index * 0.2)"
    },
    "animations": [
      { "property": "scale", "value": "0.8 + micData.bass * 0.8" },
      { "property": "material.emissiveIntensity", "value": "0.5 + micData.energy * 1.5" }
    ]
  }]
}`;

export const EXAMPLE_DANCING_SHAPES = `{
  "version": "1.0",
  "name": "Dancing Shapes",
  "objects": [
    {
      "id": "spheres",
      "type": "group",
      "count": 3,
      "geometry": { "type": "sphere", "radius": 0.8 },
      "material": { "type": "phong", "color": { "h": 0.1, "s": 1, "l": 0.5 } },
      "position": { "x": "index * 3 - 3", "y": 0, "z": 0 },
      "animations": [
        { "property": "position.y", "value": "sin(time * 2 + index) * micData.bass * 2" },
        { "property": "rotation.y", "value": "time + index" }
      ]
    },
    {
      "id": "cubes",
      "type": "group",
      "count": 3,
      "geometry": { "type": "box", "width": 1, "height": 1, "depth": 1 },
      "material": { "type": "phong", "color": { "h": 0.6, "s": 1, "l": 0.5 } },
      "position": { "x": "index * 3 - 3", "y": "2", "z": 0 },
      "animations": [
        { "property": "position.y", "value": "2 + cos(time * 2 + index) * micData.mid * 2" },
        { "property": "rotation.x", "value": "time * 0.5 + index" }
      ]
    }
  ]
}`;

export const DSL_EXAMPLES = {
  'Pulsing Cubes': EXAMPLE_PULSING_CUBES,
  'Glowing Sphere': EXAMPLE_GLOWING_SPHERE,
  'Spiral': EXAMPLE_SPIRAL,
  'Dancing Shapes': EXAMPLE_DANCING_SHAPES,
};


