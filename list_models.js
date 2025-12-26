require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  console.log('Listing available models...');
  
  if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is missing');
      return;
  }

  try {
    // We can't easily list models via the Node SDK directly in older versions, 
    // but let's try a direct fetch if the SDK fails.
    // Actually, newer SDK might have a method, but I'll stick to a simple fetch for maximum compatibility
    // to verify the KEY and what it can see.
    
    // Using fetch directly to debug
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
        console.log('✅ Available Models:');
        data.models.forEach(m => console.log(` - ${m.name}`));
    } else {
        console.error('❌ Failed to list models:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listModels();
