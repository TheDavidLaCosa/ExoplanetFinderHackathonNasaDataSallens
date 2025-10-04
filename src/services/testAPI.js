/**
 * Test script to verify NASA Exoplanet Archive API integration
 * Run this in the browser console to test the API
 */

import { fetchExoplanetData, transformExoplanetData, getDatasetStats } from './exoplanetService';

const testNASAAPI = async () => {
  console.log('🚀 Testing NASA Exoplanet Archive API...\n');
  
  const datasets = ['kepler', 'tess', 'ps'];
  
  for (const dataset of datasets) {
    console.log(`\n📡 Testing ${dataset.toUpperCase()} dataset...`);
    try {
      const startTime = Date.now();
      const rawData = await fetchExoplanetData(dataset, 50);
      const transformedData = transformExoplanetData(rawData, dataset);
      const stats = getDatasetStats(transformedData);
      const endTime = Date.now();
      
      console.log(`✅ Success! Loaded in ${endTime - startTime}ms`);
      console.log(`   Total: ${stats.total}`);
      console.log(`   Exoplanets: ${stats.exoplanets}`);
      console.log(`   Non-exoplanets: ${stats.nonExoplanets}`);
      console.log(`   Sample data:`, transformedData.slice(0, 2));
    } catch (error) {
      console.error(`❌ Failed to load ${dataset}:`, error.message);
    }
  }
  
  console.log('\n✨ API testing complete!');
};

// Export for manual testing
export default testNASAAPI;

// Uncomment to run automatically:
// testNASAAPI();

