# AgriClime Sentinel - Data Architecture

**Last Updated:** 2025-11-06  
**Purpose:** Explain the hybrid data architecture and user experience flow

---

## 🎯 **Overview**

AgriClime Sentinel uses a **two-tier hybrid data architecture** that provides:

- ✅ **Fast map exploration** with sample data
- ✅ **Accurate county details** with real government APIs

This architecture ensures optimal user experience while maintaining data accuracy where it matters most.

---

## 🏗️ **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AgriClime Sentinel                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  TIER 1: MAP VIEW (Sample Data)                               │ │
│  │                                                                │ │
│  │  ┌──────────────┐         ┌──────────────────────┐           │ │
│  │  │  User Opens  │────────▶│  PostgreSQL Database │           │ │
│  │  │  Map Layer   │         │  (3,221 counties)    │           │ │
│  │  └──────────────┘         └──────────────────────┘           │ │
│  │                                     │                          │ │
│  │                                     ▼                          │ │
│  │                           ┌──────────────────┐                │ │
│  │                           │  Map Renders     │                │ │
│  │                           │  <1 second ✅    │                │ │
│  │                           └──────────────────┘                │ │
│  └────────────────────────────────┬───────────────────────────────┘ │
│                                   │                                 │
│                                   │ User Clicks County              │
│                                   ▼                                 │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  TIER 2: COUNTY DASHBOARD (Real Data)                         │ │
│  │                                                                │ │
│  │  ┌──────────────────┐                                         │ │
│  │  │  Dashboard Opens │                                         │ │
│  │  └────────┬─────────┘                                         │ │
│  │           │                                                    │ │
│  │           ├─────────▶ NOAA NWS API (Weather Alerts)          │ │
│  │           │                                                    │ │
│  │           ├─────────▶ NOAA HRRR API (Severe Weather)         │ │
│  │           │                                                    │ │
│  │           ├─────────▶ EPA AirNow API (Air Quality)           │ │
│  │           │                                                    │ │
│  │           └─────────▶ Open-Meteo API (Climate Trends)        │ │
│  │                                                                │ │
│  │                      ┌──────────────────┐                     │ │
│  │                      │  Dashboard Shows │                     │ │
│  │                      │  2-5 seconds ✅  │                     │ │
│  │                      └──────────────────┘                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 **Tier 1: Map View (Sample Data)**

### **What It Does**

- Displays 5 climate data layers across all 3,221 US counties
- Provides instant visualization of national climate patterns
- Enables fast exploration and comparison

### **Data Layers**

1. 🌧️ **Drought Status** - Drought severity index (D0-D4)
2. 💧 **30-Day Precipitation** - Total rainfall in last 30 days
3. 🌡️ **Temperature Anomaly** - Deviation from 5-year baseline
4. 🌱 **Soil Moisture** - Soil moisture levels (0-10cm depth)
5. 🌾 **Crop Risk** - Agricultural risk scores by crop type

### **Data Source**

- **PostgreSQL Database** (Supabase)
- **Materialized Views:** `current_drought_status`, `precipitation_30day`
- **Tables:** `climate_data`, `crop_risk_indices`

### **Data Generation**

- Algorithmically generated using realistic climate patterns
- Based on NOAA regional climate trends and warming rates
- Populated via scripts: `populate-sample-data.ts`, `populate-crop-risk-data.ts`

### **Performance**

- **Load Time:** <1 second for all 3,221 counties
- **Cache Duration:** 6 hours (in-memory cache)
- **User Experience:** Instant, smooth, responsive

### **Why Sample Data?**

| Metric              | Real-Time API                            | Sample Data              |
| ------------------- | ---------------------------------------- | ------------------------ |
| **Load Time**       | 65-90 seconds ❌                         | <1 second ✅             |
| **API Calls**       | 16,105 calls (5 layers × 3,221 counties) | 0 calls                  |
| **Rate Limits**     | Exceeds 10,000/day limit ❌              | No limits ✅             |
| **Browser Timeout** | 30-60 seconds ❌                         | Never times out ✅       |
| **User Experience** | Frustrating wait ❌                      | Instant visualization ✅ |

**Conclusion:** Sample data is the **only viable option** for map layers.

---

## 🌐 **Tier 2: County Dashboard (Real Data)**

### **What It Does**

- Opens when user clicks on any county
- Fetches real-time data from government APIs
- Provides accurate, up-to-date information for decision-making

### **Dashboard Features**

#### 1. ⚡ **Weather Alerts** (NOAA NWS API)

- **API:** `https://api.weather.gov/alerts/active`
- **Data:** Active weather warnings, watches, advisories
- **Status:** ✅ Real data
- **API Key:** Not required

#### 2. 🌪️ **Severe Weather** (NOAA HRRR Model)

- **API:** `https://mesonet.agron.iastate.edu/api/1/sounding.json`
- **Data:** Atmospheric sounding, severe weather indices (CAPE, SRH, etc.)
- **Status:** ⚠️ Real data with fallback
- **API Key:** Not required

#### 3. 💨 **Air Quality** (EPA AirNow API)

- **API:** `https://www.airnowapi.org/aq/observation/latLong/current/`
- **Data:** Real-time AQI for O3, PM2.5, PM10, NO2, SO2, CO
- **Status:** ✅ Real data
- **API Key:** Required (configured in `.env`)

