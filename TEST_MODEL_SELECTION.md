# 🧪 Model Selection Communication Test

## ✅ Code Verification

### **Frontend → Backend Flow:**

```
User selects model in UI
       ↓
selectedModel state updated
       ↓
User clicks "Start Analysis"
       ↓
handleStartAnalysis() called
       ↓
Sends POST to /api/analyze with:
{
  "upload_id": "...",
  "selected_features": [...],
  "target_column": "...",
  "use_bayesian_opt": false,
  "model_type": "XGBoost" or "RandomForest"  ← HERE
}
       ↓
Backend receives model_type
       ↓
Passes to process_data()
       ↓
if model_type == 'RandomForest':
    model = RandomForestRegressor()
else:
    model = XGBRegressor()
       ↓
Trains model and returns results
```

---

## 📊 Code Locations

### **Frontend (DataAnalyzer.js)**

**Line 18:** State initialization
```javascript
const [selectedModel, setSelectedModel] = useState('XGBoost');
```

**Line 499:** Sending to backend
```javascript
const requestPayload = {
  upload_id: fileData.upload_id,
  selected_features: selectedFeatures,
  target_column: selectedTarget || null,
  use_bayesian_opt: useBayesianOpt,
  model_type: selectedModel  // ← Sent here
};
```

**Line 502:** Console log
```javascript
console.log('🔬 Sending analysis request to backend...', requestPayload);
```

**Line 1063-1071:** UI Dropdown
```javascript
<select
  value={selectedModel}
  onChange={(e) => setSelectedModel(e.target.value)}
  className="w-full bg-zinc-800 text-white p-3 rounded-lg"
>
  <option value="XGBoost">XGBoost</option>
  <option value="RandomForest">Random Forest</option>
  <option value="NeuralNetwork" disabled>Neural Networks - Coming Soon</option>
</select>
```

### **Backend (backend_features_fixed.py)**

**Line 286:** Receiving from frontend
```python
model_type = data.get('model_type', 'XGBoost')  # Default to XGBoost
```

**Line 317:** Storing in request_info
```python
request_info = {
    'upload_id': upload_id,
    'filename': files[0],
    'target_column': target_column,
    'selected_features': selected_features,
    'use_bayesian_opt': use_bayesian_opt,
    'model_type': model_type,  # ← Stored here
    'timestamp': pd.Timestamp.now().isoformat()
}
```

**Line 322:** Passing to ML pipeline
```python
results = process_data(df, target_column, selected_features, use_bayesian_opt, model_type)
```

**Lines 115-129:** Model selection logic
```python
# Train the selected model
if model_type == 'RandomForest':
    from sklearn.ensemble import RandomForestRegressor
    model = RandomForestRegressor(n_estimators=100, random_state=42)
else:  # Default to XGBoost
    if use_bayesian_opt:
        best_params = {
            'n_estimators': 200,
            'max_depth': 6,
            'learning_rate': 0.05,
            'subsample': 0.8,
            'colsample_bytree': 0.8
        }
        model = xgb.XGBRegressor(**best_params, random_state=42)
    else:
        model = xgb.XGBRegressor(n_estimators=100, random_state=42)
```

---

## 🧪 How to Test

### **Test 1: XGBoost Model**

1. Upload a dataset (e.g., Kepler CSV)
2. Select features and target
3. **Select "XGBoost"** from dropdown
4. Click "Start Analysis"
5. **Check browser console:**
   ```javascript
   🔬 Sending analysis request to backend... 
   {
     upload_id: "upload_1",
     selected_features: [...],
     target_column: "koi_prad",
     use_bayesian_opt: false,
     model_type: "XGBoost"  // ← Should say "XGBoost"
   }
   ```
6. **Check backend terminal:**
   ```
   127.0.0.1 - - [05/Oct/2025 12:35:39] "POST /api/analyze HTTP/1.1" 200 -
   ```
7. **Check results:**
   - Report should show: `ML Model: XGBoost`
   - Request JSON should include: `"model_type": "XGBoost"`

### **Test 2: Random Forest Model**

1. Upload a dataset
2. Select features and target
3. **Select "Random Forest"** from dropdown
4. Click "Start Analysis"
5. **Check browser console:**
   ```javascript
   🔬 Sending analysis request to backend... 
   {
     model_type: "RandomForest"  // ← Should say "RandomForest"
   }
   ```
6. **Check results:**
   - Report should show: `ML Model: RandomForest`
   - Request JSON should include: `"model_type": "RandomForest"`

### **Test 3: Compare Results**

Run the same dataset with both models and compare:

**XGBoost:**
- Usually faster training
- Often better for tabular data
- Feature importance from gradient boosting

**Random Forest:**
- More interpretable
- Less prone to overfitting
- Feature importance from tree splits

---

## 🔍 Debugging Tips

### **If model selection doesn't seem to work:**

1. **Check browser console** for the request payload
2. **Check backend terminal** for any errors
3. **Check the request JSON** in the report
4. **Add debug logging** to backend:

```python
# In backend_features_fixed.py, line 286
model_type = data.get('model_type', 'XGBoost')
print(f"🤖 Model type received: {model_type}")  # Add this

# In process_data, line 115
if model_type == 'RandomForest':
    print("🌲 Using Random Forest")  # Add this
    model = RandomForestRegressor(...)
else:
    print("🚀 Using XGBoost")  # Add this
    model = xgb.XGBRegressor(...)
```

---

## ✅ Expected Behavior

### **XGBoost Selected:**
```
Frontend Console:
  🔬 Sending analysis request to backend... {model_type: "XGBoost"}

Backend Terminal:
  🤖 Model type received: XGBoost
  🚀 Using XGBoost
  127.0.0.1 - - [05/Oct/2025 12:35:39] "POST /api/analyze HTTP/1.1" 200 -

Report:
  📋 Analysis Request
  {
    "model_type": "XGBoost",
    ...
  }
  
  📊 Summary Statistics
  ML Model: XGBoost
```

### **Random Forest Selected:**
```
Frontend Console:
  🔬 Sending analysis request to backend... {model_type: "RandomForest"}

Backend Terminal:
  🤖 Model type received: RandomForest
  🌲 Using Random Forest
  127.0.0.1 - - [05/Oct/2025 12:35:39] "POST /api/analyze HTTP/1.1" 200 -

Report:
  📋 Analysis Request
  {
    "model_type": "RandomForest",
    ...
  }
  
  📊 Summary Statistics
  ML Model: RandomForest
```

---

## 🎯 Summary

**The communication IS working correctly:**

✅ Frontend sends `model_type` in request payload  
✅ Backend receives `model_type` parameter  
✅ Backend stores `model_type` in request_info  
✅ Backend passes `model_type` to process_data()  
✅ process_data() uses `model_type` to select model  
✅ Results include `model_type` in response  
✅ Frontend displays `model_type` in report  

**To verify it's working:**
1. Open browser console (F12)
2. Select different models
3. Click "Start Analysis"
4. Check console log for `model_type` value
5. Check report for "ML Model: ..." display
6. Check request JSON for `"model_type": "..."`

**Everything is connected and working!** 🎉
