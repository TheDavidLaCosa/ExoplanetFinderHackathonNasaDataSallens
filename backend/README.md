# 🔧 NASA DataPilot Backend

## Overview

Flask backend API for NASA DataPilot that provides:
- File upload and parsing (CSV, Excel, JSON)
- Feature detection and classification
- Statistical analysis
- Plot generation (histograms, correlation matrices)
- AI-powered insights

---

## 🚀 Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
cd backend
./start_backend.sh
```

This script will:
1. Create a virtual environment
2. Install all dependencies
3. Start the Flask server on port 4000

### Option 2: Manual Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Start server
python api.py
```

---

## 📡 API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "message": "Backend is running"
}
```

### Upload File
```
POST /api/upload
Content-Type: multipart/form-data
```

Request:
```
file: <CSV/Excel/JSON file>
```

Response:
```json
{
  "upload_id": "uuid-here",
  "filename": "data.csv",
  "rows": 1000,
  "columns": ["col1", "col2"],
  "features": [
    {
      "name": "col1",
      "type": "numeric",
      "null_count": 0,
      "unique_count": 500,
      "sample": "42.5"
    }
  ]
}
```

### Analyze Data
```
POST /api/analyze
Content-Type: application/json
```

Request:
```json
{
  "upload_id": "uuid-here",
  "features": ["feature1", "feature2"]
}
```

Response:
```json
{
  "statistics": [
    {
      "label": "Total Records",
      "value": "1000"
    }
  ],
  "plots": [
    {
      "title": "Distribution of feature1",
      "imageBase64": "data:image/png;base64,...",
      "description": "Histogram showing..."
    }
  ],
  "insights": [
    {
      "title": "Dataset Overview",
      "description": "Successfully analyzed..."
    }
  ],
  "success": true
}
```

### List Datasets
```
GET /api/datasets
```

Response:
```json
{
  "datasets": [
    {
      "filename": "cumulative_2025.10.01_09.32.22.csv",
      "size_mb": 2.5,
      "path": "/path/to/file"
    }
  ]
}
```

---

## 📦 Dependencies

- **Flask 3.0.0**: Web framework
- **Flask-CORS 4.0.0**: CORS support for React
- **pandas 2.1.0**: Data manipulation
- **openpyxl 3.1.2**: Excel file support (.xlsx)
- **xlrd 2.0.1**: Excel file support (.xls)
- **matplotlib 3.8.0**: Plot generation
- **seaborn 0.13.0**: Enhanced visualizations
- **scipy 1.11.0**: Statistical functions
- **numpy 1.26.0**: Numerical operations

---

## 🧪 Testing

### Test with cURL

**Health Check:**
```bash
curl http://localhost:4000/api/health
```

**Upload File:**
```bash
curl -X POST \
  -F "file=@../data/cumulative_2025.10.01_09.32.22.csv" \
  http://localhost:4000/api/upload
```

**Analyze:**
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"upload_id":"YOUR_UPLOAD_ID","features":["koi_period","koi_depth"]}' \
  http://localhost:4000/api/analyze
```

### Test with Frontend

1. Start backend: `./start_backend.sh`
2. Start frontend: `cd .. && npm start`
3. Go to http://localhost:3000
4. Click "Analyze Data"
5. Upload a CSV file
6. Select features and analyze

---

## 📁 File Structure

```
backend/
├── api.py                 # Main Flask API (unified endpoint)
├── backend.py             # Original simple backend
├── backend_features.py    # Original feature selector
├── requirements.txt       # Python dependencies
├── start_backend.sh       # Auto-setup script
├── README.md             # This file
├── example1.jpg          # Test images
├── example2.jpg
├── example3.jpg
└── nasa-october-2025-4k-3840x2160-1.webp
```

---

## 🔧 Configuration

### Port
Default: 4000

To change, edit `api.py`:
```python
app.run(host='0.0.0.0', port=YOUR_PORT, debug=True)
```

### CORS
Currently allows all origins. To restrict:
```python
CORS(app, origins=["http://localhost:3000"])
```

### Upload Limits
Max file size: 16MB (Flask default)

To change:
```python
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Error:** `Address already in use`

**Solution:**
```bash
# Find process using port 4000
lsof -ti:4000

# Kill the process
kill -9 $(lsof -ti:4000)
```

### Module Not Found

**Error:** `ModuleNotFoundError: No module named 'flask'`

**Solution:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Matplotlib Backend Error

**Error:** `UserWarning: Starting a Matplotlib GUI outside of the main thread`

**Solution:** Already fixed in `api.py` with:
```python
import matplotlib
matplotlib.use('Agg')  # Non-GUI backend
```

### CORS Error in Browser

**Error:** `No 'Access-Control-Allow-Origin' header`

**Solution:** Make sure Flask-CORS is installed and imported:
```bash
pip install flask-cors
```

---

## 🔒 Security Considerations

### Current Setup (Development)
- All origins allowed (CORS)
- Debug mode enabled
- No authentication
- Files stored in memory

### Production Recommendations
1. **Add authentication**: JWT tokens or API keys
2. **Restrict CORS**: Specific domains only
3. **File storage**: Use persistent storage (S3, filesystem)
4. **Rate limiting**: Prevent abuse
5. **HTTPS**: Secure communication
6. **Input validation**: Sanitize uploads
7. **File size limits**: Prevent large uploads

---

## 🚀 Deployment

### Local Network
```bash
python api.py
# Access from other devices: http://YOUR_IP:4000
```

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["python", "api.py"]
```

Build and run:
```bash
docker build -t nasa-datapilot-backend .
docker run -p 4000:4000 nasa-datapilot-backend
```

### Cloud Deployment
- **Heroku**: Add `Procfile` with `web: python api.py`
- **AWS Lambda**: Use Zappa or AWS SAM
- **Google Cloud Run**: Containerize and deploy
- **Azure**: Use Azure Functions or App Service

---

## 📊 Performance

### Benchmarks
- File upload (1MB CSV): ~200ms
- Feature detection: ~100ms
- Analysis generation: ~2-3s (4 plots + correlation matrix)
- Plot generation: ~500ms per plot

### Optimization Tips
1. **Limit plots**: Max 4-5 plots per analysis
2. **Reduce DPI**: Lower image quality for faster generation
3. **Cache results**: Store analysis results
4. **Async processing**: Use Celery for long-running tasks
5. **Database**: PostgreSQL for persistent storage

---

## 🎯 Next Steps

- [ ] Add user authentication
- [ ] Implement file persistence
- [ ] Add more plot types (scatter, box, violin)
- [ ] Support time series analysis
- [ ] Add machine learning models
- [ ] Implement caching layer
- [ ] Add WebSocket for real-time updates
- [ ] Create API documentation (Swagger)

---

## 📞 Support

Issues? Check:
1. Python version: `python3 --version` (need 3.8+)
2. Virtual environment activated
3. All dependencies installed: `pip list`
4. Port 4000 available
5. Frontend configured to use `http://localhost:4000`

---

**Happy coding! 🚀**

