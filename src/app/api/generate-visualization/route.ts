import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const SYSTEM_PROMPT = `You are a visualization configuration generator for a music-reactive 3D application.

Generate a JSON configuration (NOT JavaScript code) based on the user's prompt.

If the user provides a PREVIOUS configuration, modify it according to their new instructions while preserving what works well. For improvement requests like "make it faster", "add more colors", "bigger", etc., adjust the relevant properties intelligently.

OUTPUT: Valid JSON only. No markdown, no code blocks, no explanations.

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
    }
  ]
}

GEOMETRY TYPES: box, sphere, cylinder, torus, plane, cone, dodecahedron, icosahedron

MATERIAL TYPES: basic, phong, standard, lambert

VARIABLES IN EXPRESSIONS:
- time: elapsed seconds
- micData.bass, micData.mid, micData.treble (0-1)
- micData.energy, micData.drums, micData.subBass (0-1)
- index: object index in group
- count: total objects in group

MATH FUNCTIONS: sin(), cos(), abs(), floor(), ceil(), sqrt(), pow(x,y), min(), max()
OPERATORS: +, -, *, /, %, ()

ANIMATION PROPERTIES:
- position.x, position.y, position.z
- rotation.x, rotation.y, rotation.z  
- scale (uniform) or scale.x, scale.y, scale.z
- material.color.h, material.color.s, material.color.l
- material.emissiveIntensity

EXAMPLES:

User: "5 spinning cubes that pulse with bass"
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
}

User: "glowing sphere that changes color with music"
{
  "version": "1.0",
  "name": "Glowing Sphere",
  "objects": [{
    "id": "sphere",
    "type": "single",
    "geometry": { "type": "sphere", "radius": 1 },
    "material": { 
      "type": "phong",
      "color": { "h": "time*0.1", "s": 1, "l": 0.5 },
      "emissive": { "h": "time*0.1", "s": 1, "l": 0.3 },
      "emissiveIntensity": 1
    },
    "animations": [
      { "property": "scale", "value": "1+micData.energy*0.5" },
      { "property": "rotation.y", "value": "time" },
      { "property": "material.color.h", "value": "(time*0.05+micData.mid*0.2)%1" },
      { "property": "material.emissiveIntensity", "value": "1+micData.treble*2" }
    ]
  }]
}

Generate creative visualizations based on the user's request.`;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, previousCode } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Generate visualization code using Google Gemini (FREE!)
    // Using gemini-2.5-flash: Stable, fast, and supports up to 1M tokens
    
    // Build the full prompt with context if this is an improvement
    let fullPrompt = prompt;
    if (previousCode) {
      fullPrompt = `PREVIOUS CONFIGURATION:\n${previousCode}\n\nUSER REQUEST:\n${prompt}\n\nModify the previous configuration according to the user's request. Keep what works well, only change what they asked for.`;
    }
    
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: fullPrompt,
      temperature: 0.7,
    });

    return NextResponse.json({ code: text });
  } catch (error: any) {
    console.error('Error generating visualization:', error);
    const errorMessage = error?.message || 'Failed to generate visualization';
    return NextResponse.json(
      { error: `AI Generation Error: ${errorMessage}. Check your API key and try again.` },
      { status: 500 }
    );
  }
}

