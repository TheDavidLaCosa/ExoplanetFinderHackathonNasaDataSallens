# 📊 Data Analyzer - Feature Guide

## Overview

The **Data Analyzer** is a powerful feature in NASA DataPilot that allows you to upload any CSV, JSON, or Excel file and get AI-powered analysis with visualizations and insights.

---

## 🎯 Key Features

### 1. **File Upload**
- Supports CSV, JSON, and Excel formats
- Drag & drop or click to upload
- Automatic file parsing

### 2. **AI-Powered Feature Detection**
- Automatically detects raw vs derived/calculated features
- Classifies numeric vs categorical data
- Provides intelligent feature descriptions

### 3. **Conversational Interface**
- AI assistant guides you through the analysis
- Ask questions about your data
- Get recommendations on which features to analyze

### 4. **Interactive Feature Selection**
- Visual buttons for easy selection
- Color-coded (raw features in teal, derived in purple)
- Shows feature types (numeric/categorical)

### 5. **AI-Generated Analysis**
- Summary statistics
- Distribution plots (histograms)
- Correlation matrices
- AI-powered insights

### 6. **Report Generation**
- View results in beautiful interface
- Download as HTML (with base64 images)
- Download as PDF (coming soon)
- Share-ready reports

---

## 🚀 How to Use

### Step 1: Upload Data

1. Click "Analyze Data" button on the main screen
2. Click the upload area or drag & drop your file
3. Supported formats:
   - **CSV**: Comma-separated values
   - **JSON**: Array of objects
   - **Excel**: .xlsx or .xls (coming soon)

### Step 2: Review Features

The AI will analyze your file and show:
- **Total rows and columns**
- **Raw features**: Original data from your file
- **Derived features**: Calculated or computed values

Example:
```
Raw Features:
• temperature: Numerical values (sample: 25.3)
• pressure: Numerical values (sample: 101.3)

Derived Features:
• temp_rate: Numerical values (sample: 0.45)
• pressure_index: Numerical values (sample: 1.23)
```

### Step 3: Select Features

Click on feature buttons to select/deselect:
- **Teal buttons**: Raw features
- **Purple buttons**: Derived features
- Selected features are highlighted
- Counter shows total selected

You can also:
- Ask the AI questions about features
- Request specific analysis types
- Get recommendations

### Step 4: Start Analysis

Click "Start Analysis" button to:
1. Generate summary statistics
2. Create visualizations
3. Get AI insights
4. Build your report

### Step 5: Download Report

Once analysis is complete:
- **View in browser**: See formatted report
- **Download HTML**: Self-contained file with embedded images
- **Download PDF**: Print-ready format (coming soon)

---

## 📈 Analysis Components

### Summary Statistics

Automatically calculated:
- **Total Records**: Number of rows
- **Features Analyzed**: Selected feature count
- **Mean Values**: Average for numeric features
- **Min/Max**: Range of values
- **Distribution**: Data spread

### Visualizations

Generated plots include:
- **Histograms**: Distribution of each feature
- **Correlation Matrix**: Relationships between features
- **Scatter Plots**: Feature interactions
- All plots embedded as base64 PNG images

### AI Insights

Powered by Groq AI (Llama 3.3 70B):
- **Pattern detection**: Unusual trends
- **Correlations**: Strong relationships
- **Outliers**: Anomalous data points
- **Recommendations**: Next steps for analysis
- **Data quality**: Missing values, issues

---

## 🎨 Report Format

### HTML Report Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>NASA DataPilot - Analysis Report</title>
  <!-- Embedded styles -->
</head>
<body>
  <div class="container">
    <!-- Header -->
    <h1>NASA DataPilot - Data Analysis Report</h1>
    
    <!-- Metadata -->
    <p>Generated: [timestamp]</p>
    <p>Dataset: [filename]</p>
    <p>Features: [feature list]</p>
    
    <!-- Summary Statistics -->
    <h2>Summary Statistics</h2>
    <div class="stat-grid">
      <!-- Stat cards -->
    </div>
    
    <!-- Visualizations -->
    <h2>Visualizations</h2>
    <div class="plot">
      <img src="data:image/png;base64,[base64_data]" />
    </div>
    
    <!-- AI Insights -->
    <h2>AI Insights</h2>
    <!-- Insight cards -->
    
    <!-- Footer -->
    <div class="footer">
      NASA DataPilot | Team DataSallens
    </div>
  </div>
