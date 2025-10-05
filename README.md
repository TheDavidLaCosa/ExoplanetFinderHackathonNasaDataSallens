# 🚀 NASA Exoplanet Neural Network Playground

**A World Away: Hunting for Exoplanets with AI**

An interactive web application that trains neural networks on real NASA exoplanet data to classify exoplanet candidates. Built for the [NASA Space Apps Challenge 2025](https://www.spaceappschallenge.org/2025/challenges/a-world-away-hunting-for-exoplanets-with-ai/).

---

## 🌟 Team: DataSallens

- **Uzziel Perez** - [Github profile](https://github.com/uzzielperez)
- **Manel Cerezo** - [Github profile](https://github.com/MCerezoSalle)
- **David Larrosa Camps** - [Github profile](https://github.com/TheDavidLaCosa)
- **Carlos Sneyder Murillo Maza** - [Github profile](https://github.com/sneymz00)
- **Meritxell Cordón Domínguez** - [Github profile](https://github.com/MertixellCD)

---

## 📋 Summary

Data from several different space-based exoplanet surveying missions have enabled discovery of thousands of new planets outside our solar system, but most of these exoplanets were identified manually. With advances in artificial intelligence and machine learning (AI/ML), it is possible to automatically analyze large sets of data collected by these missions to identify exoplanets.

This project creates an AI/ML model that is trained on NASA's open-source exoplanet datasets and can analyze new data to accurately identify exoplanets through an interactive web interface.

---

## ✨ Features

- 🛰️ **Real NASA Data Integration** - Fetches live data from NASA Exoplanet Archive
- 🧠 **Neural Network Training** - Real-time interactive neural network visualization
- 📊 **Multiple Datasets** - Support for Kepler, TESS, and all confirmed exoplanets
- 🎨 **Beautiful UI** - Modern, responsive interface built with React and Tailwind CSS
- 🔍 **Data Verification** - Built-in verification panel to confirm real NASA data
- 📈 **Live Statistics** - Real-time training loss and dataset statistics
- 🎛️ **Hyperparameter Tuning** - Adjust learning rate, activation functions, regularization
- 🏗️ **Custom Architecture** - Add/remove layers and neurons interactively

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:TheDavidLaCosa/ExoplanetFinderHackathonNasaDataSallens.git
   cd ExoplanetFinderHackathonNasaDataSallens
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage

1. **Select a Dataset** - Choose from Kepler, TESS, or All Confirmed exoplanets
2. **Load NASA Data** - Click the "Load NASA Data" button to fetch real exoplanet data
3. **Configure Network** - Adjust layers, neurons, learning rate, and activation functions
4. **Train the Model** - Click Play to start training and watch the loss decrease
5. **Verify Data** - Check the verification panel at the bottom to confirm real NASA data

---

## 🎯 Objectives Met

✅ **AI/ML Model** - Interactive neural network trained on NASA data  
✅ **Multiple Datasets** - Kepler, TESS, and all confirmed exoplanets  
✅ **Web Interface** - User-friendly React application  
✅ **Real-time Training** - Live visualization of training progress  
✅ **Data Verification** - Confirms authenticity of NASA data  
✅ **Hyperparameter Tuning** - Adjustable learning rate, activation, regularization  
✅ **Custom Architecture** - Dynamic layer and neuron configuration  
✅ **Statistics Display** - Real-time accuracy and loss metrics  

---

## 📊 Datasets

Our application supports multiple NASA exoplanet datasets:

| Dataset | Source | Description | Count |
|---------|--------|-------------|-------|
| 🔭 **Kepler** | NASA Kepler Mission | Confirmed Kepler exoplanets (KOI) | ~2,700 |
| 🛰️ **TESS** | TESS Survey | Transit Exoplanet Survey Satellite discoveries | ~400 |
| 🪐 **All Confirmed** | NASA Exoplanet Archive | All confirmed exoplanets | ~5,500 |
| 📡 **Radial Velocity** | Various | Doppler spectroscopy detections | ~900 |
| 🌌 **Microlensing** | Various | Gravitational lensing events | ~200 |

**Data Source:** [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/)

---

## 🛠️ Technology Stack

- **Frontend:** React 18
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Data Visualization:** HTML5 Canvas
- **API:** NASA Exoplanet Archive (NStED API)
- **Build Tool:** Create React App

---

## 📚 Documentation

Comprehensive documentation is available in the repository:

- **[QUICK_START.md](QUICK_START.md)** - Fast setup guide
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Complete feature documentation
- **[HOW_TO_VERIFY_NASA_DATA.md](HOW_TO_VERIFY_NASA_DATA.md)** - Data verification guide
- **[NASA_DATA_INTEGRATION.md](NASA_DATA_INTEGRATION.md)** - API integration details
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[CORS_FIX_APPLIED.md](CORS_FIX_APPLIED.md)** - CORS issue resolution

---

## 🔍 Verifying Real NASA Data

The application includes a built-in verification system:

1. **Visual Indicator:** Green checkmark (✅) shows "Real NASA Data"
2. **Console Logging:** Detailed API requests and responses in browser console (F12)
3. **Data Inspector:** Click "Show Details" to view individual exoplanet properties
4. **Statistics Panel:** Real-time dataset statistics

---

## 🧪 Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

---

## 🎨 Features in Detail

### Neural Network Architecture
- **Input Layer:** Configurable features (orbital period, transit depth, stellar properties)
- **Hidden Layers:** 1-6 layers with 1-8 neurons each
- **Output Layer:** Binary classification (exoplanet vs non-exoplanet)
- **Activation Functions:** ReLU, Tanh, Sigmoid, Linear
- **Regularization:** None, L1, L2

### Data Processing
- **Normalization:** Log-scale transformation for better visualization
- **Filtering:** Dataset-specific filtering (confirmed, candidates, etc.)
- **Train/Test Split:** Adjustable ratio (10%-90%)
- **Noise Addition:** Configurable noise for robustness testing

### Visualization
- **Decision Boundary:** 2D visualization of classification regions
- **Network Diagram:** Real-time network architecture display
- **Training Progress:** Live loss curves and epoch tracking
- **Data Points:** Color-coded exoplanet/non-exoplanet markers

---

## 🌐 API Integration

The application uses NASA's Exoplanet Archive API:

```
Base URL: https://exoplanetarchive.ipac.caltech.edu/cgi-bin/nstedAPI/nph-nstedAPI
```

**Example Query:**
```
?table=cumulative&format=json&select=kepoi_name,koi_period,koi_depth,koi_disposition
```

**Tables Used:**
- `cumulative` - Kepler Objects of Interest
- `ps` - Planetary Systems (all confirmed exoplanets)

---

## 🤝 Contributing

This project was created for the NASA Space Apps Challenge 2025. Contributions, issues, and feature requests are welcome!

---

## 📝 License

This project is created for educational purposes as part of the NASA Space Apps Challenge.

---

## 🙏 Acknowledgments

- **NASA Exoplanet Archive** for providing open-source exoplanet data
- **NASA Space Apps Challenge** for the inspiration and challenge
- **Kepler, TESS, and all exoplanet missions** for the incredible data

---

## 📞 Resources

- [NASA Space Apps Challenge](https://www.spaceappschallenge.org/2025/challenges/a-world-away-hunting-for-exoplanets-with-ai/)
- [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/)
- [NASA Exoplanet Exploration](https://exoplanets.nasa.gov/)
- [Challenge Resources](https://www.spaceappschallenge.org/2025/challenges/a-world-away-hunting-for-exoplanets-with-ai/?tab=resources)

---

**Built with ❤️ for the NASA Space Apps Challenge 2025** 🚀🪐
