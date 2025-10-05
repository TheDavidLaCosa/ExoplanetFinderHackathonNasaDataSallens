import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';

/**
 * DataDebugger Component
 * Displays detailed information about loaded NASA data to verify authenticity
 */
const DataDebugger = ({ data, dataStats, isLoadingData, selectedDataset }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertCircle size={16} />
          <span className="font-semibold">No data loaded</span>
        </div>
        <p className="text-yellow-700 mt-1 text-xs">
          Click "Load NASA Data" to fetch real exoplanet data
        </p>
      </div>
    );
  }

  // Check if data has NASA metadata (real data)
  const hasMetadata = data.some(point => point.metadata && Object.keys(point.metadata).length > 0);
  const samplePoint = data.find(point => point.metadata) || data[0];

  return (
    <div className="bg-white border rounded p-4 space-y-3">
      {/* Status Indicator */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">Data Source Verification</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-500 hover:text-blue-700 flex items-center gap-1 text-xs"
        >
          <Eye size={14} />
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {hasMetadata ? (
          <>
            <CheckCircle size={20} className="text-green-500" />
            <div>
              <div className="font-semibold text-green-700">✓ Real NASA Data</div>
              <div className="text-xs text-gray-600">Connected to NASA Exoplanet Archive</div>
            </div>
          </>
        ) : (
          <>
            <XCircle size={20} className="text-orange-500" />
            <div>
              <div className="font-semibold text-orange-700">Synthetic Data</div>
              <div className="text-xs text-gray-600">Using generated test data</div>
            </div>
          </>
        )}
      </div>

      {/* Data Stats */}
      {dataStats && (
        <div className="bg-blue-50 rounded p-2 text-xs space-y-1">
          <div className="font-semibold text-blue-900">Dataset: {selectedDataset?.toUpperCase()}</div>
          <div className="grid grid-cols-3 gap-2 text-blue-800">
            <div>
              <div className="font-medium">Total</div>
              <div className="text-lg">{dataStats.total}</div>
            </div>
            <div>
              <div className="font-medium">Confirmed</div>
              <div className="text-lg">{dataStats.exoplanets}</div>
            </div>
            <div>
              <div className="font-medium">Candidates</div>
              <div className="text-lg">{dataStats.nonExoplanets}</div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Information */}
      {showDetails && hasMetadata && (
        <div className="border-t pt-3 space-y-2">
          <div className="text-xs font-semibold text-gray-700">Sample Exoplanet Data:</div>
          
          {/* Sample Point Selector */}
          <select
            onChange={(e) => {
              const point = data[parseInt(e.target.value)];
              setSelectedPoint(point);
            }}
            className="w-full text-xs border rounded p-1"
          >
            <option value="">Select an exoplanet...</option>
            {data.slice(0, 10).map((point, idx) => (
              <option key={idx} value={idx}>
                {point.metadata?.pl_name || point.metadata?.kepoi_name || point.metadata?.hostname || `Exoplanet #${idx + 1}`}
              </option>
            ))}
          </select>

          {/* Display Selected Point Details */}
          {selectedPoint?.metadata && (
            <div className="bg-gray-50 rounded p-2 text-xs space-y-1 max-h-60 overflow-y-auto">
              <div className="font-bold text-gray-800 mb-2">
                {selectedPoint.metadata.pl_name || selectedPoint.metadata.kepoi_name || 'Unknown'}
              </div>
              {Object.entries(selectedPoint.metadata).slice(0, 15).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-gray-200 pb-1">
                  <span className="text-gray-600 font-mono">{key}:</span>
                  <span className="text-gray-900 font-medium">
                    {value !== null && value !== undefined ? value.toString() : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* API Source Info */}
          <div className="bg-green-50 border border-green-200 rounded p-2 text-xs">
            <div className="font-semibold text-green-800 mb-1">NASA API Source:</div>
            <div className="text-green-700 font-mono break-all">
              https://exoplanetarchive.ipac.caltech.edu/TAP/sync
            </div>
            <div className="text-green-600 mt-1">
              Table: <span className="font-mono">
                {selectedDataset === 'kepler' ? 'koi' : selectedDataset === 'tess' ? 'toi' : 'ps'}
              </span>
            </div>
          </div>

          {/* Available Fields */}
          <div className="text-xs">
            <div className="font-semibold text-gray-700 mb-1">Available NASA Fields:</div>
            <div className="flex flex-wrap gap-1">
              {samplePoint.metadata && Object.keys(samplePoint.metadata).map((key, idx) => (
                <span key={idx} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-mono">
                  {key}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoadingData && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm">
          <div className="flex items-center gap-2 text-blue-700">
            <div className="animate-spin">⏳</div>
            <span>Fetching data from NASA...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataDebugger;

