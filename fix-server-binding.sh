#!/bin/bash

echo "🔧 Fixing server binding issue on EC2..."

# Navigate to the app directory
cd /var/www/html/ai_twilio

echo "📁 Current directory: $(pwd)"

# Check current server.js configuration
echo "🔍 Checking current server.js configuration:"
grep -n "app.listen" src/server.js

# Check if the binding is already fixed
if grep -q "app.listen(PORT, '0.0.0.0'" src/server.js; then
    echo "✅ Server binding is already correct (0.0.0.0)"
else
    echo "🔧 Fixing server binding..."
    # Fix the server binding
    sed -i "s/app.listen(PORT, () => {/app.listen(PORT, '0.0.0.0', () => {/" src/server.js
    echo "✅ Server binding fixed"
fi

# Verify the change
echo "🔍 Verifying the change:"
grep -A 2 -B 2 "app.listen" src/server.js

# Restart the application
echo "🔄 Restarting application..."
pm2 restart ai-twilio

# Wait a moment for the app to start
sleep 3

# Check the logs
echo "📋 Recent logs:"
pm2 logs ai-twilio --lines 10

# Test the API directly
echo "🧪 Testing API connection:"
curl -s http://localhost:3001/api || echo "❌ API test failed"

# Check what's listening on port 3001
echo "🔍 Checking what's listening on port 3001:"
sudo netstat -tlnp | grep :3001

echo "✅ Fix script completed!"
echo "🌐 Try accessing your app at: http://44.200.2.140/login"
