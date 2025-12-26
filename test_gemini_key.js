require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  console.log('Testing Gemini API Key...');
  
  if (!process.env.GOOGLE_API_KEY) {
      console.error('❌ GOOGLE_API_KEY is missing in .env');
      return;
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro"});

    const prompt = "Say 'Gemini is working!' if you can hear me.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Response from Gemini:', text);
    console.log('🎉 API Key is VALID and working.');
  } catch (error) {
    console.error('❌ Gemini Validation Failed:', error.message);
    if (error.message.includes('API key not valid')) {
        console.error('👉 The API Key in .env is incorrect.');
    }
  }
}

testGemini();
