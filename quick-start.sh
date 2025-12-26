#!/bin/bash

echo "🚀 SMS Lead Management System - Quick Start"
echo "============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your API keys before starting the server."
    echo "   Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, GEMINI_API_KEY, MONGODB_URI"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start MongoDB (local or Atlas)"
echo "3. Run: npm run dev"
echo "4. Test with: node test-sms.js"
echo ""
echo "📚 For detailed setup, see DEPLOYMENT.md"
echo "📖 For API documentation, see README.md" 