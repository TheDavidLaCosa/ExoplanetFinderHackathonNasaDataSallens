from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import xgboost as xgb
import os
import json
import base64
from io import BytesIO
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set matplotlib to use non-interactive backend
plt.ioff()

def montecarlo(df, column, n_iterations=100):
    """Monte Carlo imputation for missing values"""
    if df[column].isna().sum() == 0:
        return df[column]
    
    # Get non-null values
    non_null_values = df[column].dropna()
    
    # Create imputed values using random sampling
    imputed_values = np.random.choice(non_null_values, size=df[column].isna().sum(), replace=True)
    
    # Fill missing values
    df_imputed = df[column].copy()
    df_imputed[df[column].isna()] = imputed_values
    
    return df_imputed

def control_nulls(df, threshold=0.5):
    """Remove columns with too many missing values"""
    missing_ratio = df.isnull().sum() / len(df)
    columns_to_keep = missing_ratio[missing_ratio < threshold].index
    return df[columns_to_keep]

def pca(df, n_components=0.95):
    """Perform PCA analysis"""
    # Select only numeric columns
    numeric_df = df.select_dtypes(include=[np.number])
    
    if numeric_df.empty:
        return None, None, None
    
    # Handle missing values
    numeric_df = numeric_df.fillna(numeric_df.mean())
    
    # Standardize the data
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(numeric_df)
    
    # Perform PCA
    pca = PCA(n_components=n_components)
    pca_result = pca.fit_transform(scaled_data)
    
    # Create DataFrame with PCA results
    pca_df = pd.DataFrame(pca_result, columns=[f'PC{i+1}' for i in range(pca_result.shape[1])])
    
    return pca_df, pca, scaler

