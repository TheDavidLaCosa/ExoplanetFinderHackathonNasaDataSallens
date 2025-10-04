from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import base64
import io
import uuid
import matplotlib
matplotlib.use('Agg')  # Non-GUI backend
import matplotlib.pyplot as plt
import seaborn as sns

app = Flask(__name__)
CORS(app)

# In-memory storage for uploaded files
uploads = {}

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Backend is running"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload and parse CSV/Excel/JSON file"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    filename = file.filename
    
    if not filename:
        return jsonify({"error": "No filename"}), 400
    
    # Generate upload ID
    upload_id = str(uuid.uuid4())
    
    # Read file based on type
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(file, comment='#', skip_blank_lines=True)
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        elif filename.endswith('.json'):
            df = pd.read_json(file)
        else:
            return jsonify({"error": "Unsupported file type. Use CSV, Excel, or JSON"}), 400
        
        # Store dataframe
        uploads[upload_id] = df
        
        # Detect feature types
        features = []
        for col in df.columns:
            is_numeric = pd.api.types.is_numeric_dtype(df[col])
            sample_val = str(df[col].iloc[0]) if len(df) > 0 else "N/A"
            
            features.append({
                "name": col,
                "type": "numeric" if is_numeric else "categorical",
                "null_count": int(df[col].isnull().sum()),
                "unique_count": int(df[col].nunique()),
                "sample": sample_val
            })
        
        return jsonify({
            "upload_id": upload_id,
            "filename": filename,
            "rows": len(df),
            "columns": list(df.columns),
            "features": features
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Generate analysis with statistics, plots, and insights"""
    data = request.json
    upload_id = data.get('upload_id')
    selected_features = data.get('features', [])
    
    if not upload_id:
        return jsonify({"error": "No upload_id provided"}), 400
    
    if upload_id not in uploads:
        return jsonify({"error": "Upload not found. Please re-upload your file."}), 404
    
    df = uploads[upload_id]
    
    try:
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
        feature_count = 0
        for feature in selected_features:
            if feature in df.columns and feature_count < 6:
                if pd.api.types.is_numeric_dtype(df[feature]):
                    mean_val = df[feature].mean()
                    min_val = df[feature].min()
                    max_val = df[feature].max()
                    
                    statistics.append({
                        "label": f"{feature} (Mean)",
                        "value": f"{mean_val:.2f}"
                    })
                    
                    if feature_count < 3:  # Add min/max for first 3
                        statistics.append({
                            "label": f"{feature} (Range)",
                            "value": f"{min_val:.2f} - {max_val:.2f}"
                        })
                    
                    feature_count += 1
        
        # Generate plots
        plots = []
        
        # Individual feature distributions
        plot_count = 0
        for feature in selected_features:
            if plot_count >= 4:  # Limit to 4 distribution plots
                break
                
            if feature in df.columns and pd.api.types.is_numeric_dtype(df[feature]):
                try:
                    # Create histogram
                    plt.figure(figsize=(8, 6))
                    data_clean = df[feature].dropna()
                    
                    if len(data_clean) > 0:
                        plt.hist(data_clean, bins=min(20, len(data_clean)//5 + 1), 
                                color='#14b8a6', edgecolor='white', alpha=0.8)
                        plt.title(f'Distribution of {feature}', fontsize=14, fontweight='bold')
                        plt.xlabel(feature, fontsize=12)
                        plt.ylabel('Frequency', fontsize=12)
                        plt.grid(alpha=0.3, linestyle='--')
                        
                        # Save to base64
                        buf = io.BytesIO()
                        plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white', dpi=100)
                        buf.seek(0)
                        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                        plt.close()
                        
                        plots.append({
                            "title": f"Distribution of {feature}",
                            "imageBase64": f"data:image/png;base64,{img_base64}",
                            "description": f"Histogram showing the frequency distribution of {feature} values"
                        })
                        
                        plot_count += 1
                except Exception as e:
                    print(f"Error generating plot for {feature}: {e}")
                    plt.close()
        
        # Correlation matrix if multiple numeric features
        numeric_features = [f for f in selected_features 
                          if f in df.columns and pd.api.types.is_numeric_dtype(df[f])]
        
        if len(numeric_features) >= 2:
            try:
                plt.figure(figsize=(10, 8))
                corr_matrix = df[numeric_features].corr()
                
                sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', 
                           center=0, square=True, linewidths=1, cbar_kws={"shrink": 0.8})
                plt.title('Feature Correlation Matrix', fontsize=14, fontweight='bold', pad=20)
                plt.tight_layout()
                
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight', facecolor='white', dpi=100)
                buf.seek(0)
                img_base64 = base64.b64encode(buf.read()).decode('utf-8')
                plt.close()
                
                plots.append({
                    "title": "Feature Correlations",
                    "imageBase64": f"data:image/png;base64,{img_base64}",
                    "description": "Correlation matrix showing relationships between numeric features. Values close to 1 or -1 indicate strong correlations."
                })
            except Exception as e:
                print(f"Error generating correlation matrix: {e}")
                plt.close()
        
        # Generate insights
        insights = []
        insights.append({
            "title": "Dataset Overview",
            "description": f"Successfully analyzed dataset with {len(df):,} records. {len(selected_features)} features were selected for analysis."
        })
        
        # Missing data insights
        total_missing = df[selected_features].isnull().sum().sum()
        if total_missing > 0:
            insights.append({
                "title": "Data Quality",
                "description": f"Found {total_missing} missing values across selected features. Consider data cleaning or imputation."
            })
        
        # Find strong correlations
        if len(numeric_features) >= 2:
            corr_matrix = df[numeric_features].corr()
            high_corr = []
            for i in range(len(numeric_features)):
                for j in range(i+1, len(numeric_features)):
                    corr_val = corr_matrix.iloc[i, j]
                    if abs(corr_val) > 0.7:
                        direction = "positive" if corr_val > 0 else "negative"
                        high_corr.append(f"{numeric_features[i]} ↔ {numeric_features[j]} ({direction}, {abs(corr_val):.2f})")
            
            if high_corr:
                insights.append({
                    "title": "Strong Correlations Detected",
                    "description": f"Found significant correlations: {'; '.join(high_corr[:3])}. These features may contain redundant information."
                })
        
        # Distribution insights
        for feature in numeric_features[:3]:
            if feature in df.columns:
                skewness = df[feature].skew()
                if abs(skewness) > 1:
                    direction = "right-skewed" if skewness > 0 else "left-skewed"
                    insights.append({
                        "title": f"{feature} Distribution",
                        "description": f"This feature is {direction} (skewness: {skewness:.2f}). Consider transformation for certain analyses."
                    })
        
        return jsonify({
            "statistics": statistics,
            "plots": plots,
            "insights": insights,
            "success": True
        })
        
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

@app.route('/api/datasets', methods=['GET'])
def list_datasets():
    """List available NASA datasets"""
    import os
    datasets = []
    
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            if filename.endswith('.csv'):
                filepath = os.path.join(data_dir, filename)
                size_mb = os.path.getsize(filepath) / (1024 * 1024)
                datasets.append({
                    "filename": filename,
                    "size_mb": round(size_mb, 2),
                    "path": filepath
                })
    
    return jsonify({"datasets": datasets})

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 NASA DataPilot Backend API")
    print("="*60)
    print(f"🌐 Server running on: http://localhost:4000")
    print(f"📊 Health check: http://localhost:4000/api/health")
    print(f"📁 Upload endpoint: http://localhost:4000/api/upload")
    print(f"🔬 Analyze endpoint: http://localhost:4000/api/analyze")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=4000, debug=True)

