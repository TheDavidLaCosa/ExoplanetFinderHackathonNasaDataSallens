/**
 * Service for fetching exoplanet data from NASA Exoplanet Archive
 * API Documentation: https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html
 */

// Use CORS proxy to avoid CORS issues
const NASA_EXOPLANET_API_BASE = 'https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI';

/**
 * Fetch exoplanet data based on dataset type
 * @param {string} dataset - Dataset type: 'kepler', 'tess', 'ps' (planetary systems)
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Array of exoplanet data
 */
export const fetchExoplanetData = async (dataset = 'ps', limit = 200) => {
  try {
    let tableName = '';
    let url = '';
    
    switch(dataset) {
      case 'kepler':
        // Kepler Objects of Interest (KOI) - use cumulative table
        tableName = 'cumulative';
        url = `${NASA_EXOPLANET_API_BASE}?table=${tableName}&format=json&select=kepoi_name,koi_period,koi_depth,koi_srad,koi_smass,koi_teq,koi_snr,koi_disposition`;
        break;
      case 'tess':
        // For TESS, use confirmed planets from PS table
        tableName = 'ps';
        url = `${NASA_EXOPLANET_API_BASE}?table=${tableName}&format=json&select=pl_name,hostname,pl_orbper,pl_trandep,pl_rade,st_rad,st_mass,pl_eqt,discoverymethod,disc_facility`;
        break;
      case 'radialVelocity':
        tableName = 'ps';
        url = `${NASA_EXOPLANET_API_BASE}?table=${tableName}&format=json&select=pl_name,hostname,pl_orbper,pl_rade,st_rad,st_mass,pl_eqt,discoverymethod,disc_year`;
        break;
      case 'microlensing':
        tableName = 'ps';
        url = `${NASA_EXOPLANET_API_BASE}?table=${tableName}&format=json&select=pl_name,hostname,pl_orbper,pl_rade,st_rad,st_mass,pl_eqt,discoverymethod,disc_year`;
        break;
      case 'ps':
      default:
        // Planetary Systems (all confirmed exoplanets)
        tableName = 'ps';
        url = `${NASA_EXOPLANET_API_BASE}?table=${tableName}&format=json&select=pl_name,hostname,pl_orbper,pl_trandep,pl_rade,pl_masse,st_rad,st_mass,pl_eqt,discoverymethod,disc_year`;
        break;
    }
    
    console.log('🌐 NASA API Request:');
    console.log('  URL:', url);
    console.log('  Dataset:', dataset);
    console.log('  Table:', tableName);
    console.log('  Limit:', limit);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    const endTime = Date.now();
    
    console.log('📡 Response received in', endTime - startTime, 'ms');
    console.log('  Status:', response.status, response.statusText);
    console.log('  Content-Type:', response.headers.get('content-type'));
    
    // Get response as text first to handle potential errors
    const responseText = await response.text();
    
    console.log('📄 Response preview:', responseText.substring(0, 200));
    
    if (!response.ok) {
      console.error('  Error response:', responseText);
      throw new Error(`API request failed with status ${response.status}: ${responseText}`);
    }
    
    // Check if response is an error message (starts with ERROR)
    if (responseText.startsWith('ERROR')) {
      console.error('  API Error:', responseText);
      throw new Error(`NASA API Error: ${responseText}`);
    }
    
    // Parse JSON
    let data = JSON.parse(responseText);
    
    // Filter data based on dataset type
    switch(dataset) {
      case 'kepler':
        // Only confirmed Kepler planets
        data = data.filter(item => item.koi_disposition === 'CONFIRMED');
        break;
      case 'tess':
        // Only planets discovered by TESS
        data = data.filter(item => 
          item.discoverymethod && 
          item.discoverymethod.includes('Transit') && 
          item.disc_facility && 
          item.disc_facility.includes('TESS')
        );
        break;
      case 'radialVelocity':
        data = data.filter(item => 
          item.discoverymethod && 
          item.discoverymethod.includes('Radial Velocity')
        );
        break;
      case 'microlensing':
        data = data.filter(item => 
          item.discoverymethod && 
          item.discoverymethod.includes('Microlensing')
        );
        break;
      default:
        // No filtering for 'ps' - all confirmed exoplanets
        break;
    }
    
    // Limit the results to requested amount
    const limitedData = data.slice(0, limit);
    
    console.log('📦 Data parsed:', limitedData.length, 'records (total available:', data.length, ')');
    
    if (limitedData.length > 0) {
      console.log('✅ REAL NASA DATA CONFIRMED!');
      console.log('  First record keys:', Object.keys(limitedData[0]));
      console.log('  Sample record:', limitedData[0]);
    }
    
    return limitedData;
    
  } catch (error) {
    console.error('❌ Error fetching exoplanet data:', error);
    throw error;
  }
};

