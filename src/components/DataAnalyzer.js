import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Sparkles, CheckCircle, ArrowRight, BarChart3, FileSpreadsheet } from 'lucide-react';
import { analyzeDataWithAI } from '../services/dataAnalysisService';

const DataAnalyzer = () => {
  const [step, setStep] = useState('upload'); // 'upload', 'conversation', 'analysis', 'report'
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [detectedFeatures, setDetectedFeatures] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // File upload handler - now sends to backend first
  const handleFileUpload = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setIsProcessing(true);

    try {
      // Send file to backend for processing
      const formData = new FormData();
      formData.append('file', uploadedFile);

      console.log('📤 Uploading file to backend...', uploadedFile.name);
      
      const response = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const backendData = await response.json();
      console.log('✅ Backend processed file:', backendData);

      // Store backend response
      setFileData({
        upload_id: backendData.upload_id,
        filename: backendData.filename,
        rows: backendData.rows,
        columns: backendData.columns,
        features: backendData.features
      });

      // Categorize features (raw vs derived)
      const categorizedFeatures = categorizeFeatures(backendData.features);
      setDetectedFeatures(categorizedFeatures);

      // Start conversation
      setStep('conversation');
      
      const initialMessage = {
        role: 'assistant',
        content: `Great! I've processed your file "${uploadedFile.name}" through our backend. Found ${backendData.rows} rows and ${backendData.columns.length} columns.\n\nLet me categorize the features for you:\n\n**Raw Features (${categorizedFeatures.raw.length}):**\n${categorizedFeatures.raw.map(f => `• ${f.name}: ${f.type} (${f.sample})`).join('\n')}\n\n**Derived/Calculated Features (${categorizedFeatures.derived.length}):**\n${categorizedFeatures.derived.map(f => `• ${f.name}: ${f.type} (${f.sample})`).join('\n')}\n\nWhich features would you like to analyze?`,
        timestamp: new Date()
      };
      
      setMessages([initialMessage]);
    } catch (error) {
      console.error('Error processing file:', error);
      alert(`Error processing file: ${error.message}. Please make sure the backend is running on port 4000.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Categorize features from backend response
  const categorizeFeatures = (features) => {
    const raw = [];
    const derived = [];
    
    features.forEach(feature => {
      const isDerived = feature.name.toLowerCase().includes('ratio') ||
                       feature.name.toLowerCase().includes('rate') ||
                       feature.name.toLowerCase().includes('percent') ||
                       feature.name.toLowerCase().includes('index') ||
                       feature.name.toLowerCase().includes('score') ||
                       feature.name.toLowerCase().includes('calculated');
      
      if (isDerived) {
        derived.push(feature);
      } else {
        raw.push(feature);
      }
    });
    
    return { raw, derived };
  };

  // Parse different file types
  const parseFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          let parsedData;

          if (file.name.endsWith('.csv')) {
            parsedData = parseCSV(content);
          } else if (file.name.endsWith('.json')) {
            parsedData = JSON.parse(content);
            parsedData = {
              columns: Object.keys(parsedData[0] || {}),
              rows: parsedData,
              rowCount: parsedData.length
            };
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            // For Excel files, you'd need a library like xlsx
            // For now, show error
            throw new Error('Excel support coming soon. Please use CSV or JSON.');
          }

          resolve(parsedData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Simple CSV parser
  const parseCSV = (content) => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i];
      });
      return row;
    });

    return {
      columns: headers,
      rows: rows,
      rowCount: rows.length
    };
  };

  // Detect raw vs derived features using AI
  const detectFeatures = async (data) => {
    // This would use AI to determine feature types
    // For now, using heuristics
    const features = {
      raw: [],
      derived: []
    };

    data.columns.forEach(col => {
      const sample = data.rows.slice(0, 10).map(r => r[col]);
      const isNumeric = sample.every(v => !isNaN(parseFloat(v)));
      
      // Simple heuristic: if column name suggests calculation, it's derived
      const derivedKeywords = ['ratio', 'rate', 'percent', 'index', 'score', 'calculated'];
      const isDerived = derivedKeywords.some(keyword => col.toLowerCase().includes(keyword));

      const feature = {
        name: col,
        type: isNumeric ? 'numeric' : 'categorical',
        description: isNumeric ? `Numerical values (sample: ${sample[0]})` : `Categorical values (sample: ${sample[0]})`
      };

      if (isDerived) {
        features.derived.push(feature);
      } else {
        features.raw.push(feature);
      }
    });

    return features;
  };

  // Handle feature selection
  const toggleFeature = (featureName) => {
    setSelectedFeatures(prev => {
      if (prev.includes(featureName)) {
        return prev.filter(f => f !== featureName);
      } else {
        return [...prev, featureName];
      }
    });
  };

  // Start analysis - now uses backend
  const handleStartAnalysis = async () => {
    if (selectedFeatures.length === 0) {
      alert('Please select at least one feature to analyze.');
      return;
    }

    setIsProcessing(true);
    setStep('analysis');

    try {
      console.log('🔬 Sending analysis request to backend...', {
        upload_id: fileData.upload_id,
        features: selectedFeatures
      });

      const response = await fetch('http://localhost:4000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          upload_id: fileData.upload_id,
          features: selectedFeatures,
          target: selectedTarget || null
        })
      });

      if (!response.ok) {
        throw new Error(`Backend analysis error: ${response.status}`);
      }

      const backendResult = await response.json();
      console.log('✅ Backend analysis complete:', backendResult);

      // Transform backend result to match expected format
      const result = {
        statistics: backendResult.statistics || [],
        plots: backendResult.plots || [],
        insights: backendResult.insights || [],
        success: backendResult.success
      };

      setAnalysisResult(result);
      setStep('report');
    } catch (error) {
      console.error('Analysis error:', error);
      alert(`Analysis failed: ${error.message}. Please make sure the backend is running.`);
      setStep('conversation');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send message in conversation
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // AI response based on user input
    setTimeout(() => {
      const aiMessage = {
        role: 'assistant',
        content: 'I understand. Would you like to proceed with the selected features? Click "Start Analysis" when ready!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 500);
  };

  // Download report
  const downloadReport = (format) => {
    if (!analysisResult) return;

    if (format === 'pdf') {
      // Generate PDF (would use jsPDF or similar)
      alert('PDF download coming soon!');
    } else if (format === 'html') {
      downloadHTMLReport();
    }
  };

  const downloadHTMLReport = () => {
    const html = generateHTMLReport(analysisResult);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nasa-datapilot-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateHTMLReport = (result) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>NASA DataPilot - Analysis Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #1e3a8a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .stat-card { background: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .stat-label { color: #64748b; font-size: 14px; }
    .stat-value { color: #1e293b; font-size: 24px; font-weight: bold; }
    .plot { margin: 20px 0; text-align: center; }
    .plot img { max-width: 100%; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #334155; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 NASA DataPilot - Data Analysis Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Dataset:</strong> ${file?.name || 'Uploaded Data'}</p>
    <p><strong>Features Analyzed:</strong> ${selectedFeatures.join(', ')}</p>
    
    <h2>📊 Summary Statistics</h2>
    <div class="stat-grid">
      ${result.statistics.map(stat => `
        <div class="stat-card">
          <div class="stat-label">${stat.label}</div>
          <div class="stat-value">${stat.value}</div>
        </div>
      `).join('')}
    </div>
    
    <h2>📈 Visualizations</h2>
    ${result.plots.map(plot => `
      <div class="plot">
        <h3>${plot.title}</h3>
        <img src="${plot.imageBase64}" alt="${plot.title}" />
        <p>${plot.description}</p>
      </div>
    `).join('')}
    
    <h2>🔍 Insights</h2>
    ${result.insights.map(insight => `
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <strong>${insight.title}:</strong> ${insight.description}
      </div>
    `).join('')}
    
    <div class="footer">
      <p>Generated by NASA DataPilot - Your AI Copilot for NASA Data Analysis</p>
      <p>Team DataSallens | NASA Space Apps Challenge 2025</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Render different steps
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <FileSpreadsheet size={64} className="mx-auto text-teal-500 mb-4" />
            <h1 className="text-4xl font-bold text-white mb-3">Data Analysis</h1>
            <p className="text-gray-400">Upload your data to get AI-powered insights and reports</p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 hover:border-teal-500 rounded-xl p-12 cursor-pointer transition-colors bg-zinc-900"
          >
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
            <p className="text-gray-500 text-sm">CSV, JSON, or Excel files (Max 10MB)</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          {isProcessing && (
            <div className="mt-6 text-teal-500">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mr-2"></div>
              Processing file...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'conversation') {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-zinc-900 rounded-t-xl p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-teal-500" />
                <div>
                  <h2 className="text-white font-semibold">Feature Selection</h2>
                  <p className="text-gray-400 text-sm">{file?.name}</p>
                </div>
              </div>
              <div className="text-gray-400 text-sm">
                {selectedFeatures.length} features selected
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-zinc-900 p-6 max-h-96 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block p-4 rounded-xl max-w-2xl ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'bg-zinc-800 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Feature Selection */}
          <div className="bg-zinc-900 p-6 border-t border-zinc-800">
            <h3 className="text-white font-semibold mb-4">Select Features to Analyze:</h3>
            
            {detectedFeatures && (
              <div className="space-y-4">
                {/* Raw Features */}
                <div>
                  <h4 className="text-teal-400 text-sm font-medium mb-2">Raw Features</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {detectedFeatures.raw.map(feature => (
                      <button
                        key={feature.name}
                        onClick={() => toggleFeature(feature.name)}
                        className={`p-3 rounded-lg text-left transition-colors ${
                          selectedFeatures.includes(feature.name)
                            ? 'bg-teal-600 text-white'
                            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                        }`}
                      >
                        <div className="font-medium text-sm">{feature.name}</div>
                        <div className="text-xs opacity-75">{feature.type}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Derived Features */}
                {detectedFeatures.derived.length > 0 && (
                  <div>
                    <h4 className="text-purple-400 text-sm font-medium mb-2">Derived Features</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {detectedFeatures.derived.map(feature => (
                        <button
                          key={feature.name}
                          onClick={() => toggleFeature(feature.name)}
                          className={`p-3 rounded-lg text-left transition-colors ${
                            selectedFeatures.includes(feature.name)
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                          }`}
                        >
                          <div className="font-medium text-sm">{feature.name}</div>
                          <div className="text-xs opacity-75">{feature.type}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target Selection */}
            <div className="mt-6">
              <h4 className="text-yellow-400 text-sm font-medium mb-2">Target Column (Optional)</h4>
              <p className="text-gray-400 text-xs mb-3">Select a target column for supervised learning analysis</p>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">No target column</option>
                {detectedFeatures && [...detectedFeatures.raw, ...detectedFeatures.derived].map(feature => (
                  <option key={feature.name} value={feature.name}>
                    {feature.name} ({feature.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Input & Action */}
          <div className="bg-zinc-900 rounded-b-xl p-4 border-t border-zinc-800">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about the features or request specific analysis..."
                className="flex-1 bg-zinc-800 text-white px-4 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
            
            <button
              onClick={handleStartAnalysis}
              disabled={selectedFeatures.length === 0}
              className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <ArrowRight size={20} />
              Start Analysis ({selectedFeatures.length} features)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'analysis') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-6">
            <Sparkles size={64} className="mx-auto text-teal-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Data</h2>
          <p className="text-gray-400 mb-6">AI is generating insights and visualizations...</p>
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'report' && analysisResult) {
    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-zinc-900 rounded-t-xl p-6 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Analysis Report</h1>
                <p className="text-gray-400">{file?.name} • {selectedFeatures.length} features analyzed</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport('html')}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download size={20} />
                  Download HTML
                </button>
                <button
                  onClick={() => downloadReport('pdf')}
                  className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Download size={20} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-zinc-900 p-6">
            {/* Statistics */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📊 Summary Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analysisResult.statistics.map((stat, idx) => (
                  <div key={idx} className="bg-zinc-800 p-4 rounded-lg border-l-4 border-teal-500">
                    <div className="text-gray-400 text-sm">{stat.label}</div>
                    <div className="text-white text-2xl font-bold">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plots */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📈 Visualizations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysisResult.plots.map((plot, idx) => (
                  <div key={idx} className="bg-zinc-800 p-4 rounded-lg">
                    <h3 className="text-white font-semibold mb-2">{plot.title}</h3>
                    <img src={plot.imageBase64} alt={plot.title} className="w-full rounded mb-2" />
                    <p className="text-gray-400 text-sm">{plot.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">🔍 AI Insights</h2>
              <div className="space-y-4">
                {analysisResult.insights.map((insight, idx) => (
                  <div key={idx} className="bg-zinc-800 p-4 rounded-lg">
                    <h3 className="text-teal-400 font-semibold mb-2">{insight.title}</h3>
                    <p className="text-gray-300">{insight.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-zinc-900 rounded-b-xl p-4 border-t border-zinc-800 text-center">
            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setFileData(null);
                setDetectedFeatures(null);
                setSelectedFeatures([]);
                setMessages([]);
                setAnalysisResult(null);
              }}
              className="text-teal-400 hover:text-teal-300 transition-colors"
            >
              Analyze Another Dataset →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default DataAnalyzer;