#### 4. 📈 **Climate Trends** (Open-Meteo Archive API)

- **API:** `https://archive-api.open-meteo.com/v1/archive`
- **Data:** 55 years of historical temperature data (1970-2025)
- **Analysis:** Linear regression, Mann-Kendall test, change point detection
- **Status:** ✅ Real data
- **API Key:** Not required

### **Performance**

- **Load Time:** 2-5 seconds per county
- **API Calls:** 4 calls per county (parallel execution)
- **Cache Duration:** Varies by feature (1-24 hours)
- **User Experience:** Acceptable wait for accurate data

### **Why Real Data?**

| Metric              | Sample Data     | Real-Time API          |
| ------------------- | --------------- | ---------------------- |
| **Accuracy**        | Approximate ❌  | Government-verified ✅ |
| **Timeliness**      | Static ❌       | Real-time ✅           |
| **Trust**           | Low ❌          | High ✅                |
| **Decision-Making** | Not reliable ❌ | Reliable ✅            |
| **Load Time**       | Instant ✅      | 2-5 seconds ✅         |

**Conclusion:** Real data is **essential** for county-level details.

---

## 🔄 **User Flow**

### **Step-by-Step Experience**

```
1. User Opens Application
   ↓
2. Map Loads with Default Layer (Drought Status)
   ├─ PostgreSQL query executed
   ├─ 3,221 counties loaded
   └─ Map renders in <1 second ✅

3. User Selects Different Layer (e.g., Precipitation)
   ├─ In-memory cache checked
   ├─ If cached: Instant load
   └─ If not cached: PostgreSQL query → <1 second ✅

4. User Explores Map
   ├─ Pans across US
   ├─ Zooms in/out
   └─ Smooth, responsive interaction ✅

5. User Clicks on County (e.g., Los Angeles County, CA)
   ↓
6. Atmospheric Science Dashboard Opens
   ├─ Loading indicator shown
   ├─ 4 parallel API calls initiated:
   │   ├─ NOAA NWS (Weather Alerts)
   │   ├─ NOAA HRRR (Severe Weather)
   │   ├─ EPA AirNow (Air Quality)
   │   └─ Open-Meteo (Climate Trends)
   └─ Dashboard renders in 2-5 seconds ✅

7. User Views Real Data
   ├─ Weather Alerts: 2 active alerts
   ├─ Severe Weather: CAPE 1,200 J/kg, SRH 150 m²/s²
   ├─ Air Quality: AQI 55 (Moderate), PM2.5 dominant
   └─ Climate Trends: +0.8°C warming trend (significant)

8. User Makes Informed Decision
   └─ Based on accurate, real-time government data ✅
```

---

## 📈 **Performance Metrics**

### **Map View (Sample Data)**

- **Initial Load:** <1 second
- **Layer Switch:** <1 second (cached) or <1 second (database query)
- **Pan/Zoom:** Instant (client-side rendering)
- **Memory Usage:** ~50MB (3,221 counties in memory)

### **County Dashboard (Real Data)**

- **Initial Load:** 2-5 seconds (4 parallel API calls)
- **Tab Switch:** Instant (data already loaded)
- **Refresh:** 2-5 seconds (re-fetches from APIs)
- **Memory Usage:** ~5MB per county

---

## 🎯 **Design Decisions**

### **Why Not Real Data for Map Layers?**

**Attempted Implementation:**

- Tried fetching real-time data from Open-Meteo API for all counties
- Result: 65-90 second load times, browser timeouts, exceeded rate limits
- Conclusion: Not viable for production

**See:** `REAL_DATA_IMPLEMENTATION.md` for details on the failed attempt

### **Why Not Sample Data for County Dashboard?**

**User Needs:**

- Farmers, researchers, and decision-makers need **accurate** data
- Sample data is not reliable for critical decisions
- Real government data builds trust and credibility

### **Future Enhancements**

See `docs/REAL_DATA_SOURCES.md` for three potential solutions:

1. **Scheduled Background Jobs** - Fetch and cache real data hourly/daily
2. **Hybrid Approach** - Show cached data with freshness indicators
3. **Progressive Loading** - Load map immediately, update with real data

---

## 🔗 **Related Documentation**

- **`DATA_SOURCE_AUDIT.md`** - Complete audit of all data sources
- **`docs/REAL_DATA_SOURCES.md`** - Data source documentation
- **`REAL_DATA_IMPLEMENTATION.md`** - Failed real-time implementation attempt
- **`scripts/populate-sample-data.ts`** - Sample data generation script

---

## 📝 **Summary**

### **The Perfect Balance**

| Component            | Data Type | Performance  | Accuracy       | User Experience        |
| -------------------- | --------- | ------------ | -------------- | ---------------------- |
| **Map Layers**       | Sample    | ✅ Excellent | ⚠️ Approximate | ✅ Instant exploration |
| **County Dashboard** | Real      | ✅ Good      | ✅ Verified    | ✅ Accurate details    |

### **Key Takeaways**

1. ✅ **Map layers use sample data** for instant visualization of 3,221 counties
2. ✅ **County dashboard uses real APIs** for accurate, government-verified data
3. ✅ **Users get the best of both worlds:** fast exploration + accurate details
4. ✅ **This architecture is production-ready** and optimized for user experience

---

**Last Updated:** January 6, 2025
**Status:** Production-ready ✅
