// Quick script to list available Gemini models
// Run with: npx tsx scripts/list-gemini-models.ts

async function listModels() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not found in environment');
    console.log('Add it to .env.local and restart');
    process.exit(1);
  }

  console.log('🔍 Fetching available Gemini models...\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', error);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ Available Models:\n');
    
    data.models.forEach((model: any) => {
      const name = model.name.replace('models/', '');
      const methods = model.supportedGenerationMethods || [];
      const supportsGenerate = methods.includes('generateContent');
      
      if (supportsGenerate) {
        console.log(`✓ ${name}`);
        console.log(`  Methods: ${methods.join(', ')}`);
        console.log(`  Description: ${model.description || 'N/A'}`);
        console.log('');
      }
    });

    // Show which ones support generateContent
    console.log('\n📝 Models that support generateContent:');
    const validModels = data.models
      .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', ''));
    
    console.log(validModels.join('\n'));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listModels();


