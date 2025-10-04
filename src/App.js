import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';
import { fetchExoplanetData, transformExoplanetData, getDatasetStats } from './services/exoplanetService';

const ExoplanetPlayground = () => {
  const [epoch, setEpoch] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [learningRate, setLearningRate] = useState(0.03);
  const [activation, setActivation] = useState('tanh');
  const [regularization, setRegularization] = useState('none');
  const [regularizationRate, setRegularizationRate] = useState(0);
  const [batchSize, setBatchSize] = useState(10);
  const [trainTestRatio, setTrainTestRatio] = useState(50);
  const [noise, setNoise] = useState(0);
  const [hiddenLayers, setHiddenLayers] = useState([4, 2]);
  const [testLoss, setTestLoss] = useState(0.497);
  const [trainLoss, setTrainLoss] = useState(0.531);
  const [showTestData, setShowTestData] = useState(false);
  const [discretizeOutput, setDiscretizeOutput] = useState(false);
  
  const [selectedDataset, setSelectedDataset] = useState('kepler');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataStats, setDataStats] = useState(null);
  const [selectedFeatures, setSelectedFeatures] = useState({
    orbitalPeriod: true,
    transitDepth: true,
    stellarRadius: false,
    stellarMass: false,
    equilibriumTemp: false,
    signalToNoise: false
  });

  const canvasRef = useRef(null);
  const networkCanvasRef = useRef(null);
  const trainingInterval = useRef(null);

  const datasets = {
    kepler: { name: 'Kepler Mission', description: 'Confirmed Kepler exoplanets' },
    tess: { name: 'TESS Survey', description: 'TESS candidates' },
    ps: { name: 'All Confirmed', description: 'All confirmed exoplanets' },
    radialVelocity: { name: 'Radial Velocity', description: 'Doppler method' },
    microlensing: { name: 'Microlensing', description: 'Gravitational lensing' }
  };

  const features = {
    orbitalPeriod: { name: 'Orbital Period', label: 'P' },
    transitDepth: { name: 'Transit Depth', label: 'δ' },
    stellarRadius: { name: 'Stellar Radius', label: 'R*' },
    stellarMass: { name: 'Stellar Mass', label: 'M*' },
    equilibriumTemp: { name: 'Equilibrium Temp', label: 'Teq' },
    signalToNoise: { name: 'Signal/Noise', label: 'SNR' }
  };

  const generateData = () => {
    const data = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * 3 + (Math.random() > 0.5 ? 0 : 3);
      const isExoplanet = radius > 3 ? 1 : 0;
      
      data.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        label: isExoplanet
      });
    }
    return data;
  };

  const [data, setData] = useState(generateData());
  
  // Load real exoplanet data from NASA API
  const loadRealData = async () => {
    setIsLoadingData(true);
    try {
      const rawData = await fetchExoplanetData(selectedDataset, 200);
      const transformedData = transformExoplanetData(rawData, selectedDataset);
      const stats = getDatasetStats(transformedData);
      
      setData(transformedData);
      setDataStats(stats);
      console.log(`Loaded ${transformedData.length} exoplanets from ${selectedDataset} dataset`, stats);
    } catch (error) {
      console.error('Failed to load exoplanet data:', error);
      alert('Failed to load data from NASA Exoplanet Archive. Using synthetic data instead.');
      setData(generateData());
    } finally {
      setIsLoadingData(false);
    }
  };

  // Draw decision boundary visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * width / 10, 0);
      ctx.lineTo(i * width / 10, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * height / 10);
      ctx.lineTo(width, i * height / 10);
      ctx.stroke();
    }
    
    // Draw heatmap background
    const imageData = ctx.createImageData(width, height);
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const xVal = (x / width) * 8 - 4;
        const yVal = (y / height) * 8 - 4;
        const dist = Math.sqrt(xVal * xVal + yVal * yVal);
        const value = dist > 3 ? 1 : 0;
        
        const idx = (y * width + x) * 4;
        if (value > 0.5) {
          // NASA Space Apps NEON YELLOW for exoplanets
          imageData.data[idx] = 234;
          imageData.data[idx + 1] = 254;
          imageData.data[idx + 2] = 7;
          imageData.data[idx + 3] = 100;
        } else {
          // NASA Space Apps BLUE YONDER for non-exoplanets
          imageData.data[idx] = 46;
          imageData.data[idx + 1] = 150;
          imageData.data[idx + 2] = 245;
          imageData.data[idx + 3] = 100;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    
    // Draw data points
    data.forEach(point => {
      const x = ((point.x + 4) / 8) * width;
      const y = height - ((point.y + 4) / 8) * height;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = point.label === 1 ? '#EAFE07' : '#2E96F5';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [data, epoch]);

  // Draw neural network
  useEffect(() => {
    const canvas = networkCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const selectedFeatureCount = Object.values(selectedFeatures).filter(Boolean).length;
    const layers = [selectedFeatureCount, ...hiddenLayers, 2];
    const layerSpacing = width / (layers.length + 1);
    
    // Draw connections
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.3)';
    ctx.lineWidth = 1;
    
    for (let l = 0; l < layers.length - 1; l++) {
      const currentLayer = layers[l];
      const nextLayer = layers[l + 1];
      const x1 = layerSpacing * (l + 1);
      const x2 = layerSpacing * (l + 2);
      
      for (let i = 0; i < currentLayer; i++) {
        const y1 = (height / (currentLayer + 1)) * (i + 1);
        for (let j = 0; j < nextLayer; j++) {
          const y2 = (height / (nextLayer + 1)) * (j + 1);
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }
    
    // Draw nodes
    layers.forEach((nodeCount, layerIndex) => {
      const x = layerSpacing * (layerIndex + 1);
      
      for (let i = 0; i < nodeCount; i++) {
        const y = (height / (nodeCount + 1)) * (i + 1);
        
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        
        if (layerIndex === 0) {
          ctx.fillStyle = '#EAFE07';
        } else if (layerIndex === layers.length - 1) {
          ctx.fillStyle = '#E43700';
        } else {
          // Use different colors for hidden layers
          const colors = ['#2E96F5', '#0960E1', '#0042A6', '#8E1100'];
          ctx.fillStyle = colors[layerIndex % colors.length];
        }
        
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }, [hiddenLayers, selectedFeatures]);

  const handleTrain = () => {
    if (isTraining) {
      setIsTraining(false);
      if (trainingInterval.current) {
        clearInterval(trainingInterval.current);
      }
    } else {
      setIsTraining(true);
      trainingInterval.current = setInterval(() => {
        setEpoch(e => {
          const newEpoch = e + 1;
          setTestLoss(Math.max(0.05, 0.5 - (newEpoch / 1000) * 0.3 + Math.random() * 0.03));
          setTrainLoss(Math.max(0.03, 0.53 - (newEpoch / 1000) * 0.35 + Math.random() * 0.03));
          return newEpoch;
        });
      }, 50);
    }
  };

  const handleReset = () => {
    setEpoch(0);
    setIsTraining(false);
    if (trainingInterval.current) {
      clearInterval(trainingInterval.current);
    }
    setTestLoss(0.497);
    setTrainLoss(0.531);
    setData(generateData());
  };

  const addHiddenLayer = () => {
    if (hiddenLayers.length < 6) {
      setHiddenLayers([...hiddenLayers, 2]);
    }
  };

  const removeHiddenLayer = () => {
    if (hiddenLayers.length > 1) {
      setHiddenLayers(hiddenLayers.slice(0, -1));
    }
  };

  const updateNeurons = (index, delta) => {
    const newLayers = [...hiddenLayers];
    newLayers[index] = Math.max(1, Math.min(8, newLayers[index] + delta));
    setHiddenLayers(newLayers);
  };

  return (
    <div className="min-h-screen p-4" style={{
      background: '#07173F',
      backgroundImage: `
        url(/Orbits.png),
        radial-gradient(circle at 20% 20%, rgba(9, 96, 225, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(46, 150, 245, 0.1) 0%, transparent 50%),
        linear-gradient(45deg, transparent 25%, rgba(0, 66, 166, 0.05) 25%, rgba(0, 66, 166, 0.05) 50%, transparent 50%, transparent 75%, rgba(0, 66, 166, 0.05) 75%)
      `,
      backgroundSize: 'cover, 200px 200px, 300px 300px, 50px 50px',
      backgroundPosition: 'center, 0% 0%, 100% 100%, 0% 0%',
      backgroundRepeat: 'no-repeat, no-repeat, no-repeat, repeat'
    }}>
      {/* Header */}
      <div className="text-white py-4 px-4 mb-3" style={{background: 'linear-gradient(135deg, #0042A6 0%, #07173F 100%)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/space-apps-logo.png" 
              alt="NASA Space Apps Challenge" 
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-2xl font-black" style={{fontFamily: 'Fira Sans, sans-serif'}}>NASA Exoplanet Neural Network Playground</h1>
              <p className="text-sm" style={{color: '#EAFE07', fontFamily: 'Overpass, sans-serif'}}>Train a neural network to classify exoplanet candidates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img 
              src="/nasa-motif-logo.png" 
              alt="NASA Space Apps Motif" 
              className="h-8 w-auto opacity-80"
            />
            <img 
              src="/nasa-small-logo.png" 
              alt="NASA Space Apps Small" 
              className="h-6 w-auto opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-3 mb-3 shadow rounded" style={{borderLeft: '4px solid #EAFE07'}}>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleReset}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors flex items-center gap-2"
            title="Reset"
          >
            <span style={{fontSize: '16px'}}>↻</span>
            Reset
          </button>
          <button
            onClick={handleTrain}
            className={`p-2 rounded transition-colors ${
              isTraining ? 'hover:opacity-90' : 'hover:opacity-90'
            } text-white`}
            style={{
              backgroundColor: isTraining ? '#E43700' : '#0960E1'
            }}
            title={isTraining ? 'Pause' : 'Play'}
          >
            <span style={{fontSize: '16px'}}>{isTraining ? '⏸' : '▶'}</span>
            {isTraining ? 'Pause' : 'Play'}
          </button>
          
          <div className="border-l pl-4">
            <label className="text-xs" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Epoch</label>
            <div className="text-xl font-mono">{epoch.toString().padStart(6, '0')}</div>
          </div>
          
          <div>
            <label className="text-xs block" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Learning rate</label>
            <select
              value={learningRate}
              onChange={(e) => setLearningRate(parseFloat(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={0.00001}>0.00001</option>
              <option value={0.0001}>0.0001</option>
              <option value={0.001}>0.001</option>
              <option value={0.003}>0.003</option>
              <option value={0.01}>0.01</option>
              <option value={0.03}>0.03</option>
              <option value={0.1}>0.1</option>
              <option value={0.3}>0.3</option>
              <option value={1}>1</option>
              <option value={3}>3</option>
              <option value={10}>10</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs block" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Activation</label>
            <select
              value={activation}
              onChange={(e) => setActivation(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="relu">ReLU</option>
              <option value="tanh">Tanh</option>
              <option value="sigmoid">Sigmoid</option>
              <option value="linear">Linear</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs block" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Regularization</label>
            <select
              value={regularization}
              onChange={(e) => setRegularization(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="none">None</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
            </select>
          </div>
          
          <div>
            <label className="text-xs block" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Regularization rate</label>
            <select
              value={regularizationRate}
              onChange={(e) => setRegularizationRate(parseFloat(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={0}>0</option>
              <option value={0.001}>0.001</option>
              <option value={0.003}>0.003</option>
              <option value={0.01}>0.01</option>
              <option value={0.03}>0.03</option>
              <option value={0.1}>0.1</option>
              <option value={0.3}>0.3</option>
              <option value={1}>1</option>
            </select>
          </div>
          
          <div className="border-l pl-4">
            <label className="text-xs block" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Problem type</label>
            <select className="border rounded px-2 py-1">
              <option value="classification">Classification</option>
              <option value="regression">Regression</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-3">
        {/* Left Column - Data */}
        <div className="col-span-2 bg-white p-3 shadow rounded relative" style={{
          borderTop: '3px solid #2E96F5'
        }}>
          <h2 className="font-bold mb-1" style={{fontFamily: 'Fira Sans, sans-serif'}}>DATA</h2>
          <p className="text-xs mb-2" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Which dataset do you want to use?</p>
          
            <div className="space-y-1 mb-3">
            {Object.entries(datasets).map(([key, dataset]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                <input
                  type="radio"
                  name="dataset"
                  checked={selectedDataset === key}
                  onChange={() => setSelectedDataset(key)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{fontFamily: 'Overpass, sans-serif'}}>{dataset.name}</div>
                  <div className="text-xs" style={{fontFamily: 'Overpass, sans-serif', color: '#4a5568'}}>{dataset.description}</div>
                </div>
              </label>
            ))}
          </div>
          
          <button
            onClick={loadRealData}
            disabled={isLoadingData}
            className="w-full text-white text-xs py-1 rounded transition-colors mb-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{backgroundColor: '#2E96F5'}}
          >
            <span style={{fontSize: '14px'}}>⬇</span>
            {isLoadingData ? 'Loading...' : 'Load NASA Data'}
          </button>
          
          {dataStats && (
            <div className="p-2 rounded mb-2 text-xs" style={{backgroundColor: '#EAFE07', color: '#07173F', fontFamily: 'Overpass, sans-serif'}}>
              <div className="font-bold mb-1">Dataset Stats:</div>
              <div>Total: {dataStats.total}</div>
              <div>Exoplanets: {dataStats.exoplanets}</div>
              <div>Non-exoplanets: {dataStats.nonExoplanets}</div>
            </div>
          )}

          <div className="border-t pt-2 space-y-2">
            <div>
              <label className="text-xs" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Ratio of training to test data: {trainTestRatio}%</label>
              <input
                type="range"
                min="10"
                max="90"
                value={trainTestRatio}
                onChange={(e) => setTrainTestRatio(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-xs" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Noise: {noise}</label>
              <input
                type="range"
                min="0"
                max="50"
                value={noise}
                onChange={(e) => setNoise(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-xs" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Batch size: {batchSize}</label>
              <input
                type="range"
                min="1"
                max="30"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <button
              onClick={handleReset}
              className="w-full text-white text-sm py-2 rounded transition-colors hover:opacity-90"
              style={{backgroundColor: '#07173F'}}
            >
              REGENERATE
            </button>
          </div>
        </div>

        {/* Middle Left - Features */}
        <div className="col-span-2 bg-white p-3 shadow rounded" style={{
          borderTop: '3px solid #0960E1'
        }}>
          <h2 className="font-bold mb-1" style={{fontFamily: 'Fira Sans, sans-serif'}}>FEATURES</h2>
          <p className="text-xs mb-2" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Which properties do you want to feed in?</p>
          
          <div className="space-y-1">
            {Object.entries(features).map(([key, feature]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedFeatures[key]}
                  onChange={(e) => setSelectedFeatures({
                    ...selectedFeatures,
                    [key]: e.target.checked
                  })}
                  className="w-4 h-4"
                />
                <div className={`w-10 h-10 flex items-center justify-center rounded text-white font-bold ${
                  selectedFeatures[key] ? 'bg-orange-400' : 'bg-gray-300'
                }`}
                style={{
                  backgroundColor: selectedFeatures[key] ? '#EAFE07' : undefined,
                  color: selectedFeatures[key] ? '#07173F' : undefined
                }}>
                  {feature.label}
                </div>
                <span className="text-sm" style={{fontFamily: 'Overpass, sans-serif'}}>{feature.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Center - Network Visualization */}
        <div className="col-span-5 bg-white p-3 shadow rounded" style={{
          borderTop: '3px solid #0042A6'
        }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold" style={{fontFamily: 'Fira Sans, sans-serif'}}>HIDDEN LAYERS</h2>
            <div className="flex gap-2">
              <button
                onClick={removeHiddenLayer}
                className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                disabled={hiddenLayers.length <= 1}
              >
                <Minus size={16} />
              </button>
              <span className="px-2">{hiddenLayers.length}</span>
              <button
                onClick={addHiddenLayer}
                className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                disabled={hiddenLayers.length >= 6}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <canvas
            ref={networkCanvasRef}
            width={400}
            height={200}
            className="w-full border rounded mb-3"
          />

          <div className="grid grid-cols-6 gap-2">
            {hiddenLayers.map((neurons, idx) => (
              <div key={idx} className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => updateNeurons(idx, 1)}
                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  >
                    +
                  </button>
                  <div className="text-lg font-bold">{neurons}</div>
                  <button
                    onClick={() => updateNeurons(idx, -1)}
                    className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                  >
                    −
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right - Output & Visualization */}
        <div className="col-span-3 bg-white p-3 shadow rounded" style={{
          borderTop: '3px solid #E43700'
        }}>
          <h2 className="font-bold mb-1" style={{fontFamily: 'Fira Sans, sans-serif'}}>OUTPUT</h2>
          
          <div className="space-y-1 text-sm mb-2">
            <div className="flex justify-between">
              <span style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Test loss</span>
              <span className="font-mono">{testLoss.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Training loss</span>
              <span className="font-mono">{trainLoss.toFixed(3)}</span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={250}
            height={200}
            className="w-full border rounded mb-3"
          />

          <div className="space-y-1 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showTestData}
                onChange={(e) => setShowTestData(e.target.checked)}
                className="w-4 h-4"
              />
              <span style={{fontFamily: 'Overpass, sans-serif'}}>Show test data</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={discretizeOutput}
                onChange={(e) => setDiscretizeOutput(e.target.checked)}
                className="w-4 h-4"
              />
              <span style={{fontFamily: 'Overpass, sans-serif'}}>Discretize output</span>
            </label>
          </div>

          <div className="mt-2 pt-2 border-t">
            <p className="text-xs" style={{fontFamily: 'Overpass, sans-serif', color: '#2d3748'}}>Colors shows data, neuron and weight values.</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-3 rounded" style={{background: 'linear-gradient(to right, #EAFE07, #2E96F5, #0960E1, #0042A6)'}}></div>
              <div className="flex justify-between w-full text-xs" style={{fontFamily: 'Overpass, sans-serif', color: '#4a5568'}}>
                <span>-1</span>
                <span>0</span>
                <span>1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-6 p-4 text-center" style={{backgroundColor: 'rgba(7, 23, 63, 0.8)'}}>
        <div className="flex items-center justify-center gap-4">
          <img 
            src="/nasa-small-logo.png" 
            alt="NASA Space Apps" 
            className="h-6 w-auto opacity-70"
          />
          <span className="text-white text-sm" style={{fontFamily: 'Overpass, sans-serif'}}>
            NASA Space Apps Challenge 2025 | Exoplanet Neural Network Playground
          </span>
          <img 
            src="/nasa-small-logo.png" 
            alt="NASA Space Apps" 
            className="h-6 w-auto opacity-70"
          />
        </div>
      </div>
    </div>
  );
};

export default ExoplanetPlayground;