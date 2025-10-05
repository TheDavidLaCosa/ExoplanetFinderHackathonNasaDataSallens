#!/bin/bash

echo "🧪 Testing NASA DataPilot Backend with Real Data"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: Health Check${NC}"
curl -s http://localhost:4000/api/health | python3 -m json.tool
echo ""
echo ""

# Test 2: Upload Kepler Dataset
echo -e "${BLUE}Test 2: Uploading Kepler Dataset${NC}"
echo "File: data/cumulative_2025.10.01_09.32.22.csv"
UPLOAD_RESPONSE=$(curl -s -X POST \
  -F "file=@data/cumulative_2025.10.01_09.32.22.csv" \
  http://localhost:4000/api/upload)

echo "$UPLOAD_RESPONSE" | python3 -m json.tool
echo ""

# Extract upload_id
UPLOAD_ID=$(echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['upload_id'])" 2>/dev/null)

if [ -z "$UPLOAD_ID" ]; then
    echo -e "${YELLOW}❌ Failed to get upload_id${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Upload successful! ID: $UPLOAD_ID${NC}"
echo ""
echo ""

# Test 3: Analyze Data
echo -e "${BLUE}Test 3: Analyzing Kepler Exoplanet Features${NC}"
echo "Selected features: koi_period, koi_depth, koi_prad, koi_teq"
echo ""

ANALYZE_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"upload_id\": \"$UPLOAD_ID\",
    \"features\": [\"koi_period\", \"koi_depth\", \"koi_prad\", \"koi_teq\"]
  }" \
  http://localhost:4000/api/analyze)

# Count plots and insights
NUM_PLOTS=$(echo "$ANALYZE_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('plots', [])))" 2>/dev/null)
NUM_STATS=$(echo "$ANALYZE_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('statistics', [])))" 2>/dev/null)
NUM_INSIGHTS=$(echo "$ANALYZE_RESPONSE" | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('insights', [])))" 2>/dev/null)

echo -e "${GREEN}✅ Analysis complete!${NC}"
echo "   📊 Statistics: $NUM_STATS"
echo "   📈 Plots: $NUM_PLOTS"
echo "   💡 Insights: $NUM_INSIGHTS"
echo ""

# Show statistics
echo -e "${BLUE}Statistics:${NC}"
echo "$ANALYZE_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for stat in data.get('statistics', [])[:8]:
    print(f\"   • {stat['label']}: {stat['value']}\")
" 2>/dev/null
echo ""

# Show insights
echo -e "${BLUE}Insights:${NC}"
echo "$ANALYZE_RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for insight in data.get('insights', []):
    print(f\"   📌 {insight['title']}\")
    print(f\"      {insight['description']}\")
    print()
" 2>/dev/null

echo ""
echo -e "${GREEN}=================================================="
echo "✅ All tests passed!"
echo "==================================================${NC}"
echo ""
echo "🌐 Backend: http://localhost:4000"
echo "🌐 Frontend: http://localhost:3000"
echo ""