</body>
</html>
```

**Key Feature**: All images are base64-encoded and embedded directly in the HTML, making it a single self-contained file!

---

## 💡 Example Use Cases

### Scientific Data Analysis
```
Upload: experiment_results.csv
Features: temperature, pressure, humidity
Analysis: Correlations between environmental factors
Output: Statistical report with distribution plots
```

### Exoplanet Data
```
Upload: kepler_data.csv
Features: orbital_period, transit_depth, stellar_radius
Analysis: Patterns in confirmed exoplanets
Output: Correlation matrix and insights
```

### Mission Telemetry
```
Upload: satellite_telemetry.json
Features: altitude, velocity, temperature
Analysis: Performance metrics over time
Output: Time series analysis with trends
```

### Climate Data
```
Upload: climate_measurements.csv
Features: co2_levels, temperature, sea_level
Analysis: Climate indicator correlations
Output: Multi-variate analysis report
```

---

## 🔧 Technical Details

### Supported File Formats

**CSV (Comma-Separated Values)**
```csv
feature1,feature2,feature3
10.5,20.3,30.1
11.2,21.5,31.4
```

**JSON (Array of Objects)**
```json
[
  {"feature1": 10.5, "feature2": 20.3, "feature3": 30.1},
  {"feature1": 11.2, "feature2": 21.5, "feature3": 31.4}
]
```

**Excel** (Coming Soon)
- .xlsx and .xls files
- Multiple sheets support
- Formula evaluation

### Feature Detection Algorithm

1. **Type Detection**:
   - Numeric: All values parseable as numbers
   - Categorical: String values or mixed types

2. **Raw vs Derived**:
   - Keywords: ratio, rate, percent, index, score, calculated
   - Presence in column name suggests derived feature

3. **Sample Analysis**:
   - Examines first 10 rows
   - Determines data patterns
   - Identifies potential issues

### Plot Generation

Plots are generated using HTML5 Canvas:
- **Width**: 600px
- **Height**: 400-600px
- **Format**: PNG
- **Encoding**: Base64 data URI
- **Embedded**: Directly in HTML reports

### AI Integration

Uses Groq API for:
- Feature classification insights
- Pattern recognition
- Correlation interpretation
- Actionable recommendations

Model: Llama 3.3 70B Versatile
- Temperature: 0.7
- Max tokens: 1024
- Response time: < 2 seconds

---

## 📊 Statistics Calculated

### Descriptive Statistics
- Count: Number of non-null values
- Mean: Average value
- Median: Middle value
- Mode: Most common value
- Standard Deviation: Spread of data
- Min/Max: Range boundaries

### Distribution Metrics
- Skewness: Asymmetry
- Kurtosis: Tail behavior
- Percentiles: 25th, 50th, 75th
- IQR: Interquartile range

### Correlation Analysis
- Pearson correlation: Linear relationships
- Spearman rank: Monotonic relationships
- Correlation matrix: All feature pairs
- Heatmap visualization

---

## 🎓 Best Practices

### Data Preparation

1. **Clean Your Data**:
   - Remove or mark missing values
   - Ensure consistent formatting
   - Use clear column names

2. **Feature Selection**:
   - Start with 3-5 key features
   - Add more as needed
   - Focus on numeric features for correlations

3. **File Size**:
   - Keep under 10MB for best performance
   - Large files may take longer to process
   - Consider sampling large datasets

### Analysis Strategy

1. **Exploratory Phase**:
   - Select all features initially
   - Review distributions
   - Identify outliers

2. **Focused Analysis**:
   - Select specific features of interest
   - Look for correlations
   - Generate targeted insights

3. **Iterative Refinement**:
   - Re-analyze with different feature combinations
   - Test hypotheses
   - Validate findings

---

## 🔒 Privacy & Security

### Data Handling
- Files processed in browser
- Not stored on servers
- Analysis runs client-side
- AI requests include only metadata

### API Usage
- Groq API for AI insights only
- Statistical summaries sent to AI
- Raw data stays in your browser
- No permanent data retention

---

## 🐛 Troubleshooting

### File Won't Upload

**Problem**: File upload fails

**Solutions**:
- Check file format (CSV, JSON supported)
- Verify file size (< 10MB)
- Ensure file isn't corrupted
- Try a different browser

### Feature Detection Issues

**Problem**: Features misclassified

**Solution**:
- Raw vs derived is a heuristic
- You can still select any feature
- Classification doesn't affect analysis

### Plot Generation Fails

**Problem**: Visualizations don't appear

**Solutions**:
- Check browser console for errors
- Ensure numeric data in selected features
- Try with fewer features
- Refresh and retry

### AI Insights Empty

**Problem**: No insights generated

**Solutions**:
- Check Groq API key is configured
- Verify internet connection
- Falls back to standard insights
- Analysis still works without AI

---

## 🚀 Advanced Features (Coming Soon)

### Enhanced Visualizations
- [ ] Scatter plots with trend lines
- [ ] 3D visualizations
- [ ] Time series analysis
- [ ] Interactive plots

### Statistical Tests
- [ ] Hypothesis testing
- [ ] ANOVA
- [ ] Chi-square tests
- [ ] Regression analysis

### Machine Learning
- [ ] Clustering algorithms
- [ ] Dimensionality reduction (PCA, t-SNE)
- [ ] Anomaly detection
- [ ] Predictive modeling

### Export Options
- [x] HTML with embedded images
- [ ] PDF generation
- [ ] PowerPoint slides
- [ ] LaTeX format
- [ ] Jupyter notebook

---

## 📞 Support

Having issues? Check:
1. Browser console (F12) for errors
2. File format and size
3. Groq API configuration
4. Internet connection

---

**Happy analyzing with NASA DataPilot!** 🚀📊✨

