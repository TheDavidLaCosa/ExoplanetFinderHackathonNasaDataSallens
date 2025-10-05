# 🔗 Backend Integration Guide

## Overview

Your team has built a **Flask backend** that handles:
- Excel/CSV file uploads
- Feature detection and selection
- Data processing with pandas
- Base64 image encoding
- Multi-image responses

Now we'll integrate it with the React frontend!

---

## 📁 Backend Files Merged

From the `backend` branch:
- ✅ `backend/backend.py` - Simple Flask API with image endpoints
- ✅ `backend/backend_features.py` - Full Excel/CSV feature selector
- ✅ `backend/example1.jpg, example2.jpg, example3.jpg` - Test images
- ✅ `data/*.csv` - Real NASA datasets (Kepler, TESS, K2)
- ✅ `nasa.ipynb` - Jupyter notebook for analysis

---

## 🚀 Setup Backend

### Step 1: Install Python Dependencies

Create `backend/requirements.txt`:

```bash
cd /Users/uzzielperez/Desktop/NASA/exoplanet-playground/backend
cat > requirements.txt << EOF
Flask==3.0.0
Flask-CORS==4.0.0
pandas==2.1.0
openpyxl==3.1.2
xlrd==2.0.1
EOF
```

Install dependencies:

```bash
pip install -r requirements.txt
# or
pip3 install -r requirements.txt
```

### Step 2: Add CORS Support

Update `backend/backend.py` to allow React to connect:

```python
from flask import Flask, jsonify, send_file
from flask_cors import CORS
import base64

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# ... rest of the code
```

Same for `backend/backend_features.py`:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)  # Enable CORS

# ... rest of the code
```

### Step 3: Run Backend Server

```bash
cd backend
python backend_features.py
# Server runs on http://localhost:4000
```

---

## 🔗 Frontend Integration

### Update DataAnalyzer to Use Backend

Modify `src/components/DataAnalyzer.js` to send files to backend:

```javascript
const handleFileUpload = async (event) => {
  const uploadedFile = event.target.files[0];
  if (!uploadedFile) return;

  setFile(uploadedFile);
  setIsProcessing(true);

  try {
    // Send file to backend
    const formData = new FormData();
    formData.append('file', uploadedFile);

    const response = await fetch('http://localhost:4000/api/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    // Backend returns columns
    const features = {
      raw: result.columns.filter(c => !isDerived(c)).map(c => ({
        name: c,
        type: 'numeric',
        description: `Feature from ${uploadedFile.name}`
      })),
      derived: result.columns.filter(c => isDerived(c)).map(c => ({
        name: c,
        type: 'numeric',
        description: `Calculated feature`
      }))
    };

    setDetectedFeatures(features);
    setStep('conversation');
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error connecting to backend');
  } finally {
    setIsProcessing(false);
  }
};
```

### Create Backend Service

Create `src/services/backendService.js`:

```javascript
const BACKEND_URL = 'http://localhost:4000';

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return response.json();
}

