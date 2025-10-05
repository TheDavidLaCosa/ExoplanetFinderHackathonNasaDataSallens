# 🔬 Optuna Bayesian Optimization Integration

## Overview
Integrated advanced Bayesian hyperparameter optimization using **Optuna** (inspired by `ml_models.py`) into the regression pipeline in `backend_features_fixed.py`.

## What Changed

### ✅ **New Features:**

1. **`optimize_random_forest(X_train, y_train, n_trials=30)`**
   - Uses Optuna's TPE (Tree-structured Parzen Estimator) sampler
   - Optimizes: `n_estimators`, `max_depth`, `min_samples_split`, `min_samples_leaf`, `max_features`
   - Uses 3-fold cross-validation with R² scoring
   - Returns best hyperparameters

2. **`optimize_xgboost(X_train, y_train, n_trials=30)`**
   - Uses Optuna's TPE sampler
   - Optimizes: `max_depth`, `learning_rate`, `n_estimators`, `subsample`, `colsample_bytree`, `min_child_weight`, `gamma`, `reg_alpha`, `reg_lambda`
   - Uses 3-fold cross-validation with R² scoring
   - Returns best hyperparameters

3. **Enhanced `process_data()` function:**
   - Now uses Optuna optimization when `use_bayesian_opt=True`
   - Adds detailed console logging showing:
     - Requested model type
     - Whether Bayesian optimization is used
     - Best parameters found (if optimization is used)
     - Model class name
     - Final MSE and R² scores
   - Returns additional fields in `model_results`:
     - `model_used`: Actual Python class name (e.g., `"XGBRegressor"`, `"RandomForestRegressor"`)
     - `model_type_requested`: What the user selected in the UI

## How It Works

### **Without Bayesian Optimization:**
```python
# RandomForest
model = RandomForestRegressor(n_estimators=100, random_state=42)

# XGBoost
model = xgb.XGBRegressor(n_estimators=100, random_state=42)
```

### **With Bayesian Optimization:**
```python
# RandomForest
best_params = optimize_random_forest(X_train, y_train, n_trials=30)
model = RandomForestRegressor(**best_params, random_state=42, n_jobs=-1)

# XGBoost
best_params = optimize_xgboost(X_train, y_train, n_trials=30)
model = xgb.XGBRegressor(**best_params, random_state=42, n_jobs=-1)
```

## Terminal Output Example

When you run an analysis, you'll see:

```
============================================================
🤖 MODEL SELECTION
============================================================
Requested model: RandomForest
Use Bayesian Optimization: True
🔬 Running Bayesian Optimization for Random Forest...
✅ Optimization complete! Best params: {'n_estimators': 300, 'max_depth': 15, ...}
Model class: RandomForestRegressor
============================================================

📊 MODEL RESULTS:
   MSE: 1234.5678
   R²: 0.8765
   Model: RandomForestRegressor
```

## API Response

The `/api/analyze` endpoint now returns:

```json
{
  "model_results": {
    "mse": 1234.5678,
    "r2": 0.8765,
    "feature_importance": {...},
    "bayesian_opt_used": true,
    "model_used": "RandomForestRegressor",
    "model_type_requested": "RandomForest"
  },
  "request_info": {
    "model_type": "RandomForest",
    "use_bayesian_opt": true,
    ...
  },
  ...
}
```

## Verification

To verify the model selection is working:

1. **Check terminal logs** - You'll see which model was selected and trained
2. **Check API response** - `model_used` field shows the actual model class
3. **Compare results** - XGBoost and RandomForest should produce different results

## Differences from `ml_models.py`

| Feature | `ml_models.py` | `backend_features_fixed.py` |
|---------|----------------|----------------------------|
| **Task** | Classification | Regression |
| **Models** | `RandomForestClassifier`, `XGBClassifier` | `RandomForestRegressor`, `XGBRegressor` |
| **Scoring** | ROC AUC | R² Score |
| **Optimization** | Optuna (50 trials) | Optuna (30 trials) |
| **Integration** | Standalone class | Integrated into Flask API |

## Performance

- **Without Bayesian Opt**: ~1-2 seconds
- **With Bayesian Opt**: ~30-60 seconds (30 trials × 3-fold CV)

## Dependencies

- `optuna` - Already in `requirements.txt`
- `scikit-learn` - Already in `requirements.txt`
- `xgboost` - Already in `requirements.txt`

## Testing

1. Upload a dataset
2. Select "Random Forest" or "XGBoost"
3. Check/uncheck "Use Bayesian Optimization"
4. Click "Start Analysis"
5. Watch the terminal for logs
6. Check the report for `model_used` field

---

**Created:** October 5, 2025  
**Status:** ✅ Integrated and Running