def optimize_random_forest(X_train, y_train, n_trials=30):
    """Optimize RandomForest using Optuna (Bayesian Optimization)"""
    import optuna
    from optuna.samplers import TPESampler
    
    def objective(trial):
        params = {
            'n_estimators': trial.suggest_int('n_estimators', 100, 500, step=50),
            'max_depth': trial.suggest_int('max_depth', 5, 30),
            'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
            'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10),
            'max_features': trial.suggest_categorical('max_features', ['sqrt', 'log2', 0.5, 0.8]),
            'random_state': 42,
            'n_jobs': -1
        }
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.model_selection import cross_val_score
        model = RandomForestRegressor(**params)
        scores = cross_val_score(model, X_train, y_train, cv=3, scoring='r2', n_jobs=-1)
        return scores.mean()
    
    study = optuna.create_study(direction='maximize', sampler=TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    
    return study.best_params

def optimize_xgboost(X_train, y_train, n_trials=30):
    """Optimize XGBoost using Optuna (Bayesian Optimization)"""
    import optuna
    from optuna.samplers import TPESampler
    
    def objective(trial):
        params = {
            'max_depth': trial.suggest_int('max_depth', 3, 10),
            'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
            'n_estimators': trial.suggest_int('n_estimators', 100, 1000, step=50),
            'subsample': trial.suggest_float('subsample', 0.6, 1.0),
            'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
            'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
            'gamma': trial.suggest_float('gamma', 0, 0.5),
            'reg_alpha': trial.suggest_float('reg_alpha', 0, 1.0),
            'reg_lambda': trial.suggest_float('reg_lambda', 0, 2.0),
            'random_state': 42,
            'n_jobs': -1
        }
        from sklearn.model_selection import cross_val_score
        model = xgb.XGBRegressor(**params)
        scores = cross_val_score(model, X_train, y_train, cv=3, scoring='r2', n_jobs=-1)
        return scores.mean()
    
    study = optuna.create_study(direction='maximize', sampler=TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
    
    return study.best_params

def process_data(df, target_column=None, selected_features=None, use_bayesian_opt=False, model_type='XGBoost'):
    """
    Process data with full ML pipeline
    
    Args:
        df: Input dataframe
        target_column: Column to predict
        selected_features: List of feature columns to use
        use_bayesian_opt: Whether to use Bayesian optimization for hyperparameter tuning
        model_type: The type of ML model to use ('XGBoost' or 'RandomForest')
    """
    try:
        print(f"\n{'='*60}")
        print(f"🚀 STARTING PROCESS_DATA")
        print(f"{'='*60}")
        print(f"Input DataFrame shape: {df.shape}")
        print(f"Input columns: {list(df.columns)[:10]}... (showing first 10)")
        print(f"Target column: {target_column}")
        print(f"Selected features: {selected_features}")
        print(f"Model type: {model_type}")
        print(f"Use Bayesian Opt: {use_bayesian_opt}")
        print(f"{'='*60}\n")
        
        # Step 1: Control nulls
        print("Step 1: Controlling nulls...")
        df_clean = control_nulls(df)
        print(f"After control_nulls: {df_clean.shape}")
        
        # Step 2: Handle missing values with Monte Carlo
        for col in df_clean.columns:
            if df_clean[col].isna().sum() > 0:
                df_clean[col] = montecarlo(df_clean, col)
        
        # Step 3: Select features (ensure target is included if specified)
        if selected_features:
            # Make sure target column is in the dataframe
            if target_column and target_column not in selected_features:
                selected_features_with_target = selected_features + [target_column]
                print(f"🔍 DEBUG: Added target '{target_column}' to selected features")
            else:
                selected_features_with_target = selected_features
            
            # Check if all columns exist in the dataframe
            missing_cols = [col for col in selected_features_with_target if col not in df_clean.columns]
            if missing_cols:
                print(f"⚠️ WARNING: Missing columns: {missing_cols}")
                print(f"Available columns: {list(df_clean.columns)}")
                # Remove missing columns
                selected_features_with_target = [col for col in selected_features_with_target if col in df_clean.columns]
            
            print(f"🔍 DEBUG: Final selected features: {selected_features_with_target}")
            df_clean = df_clean[selected_features_with_target]
        
        # Step 4: PCA analysis
        pca_df, pca_model, scaler = pca(df_clean)
        
        # Step 5: ML Model analysis (if target is specified)
        model_results = None
        if target_column and target_column in df_clean.columns:
            # Prepare features and target
            X = df_clean.drop(columns=[target_column])
            y = df_clean[target_column]
            
            print(f"\n🔍 DEBUG: Target column: {target_column}")
            print(f"🔍 DEBUG: Features for ML: {list(X.columns)}")
            print(f"🔍 DEBUG: X shape: {X.shape}, y shape: {y.shape}")
            
            # Handle missing values in target
            y = y.fillna(y.mean())
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            print(f"\n{'='*60}")
            print(f"🤖 MODEL SELECTION")
            print(f"{'='*60}")
            print(f"Requested model: {model_type}")
            print(f"Use Bayesian Optimization: {use_bayesian_opt}")
            
            # Train the selected model with optional Bayesian optimization
            if model_type == 'RandomForest':
                from sklearn.ensemble import RandomForestRegressor
                if use_bayesian_opt:
                    print(f"🔬 Running Bayesian Optimization for Random Forest...")
                    best_params = optimize_random_forest(X_train, y_train, n_trials=30)
                    best_params['random_state'] = 42
                    best_params['n_jobs'] = -1
                    model = RandomForestRegressor(**best_params)
                    print(f"✅ Optimization complete! Best params: {best_params}")
                else:
                    model = RandomForestRegressor(n_estimators=100, random_state=42)
                    print(f"✅ Using default Random Forest parameters")
            else:  # XGBoost
                if use_bayesian_opt:
                    print(f"🔬 Running Bayesian Optimization for XGBoost...")
                    best_params = optimize_xgboost(X_train, y_train, n_trials=30)
                    best_params['random_state'] = 42
                    best_params['n_jobs'] = -1
                    model = xgb.XGBRegressor(**best_params)
                    print(f"✅ Optimization complete! Best params: {best_params}")
                else:
                    model = xgb.XGBRegressor(n_estimators=100, random_state=42)
                    print(f"✅ Using default XGBoost parameters")
            
            print(f"Model class: {type(model).__name__}")
            print(f"{'='*60}\n")
            
            # Train the model
            model.fit(X_train, y_train)
            
            # Make predictions
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            mse = mean_squared_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            print(f"📊 MODEL RESULTS:")
            print(f"   MSE: {mse:.4f}")
            print(f"   R²: {r2:.4f}")
            print(f"   Model: {type(model).__name__}\n")
            
            model_results = {
                'mse': float(mse),
                'r2': float(r2),
                'feature_importance': {str(k): float(v) for k, v in zip(X.columns, model.feature_importances_)} if hasattr(model, 'feature_importances_') else {},
                'bayesian_opt_used': use_bayesian_opt,
                'model_used': type(model).__name__,  # Actual model class name
                'model_type_requested': model_type   # What was requested
            }
        
        # Step 6: Generate plots
        plots = {}
        
        # Correlation matrix
        if len(df_clean.select_dtypes(include=[np.number]).columns) > 1:
            plt.figure(figsize=(10, 8))
            corr_matrix = df_clean.select_dtypes(include=[np.number]).corr()
            sns.heatmap(corr_matrix, annot=True, cmap='coolwarm', center=0)
            plt.title('Correlation Matrix')
            plt.tight_layout()
            
            # Save plot as base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            buffer.seek(0)
            plot_data = base64.b64encode(buffer.getvalue()).decode()
            plots['correlation'] = f"data:image/png;base64,{plot_data}"
            plt.close()
        
        # PCA plot
        if pca_df is not None and len(pca_df.columns) >= 2:
            plt.figure(figsize=(10, 8))
            plt.scatter(pca_df.iloc[:, 0], pca_df.iloc[:, 1], alpha=0.6)
            plt.xlabel('First Principal Component')
            plt.ylabel('Second Principal Component')
            plt.title('PCA Analysis')
            plt.tight_layout()
            
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            buffer.seek(0)
            plot_data = base64.b64encode(buffer.getvalue()).decode()
            plots['pca'] = f"data:image/png;base64,{plot_data}"
            plt.close()
        
        # Feature importance (if model was run)
        if model_results and 'feature_importance' in model_results:
            plt.figure(figsize=(10, 8))
            features = list(model_results['feature_importance'].keys())
            importance = list(model_results['feature_importance'].values())
            plt.barh(features, importance)
            plt.xlabel('Feature Importance')
            plt.title('Model Feature Importance')
            plt.tight_layout()
            
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            buffer.seek(0)
            plot_data = base64.b64encode(buffer.getvalue()).decode()
            plots['feature_importance'] = f"data:image/png;base64,{plot_data}"
            plt.close()
        
        return {
            'success': True,
            'data_shape': [int(df_clean.shape[0]), int(df_clean.shape[1])],
            'pca_components': int(pca_df.shape[1]) if pca_df is not None else 0,
            'model_results': model_results,
            'plots': plots,
            'message': 'Full ML pipeline completed successfully!'
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': 'Error in ML pipeline processing'
        }

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'NASA DataPilot Backend Features API is running!',
        'version': '2.0.0'
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, comment='#', skip_blank_lines=True)
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file)
        elif file.filename.endswith('.json'):
            df = pd.read_json(file)
        else:
            return jsonify({'error': 'Unsupported file format'}), 400
        
        # Generate upload ID
        upload_id = f"upload_{len(os.listdir('data')) + 1}"
        
        # Save file
        os.makedirs('data', exist_ok=True)
        file_path = f"data/{upload_id}_{file.filename}"
        file.seek(0)  # Reset file pointer
        file.save(file_path)
        
        # Get basic info
        rows, cols = df.shape
        
        # Create feature objects with metadata
        features = []
        for col in df.columns:
            dtype = str(df[col].dtype)
            sample_value = str(df[col].iloc[0]) if len(df) > 0 else 'N/A'
            features.append({
                'name': col,
                'type': dtype,
                'sample': sample_value
            })
        
        return jsonify({
            'upload_id': upload_id,
            'filename': file.filename,
            'rows': rows,
            'columns': cols,
            'features': features,
            'message': 'File uploaded successfully!'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    try:
        data = request.get_json()
        upload_id = data.get('upload_id')
        selected_features = data.get('selected_features', [])
        target_column = data.get('target_column')
        use_bayesian_opt = data.get('use_bayesian_opt', False)
        model_type = data.get('model_type', 'XGBoost') # Default to XGBoost
        
        if not upload_id:
            return jsonify({'error': 'Upload ID required'}), 400
        
        # Find the uploaded file
        data_dir = 'data'
        files = [f for f in os.listdir(data_dir) if f.startswith(upload_id)]
        
        if not files:
            return jsonify({'error': 'File not found'}), 404
        
        file_path = os.path.join(data_dir, files[0])
        
        # Read the file
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, comment='#', skip_blank_lines=True)
        elif file_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_path)
        elif file_path.endswith('.json'):
            df = pd.read_json(file_path)
        else:
            return jsonify({'error': 'Unsupported file format'}), 400
        
        # Store the request info for transparency
        request_info = {
            'upload_id': upload_id,
            'filename': files[0],
            'target_column': target_column,
            'selected_features': selected_features,
            'use_bayesian_opt': use_bayesian_opt,
            'model_type': model_type,
            'timestamp': pd.Timestamp.now().isoformat()
        }
        
        # Process with full ML pipeline
        results = process_data(df, target_column, selected_features, use_bayesian_opt, model_type)
        
        # Add request info to results
        results['request_info'] = request_info
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 NASA DataPilot Backend Features API (FIXED)")
    print("=" * 60)
    print("🌐 Server running on: http://localhost:4000")
    print("📊 Health check: http://localhost:4000/api/health")
    print("📁 Upload endpoint: http://localhost:4000/api/upload")
    print("🔬 Analyze endpoint: http://localhost:4000/api/analyze")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=4000, debug=True)
