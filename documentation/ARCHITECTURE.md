# 🏗️ Application Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│                   (localhost:3000)                           │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌────────────────┐  ┌──────────────┐
│   App.js      │  │ exoplanetSer-  │  │  Tailwind    │
│  (Main UI)    │  │  vice.js       │  │    CSS       │
│               │  │  (Data Layer)  │  │  (Styling)   │
└───────────────┘  └────────────────┘  └──────────────┘
        │                   │
        │                   │
        │                   ▼
        │          ┌─────────────────────────────┐
        │          │   NASA Exoplanet Archive    │
        │          │   API (TAP Service)         │
        │          │   exoplanetarchive.ipac...  │
        │          └─────────────────────────────┘
        │                   │
        │                   ▼
        │          ┌─────────────────────────────┐
        │          │   Real Exoplanet Data       │
        │          │   - Kepler (2,700+)         │
        │          │   - TESS (latest)           │
        │          │   - All Confirmed (5,500+)  │
        │          └─────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────┐
│              User Interface Components              │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Control   │  │    Data      │  │ Features │ │
│  │   Panel     │  │  Selection   │  │ Selection│ │
│  └─────────────┘  └──────────────┘  └──────────┘ │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Neural    │  │    Network   │  │  Output  │ │
│  │   Network   │  │  Visualiza-  │  │  Canvas  │ │
│  │   Canvas    │  │    tion      │  │          │ │
│  └─────────────┘  └──────────────┘  └──────────┘ │
└────────────────────────────────────────────────────┘
```

## Data Flow

```
User Action → Dataset Selection → Click "Load NASA Data"
                                          │
                                          ▼
                            exoplanetService.fetchExoplanetData()
                                          │
                                          ▼
                            Construct TAP Query (SQL-like)
                                          │
                                          ▼
                         HTTP GET to NASA Exoplanet Archive
                                          │
                                          ▼
                              Receive JSON Response
                                          │
                                          ▼
                            transformExoplanetData()
                            - Normalize coordinates
                            - Log scale values
                            - Map to visualization space
                                          │
                                          ▼
                              Update React State
                            - setData(transformedData)
                            - setDataStats(stats)
                                          │
                                          ▼
                              Render Visualization
                            - Canvas draws data points
                            - Neural network updates
                            - Statistics display
```

## File Structure

```
/Users/uzzielperez/Desktop/NASA/exoplanet-playground/
│
├── public/
│   └── index.html                 # HTML template (with Tailwind CDN)
│
├── src/
│   ├── App.js                     # Main application component
│   │                              # - UI layout & controls
│   │                              # - Neural network logic
│   │                              # - Canvas visualizations
│   │
│   ├── services/
│   │   ├── exoplanetService.js   # NASA API integration
│   │   │                          # - fetchExoplanetData()
│   │   │                          # - transformExoplanetData()
│   │   │                          # - getDatasetStats()
│   │   │                          # - filterByFeatures()
│   │   │
│   │   └── testAPI.js            # API testing utilities
│   │
│   └── index.js                   # React entry point
│
├── package.json                   # Dependencies
├── QUICK_START.md                # Quick reference
├── SETUP_COMPLETE.md             # Full documentation
├── NASA_DATA_INTEGRATION.md      # API details
└── ARCHITECTURE.md               # This file
```

## Component Hierarchy

```
<ExoplanetPlayground>
  │
  ├── Header Section
  │   └── Title & Description
  │
  ├── Control Panel
  │   ├── Reset Button
  │   ├── Play/Pause Button
  │   ├── Epoch Display
  │   ├── Learning Rate Selector
  │   ├── Activation Function Selector
  │   ├── Regularization Controls
  │   └── Problem Type Selector
  │
  └── Main Grid (3 columns)
      │
      ├── Left Column: DATA
      │   ├── Dataset Radio Buttons
      │   │   ├── Kepler
      │   │   ├── TESS
      │   │   ├── All Confirmed
      │   │   ├── Radial Velocity
      │   │   └── Microlensing
      │   ├── Load NASA Data Button
      │   ├── Dataset Statistics Display
      │   ├── Train/Test Ratio Slider
      │   ├── Noise Slider
      │   ├── Batch Size Slider
      │   └── Regenerate Button
      │
      ├── Middle Column: FEATURES
      │   ├── Feature Checkboxes
      │   │   ├── Orbital Period
      │   │   ├── Transit Depth
      │   │   ├── Stellar Radius
      │   │   ├── Stellar Mass
      │   │   ├── Equilibrium Temp
      │   │   └── Signal-to-Noise
      │   └── Feature Icons
      │
      └── Right Column: OUTPUT
          ├── Loss Display
          │   ├── Test Loss
          │   └── Training Loss
          ├── Decision Boundary Canvas
          ├── Show Test Data Checkbox
          ├── Discretize Output Checkbox
          └── Color Scale Legend
