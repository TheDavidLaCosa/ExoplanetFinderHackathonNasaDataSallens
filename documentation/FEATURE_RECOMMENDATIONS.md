# 🎯 Feature Recommendations & Tooltips System

## Overview
The system now provides intelligent AI-powered recommendations for which features to use as targets and which to use as input features, along with detailed tooltips explaining each feature.

---

## ✨ New Features

### 1. **AI Recommendations Panel**
When you upload a dataset, the system automatically analyzes all features and provides:
- **Recommended Target**: Best column to predict (e.g., planet radius, temperature)
- **Recommended Features**: Top 5 most useful input features
- **One-Click Selection**: Buttons to quickly apply recommendations

### 2. **Feature Tooltips (? icon)**
Every feature now has a **?** icon that shows:
- **Description**: What the feature represents
- **Importance Level**: High/Medium/Low (color-coded)
- **Reason**: Why it's useful for analysis

### 3. **Smart Feature Detection**
The system recognizes:
- **Exoplanet-specific features** (koi_period, koi_prad, koi_teq, etc.)
- **Generic scientific features** (temperature, mass, radius, flux, etc.)
- **Identifiers to exclude** (ID columns, flags, names)

---

## 📊 Feature Knowledge Base

### **Exoplanet Features** (Built-in)

#### **High-Priority Targets:**
- `koi_period` - Orbital period in days
- `koi_prad` - Planetary radius in Earth radii
- `koi_teq` - Equilibrium temperature in Kelvin

#### **High-Priority Features:**
- `koi_insol` - Insolation flux (stellar energy received)
- `koi_depth` - Transit depth in parts per million

#### **Medium-Priority Features:**
- `koi_srad` - Stellar radius in solar radii
- `koi_smass` - Stellar mass in solar masses
- `koi_steff` - Stellar effective temperature
- `koi_duration` - Transit duration in hours

#### **Low-Priority Features:**
- `koi_impact` - Impact parameter (less predictive)
- `koi_snr` - Signal-to-noise ratio (measurement quality, not physical property)

### **Generic Features** (Auto-detected)

#### **Temperature-related:**
- Keywords: `temp`, `temperature`
- **Importance**: High
- **Recommended for**: Target
- **Reason**: Temperature is often a key prediction target

#### **Mass-related:**
- Keywords: `mass`
- **Importance**: High
- **Recommended for**: Target
- **Reason**: Mass is a fundamental physical property

#### **Size/Radius-related:**
- Keywords: `radius`, `size`
- **Importance**: High
- **Recommended for**: Target
- **Reason**: Size is a key classification parameter

#### **Distance-related:**
- Keywords: `distance`, `dist`
- **Importance**: Medium
- **Recommended for**: Feature
- **Reason**: Spatial information can be predictive

#### **Flux/Energy-related:**
- Keywords: `flux`, `luminosity`
- **Importance**: High
- **Recommended for**: Feature
- **Reason**: Energy received affects physical conditions

#### **Derived Ratios:**
- Keywords: `ratio`, `rate`
- **Importance**: Medium
- **Recommended for**: Feature
- **Reason**: Ratios can reveal important relationships

#### **Identifiers (Excluded):**
- Keywords: `id`, `name`, `flag`
- **Importance**: Low
- **Recommended for**: Exclude
- **Reason**: Non-numeric identifiers are not useful for ML models

---

## 🎨 UI Components

### **Recommendations Panel** (Top of Feature Selection)
```
┌─────────────────────────────────────────────────┐
│ ✨ AI Recommendations                           │
│                                                 │
│ 🎯 Recommended Target:                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ koi_prad                          [Use]     │ │
│ │ Planetary radius in Earth radii             │ │
│ │ 💡 Direct indicator of planet size          │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ✨ Recommended Features:                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ koi_insol                    [✓ Selected]   │ │
│ │ Insolation flux                             │ │
│ ├─────────────────────────────────────────────┤ │
│ │ koi_depth                        [Select]   │ │
│ │ Transit depth in ppm                        │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Select All Recommended Features]              │
└─────────────────────────────────────────────────┘
```

### **Feature Cards with Tooltips**
```
┌──────────────────────────┐
│ koi_period          [?]  │  ← Click ? for tooltip
│ float64                  │
└──────────────────────────┘
         ↓ (on hover/click)
┌──────────────────────────────────────┐
│ koi_period                           │
│ Orbital period in days               │
│ [high importance]                    │
│ 💡 Key physical property that        │
│    affects habitability              │
└──────────────────────────────────────┘
```

---

## 🔧 How It Works

### **1. File Upload**
```javascript
handleFileUpload()
  → Backend processes file
  → Returns features with metadata
  → categorizeFeatures() called
```

### **2. Feature Analysis**
```javascript
categorizeFeatures(features)
  → Separates raw vs derived features
  → Calls generateRecommendations()
  → Sets recommendations state
```

### **3. Generate Recommendations**
```javascript
generateRecommendations(features)
  → Maps each feature through getFeatureInfo()
  → Filters by recommendFor: 'target' | 'feature' | 'exclude'
  → Sorts by importance: high > medium > low
  → Returns:
    - recommendedTarget (top target candidate)
    - alternativeTargets (2 more options)
    - recommendedFeatures (top 5 features)
    - excludeFeatures (IDs, flags, etc.)
```

