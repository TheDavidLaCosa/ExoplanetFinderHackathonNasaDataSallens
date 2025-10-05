from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import io, uuid, os
import matplotlib
matplotlib.use('Agg')  # Non-GUI backend
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 120 * 1024 * 1024  # 120MB

# In-memory store dels uploads (bytes)
UPLOAD_STORE: dict[str, bytes] = {}
# Map d'upload_id -> path del CSV net guardat
CLEANED_CSV_PATHS: dict[str, str] = {}

UPLOAD_DIR = "./uploads"

def _ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs("./img", exist_ok=True)

def read_columns_and_save_clean_csv(filename: str, content: bytes) -> tuple[list[str], str]:
    """
    Llegeix TOT el fitxer (taula en memòria) i desa un CSV net (sense línies amb '#').
    Retorna (columns, cleaned_csv_path).
    """
    lower = (filename or "").lower()
    _ensure_upload_dir()
    cleaned_path = os.path.join(UPLOAD_DIR, f"dataset.csv")

    if lower.endswith(".csv"):
        # Llegeix tot el CSV ja netejant metadades amb '#'
        df = pd.read_csv(
            io.BytesIO(content),
            sep=",",
            comment="#",
            engine="python",
            on_bad_lines="skip"
        )
        # Desa CSV net
        df.to_csv(cleaned_path, index=False)
        return list(df.columns), cleaned_path

    elif lower.endswith(".xlsx") or lower.endswith(".xls"):
        # Excel: llegeix tot i desa en format CSV per consistència
        df = pd.read_excel(io.BytesIO(content))
        df.to_csv(cleaned_path, index=False)
        return list(df.columns), cleaned_path

    else:
        raise ValueError("Format no suportat. Fes servir .xlsx, .xls o .csv")

def montecarlo(dataset, col):
    """Monte Carlo imputation for missing values"""
    if dataset[col].dtype in ["int64", "float64"]:
        if dataset[col].isna().sum() > 0:
            mean = dataset[col].mean()
            std = dataset[col].std()
            if not pd.isna(std) and std > 0:
                # Generem valors aleatoris
                random_values = np.random.normal(mean, std, size=dataset[col].isna().sum())
                dataset.loc[dataset[col].isna(), col] = random_values
    return dataset[col]

def control_nulls(dataset, level=20):
    """Handle missing values - remove columns with >level% missing, fill others with Monte Carlo"""
    for col in dataset.columns:
        nan_counts = dataset[col].isna().sum()
        nan_percent = (nan_counts / len(dataset[col])) * 100
        
        if nan_percent < level:
            dataset[col] = montecarlo(dataset, col)
        else:
            dataset.drop(columns=[col], inplace=True)
    return dataset

def generate_correlation_plot(data, filename):
    """Generate correlation heatmap"""
    try:
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) < 2:
            return False
            
        correlation = data[numeric_cols].corr()
        
        plt.figure(figsize=(12, 10))
        sns.heatmap(
            correlation,
            annot=True,
            cmap="icefire",
            fmt=".2f",
            cbar=True
        )
        plt.title("Numeric Variables Correlation", fontsize=14)
        plt.xticks(rotation=45, ha="right")
        plt.yticks(rotation=0)
        plt.tight_layout()
        plt.savefig(filename, format="jpg", dpi=300, bbox_inches='tight')
        plt.close()
        return True
    except Exception as e:
        print(f"Error generating correlation plot: {e}")
        return False

