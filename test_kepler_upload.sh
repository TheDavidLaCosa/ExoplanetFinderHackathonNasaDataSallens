#!/bin/bash

echo "🧪 Testing Kepler Data Upload to Backend"
echo "=========================================="
echo ""

# Test backend health
echo "1. Testing backend health..."
curl -s http://localhost:4000/api/health | python3 -m json.tool
echo ""
echo ""

# Upload Kepler dataset
echo "2. Uploading Kepler dataset..."
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "file=@data/cumulative_2025.10.01_09.32.22.csv" \
  http://localhost:4000/api/upload)

echo "$UPLOAD_RESPONSE" | python3 -m json.tool
echo ""

# Extract upload_id
UPLOAD_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['upload_id'])" 2>/dev/null)

if [ -z "$UPLOAD_ID" ]; then
    echo "❌ Failed to get upload_id"
    exit 1
fi

echo "✅ Upload successful! ID: $UPLOAD_ID"
echo ""

# Test analysis with Kepler features
echo "3. Analyzing Kepler exoplanet features..."
ANALYZE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"upload_id\": \"$UPLOAD_ID\",
    \"features\": [\"koi_period\", \"koi_depth\", \"koi_prad\", \"koi_teq\"]
  }" \
  http://localhost:4000/api/analyze)

echo "Analysis response:"
echo "$ANALYZE_RESPONSE" | python3 -m json.tool

echo ""
echo "✅ Backend integration test complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "🌐 Backend: http://localhost:4000"
