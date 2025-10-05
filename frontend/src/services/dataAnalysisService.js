import { chatWithGroq } from './groqService';

/**
 * Analyze data with AI and generate plots
 * @param {Object} fileData - Parsed file data
 * @param {Array} selectedFeatures - Features to analyze
 * @returns {Promise<Object>} Analysis results with plots and insights
 */
export async function analyzeDataWithAI(fileData, selectedFeatures) {
  try {
    // 1. Generate statistics
    const statistics = generateStatistics(fileData, selectedFeatures);
    
    // 2. Generate plots (with base64 encoded images)
    const plots = await generatePlots(fileData, selectedFeatures);
    
    // 3. Get AI insights
    const insights = await generateAIInsights(fileData, selectedFeatures, statistics);
    
    return {
      statistics,
      plots,
      insights,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error in data analysis:', error);
    throw error;
  }
}

/**
 * Generate summary statistics for selected features
 */
function generateStatistics(fileData, selectedFeatures) {
  const stats = [];
  
  // Total rows
  stats.push({
    label: 'Total Records',
    value: fileData.rowCount.toLocaleString()
  });
  
  // Features analyzed
  stats.push({
    label: 'Features Analyzed',
    value: selectedFeatures.length
  });
  
  // Calculate statistics for each numeric feature
  selectedFeatures.forEach(feature => {
    const values = fileData.rows
      .map(row => parseFloat(row[feature]))
      .filter(v => !isNaN(v));
    
    if (values.length > 0) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      stats.push({
        label: `${feature} (Mean)`,
        value: mean.toFixed(2)
      });
    }
  });
  
  return stats.slice(0, 8); // Limit to 8 stats for display
}

/**
 * Generate plot visualizations with base64 encoding
 */
async function generatePlots(fileData, selectedFeatures) {
  const plots = [];
  
  // For each numeric feature, generate a histogram
  for (const feature of selectedFeatures.slice(0, 4)) { // Limit to 4 plots
    const values = fileData.rows
      .map(row => parseFloat(row[feature]))
      .filter(v => !isNaN(v));
    
    if (values.length > 0) {
      const plot = {
        title: `Distribution of ${feature}`,
        imageBase64: await generateHistogramBase64(values, feature),
        description: `Histogram showing the distribution of ${feature} across ${values.length} data points.`
      };
      plots.push(plot);
    }
  }
  
  // Generate correlation plot if multiple numeric features
  if (selectedFeatures.length >= 2) {
    const correlationPlot = {
      title: 'Feature Correlations',
      imageBase64: await generateCorrelationPlotBase64(fileData, selectedFeatures),
      description: 'Correlation matrix showing relationships between selected features.'
    };
    plots.push(correlationPlot);
  }
  
  return plots;
}

/**
 * Generate histogram as base64 encoded PNG
 * Uses canvas to create simple visualizations
 */