export async function analyzeData(uploadId, selectedFeatures) {
  const response = await fetch(`${BACKEND_URL}/api/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      upload_id: uploadId,
      features: selectedFeatures
    })
  });

  if (!response.ok) {
    throw new Error(`Backend error: ${response.status}`);
  }

  return response.json();
}

export async function getImages() {
  const response = await fetch(`${BACKEND_URL}/api/multi`);
  const data = await response.json();
  
  // Returns base64 encoded images
  return data.images.map(img => `data:image/jpeg;base64,${img}`);
}
```

---

## 🔧 Backend API Endpoints

### Current Endpoints (from backend.py)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/data` | GET | Sample JSON data |
| `/api/image` | GET | Single image file |
| `/api/multi` | GET | Multiple base64 images |

### Feature Selector Endpoints (from backend_features.py)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Upload form |
| `/excel` | POST | Process Excel/CSV |
| `/submit-columns` | POST | Submit selected features |

---

## 🎯 Recommended Backend API Structure

Let me create a new unified backend that works perfectly with our React app:

Create `backend/api.py`:

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import base64
import io
import uuid
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

app = Flask(__name__)
CORS(app)

# In-memory storage for uploaded files
uploads = {}

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload and parse file"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    filename = file.filename
    
    # Generate upload ID
    upload_id = str(uuid.uuid4())
    
    # Read file based on type
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        elif filename.endswith('.json'):
            df = pd.read_json(file)
        else:
            return jsonify({"error": "Unsupported file type"}), 400
        
        # Store dataframe
        uploads[upload_id] = df
        
        # Detect feature types
        features = []
        for col in df.columns:
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            features.append({
                "name": col,
                "type": "numeric" if is_numeric else "categorical",
                "null_count": int(df[col].isnull().sum()),
                "unique_count": int(df[col].nunique())
            })
        
        return jsonify({
            "upload_id": upload_id,
            "filename": filename,
            "rows": len(df),
            "columns": list(df.columns),
            "features": features
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Generate analysis with plots"""
    data = request.json
    upload_id = data.get('upload_id')
    selected_features = data.get('features', [])
    
    if upload_id not in uploads:
        return jsonify({"error": "Upload not found"}), 404
    
    df = uploads[upload_id]
    
    # Generate statistics
    statistics = []
    statistics.append({
        "label": "Total Records",
        "value": str(len(df))
    })
    statistics.append({
        "label": "Features Analyzed",
        "value": str(len(selected_features))
    })
    
    # Statistics for each feature
    for feature in selected_features[:6]:  # Limit to 6
        if feature in df.columns:
            if pd.api.types.is_numeric_dtype(df[feature]):
                mean_val = df[feature].mean()
                statistics.append({
                    "label": f"{feature} (Mean)",
                    "value": f"{mean_val:.2f}"
                })
    
    # Generate plots
    plots = []
    
    for feature in selected_features[:4]:  # Limit to 4 plots
        if feature in df.columns and pd.api.types.is_numeric_dtype(df[feature]):
            # Create histogram
            plt.figure(figsize=(8, 6))
            plt.hist(df[feature].dropna(), bins=20, color='#14b8a6', edgecolor='white')
            plt.title(f'Distribution of {feature}')
            plt.xlabel(feature)
            plt.ylabel('Frequency')
            plt.grid(alpha=0.3)
            
            # Save to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            plt.close()
            
            plots.append({
                "title": f"Distribution of {feature}",
                "imageBase64": f"data:image/png;base64,{img_base64}",
                "description": f"Histogram showing distribution of {feature}"
            })
    
    # Correlation plot if multiple numeric features
    numeric_features = [f for f in selected_features if f in df.columns and pd.api.types.is_numeric_dtype(df[f])]
    
    if len(numeric_features) >= 2:
        plt.figure(figsize=(10, 8))
        corr_matrix = df[numeric_features].corr()
        sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', center=0)
        plt.title('Feature Correlation Matrix')
        
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close()
        
        plots.append({
            "title": "Feature Correlations",
            "imageBase64": f"data:image/png;base64,{img_base64}",
            "description": "Correlation matrix showing relationships between features"
        })
    
    # Generate insights
    insights = []
    insights.append({
        "title": "Dataset Overview",
        "description": f"The dataset contains {len(df)} records with {len(selected_features)} features selected for analysis."
    })
    
    # Find correlations
    if len(numeric_features) >= 2:
        corr_matrix = df[numeric_features].corr()
        high_corr = []
        for i in range(len(numeric_features)):
            for j in range(i+1, len(numeric_features)):
                corr_val = corr_matrix.iloc[i, j]
                if abs(corr_val) > 0.7:
                    high_corr.append(f"{numeric_features[i]} and {numeric_features[j]} ({corr_val:.2f})")
        
        if high_corr:
            insights.append({
                "title": "Strong Correlations Found",
                "description": f"High correlations detected: {', '.join(high_corr)}"
            })
    
    return jsonify({
        "statistics": statistics,
        "plots": plots,
        "insights": insights
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4000, debug=True)
```

---

## 📦 Required Python Packages

Create `backend/requirements.txt`:

```
Flask==3.0.0
Flask-CORS==4.0.0
pandas==2.1.0
openpyxl==3.1.2
xlrd==2.0.1
matplotlib==3.8.0
seaborn==0.13.0
scipy==1.11.0
```

Install:

```bash
cd backend
pip install -r requirements.txt
```

---

## 🚀 Running Both Servers

### Terminal 1: Backend
```bash
cd /Users/uzzielperez/Desktop/NASA/exoplanet-playground/backend
python api.py
# Runs on http://localhost:4000
```

### Terminal 2: Frontend
```bash
cd /Users/uzzielperez/Desktop/NASA/exoplanet-playground
npm start
# Runs on http://localhost:3000
```

---

## ✅ Testing the Integration

1. **Start backend**: `python backend/api.py`
2. **Start frontend**: `npm start`
3. **Go to**: http://localhost:3000
4. **Click**: "Analyze Data"
5. **Upload**: One of the CSV files from `data/` folder
6. **Select features** and analyze

---

## 🔄 Next Steps

1. Create the unified `backend/api.py` file
2. Update React DataAnalyzer to use backend endpoints
3. Test with real NASA datasets from `data/` folder
4. Deploy both services together

---

**Backend integration ready!** 🎉

