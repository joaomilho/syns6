/**
 * Quick test to verify IndexedDB storage is working
 * Run in browser console to test
 */

import { saveCustomVisualization, getAllCustomVisualizations } from './customVisualizations';

export async function testStorage() {
  console.log('🧪 Testing custom visualization storage...');
  
  // Create a test visualization
  const testViz = {
    id: 'test_' + Date.now(),
    name: 'Test Viz',
    prompt: 'test prompt',
    code: '{"version":"1.0","name":"Test"}',
    createdAt: Date.now(),
    icon: '✨',
    thumbnail: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  };
  
  try {
    // Save it
    console.log('💾 Saving test visualization...');
    await saveCustomVisualization(testViz);
    console.log('✅ Saved successfully');
    
    // Retrieve all
    console.log('📦 Loading all visualizations...');
    const all = await getAllCustomVisualizations();
    console.log('✅ Loaded:', all.length, 'visualizations');
    console.log('📋 List:', all.map(v => ({ id: v.id, name: v.name })));
    
    // Verify our test viz is there
    const found = all.find(v => v.id === testViz.id);
    if (found) {
      console.log('✅ Test visualization found in storage!');
      console.log('📄 Data:', found);
    } else {
      console.error('❌ Test visualization NOT found in storage!');
    }
    
    return all;
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    throw error;
  }
}

// Export for console use
if (typeof window !== 'undefined') {
  (window as any).testCustomVizStorage = testStorage;
  console.log('💡 Run window.testCustomVizStorage() to test storage');
}