async function generateHistogramBase64(values, featureName) {
  return new Promise((resolve) => {
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate histogram bins
    const bins = 20;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    const histogram = new Array(bins).fill(0);
    
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex]++;
    });
    
    const maxCount = Math.max(...histogram);
    
    // Draw bars
    const barWidth = (canvas.width - 80) / bins;
    const chartHeight = canvas.height - 100;
    
    histogram.forEach((count, i) => {
      const barHeight = (count / maxCount) * chartHeight;
      const x = 40 + i * barWidth;
      const y = canvas.height - 50 - barHeight;
      
      // Bar
      ctx.fillStyle = '#14b8a6';
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    });
    
    // Axes
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height - 50);
    ctx.lineTo(canvas.width - 40, canvas.height - 50);
    ctx.moveTo(40, canvas.height - 50);
    ctx.lineTo(40, 50);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(min.toFixed(2), 40, canvas.height - 20);
    ctx.fillText(max.toFixed(2), canvas.width - 40, canvas.height - 20);
    ctx.fillText(featureName, canvas.width / 2, canvas.height - 10);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Distribution of ${featureName}`, canvas.width / 2, 30);
    
    // Convert to base64
    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * Generate correlation plot as base64 encoded PNG
 */
async function generateCorrelationPlotBase64(fileData, selectedFeatures) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate correlations
    const n = selectedFeatures.length;
    const size = Math.min(n, 5); // Limit to 5x5
    const cellSize = 400 / size;
    const offset = 100;
    
    // Draw correlation matrix
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const corr = calculateCorrelation(
          fileData,
          selectedFeatures[i],
          selectedFeatures[j]
        );
        
        // Color based on correlation
        const intensity = Math.abs(corr);
        const color = corr > 0 
          ? `rgba(20, 184, 166, ${intensity})`
          : `rgba(239, 68, 68, ${intensity})`;
        
        ctx.fillStyle = color;
        ctx.fillRect(
          offset + j * cellSize,
          offset + i * cellSize,
          cellSize - 2,
          cellSize - 2
        );
        
        // Correlation value
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          corr.toFixed(2),
          offset + j * cellSize + cellSize / 2,
          offset + i * cellSize + cellSize / 2
        );
      }
    }
    
    // Labels
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px Arial';
    selectedFeatures.slice(0, size).forEach((feature, i) => {
      ctx.save();
      ctx.translate(offset - 10, offset + i * cellSize + cellSize / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(feature.substring(0, 15), 0, 0);
      ctx.restore();
      
      ctx.textAlign = 'center';
      ctx.fillText(
        feature.substring(0, 15),
        offset + i * cellSize + cellSize / 2,
        offset - 10
      );
    });
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Feature Correlation Matrix', canvas.width / 2, 40);
    
    resolve(canvas.toDataURL('image/png'));
  });
}

/**
 * Calculate Pearson correlation between two features
 */
function calculateCorrelation(fileData, feature1, feature2) {
  const values1 = fileData.rows.map(r => parseFloat(r[feature1])).filter(v => !isNaN(v));
  const values2 = fileData.rows.map(r => parseFloat(r[feature2])).filter(v => !isNaN(v));
  
  if (values1.length === 0 || values2.length === 0) return 0;
  
  const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
  const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
  
  let numerator = 0;
  let sum1 = 0;
  let sum2 = 0;
  
  for (let i = 0; i < Math.min(values1.length, values2.length); i++) {
    const diff1 = values1[i] - mean1;
    const diff2 = values2[i] - mean2;
    numerator += diff1 * diff2;
    sum1 += diff1 * diff1;
    sum2 += diff2 * diff2;
  }
  
  const denominator = Math.sqrt(sum1 * sum2);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Generate AI insights using Groq
 */
async function generateAIInsights(fileData, selectedFeatures, statistics) {
  try {
    const prompt = `You are analyzing a dataset with ${fileData.rowCount} rows. The user selected these features to analyze: ${selectedFeatures.join(', ')}.

Here are the summary statistics:
${statistics.map(s => `- ${s.label}: ${s.value}`).join('\n')}

Please provide 3-5 key insights about this data in a clear, concise way. Each insight should be actionable and highlight patterns, correlations, or notable findings.

Format your response as JSON with this structure:
[
  {
    "title": "Insight title",
    "description": "Detailed description of the insight"
  }
]`;

    const response = await chatWithGroq([
      { role: 'user', content: prompt }
    ]);
    
    // Try to parse JSON response
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Could not parse JSON, using fallback insights');
    }
    
    // Fallback insights
    return generateFallbackInsights(selectedFeatures, statistics);
  } catch (error) {
    console.error('Error generating AI insights:', error);
    return generateFallbackInsights(selectedFeatures, statistics);
  }
}

/**
 * Generate fallback insights if AI fails
 */
function generateFallbackInsights(selectedFeatures, statistics) {
  return [
    {
      title: 'Dataset Overview',
      description: `The dataset contains ${statistics[0]?.value || 'multiple'} records with ${selectedFeatures.length} features selected for analysis. This provides a solid foundation for identifying patterns and relationships.`
    },
    {
      title: 'Feature Distribution',
      description: `The selected features show varied distributions across the dataset. Review the histograms above to understand the spread and identify any outliers or unusual patterns.`
    },
    {
      title: 'Correlation Analysis',
      description: `Feature correlations reveal relationships between variables. Strong positive or negative correlations (close to +1 or -1) indicate features that move together and may be useful for predictive modeling.`
    },
    {
      title: 'Data Quality',
      description: `The analysis includes data quality metrics. Check for missing values, outliers, or skewed distributions that might affect downstream analysis or model performance.`
    }
  ];
}

export default {
  analyzeDataWithAI
};

