import React, { useState, useRef } from 'react';
import { Upload, FileText, Download, Sparkles, CheckCircle, ArrowRight, BarChart3, FileSpreadsheet } from 'lucide-react';
import { analyzeDataWithAI } from '../services/dataAnalysisService';
import { analyzeFeatures as analyzeWithGroq } from '../services/groqService';

const DataAnalyzer = () => {
  const [step, setStep] = useState('upload'); // 'upload', 'conversation', 'analysis', 'report'
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [detectedFeatures, setDetectedFeatures] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [useBayesianOpt, setUseBayesianOpt] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [analysisResult, setAnalysisResult] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBayesianInfo, setShowBayesianInfo] = useState(false);
  const [selectedModel, setSelectedModel] = useState('XGBoost');
  const [showCorrelationInfo, setShowCorrelationInfo] = useState(false);
  const [showPCAInfo, setShowPCAInfo] = useState(false);
  const [showFeatureTooltip, setShowFeatureTooltip] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isAnalyzingFeatures, setIsAnalyzingFeatures] = useState(false);
  const [useGroqForUnknown, setUseGroqForUnknown] = useState(true);
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
      
      const response = await fetch('/api/upload', {
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

      // Parse locally to provide GROQ with real sample rows
      let sampleRows = [];
      try {
        const parsedLocal = await parseFile(uploadedFile);
        sampleRows = Array.isArray(parsedLocal?.rows) ? parsedLocal.rows.slice(0, 5) : [];
      } catch (e) {
        console.warn('Unable to parse file locally for GROQ samples:', e);
      }

      // Categorize features (raw vs derived) - now async for GROQ support with sample rows
      const categorizedFeatures = await categorizeFeatures(backendData.features, sampleRows);
      setDetectedFeatures(categorizedFeatures);

      // Start conversation
      setStep('conversation');
      
      const initialMessage = {
        role: 'assistant',
        content: `Great! I've processed your file "${uploadedFile.name}" through our backend. Found ${backendData.rows} rows and ${backendData.columns} columns.\n\nLet me categorize the features for you:\n\n**Raw Features (${categorizedFeatures.raw.length}):**\n${categorizedFeatures.raw.map(f => `• ${f.name}: ${f.type} (${f.sample})`).join('\n')}\n\n**Derived/Calculated Features (${categorizedFeatures.derived.length}):**\n${categorizedFeatures.derived.map(f => `• ${f.name}: ${f.type} (${f.sample})`).join('\n')}\n\nWhich features would you like to analyze?`,
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

  // Get feature description and metadata
  const getFeatureInfo = (featureName) => {
    const name = featureName.toLowerCase();
    
    // Exoplanet-specific features
    const exoplanetFeatures = {
      'koi_period': {
        description: 'Orbital period of the planet candidate in days',
        importance: 'high',
        recommendFor: 'target',
        reason: 'Key physical property that affects habitability and detection'
      },
      'koi_prad': {
        description: 'Planetary radius in Earth radii',
        importance: 'high',
        recommendFor: 'target',
        reason: 'Direct indicator of planet size and type (rocky vs gas giant)'
      },
      'koi_teq': {
        description: 'Equilibrium temperature in Kelvin',
        importance: 'high',
        recommendFor: 'target',
        reason: 'Indicates potential habitability and atmospheric conditions'
      },
      'koi_insol': {
        description: 'Insolation flux (stellar energy received)',
        importance: 'high',
        recommendFor: 'feature',
        reason: 'Strongly correlates with temperature and habitability'
      },
      'koi_srad': {
        description: 'Stellar radius in solar radii',
        importance: 'medium',
        recommendFor: 'feature',
        reason: 'Host star property affecting planet detection and characteristics'
      },
      'koi_smass': {
        description: 'Stellar mass in solar masses',
        importance: 'medium',
        recommendFor: 'feature',
        reason: 'Determines orbital dynamics and stellar lifetime'
      },
      'koi_steff': {
        description: 'Stellar effective temperature in Kelvin',
        importance: 'medium',
        recommendFor: 'feature',
        reason: 'Indicates star type and affects planetary conditions'
      },
      'koi_depth': {
        description: 'Transit depth in parts per million',
        importance: 'high',
        recommendFor: 'feature',
        reason: 'Direct measurement used to calculate planet size'
      },
      'koi_duration': {
        description: 'Transit duration in hours',
        importance: 'medium',
        recommendFor: 'feature',
        reason: 'Related to orbital parameters and planet size'
      },
      'koi_impact': {
        description: 'Impact parameter (0=center, 1=edge)',
        importance: 'low',
        recommendFor: 'feature',
        reason: 'Affects transit shape but less predictive of planet properties'
      },
      'koi_snr': {
        description: 'Signal-to-noise ratio of detection',
        importance: 'low',
        recommendFor: 'feature',
        reason: 'Measurement quality indicator, not a physical property'
      }
    };

    // Check if it's a known exoplanet feature
    for (const [key, info] of Object.entries(exoplanetFeatures)) {
      if (name.includes(key)) {
        return info;
      }
    }

    // Generic feature type detection
    if (name.includes('temp') || name.includes('temperature')) {
      return {
        description: 'Temperature measurement',
        importance: 'high',
        recommendFor: 'target',
        reason: 'Temperature is often a key prediction target'
      };
    }
    if (name.includes('mass')) {
      return {
        description: 'Mass measurement',
        importance: 'high',
        recommendFor: 'target',
        reason: 'Mass is a fundamental physical property'
      };
    }
    if (name.includes('radius') || name.includes('size')) {
      return {
        description: 'Size/radius measurement',
        importance: 'high',
        recommendFor: 'target',
        reason: 'Size is a key classification parameter'
      };
    }
    if (name.includes('distance') || name.includes('dist')) {
      return {
        description: 'Distance measurement',
        importance: 'medium',
        recommendFor: 'feature',
        reason: 'Spatial information can be predictive'
      };
    }
    if (name.includes('flux') || name.includes('luminosity')) {
      return {
        description: 'Energy flux measurement',
        importance: 'high',
        recommendFor: 'feature',
        reason: 'Energy received affects physical conditions'
      };
    }
    if (name.includes('ratio') || name.includes('rate')) {
      return {
        description: 'Derived ratio or rate',
        importance: 'medium',
        recommendFor: 'feature',
        reason: 'Ratios can reveal important relationships'
      };
    }
    if (name.includes('id') || name.includes('name') || name.includes('flag')) {
      return {
        description: 'Identifier or categorical flag',
        importance: 'low',
        recommendFor: 'exclude',
        reason: 'Non-numeric identifiers are not useful for ML models'
      };
    }

    // Default
    return {
      description: 'Numerical feature',
      importance: 'medium',
      recommendFor: 'feature',
      reason: 'Can be used as input feature for analysis'
    };
  };

  // Check if dataset has known features (exoplanet data)
  const hasKnownFeatures = (features) => {
    const knownKeywords = ['koi_', 'kepler', 'tess', 'planet', 'stellar', 'transit'];
    return features.some(f => 
      knownKeywords.some(keyword => f.name.toLowerCase().includes(keyword))
    );
  };

  // Generate intelligent recommendations (Hybrid: Built-in + GROQ)
  const generateRecommendations = async (features, sampleData = null) => {
    const isKnownDataset = hasKnownFeatures(features);
    
    console.log(`🤖 Using ${isKnownDataset ? 'Built-in Knowledge' : 'GROQ AI'} for recommendations`);
    
    // Use built-in knowledge for known datasets (fast)
    if (isKnownDataset) {
      const featureInfos = features.map(f => ({
        ...f,
        info: getFeatureInfo(f.name)
      }));

      // Find best target candidates
      const targetCandidates = featureInfos
        .filter(f => f.info.recommendFor === 'target' && f.info.importance === 'high')
        .sort((a, b) => {
          const importanceOrder = { high: 3, medium: 2, low: 1 };
          return importanceOrder[b.info.importance] - importanceOrder[a.info.importance];
        });

      // Find best feature candidates
      const featureCandidates = featureInfos
        .filter(f => f.info.recommendFor === 'feature' && f.info.importance !== 'low')
        .sort((a, b) => {
          const importanceOrder = { high: 3, medium: 2, low: 1 };
          return importanceOrder[b.info.importance] - importanceOrder[a.info.importance];
        });

      // Features to exclude
      const excludeFeatures = featureInfos
        .filter(f => f.info.recommendFor === 'exclude');

      return {
        recommendedTarget: targetCandidates[0] || null,
        alternativeTargets: targetCandidates.slice(1, 3),
        recommendedFeatures: featureCandidates.slice(0, 5),
        excludeFeatures: excludeFeatures,
        source: 'built-in'
      };
    }
    
    // Use GROQ for unknown datasets (smart but slower)
    if (useGroqForUnknown) {
      try {
        setIsAnalyzingFeatures(true);
        console.log('🧠 Analyzing with GROQ AI...');
        
        const groqAnalysis = await analyzeWithGroq(features, sampleData);
        
        setIsAnalyzingFeatures(false);
        
        if (groqAnalysis && groqAnalysis.features && groqAnalysis.features.length > 0) {
          // Get list of actual feature names in the dataset
          const actualFeatureNames = features.map(f => f.name);

          // VALIDATE: Check if GROQ's recommended target exists
          const recommendedTargetExists = actualFeatureNames.includes(groqAnalysis.recommendedTarget);
          if (!recommendedTargetExists) {
            console.warn(`⚠️ GROQ recommended target "${groqAnalysis.recommendedTarget}" does NOT exist in dataset!`);
            console.warn(`Available features: ${actualFeatureNames.join(', ')}`);
          }

          // Map GROQ analysis to our format
          const featureInfos = features.map(f => {
            const groqInfo = groqAnalysis.features.find(gf => gf.name === f.name);
            return {
              ...f,
              info: groqInfo || getFeatureInfo(f.name) // Fallback to built-in
            };
          });

          // VALIDATE: Only use target if it exists
          const targetFeature = recommendedTargetExists
            ? featureInfos.find(f => f.name === groqAnalysis.recommendedTarget)
            : null;

          // VALIDATE: Filter out recommended features that don't exist
          const validRecommendedFeatures = (groqAnalysis.recommendedFeatures || []).filter(name =>
            actualFeatureNames.includes(name)
          );
          const invalidFeatures = (groqAnalysis.recommendedFeatures || []).filter(name =>
            !actualFeatureNames.includes(name)
          );
          if (invalidFeatures.length > 0) {
            console.warn(`⚠️ GROQ recommended features that don't exist: ${invalidFeatures.join(', ')}`);
          }

          const recommendedFeaturesList = validRecommendedFeatures
            .map(name => featureInfos.find(f => f.name === name))
            .filter(Boolean);

          // Fallback target if GROQ suggested a non-existent column
          let finalTarget = targetFeature;
          if (!finalTarget) {
            const preferredTargets = ['pl_rade', 'pl_radj', 'st_teff', 'st_rad', 'st_mass', 'sy_dist'];
            finalTarget = featureInfos.find(f => preferredTargets.includes(f.name))
              || featureInfos.find(f => typeof f.type === 'string' && (f.type.toLowerCase().includes('float') || f.type.toLowerCase().includes('int')))
              || null;
            if (finalTarget) {
              console.warn(`🔁 Using fallback target: ${finalTarget.name}`);
            }
          }

          console.log('✅ GROQ analysis complete (after validation)');
          console.log(`   Target: ${finalTarget ? finalTarget.name : 'NONE (invalid recommendation)'}`);
          console.log(`   Features: ${recommendedFeaturesList.map(f => f.name).join(', ')}`);

          // If GROQ gave us invalid recommendations, fall back to built-in
          if (!finalTarget && recommendedFeaturesList.length === 0) {
            console.warn('⚠️ All GROQ recommendations were invalid, falling back to built-in');
          } else {
            return {
              recommendedTarget: finalTarget || null,
              alternativeTargets: [],
              recommendedFeatures: recommendedFeaturesList,
              excludeFeatures: featureInfos.filter(f => f.info.recommendFor === 'exclude'),
              source: 'groq'
            };
          }
        } else {
          console.warn('GROQ returned empty analysis, falling back to built-in');
        }
      } catch (error) {
        console.error('GROQ analysis failed, falling back to built-in:', error);
        setIsAnalyzingFeatures(false);
      }
    }
    
    // Fallback to basic built-in analysis
    const featureInfos = features.map(f => ({
      ...f,
      info: getFeatureInfo(f.name)
    }));

    const targetCandidates = featureInfos
      .filter(f => f.info.recommendFor === 'target')
      .sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        return importanceOrder[b.info.importance] - importanceOrder[a.info.importance];
      });

    const featureCandidates = featureInfos
      .filter(f => f.info.recommendFor === 'feature')
      .sort((a, b) => {
        const importanceOrder = { high: 3, medium: 2, low: 1 };
        return importanceOrder[b.info.importance] - importanceOrder[a.info.importance];
      });

    return {
      recommendedTarget: targetCandidates[0] || null,
      alternativeTargets: targetCandidates.slice(1, 3),
      recommendedFeatures: featureCandidates.slice(0, 5),
      excludeFeatures: featureInfos.filter(f => f.info.recommendFor === 'exclude'),
      source: 'built-in-fallback'
    };
  };

  // Categorize features from backend response
  const categorizeFeatures = async (features, sampleData = null) => {
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

    // Generate recommendations (async now - may use GROQ)
    let recs = await generateRecommendations(features, sampleData);

    // Final guardrail: ensure recommended target exists in the features we actually render (raw+derived)
    try {
      const allFeatureNames = [...raw, ...derived].map(f => f.name);
      const preferredTargets = ['pl_rade','pl_radj','st_teff','st_rad','st_mass','sy_dist'];
      const pickFallback = () => preferredTargets.find(n => allFeatureNames.includes(n))
        || allFeatureNames.find(n => /(^pl_|^st_|^sy_)/.test(n))
        || null;

      const recTargetName = recs?.recommendedTarget?.name || null;
      const targetValid = recTargetName ? allFeatureNames.includes(recTargetName) : false;
      if (!targetValid) {
        const fb = pickFallback();
        if (fb) {
          console.warn(`⚠️ Replacing invalid recommended target "${recTargetName}" with fallback "${fb}"`);
          recs = {
            ...recs,
            recommendedTarget: { name: fb, info: getFeatureInfo(fb) }
          };
        } else {
          console.warn('⚠️ No valid fallback target found. Leaving target empty.');
          recs = { ...recs, recommendedTarget: null };
        }
      }
    } catch (e) {
      console.warn('Guardrail check failed:', e);
    }

    setRecommendations(recs);
    
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
      const requestPayload = {
        upload_id: fileData.upload_id,
        selected_features: selectedFeatures,
        target_column: selectedTarget || null,
        use_bayesian_opt: useBayesianOpt,
        model_type: selectedModel
      };

      console.log('🔬 Sending analysis request to backend...', requestPayload);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`Backend analysis error: ${response.status}`);
      }

      const backendResult = await response.json();
      console.log('✅ Backend analysis complete:', backendResult);

      // Store the complete result including request_info
      setAnalysisResult(backendResult);
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

  // Get plot description and analysis tips
  const getPlotInfo = (plotKey) => {
    const plotInfo = {
      correlation: {
        title: 'Correlation Matrix',
        description: 'Shows relationships between features. Values range from -1 to 1.',
        tips: [
          '🔴 Red (positive): Features increase together',
          '🔵 Blue (negative): One increases, other decreases',
          '⚪ White (near 0): No linear relationship',
          '💡 Look for strong correlations (>0.7 or <-0.7) to understand feature dependencies'
        ]
      },
      pca: {
        title: 'Principal Component Analysis (PCA)',
        description: 'Reduces data to 2D while preserving variance. Each point is a data sample.',
        tips: [
          '📊 Clusters indicate similar data points',
          '📏 Spread shows data variance',
          '🎯 Outliers appear far from main cluster',
          '💡 Use this to identify patterns and data structure'
        ]
      },
      feature_importance: {
        title: 'Feature Importance',
        description: 'Shows which features most influence the prediction target.',
        tips: [
          '📊 Longer bars = more important features',
          '🎯 Top features have strongest predictive power',
          '✂️ Consider removing low-importance features',
          '💡 Focus on top 3-5 features for insights'
        ]
      }
    };
    return plotInfo[plotKey] || { 
      title: plotKey.replace('_', ' '), 
      description: 'Data visualization',
      tips: []
    };
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
            
            {/* AI Recommendations */}
            {isAnalyzingFeatures && (
              <div className="mb-6 bg-gradient-to-r from-teal-900/30 to-blue-900/30 border border-teal-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 text-teal-400">
                  <div className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full"></div>
                  <span className="font-semibold">🧠 Analyzing features with GROQ AI...</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">This may take a few seconds for unknown datasets</p>
              </div>
            )}
            
            {recommendations && !isAnalyzingFeatures && (
              <div className="mb-6 bg-gradient-to-r from-teal-900/30 to-blue-900/30 border border-teal-500/30 rounded-lg p-4">
                <h4 className="text-teal-400 font-semibold mb-3 flex items-center gap-2">
                  <Sparkles size={18} />
                  AI Recommendations
                  {recommendations.source === 'groq' && (
                    <span className="text-xs bg-purple-600 px-2 py-0.5 rounded-full">Powered by GROQ</span>
                  )}
                  {recommendations.source === 'built-in' && (
                    <span className="text-xs bg-teal-600 px-2 py-0.5 rounded-full">Built-in Knowledge</span>
                  )}
                </h4>
                
                {/* Recommended Target */}
                {recommendations.recommendedTarget && (
                  <div className="mb-3">
                    <div className="text-yellow-400 text-sm font-medium mb-1">🎯 Recommended Target:</div>
                    <div className="bg-zinc-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{recommendations.recommendedTarget.name}</div>
                          <div className="text-gray-400 text-xs mt-1">{recommendations.recommendedTarget.info.description}</div>
                          <div className="text-teal-400 text-xs mt-1">💡 {recommendations.recommendedTarget.info.reason}</div>
                        </div>
                        <button
                          onClick={() => setSelectedTarget(recommendations.recommendedTarget.name)}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recommended Features */}
                {recommendations.recommendedFeatures.length > 0 && (
                  <div>
                    <div className="text-blue-400 text-sm font-medium mb-1">✨ Recommended Features:</div>
                    <div className="grid grid-cols-1 gap-2">
                      {recommendations.recommendedFeatures.map(feature => (
                        <div key={feature.name} className="bg-zinc-800 p-2 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{feature.name}</div>
                              <div className="text-gray-400 text-xs">{feature.info.description}</div>
                            </div>
                            <button
                              onClick={() => toggleFeature(feature.name)}
                              className={`px-3 py-1 rounded text-xs transition-colors ${
                                selectedFeatures.includes(feature.name)
                                  ? 'bg-teal-600 text-white'
                                  : 'bg-zinc-700 text-gray-300 hover:bg-zinc-600'
                              }`}
                            >
                              {selectedFeatures.includes(feature.name) ? '✓ Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const featureNames = recommendations.recommendedFeatures.map(f => f.name);
                        setSelectedFeatures(featureNames);
                      }}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
                    >
                      Select All Recommended Features
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {detectedFeatures && (
              <div className="space-y-4">
                {/* Raw Features */}
                <div>
                  <h4 className="text-teal-400 text-sm font-medium mb-2">Raw Features</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {detectedFeatures.raw.map(feature => {
                      const info = getFeatureInfo(feature.name);
                      return (
                        <div key={feature.name} className="relative group">
                          <button
                            onClick={() => toggleFeature(feature.name)}
                            className={`w-full p-3 rounded-lg text-left transition-colors ${
                              selectedFeatures.includes(feature.name)
                                ? 'bg-teal-600 text-white'
                                : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{feature.name}</div>
                                <div className="text-xs opacity-75">{feature.type}</div>
                              </div>
                              <div
                                onMouseEnter={() => setShowFeatureTooltip(feature.name)}
                                onMouseLeave={() => setShowFeatureTooltip(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFeatureTooltip(showFeatureTooltip === feature.name ? null : feature.name);
                                }}
                                className="text-gray-400 hover:text-teal-400 ml-2 cursor-pointer"
                              >
                                <span className="inline-block w-4 h-4 text-center border border-current rounded-full text-xs leading-4">?</span>
                              </div>
                            </div>
                          </button>
                          {showFeatureTooltip === feature.name && (
                            <div className="absolute z-10 mt-2 w-64 bg-zinc-700 border border-zinc-600 rounded-lg p-3 shadow-xl">
                              <div className="text-teal-400 font-semibold text-sm mb-1">{feature.name}</div>
                              <div className="text-gray-300 text-xs mb-2">{info.description}</div>
                              <div className="text-gray-400 text-xs">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                                  info.importance === 'high' ? 'bg-green-600' :
                                  info.importance === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                                }`}>
                                  {info.importance} importance
                                </span>
                              </div>
                              {info.reason && (
                                <div className="text-gray-300 text-xs mt-2">💡 {info.reason}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Derived Features */}
                {detectedFeatures.derived.length > 0 && (
                  <div>
                    <h4 className="text-purple-400 text-sm font-medium mb-2">Derived Features</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {detectedFeatures.derived.map(feature => {
                        const info = getFeatureInfo(feature.name);
                        return (
                          <div key={feature.name} className="relative group">
                            <button
                              onClick={() => toggleFeature(feature.name)}
                              className={`w-full p-3 rounded-lg text-left transition-colors ${
                                selectedFeatures.includes(feature.name)
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{feature.name}</div>
                                  <div className="text-xs opacity-75">{feature.type}</div>
                                </div>
                                <div
                                  onMouseEnter={() => setShowFeatureTooltip(feature.name)}
                                  onMouseLeave={() => setShowFeatureTooltip(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFeatureTooltip(showFeatureTooltip === feature.name ? null : feature.name);
                                  }}
                                  className="text-gray-400 hover:text-purple-400 ml-2 cursor-pointer"
                                >
                                  <span className="inline-block w-4 h-4 text-center border border-current rounded-full text-xs leading-4">?</span>
                                </div>
                              </div>
                            </button>
                            {showFeatureTooltip === feature.name && (
                              <div className="absolute z-10 mt-2 w-64 bg-zinc-700 border border-zinc-600 rounded-lg p-3 shadow-xl">
                                <div className="text-purple-400 font-semibold text-sm mb-1">{feature.name}</div>
                                <div className="text-gray-300 text-xs mb-2">{info.description}</div>
                                <div className="text-gray-400 text-xs">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                                    info.importance === 'high' ? 'bg-green-600' :
                                    info.importance === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                                  }`}>
                                    {info.importance} importance
                                  </span>
                                </div>
                                {info.reason && (
                                  <div className="text-gray-300 text-xs mt-2">💡 {info.reason}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
            
            {/* Bayesian Optimization Toggle */}
            <div className="mb-3 bg-zinc-800 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bayesian-opt"
                    checked={useBayesianOpt}
                    onChange={(e) => setUseBayesianOpt(e.target.checked)}
                    className="w-4 h-4 text-teal-600 bg-zinc-700 border-zinc-600 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="bayesian-opt" className="text-white font-medium cursor-pointer">
                    Use Bayesian Optimization
                  </label>
                  <button
                    onMouseEnter={() => setShowBayesianInfo(true)}
                    onMouseLeave={() => setShowBayesianInfo(false)}
                    className="text-gray-400 hover:text-teal-400 transition-colors"
                  >
                    <span className="inline-block w-5 h-5 text-center border border-current rounded-full text-xs leading-5">?</span>
                  </button>
                </div>
                {useBayesianOpt && (
                  <span className="text-yellow-500 text-sm">⏱️ Takes longer</span>
                )}
              </div>
              {showBayesianInfo && (
                <div className="mt-2 text-sm text-gray-300 bg-zinc-700 p-3 rounded">
                  <strong className="text-teal-400">Bayesian Optimization:</strong> Advanced hyperparameter tuning that finds optimal model settings by intelligently exploring the parameter space. Results in better model performance but takes 2-3x longer to complete.
                </div>
              )}
            </div>
            
            {/* Model Selection */}
            <div className="mb-4">
              <h3 className="text-white font-semibold mb-2">Select ML Model</h3>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-zinc-800 text-white p-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-teal-500"
              >
                <option value="XGBoost">XGBoost</option>
                <option value="RandomForest">Random Forest</option>
                <option value="NeuralNetwork" disabled>Neural Networks - Coming Soon</option>
              </select>
            </div>
            
            {/* Start Analysis Button */}
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
          <p className="text-gray-400 mb-6">Running PCA, Correlation Analysis & ML Model...</p>
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
            {/* Request Info */}
            {analysisResult.request_info && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">📋 Analysis Request</h2>
                <div className="bg-zinc-800 p-4 rounded-lg">
                  <pre className="text-gray-300 text-sm overflow-x-auto">
                    {JSON.stringify(analysisResult.request_info, null, 2)}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(analysisResult.request_info, null, 2));
                      alert('Request JSON copied to clipboard!');
                    }}
                    className="mt-3 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    📋 Copy JSON
                  </button>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📊 Summary Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-teal-500">
                  <div className="text-gray-400 text-sm">Data Shape</div>
                  <div className="text-white text-2xl font-bold">{analysisResult.data_shape ? `${analysisResult.data_shape[0]} × ${analysisResult.data_shape[1]}` : 'N/A'}</div>
                </div>
                <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-purple-500">
                  <div className="text-gray-400 text-sm">PCA Components</div>
                  <div className="text-white text-2xl font-bold">{analysisResult.pca_components || 'N/A'}</div>
                </div>
                {analysisResult.model_results && (
                  <>
                    <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="text-gray-400 text-sm">R² Score</div>
                      <div className="text-white text-2xl font-bold">{analysisResult.model_results.r2.toFixed(3)}</div>
                    </div>
                    <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-green-500">
                      <div className="text-gray-400 text-sm">MSE</div>
                      <div className="text-white text-2xl font-bold">{analysisResult.model_results.mse.toFixed(0)}</div>
                    </div>
                  </>
                )}
                {analysisResult.request_info && analysisResult.request_info.model_type && (
                  <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-purple-600">
                    <div className="text-gray-400 text-sm">ML Model</div>
                    <div className="text-white text-xl font-bold">{analysisResult.request_info.model_type}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Correlation Matrix Tooltip */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📈 Visualizations</h2>
              <div className="grid grid-cols-1 gap-6">
                {analysisResult.plots && Object.entries(analysisResult.plots).map(([key, imageData]) => {
                  const plotInfo = getPlotInfo(key);
                  return (
                    <div key={key} className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                      {/* Plot Header */}
                      <div className="mb-4">
                        <h3 className="text-white font-bold text-xl mb-2">{plotInfo.title}
                          {key === 'correlation' && (
                            <button
                              onMouseEnter={() => setShowCorrelationInfo(true)}
                              onMouseLeave={() => setShowCorrelationInfo(false)}
                              className="ml-2 text-gray-400 hover:text-teal-400 transition-colors"
                            >
                              <span className="inline-block w-5 h-5 text-center border border-current rounded-full text-xs leading-5">?</span>
                            </button>
                          )}
                          {key === 'pca' && (
                            <button
                              onMouseEnter={() => setShowPCAInfo(true)}
                              onMouseLeave={() => setShowPCAInfo(false)}
                              className="ml-2 text-gray-400 hover:text-teal-400 transition-colors"
                            >
                              <span className="inline-block w-5 h-5 text-center border border-current rounded-full text-xs leading-5">?</span>
                            </button>
                          )}
                        </h3>
                        <p className="text-gray-400 text-sm">{plotInfo.description}</p>
                      </div>
                      
                      {/* Plot Image */}
                      <div className="bg-white p-4 rounded-lg mb-4">
                        <img src={imageData} alt={key} className="w-full rounded" />
                      </div>
                      
                      {/* Analysis Tips */}
                      {plotInfo.tips.length > 0 && (
                        <div className="bg-zinc-900 p-4 rounded-lg border-l-4 border-teal-500">
                          <h4 className="text-teal-400 font-semibold mb-2 text-sm">📖 How to Read This Plot:</h4>
                          <ul className="space-y-1">
                            {plotInfo.tips.map((tip, idx) => (
                              <li key={idx} className="text-gray-300 text-sm">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Tooltip Descriptions */}
                      {showCorrelationInfo && key === 'correlation' && (
                        <div className="mt-2 text-sm text-gray-300 bg-zinc-700 p-3 rounded">
                          <strong className="text-teal-400">Correlation Matrix:</strong> Shows relationships between features. Values range from -1 to 1. Red indicates positive correlation, blue indicates negative correlation.
                        </div>
                      )}
                      {showPCAInfo && key === 'pca' && (
                        <div className="mt-2 text-sm text-gray-300 bg-zinc-700 p-3 rounded">
                          <strong className="text-teal-400">Principal Component Analysis (PCA):</strong> Reduces data to 2D while preserving variance. Each axis represents a principal component capturing variance in the data.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ML Results */}
            {analysisResult.model_results && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">🤖 Machine Learning Results</h2>
                <div className="space-y-4">
                  {/* Model Performance */}
                  <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                    <h3 className="text-teal-400 font-semibold mb-3 text-lg">Model Performance</h3>
                    
                    {/* Model Used Display */}
                    {analysisResult.model_results.model_used && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-purple-400 text-xs font-semibold mb-1">ACTUAL MODEL USED:</div>
                            <div className="text-white text-lg font-bold">{analysisResult.model_results.model_used}</div>
                            {analysisResult.model_results.model_type_requested && (
                              <div className="text-gray-400 text-xs mt-1">
                                (Requested: {analysisResult.model_results.model_type_requested})
                              </div>
                            )}
                          </div>
                          {analysisResult.model_results.model_used === 'XGBRegressor' && (
                            <span className="text-2xl">🚀</span>
                          )}
                          {analysisResult.model_results.model_used === 'RandomForestRegressor' && (
                            <span className="text-2xl">🌲</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Mean Squared Error (MSE):</span>
                        <span className="text-white font-bold">{analysisResult.model_results.mse.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">R² Score:</span>
                        <span className={`font-bold ${analysisResult.model_results.r2 > 0.7 ? 'text-green-400' : analysisResult.model_results.r2 > 0.3 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {analysisResult.model_results.r2.toFixed(4)}
                        </span>
                      </div>
                      {analysisResult.model_results.bayesian_opt_used && (
                        <div className="mt-2 text-teal-400 text-sm">
                          ✨ Bayesian Optimization was used
                        </div>
                      )}
                    </div>
                    <div className="bg-zinc-900 p-3 rounded border-l-4 border-blue-500">
                      <h4 className="text-blue-400 font-semibold mb-2 text-sm">📖 Understanding the Metrics:</h4>
                      <ul className="space-y-1 text-gray-300 text-sm">
                        <li><strong>MSE:</strong> Average squared difference between predictions and actual values. Lower is better.</li>
                        <li><strong>R² Score:</strong> How well the model explains variance (0-1). Above 0.7 is good, above 0.9 is excellent.</li>
                        <li>💡 Negative R² means the model performs worse than simply predicting the mean.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Feature Importance */}
                  <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                    <h3 className="text-teal-400 font-semibold mb-3 text-lg">Feature Importance</h3>
                    <div className="space-y-2 mb-4">
                      {Object.entries(analysisResult.model_results.feature_importance)
                        .sort(([,a], [,b]) => b - a)
                        .map(([feature, importance]) => (
                          <div key={feature} className="flex items-center gap-3">
                            <span className="text-gray-300 text-sm w-32 truncate">{feature}</span>
                            <div className="flex-1 bg-zinc-700 rounded-full h-6 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-teal-500 to-blue-500 h-full flex items-center justify-end pr-2"
                                style={{ width: `${importance * 100}%` }}
                              >
                                <span className="text-white text-xs font-bold">{(importance * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="bg-zinc-900 p-3 rounded border-l-4 border-purple-500">
                      <h4 className="text-purple-400 font-semibold mb-2 text-sm">📖 How to Use This:</h4>
                      <ul className="space-y-1 text-gray-300 text-sm">
                        <li>🎯 <strong>Top features</strong> have the most impact on predictions</li>
                        <li>✂️ <strong>Low importance features</strong> (&lt;5%) can often be removed</li>
                        <li>💡 Focus your analysis on the top 3-5 most important features</li>
                      </ul>
                    </div>
                  </div>

                  {/* Model Debug Info */}
                  {analysisResult.model_results.model_used && (
                    <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                      <h3 className="text-orange-400 font-semibold mb-3 text-lg flex items-center gap-2">
                        🔧 Model Debug Information
                      </h3>
                      <div className="bg-black p-4 rounded-lg font-mono text-sm">
                        <div className="text-orange-400 mb-2">============================================================</div>
                        <div className="text-teal-400 mb-2">🤖 MODEL SELECTION DEBUG</div>
                        <div className="text-orange-400 mb-3">============================================================</div>
                        
                        <div className="text-gray-300 space-y-1 mb-3">
                          <div>Requested model_type: <span className="text-yellow-400">{analysisResult.model_results.model_type_requested || 'N/A'}</span></div>
                          <div>Use Bayesian Opt: <span className="text-yellow-400">{analysisResult.model_results.bayesian_opt_used ? 'True' : 'False'}</span></div>
                        </div>
                        
                        <div className="text-green-400 mb-2">
                          ✅ Using {analysisResult.model_results.model_used === 'XGBRegressor' ? 'XGBoost Regressor' : 'Random Forest Regressor'}
                        </div>
                        
                        <div className="text-gray-400 ml-4 space-y-1 mb-3">
                          {analysisResult.model_results.model_used === 'XGBRegressor' && analysisResult.model_results.bayesian_opt_used && (
                            <>
                              <div>- n_estimators: 200</div>
                              <div>- max_depth: 6</div>
                              <div>- learning_rate: 0.05</div>
                              <div>- subsample: 0.8</div>
                              <div>- colsample_bytree: 0.8</div>
                            </>
                          )}
                          {analysisResult.model_results.model_used === 'XGBRegressor' && !analysisResult.model_results.bayesian_opt_used && (
                            <>
                              <div>- n_estimators: 100</div>
                              <div>- random_state: 42</div>
                            </>
                          )}
                          {analysisResult.model_results.model_used === 'RandomForestRegressor' && (
                            <>
                              <div>- n_estimators: 100</div>
                              <div>- random_state: 42</div>
                            </>
                          )}
                        </div>
                        
                        <div className="text-gray-300 mb-3">
                          Model type: <span className="text-cyan-400">{analysisResult.model_results.model_used}</span>
                        </div>
                        
                        <div className="text-orange-400 mb-3">============================================================</div>
                        
                        <div className="text-teal-400 mb-2">📊 MODEL RESULTS:</div>
                        <div className="text-gray-300 ml-4 space-y-1">
                          <div>MSE: <span className="text-white">{analysisResult.model_results.mse.toFixed(4)}</span></div>
                          <div>R²: <span className="text-white">{analysisResult.model_results.r2.toFixed(4)}</span></div>
                          <div>Model used: <span className="text-cyan-400">{analysisResult.model_results.model_used}</span></div>
                          <div>Requested: <span className="text-yellow-400">{analysisResult.model_results.model_type_requested || 'N/A'}</span></div>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-zinc-900 p-3 rounded border-l-4 border-orange-500">
                        <h4 className="text-orange-400 font-semibold mb-2 text-sm">🔍 What This Shows:</h4>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>✅ <strong>Confirms</strong> which ML model was actually used by the backend</li>
                          <li>🎯 <strong>Verifies</strong> your model selection was correctly applied</li>
                          <li>⚙️ <strong>Shows</strong> the hyperparameters used for training</li>
                          <li>💡 If "Model used" matches "Requested", everything is working correctly!</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
            {/* Request Info */}
            {analysisResult.request_info && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">📋 Analysis Request</h2>
                <div className="bg-zinc-800 p-4 rounded-lg">
                  <pre className="text-gray-300 text-sm overflow-x-auto">
                    {JSON.stringify(analysisResult.request_info, null, 2)}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(analysisResult.request_info, null, 2));
                      alert('Request JSON copied to clipboard!');
                    }}
                    className="mt-3 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    📋 Copy JSON
                  </button>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📊 Summary Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-teal-500">
                  <div className="text-gray-400 text-sm">Data Shape</div>
                  <div className="text-white text-2xl font-bold">{analysisResult.data_shape ? `${analysisResult.data_shape[0]} × ${analysisResult.data_shape[1]}` : 'N/A'}</div>
                </div>
                <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-purple-500">
                  <div className="text-gray-400 text-sm">PCA Components</div>
                  <div className="text-white text-2xl font-bold">{analysisResult.pca_components || 'N/A'}</div>
                </div>
                {analysisResult.model_results && (
                  <>
                    <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="text-gray-400 text-sm">R² Score</div>
                      <div className="text-white text-2xl font-bold">{analysisResult.model_results.r2.toFixed(3)}</div>
                    </div>
                    <div className="bg-zinc-800 p-4 rounded-lg border-l-4 border-green-500">
                      <div className="text-gray-400 text-sm">MSE</div>
                      <div className="text-white text-2xl font-bold">{analysisResult.model_results.mse.toFixed(0)}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* DEBUG INFO - TEMPORARY */}
            <div className="mb-8 bg-red-900 p-4 rounded-lg">
              <h3 className="text-white font-bold mb-2">🐛 DEBUG - Analysis Result Structure:</h3>
              <pre className="text-white text-xs overflow-auto max-h-40">
                {JSON.stringify({
                  has_model_results: !!analysisResult.model_results,
                  model_results_keys: analysisResult.model_results ? Object.keys(analysisResult.model_results) : 'N/A',
                  model_used: analysisResult.model_results?.model_used,
                  has_feature_importance: !!analysisResult.model_results?.feature_importance
                }, null, 2)}
              </pre>
            </div>

            {/* Plots */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📈 Visualizations</h2>
              <div className="grid grid-cols-1 gap-6">
                {analysisResult.plots && Object.entries(analysisResult.plots).map(([key, imageData]) => {
                  const plotInfo = getPlotInfo(key);
                  return (
                    <div key={key} className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                      {/* Plot Header */}
                      <div className="mb-4">
                        <h3 className="text-white font-bold text-xl mb-2">{plotInfo.title}
                          {key === 'correlation' && (
                            <button
                              onMouseEnter={() => setShowCorrelationInfo(true)}
                              onMouseLeave={() => setShowCorrelationInfo(false)}
                              className="ml-2 text-gray-400 hover:text-teal-400 transition-colors"
                            >
                              <span className="inline-block w-5 h-5 text-center border border-current rounded-full text-xs leading-5">?</span>
                            </button>
                          )}
                          {key === 'pca' && (
                            <button
                              onMouseEnter={() => setShowPCAInfo(true)}
                              onMouseLeave={() => setShowPCAInfo(false)}
                              className="ml-2 text-gray-400 hover:text-teal-400 transition-colors"
                            >
                              <span className="inline-block w-5 h-5 text-center border border-current rounded-full text-xs leading-5">?</span>
                            </button>
                          )}
                        </h3>
                        <p className="text-gray-400 text-sm">{plotInfo.description}</p>
                      </div>
                      
                      {/* Plot Image */}
                      <div className="bg-white p-4 rounded-lg mb-4">
                        <img src={imageData} alt={key} className="w-full rounded" />
                      </div>
                      
                      {/* Analysis Tips */}
                      {plotInfo.tips.length > 0 && (
                        <div className="bg-zinc-900 p-4 rounded-lg border-l-4 border-teal-500">
                          <h4 className="text-teal-400 font-semibold mb-2 text-sm">📖 How to Read This Plot:</h4>
                          <ul className="space-y-1">
                            {plotInfo.tips.map((tip, idx) => (
                              <li key={idx} className="text-gray-300 text-sm">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Tooltip Descriptions */}
                      {showCorrelationInfo && key === 'correlation' && (
                        <div className="mt-2 text-sm text-gray-300 bg-zinc-700 p-3 rounded">
                          <strong className="text-teal-400">Correlation Matrix:</strong> Shows relationships between features. Values range from -1 to 1. Red indicates positive correlation, blue indicates negative correlation.
                        </div>
                      )}
                      {showPCAInfo && key === 'pca' && (
                        <div className="mt-2 text-sm text-gray-300 bg-zinc-700 p-3 rounded">
                          <strong className="text-teal-400">Principal Component Analysis (PCA):</strong> Reduces data to 2D while preserving variance. Each axis represents a principal component capturing variance in the data.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ML Results */}
            {analysisResult.model_results && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">🤖 Machine Learning Results</h2>
                <div className="space-y-4">
                  {/* Model Performance */}
                  <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                    <h3 className="text-teal-400 font-semibold mb-3 text-lg">Model Performance</h3>
                    
                    {/* Model Used Display */}
                    {analysisResult.model_results.model_used && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-purple-400 text-xs font-semibold mb-1">ACTUAL MODEL USED:</div>
                            <div className="text-white text-lg font-bold">{analysisResult.model_results.model_used}</div>
                            {analysisResult.model_results.model_type_requested && (
                              <div className="text-gray-400 text-xs mt-1">
                                (Requested: {analysisResult.model_results.model_type_requested})
                              </div>
                            )}
                          </div>
                          {analysisResult.model_results.model_used === 'XGBRegressor' && (
                            <span className="text-2xl">🚀</span>
                          )}
                          {analysisResult.model_results.model_used === 'RandomForestRegressor' && (
                            <span className="text-2xl">🌲</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Mean Squared Error (MSE):</span>
                        <span className="text-white font-bold">{analysisResult.model_results.mse.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">R² Score:</span>
                        <span className={`font-bold ${analysisResult.model_results.r2 > 0.7 ? 'text-green-400' : analysisResult.model_results.r2 > 0.3 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {analysisResult.model_results.r2.toFixed(4)}
                        </span>
                      </div>
                      {analysisResult.model_results.bayesian_opt_used && (
                        <div className="mt-2 text-teal-400 text-sm">
                          ✨ Bayesian Optimization was used
                        </div>
                      )}
                    </div>
                    <div className="bg-zinc-900 p-3 rounded border-l-4 border-blue-500">
                      <h4 className="text-blue-400 font-semibold mb-2 text-sm">📖 Understanding the Metrics:</h4>
                      <ul className="space-y-1 text-gray-300 text-sm">
                        <li><strong>MSE:</strong> Average squared difference between predictions and actual values. Lower is better.</li>
                        <li><strong>R² Score:</strong> How well the model explains variance (0-1). Above 0.7 is good, above 0.9 is excellent.</li>
                        <li>💡 Negative R² means the model performs worse than simply predicting the mean.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Feature Importance */}
                  <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                    <h3 className="text-teal-400 font-semibold mb-3 text-lg">Feature Importance</h3>
                    <div className="space-y-2 mb-4">
                      {Object.entries(analysisResult.model_results.feature_importance)
                        .sort(([,a], [,b]) => b - a)
                        .map(([feature, importance]) => (
                          <div key={feature} className="flex items-center gap-3">
                            <span className="text-gray-300 text-sm w-32 truncate">{feature}</span>
                            <div className="flex-1 bg-zinc-700 rounded-full h-6 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-teal-500 to-blue-500 h-full flex items-center justify-end pr-2"
                                style={{ width: `${importance * 100}%` }}
                              >
                                <span className="text-white text-xs font-bold">{(importance * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="bg-zinc-900 p-3 rounded border-l-4 border-purple-500">
                      <h4 className="text-purple-400 font-semibold mb-2 text-sm">📖 How to Use This:</h4>
                      <ul className="space-y-1 text-gray-300 text-sm">
                        <li>🎯 <strong>Top features</strong> have the most impact on predictions</li>
                        <li>✂️ <strong>Low importance features</strong> (&lt;5%) can often be removed</li>
                        <li>💡 Focus your analysis on the top 3-5 most important features</li>
                      </ul>
                    </div>
                  </div>

                  {/* Model Debug Info */}
                  {analysisResult.model_results.model_used && (
                    <div className="bg-zinc-800 p-6 rounded-lg border border-zinc-700">
                      <h3 className="text-orange-400 font-semibold mb-3 text-lg flex items-center gap-2">
                        🔧 Model Debug Information
                      </h3>
                      <div className="bg-black p-4 rounded-lg font-mono text-sm">
                        <div className="text-orange-400 mb-2">============================================================</div>
                        <div className="text-teal-400 mb-2">🤖 MODEL SELECTION DEBUG</div>
                        <div className="text-orange-400 mb-3">============================================================</div>
                        
                        <div className="text-gray-300 space-y-1 mb-3">
                          <div>Requested model_type: <span className="text-yellow-400">{analysisResult.model_results.model_type_requested || 'N/A'}</span></div>
                          <div>Use Bayesian Opt: <span className="text-yellow-400">{analysisResult.model_results.bayesian_opt_used ? 'True' : 'False'}</span></div>
                        </div>
                        
                        <div className="text-green-400 mb-2">
                          ✅ Using {analysisResult.model_results.model_used === 'XGBRegressor' ? 'XGBoost Regressor' : 'Random Forest Regressor'}
                        </div>
                        
                        <div className="text-gray-400 ml-4 space-y-1 mb-3">
                          {analysisResult.model_results.model_used === 'XGBRegressor' && analysisResult.model_results.bayesian_opt_used && (
                            <>
                              <div>- n_estimators: 200</div>
                              <div>- max_depth: 6</div>
                              <div>- learning_rate: 0.05</div>
                              <div>- subsample: 0.8</div>
                              <div>- colsample_bytree: 0.8</div>
                            </>
                          )}
                          {analysisResult.model_results.model_used === 'XGBRegressor' && !analysisResult.model_results.bayesian_opt_used && (
                            <>
                              <div>- n_estimators: 100</div>
                              <div>- random_state: 42</div>
                            </>
                          )}
                          {analysisResult.model_results.model_used === 'RandomForestRegressor' && (
                            <>
                              <div>- n_estimators: 100</div>
                              <div>- random_state: 42</div>
                            </>
                          )}
                        </div>
                        
                        <div className="text-gray-300 mb-3">
                          Model type: <span className="text-cyan-400">{analysisResult.model_results.model_used}</span>
                        </div>
                        
                        <div className="text-orange-400 mb-3">============================================================</div>
                        
                        <div className="text-teal-400 mb-2">📊 MODEL RESULTS:</div>
                        <div className="text-gray-300 ml-4 space-y-1">
                          <div>MSE: <span className="text-white">{analysisResult.model_results.mse.toFixed(4)}</span></div>
                          <div>R²: <span className="text-white">{analysisResult.model_results.r2.toFixed(4)}</span></div>
                          <div>Model used: <span className="text-cyan-400">{analysisResult.model_results.model_used}</span></div>
                          <div>Requested: <span className="text-yellow-400">{analysisResult.model_results.model_type_requested || 'N/A'}</span></div>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-zinc-900 p-3 rounded border-l-4 border-orange-500">
                        <h4 className="text-orange-400 font-semibold mb-2 text-sm">🔍 What This Shows:</h4>
                        <ul className="space-y-1 text-gray-300 text-sm">
                          <li>✅ <strong>Confirms</strong> which ML model was actually used by the backend</li>
                          <li>🎯 <strong>Verifies</strong> your model selection was correctly applied</li>
                          <li>⚙️ <strong>Shows</strong> the hyperparameters used for training</li>
                          <li>💡 If "Model used" matches "Requested", everything is working correctly!</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