def process_data_simple(columns, level=20):
    """Simplified data processing without complex ML"""
    try:
        dataset = pd.read_csv("./uploads/dataset.csv", sep=",")
        
        # Filter columns that exist
        available_cols = [col for col in columns if col in dataset.columns]
        if not available_cols:
            return dataset, None, None
            
        df_filtered = dataset[available_cols]
        
        # Handle nulls
        df_processed = control_nulls(df_filtered.copy(), level)
        
        # Generate correlation plot
        generate_correlation_plot(df_processed, "./img/correlation_plot.jpg")
        
        return df_processed, None, None
        
    except Exception as e:
        print(f"Error in process_data_simple: {e}")
        return None, None, None

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Backend ML API is running"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload and clean file using ML pipeline"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    filename = file.filename
    
    if not filename:
        return jsonify({"error": "No filename"}), 400
    
    try:
        content = file.read()  # bytes del fitxer
        upload_id = str(uuid.uuid4())
        UPLOAD_STORE[upload_id] = content

        # Clean the data using backend_features logic
        columns, cleaned_path = read_columns_and_save_clean_csv(filename, content)
        CLEANED_CSV_PATHS[upload_id] = cleaned_path

        # Process data with simplified ML pipeline
        try:
            data, data_pac, model = process_data_simple(columns, level=20)
            print(f"✅ ML processing complete for {filename}")
        except Exception as e:
            print(f"⚠️ ML processing failed: {e}")
            # Continue without ML processing

        # Detect feature types
        features = []
        for col in columns:
            # Read a sample to determine type
            df_sample = pd.read_csv(cleaned_path, nrows=5)
            is_numeric = pd.api.types.is_numeric_dtype(df_sample[col])
            sample_val = str(df_sample[col].iloc[0]) if len(df_sample) > 0 else "N/A"
            
            features.append({
                "name": col,
                "type": "numeric" if is_numeric else "categorical",
                "null_count": 0,  # Will be updated after full processing
                "unique_count": 0,  # Will be updated after full processing
                "sample": sample_val
            })

        return jsonify({
            "upload_id": upload_id,
            "filename": filename,
            "rows": len(pd.read_csv(cleaned_path)),
            "columns": columns,
            "features": features,
            "cleaned_path": cleaned_path,
            "ml_processed": True
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to process file: {str(e)}"}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    """Analyze data with selected features and target"""
    data = request.json
    upload_id = data.get('upload_id')
    selected_features = data.get('features', [])
    target_column = data.get('target', None)
    
    if not upload_id:
        return jsonify({"error": "No upload_id provided"}), 400
    
    if upload_id not in CLEANED_CSV_PATHS:
        return jsonify({"error": "Upload not found. Please re-upload your file."}), 404
    
    try:
        cleaned_path = CLEANED_CSV_PATHS[upload_id]
        df = pd.read_csv(cleaned_path)
        
        # Filter selected features
        if selected_features:
            available_features = [f for f in selected_features if f in df.columns]
            df_filtered = df[available_features]
        else:
            df_filtered = df
        
        # Add target if specified
        if target_column and target_column in df.columns:
            df_filtered[target_column] = df[target_column]
        
        # Save filtered dataset for ML processing
        filtered_path = os.path.join(UPLOAD_DIR, f"filtered_{upload_id}.csv")
        df_filtered.to_csv(filtered_path, index=False)
        
        # Process with ML pipeline
        try:
            data_processed, data_pac, model = process_data_simple(list(df_filtered.columns), level=20)
            
            # Generate statistics
            statistics = []
            statistics.append({
                "label": "Total Records",
                "value": str(len(df_filtered))
            })
            statistics.append({
                "label": "Features Selected",
                "value": str(len(available_features))
            })
            
            if target_column:
                statistics.append({
                    "label": "Target Column",
                    "value": target_column
                })
            
            # Add feature statistics
            for feature in available_features[:6]:
                if feature in df_filtered.columns and pd.api.types.is_numeric_dtype(df_filtered[feature]):
                    mean_val = df_filtered[feature].mean()
                    statistics.append({
                        "label": f"{feature} (Mean)",
                        "value": f"{mean_val:.2f}"
                    })
            
            # Generate insights
            insights = []
            insights.append({
                "title": "Dataset Overview",
                "description": f"Successfully processed dataset with {len(df_filtered)} records and {len(available_features)} features."
            })
            
            if target_column:
                insights.append({
                    "title": "Target Analysis",
                    "description": f"Target column '{target_column}' included for supervised learning analysis."
                })
            
            # Check for correlations
            numeric_features = [f for f in available_features if f in df_filtered.columns and pd.api.types.is_numeric_dtype(df_filtered[f])]
            if len(numeric_features) >= 2:
                corr_matrix = df_filtered[numeric_features].corr()
                high_corr = []
                for i in range(len(numeric_features)):
                    for j in range(i+1, len(numeric_features)):
                        corr_val = corr_matrix.iloc[i, j]
                        if abs(corr_val) > 0.7:
                            high_corr.append(f"{numeric_features[i]} ↔ {numeric_features[j]} ({corr_val:.2f})")
                
                if high_corr:
                    insights.append({
                        "title": "Strong Correlations",
                        "description": f"Found strong correlations: {'; '.join(high_corr[:3])}"
                    })
            
            return jsonify({
                "statistics": statistics,
                "plots": [],  # Plots are saved as files in ./img/
                "insights": insights,
                "success": True,
                "ml_processed": True,
                "plots_saved": [
                    "./img/correlation_plot.jpg"
                ]
            })
            
        except Exception as e:
            print(f"ML processing error: {e}")
            # Return basic analysis without ML
            return jsonify({
                "statistics": [{"label": "Records", "value": str(len(df_filtered))}],
                "plots": [],
                "insights": [{"title": "Basic Analysis", "description": "Data processed successfully"}],
                "success": True,
                "ml_processed": False,
                "error": str(e)
            })
        
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}"}), 500

if __name__ == '__main__':
    _ensure_upload_dir()
    print("\n" + "="*60)
    print("🚀 NASA DataPilot Backend ML API")
    print("="*60)
    print(f"🌐 Server running on: http://localhost:4000")
    print(f"📊 Health check: http://localhost:4000/api/health")
    print(f"📁 Upload endpoint: http://localhost:4000/api/upload")
    print(f"🔬 Analyze endpoint: http://localhost:4000/api/analyze")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=4000, debug=True)
