# NASA Exoplanet Data Integration

This application now integrates with the **[NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/)** to fetch real exoplanet data for training your neural network!

## 🚀 Data Sources

Based on the [NASA Space Apps Challenge 2025](https://www.spaceappschallenge.org/2025/challenges/a-world-away-hunting-for-exoplanets-with-ai/?tab=resources), this app connects to:

### Available Datasets

1. **Kepler Mission** 🔭
   - Confirmed Kepler exoplanets (KOI - Kepler Objects of Interest)
   - Over 2,700 confirmed exoplanets
   - Features: orbital period, transit depth, stellar properties

2. **TESS Survey** 🛰️
   - TESS candidates (TOI - TESS Objects of Interest)
   - All-sky transit survey data
   - Recent discoveries from NASA's newest planet hunter

3. **All Confirmed Exoplanets** 🪐
   - Complete planetary systems database
   - 5,500+ confirmed exoplanets
   - All detection methods combined

4. **Radial Velocity** 📡
   - Exoplanets detected via Doppler spectroscopy
   - Measures stellar wobble caused by planets

5. **Microlensing** 🌌
   - Gravitational lensing detection method
   - Finds distant planets beyond traditional methods

## 📊 How to Use

1. **Select a Dataset**: Choose from Kepler, TESS, or other datasets in the DATA section
2. **Click "Load NASA Data"**: This fetches real exoplanet data from NASA's servers
3. **View Statistics**: See how many exoplanets were loaded
4. **Train Your Model**: Use the Play button to start neural network training on real data!

## 🔧 Technical Details

### API Endpoint
```
https://exoplanetarchive.ipac.caltech.edu/TAP/sync
```

### Available Features

The app can access these exoplanet properties:
- **Orbital Period** (days): How long it takes the planet to orbit its star
- **Transit Depth** (ppm): How much the star dims when planet passes
- **Stellar Radius** (R☉): Size of the host star
- **Stellar Mass** (M☉): Mass of the host star
- **Equilibrium Temperature** (K): Expected planet temperature
- **Signal-to-Noise Ratio**: Detection confidence

### Data Format

The API returns JSON data with fields like:
```json
{
  "pl_name": "Kepler-452 b",
  "pl_orbper": 384.843,
  "pl_trandep": 0.0045,
  "pl_rade": 1.63,
  "st_rad": 1.11,
  "st_mass": 1.04,
  "pl_eqt": 265,
  "discoverymethod": "Transit"
}
```

## 🎓 Educational Use

This integration is perfect for:
- Learning about real exoplanet detection methods
- Training ML models on authentic NASA data
- Exploring patterns in confirmed exoplanet discoveries
- Understanding how different detection methods affect data characteristics

## 📚 Resources

- [NASA Exoplanet Archive Documentation](https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html)
- [TAP Service Guide](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html)
- [NASA Space Apps Challenge](https://www.spaceappschallenge.org/2025/challenges/a-world-away-hunting-for-exoplanets-with-ai/)
- [Exoplanet Exploration](https://exoplanets.nasa.gov/)

## 🛠️ Implementation

The data integration is handled by `/src/services/exoplanetService.js`, which:
1. Constructs TAP queries based on dataset selection
2. Fetches data from NASA's API
3. Transforms data into normalized format for visualization
4. Provides statistics about the loaded dataset

## ⚠️ Notes

- The app fetches up to 200 data points per request to maintain performance
- Data is logarithmically scaled for better visualization
- CORS is enabled on NASA's API, so no proxy is needed
- Internet connection required to load real data
- Falls back to synthetic data if NASA API is unavailable

## 🌟 Next Steps

Consider enhancing the app with:
- Real-time training on NASA data
- Export trained model weights
- Compare model performance across different datasets
- Visualize specific exoplanet properties
- Filter by discovery year or detection method

