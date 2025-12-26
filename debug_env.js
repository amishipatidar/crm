const dotenv = require('dotenv');
const result = dotenv.config();

if (result.error) {
  console.log('❌ Error loading .env file:', result.error.message);
} else {
  console.log('✅ .env file loaded successfully.');
  console.log('Parsed keys:', Object.keys(result.parsed).join(', '));
  
  if (result.parsed.GOOGLE_API_KEY) {
    const key = result.parsed.GOOGLE_API_KEY;
    console.log(`🔑 GOOGLE_API_KEY found: ${key.substring(0, 4)}... (length: ${key.length})`);
  } else {
    console.log('❌ GOOGLE_API_KEY is NOT present in the .env file.');
  }
}