### **4. Feature Info Lookup**
```javascript
getFeatureInfo(featureName)
  → Checks exoplanetFeatures dictionary
  → Falls back to generic keyword matching
  → Returns:
    - description: What it represents
    - importance: 'high' | 'medium' | 'low'
    - recommendFor: 'target' | 'feature' | 'exclude'
    - reason: Why it's useful
```

### **5. Display Tooltips**
```javascript
// On hover or click of ? icon
setShowFeatureTooltip(featureName)
  → Shows absolute positioned tooltip
  → Displays description, importance badge, reason
  → Auto-hides on mouse leave
```

---

## 🎯 User Workflow

### **Option 1: Use AI Recommendations** (Fastest)
1. Upload dataset
2. See AI recommendations panel
3. Click "Use" for recommended target
4. Click "Select All Recommended Features"
5. Click "Start Analysis"

### **Option 2: Manual Selection with Guidance**
1. Upload dataset
2. Review AI recommendations
3. Hover over ? icons to learn about each feature
4. Manually select features based on tooltips
5. Choose your own target
6. Click "Start Analysis"

### **Option 3: Mix Both**
1. Upload dataset
2. Click "Select All Recommended Features"
3. Add/remove features based on tooltip info
4. Use recommended target or choose your own
5. Click "Start Analysis"

---

## 📈 Benefits

### **For Beginners:**
- ✅ No need to understand every feature
- ✅ AI guides you to the best choices
- ✅ One-click setup for quick analysis
- ✅ Learn as you go with tooltips

### **For Experts:**
- ✅ Quick validation of feature selection
- ✅ Detailed metadata for informed decisions
- ✅ Flexibility to override recommendations
- ✅ Importance rankings help prioritize

### **For Everyone:**
- ✅ Faster workflow (no trial and error)
- ✅ Better model performance (optimal features)
- ✅ Educational (learn what features mean)
- ✅ Transparent (see why features are recommended)

---

## 🧪 Example: Kepler Exoplanet Data

### **Upload: `Kepler_2025.10.07_10.44.csv`**

**AI Recommendations:**
```
🎯 Recommended Target: koi_prad
   "Planetary radius in Earth radii"
   💡 Direct indicator of planet size and type

✨ Recommended Features:
   1. koi_insol - Insolation flux
   2. koi_depth - Transit depth
   3. koi_period - Orbital period
   4. koi_steff - Stellar temperature
   5. koi_srad - Stellar radius
```

**Feature Tooltips Available For:**
- `koi_period` - Orbital period (HIGH importance)
- `koi_prad` - Planet radius (HIGH importance)
- `koi_teq` - Temperature (HIGH importance)
- `koi_insol` - Insolation (HIGH importance)
- `koi_depth` - Transit depth (HIGH importance)
- `koi_srad` - Stellar radius (MEDIUM importance)
- `koi_smass` - Stellar mass (MEDIUM importance)
- `koi_steff` - Stellar temp (MEDIUM importance)
- `koi_duration` - Transit duration (MEDIUM importance)
- `koi_impact` - Impact parameter (LOW importance)
- `koi_snr` - Signal-to-noise (LOW importance)

---

## 🔮 Future Enhancements

1. **LLM-Powered Descriptions**
   - Use Groq API to generate custom descriptions
   - Context-aware explanations based on dataset

2. **Correlation-Based Recommendations**
   - Analyze feature correlations before recommending
   - Avoid redundant features

3. **Domain-Specific Presets**
   - Exoplanets, Climate, Medical, Financial, etc.
   - Pre-loaded feature knowledge bases

4. **User Feedback Loop**
   - Track which recommendations users accept
   - Improve recommendations over time

5. **Feature Engineering Suggestions**
   - Suggest new derived features
   - Auto-generate ratios, polynomials, interactions

---

## 🚀 Testing

1. **Start the frontend:**
   ```bash
   cd /Users/uzzielperez/Desktop/NASA/exoplanet-playground
   npm start
   ```

2. **Upload a Kepler dataset**

3. **Check for:**
   - ✅ AI Recommendations panel appears
   - ✅ Recommended target is displayed
   - ✅ Top 5 recommended features listed
   - ✅ ? icons appear on all feature cards
   - ✅ Tooltips show on hover/click
   - ✅ Importance badges are color-coded
   - ✅ "Use" button sets target
   - ✅ "Select All" button selects features

---

## 📝 Code Structure

```
DataAnalyzer.js
├── State Management
│   ├── showFeatureTooltip (which tooltip to show)
│   └── recommendations (AI recommendations object)
│
├── Feature Analysis Functions
│   ├── getFeatureInfo(featureName)
│   │   ├── Exoplanet feature dictionary
│   │   ├── Generic keyword matching
│   │   └── Returns: description, importance, recommendFor, reason
│   │
│   ├── generateRecommendations(features)
│   │   ├── Maps features through getFeatureInfo()
│   │   ├── Filters and sorts by importance
│   │   └── Returns: recommendedTarget, recommendedFeatures, excludeFeatures
│   │
│   └── categorizeFeatures(features)
│       ├── Separates raw vs derived
│       └── Calls generateRecommendations()
│
└── UI Components
    ├── AI Recommendations Panel
    │   ├── Recommended Target Card
    │   ├── Recommended Features List
    │   └── "Select All" Button
    │
    └── Feature Cards with Tooltips
        ├── Feature Button (selectable)
        ├── ? Icon (hover/click)
        └── Tooltip Popup
            ├── Feature name
            ├── Description
            ├── Importance badge
            └── Reason
```

---

**Everything is ready to test!** 🎉
