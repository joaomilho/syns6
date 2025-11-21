/**
 * Storage and management for custom user-created visualizations
 */

import localforage from 'localforage';

// Configure localforage for custom visualizations
const customVizStore = localforage.createInstance({
  name: 'syns',
  storeName: 'customVisualizations',
  description: 'User-created custom visualizations'
});

export interface CustomVisualization {
  id: string;
  name: string;
  prompt: string;
  code: string; // DSL JSON code
  compiledCode?: string; // Compiled JS code for performance
  createdAt: number;
  icon?: string;
  thumbnail?: string;
}

export async function saveCustomVisualization(viz: CustomVisualization): Promise<void> {
  // Create a clean plain object to avoid any serialization issues
  const cleanViz: CustomVisualization = {
    id: viz.id,
    name: viz.name,
    prompt: viz.prompt,
    code: viz.code,
    compiledCode: viz.compiledCode,
    createdAt: viz.createdAt,
    icon: viz.icon,
    thumbnail: viz.thumbnail,
  };
  
  await customVizStore.setItem(cleanViz.id, cleanViz);
}

export async function getCustomVisualization(id: string): Promise<CustomVisualization | null> {
  return await customVizStore.getItem<CustomVisualization>(id);
}

export async function getAllCustomVisualizations(): Promise<CustomVisualization[]> {
  const visualizations: CustomVisualization[] = [];
  await customVizStore.iterate<CustomVisualization, void>((value) => {
    visualizations.push(value);
  });
  return visualizations.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteCustomVisualization(id: string): Promise<void> {
  await customVizStore.removeItem(id);
}

export async function clearAllCustomVisualizations(): Promise<void> {
  await customVizStore.clear();
}