```

## State Management

```javascript
// Training State
- epoch: number                 // Current training epoch
- isTraining: boolean          // Training in progress
- trainLoss: number            // Training loss value
- testLoss: number             // Test loss value

// Model Configuration
- learningRate: number         // 0.00001 to 10
- activation: string           // relu, tanh, sigmoid, linear
- regularization: string       // none, L1, L2
- regularizationRate: number   // 0 to 1
- batchSize: number           // 1 to 30
- hiddenLayers: array         // [4, 2] neurons per layer

// Data State
- selectedDataset: string      // kepler, tess, ps, etc.
- data: array                  // Current dataset
- isLoadingData: boolean       // Loading from NASA API
- dataStats: object           // Dataset statistics
- trainTestRatio: number       // 10 to 90
- noise: number               // 0 to 50

// Feature Selection
- selectedFeatures: object     // Boolean flags per feature
  - orbitalPeriod: boolean
  - transitDepth: boolean
  - stellarRadius: boolean
  - stellarMass: boolean
  - equilibriumTemp: boolean
  - signalToNoise: boolean

// Visualization
- showTestData: boolean
- discretizeOutput: boolean
```

## API Integration

### NASA Exoplanet Archive TAP Service

**Base URL:**
```
https://exoplanetarchive.ipac.caltech.edu/TAP/sync
```

**Query Format:**
```
?query=SELECT+columns+FROM+table+WHERE+condition&format=json
```

**Available Tables:**
- `koi` - Kepler Objects of Interest
- `toi` - TESS Objects of Interest  
- `ps` - Planetary Systems (all confirmed)

**Example Query:**
```sql
SELECT TOP 200 
  pl_name, pl_orbper, pl_trandep, 
  pl_rade, st_rad, st_mass, pl_eqt 
FROM ps 
WHERE default_flag=1
```

## Canvas Rendering

### Decision Boundary Canvas
1. Clear canvas
2. Draw grid lines
3. Generate heatmap background
4. Plot data points (colored by label)
5. Update on each epoch

### Neural Network Canvas
1. Calculate layer positions
2. Draw connections between layers
3. Draw nodes (colored by type)
   - Orange: Input layer
   - Blue: Hidden layers
   - Green: Output layer
4. Update when architecture changes

## Performance Optimizations

- **Lazy Loading**: Data fetched only when requested
- **Memoization**: Canvas only redraws when data changes
- **Throttled Updates**: Training visualization updates every 50ms
- **Limited Data**: Fetch only 200 points for performance
- **Normalized Coordinates**: Log scale for better visualization

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 |
| Styling | Tailwind CSS (CDN) |
| Icons | Lucide React |
| Data Visualization | HTML5 Canvas |
| API | REST (NASA TAP) |
| Data Format | JSON |
| Build Tool | Create React App |

## Security & CORS

- NASA API supports CORS (Cross-Origin Resource Sharing)
- No authentication required
- Public API for educational use
- Rate limits apply (reasonable use)

## Future Enhancements

Potential additions to the architecture:
- [ ] WebWorkers for ML training
- [ ] TensorFlow.js integration
- [ ] Backend proxy server for caching
- [ ] Redis for API response caching
- [ ] GraphQL API layer
- [ ] WebSocket for real-time updates
- [ ] Progressive Web App (PWA)
- [ ] Server-Side Rendering (SSR)

---

**Built for NASA Space Apps Challenge 2025** 🚀

