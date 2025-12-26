require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API Key (GEMINI_API_KEY)...');
  
  if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is missing in .env');
      return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest"});

    console.log('Sending prompt to Gemini...');
    const result = await model.generateContent("Reply with 'Success' if this works.");
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Response:', text);
    console.log('🎉 Gemini API is WORKING!');
  } catch (error) {
    console.error('❌ Gemini Error:', error.message);
  }
}

testGemini();