/**
 * Transform raw API data into normalized format for visualization
 * @param {Array} rawData - Raw data from NASA API
 * @param {string} dataset - Dataset type
 * @returns {Array} Normalized data points
 */
export const transformExoplanetData = (rawData, dataset = 'ps') => {
  if (!rawData || rawData.length === 0) return [];
  
  try {
    return rawData.map((item, index) => {
      let x, y, label;
      
      switch(dataset) {
        case 'kepler':
          // Use orbital period and transit depth
          x = item.koi_period ? Math.log10(parseFloat(item.koi_period)) : Math.random() * 8 - 4;
          y = item.koi_depth ? Math.log10(parseFloat(item.koi_depth)) : Math.random() * 8 - 4;
          label = item.koi_disposition === 'CONFIRMED' ? 1 : 0;
          break;
        case 'tess':
          x = item.pl_orbper ? Math.log10(parseFloat(item.pl_orbper)) : Math.random() * 8 - 4;
          y = item.pl_trandep ? Math.log10(parseFloat(item.pl_trandep)) : Math.random() * 8 - 4;
          label = 1; // All TESS data from ps table is confirmed
          break;
        case 'radialVelocity':
        case 'microlensing':
          x = item.pl_orbper ? Math.log10(parseFloat(item.pl_orbper)) : Math.random() * 8 - 4;
          y = item.pl_rade ? Math.log10(parseFloat(item.pl_rade)) : Math.random() * 8 - 4;
          label = 1;
          break;
        default:
          // Planetary Systems
          const orbper = item.pl_orbper || item.koi_period;
          const rade = item.pl_rade || item.pl_trandep;
          x = orbper ? Math.log10(parseFloat(orbper)) : Math.random() * 8 - 4;
          y = rade ? Math.log10(parseFloat(rade)) : Math.random() * 8 - 4;
          label = 1; // All confirmed exoplanets
          break;
      }
      
      // Normalize to -4 to 4 range
      x = Math.max(-4, Math.min(4, x));
      y = Math.max(-4, Math.min(4, y));
      
      // Handle NaN values
      if (isNaN(x)) x = Math.random() * 8 - 4;
      if (isNaN(y)) y = Math.random() * 8 - 4;
      
      return {
        x,
        y,
        label,
        metadata: item
      };
    });
  } catch (error) {
    console.error('Error transforming data:', error);
    return [];
  }
};

/**
 * Get dataset statistics
 * @param {Array} data - Exoplanet data array
 * @returns {Object} Statistics object
 */
export const getDatasetStats = (data) => {
  if (!data || data.length === 0) return null;
  
  const exoplanets = data.filter(item => item.label === 1).length;
  const nonExoplanets = data.filter(item => item.label === 0).length;
  
  return {
    total: data.length,
    exoplanets,
    nonExoplanets,
    ratio: exoplanets / data.length
  };
};

/**
 * Filter data based on selected features
 * @param {Array} data - Exoplanet data array
 * @param {Object} selectedFeatures - Object with feature selections
 * @returns {Array} Filtered data
 */
export const filterByFeatures = (data, selectedFeatures) => {
  if (!data || data.length === 0) return [];
  
  return data.filter(item => {
    const metadata = item.metadata || {};
    
    // Check if data has required features
    if (selectedFeatures.orbitalPeriod && !metadata.pl_orbper && !metadata.koi_period) {
      return false;
    }
    if (selectedFeatures.transitDepth && !metadata.pl_trandep && !metadata.koi_depth) {
      return false;
    }
    if (selectedFeatures.stellarRadius && !metadata.st_rad && !metadata.koi_srad) {
      return false;
    }
    if (selectedFeatures.stellarMass && !metadata.st_mass && !metadata.koi_smass) {
      return false;
    }
    if (selectedFeatures.equilibriumTemp && !metadata.pl_eqt && !metadata.koi_teq) {
      return false;
    }
    if (selectedFeatures.signalToNoise && !metadata.koi_snr) {
      return false;
    }
    
    return true;
  });
};

export default {
  fetchExoplanetData,
  transformExoplanetData,
  getDatasetStats,
  filterByFeatures
};

