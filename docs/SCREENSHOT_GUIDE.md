# Screenshot Guide for README

This guide explains how to add screenshots to the README.md file.

---

## 📸 Required Screenshots

### 1. **Interactive Map View**

**What to capture:**
- Full map view showing all US counties
- One of the data layers selected (e.g., Drought Status or Precipitation)
- Legend visible on the right side
- Layer selector visible at the top

**How to capture:**
1. Open the application at http://localhost:3000 or the live demo
2. Select a data layer (e.g., "Drought Status")
3. Zoom out to show the entire US
4. Take a full-screen screenshot
5. Save as `screenshots/map-view.png`

**Add to README:**
```markdown
### Interactive Map View
![Interactive Map View](screenshots/map-view.png)
*Interactive map showing 3,221 US counties with climate data layers*
```

---

### 2. **Atmospheric Science Dashboard - Overview**

**What to capture:**
- Dashboard with all 4 tabs visible
- One county selected (e.g., Los Angeles County, CA)
- Show the "Weather Alerts" tab active
- Include the county name and coordinates at the top

**How to capture:**
1. Click on any county on the map
2. Wait for the dashboard to load
3. Make sure "Weather Alerts" tab is selected
4. Take a screenshot of the entire dashboard
5. Save as `screenshots/dashboard-overview.png`

**Add to README:**
```markdown
### Atmospheric Science Dashboard
![Atmospheric Science Dashboard](screenshots/dashboard-overview.png)
*Real-time weather alerts, severe weather indices, air quality, and climate trends*
```

---

### 3. **Climate Trends Analysis**

**What to capture:**
- Dashboard with "Climate Trends" tab selected
- Show the temperature trend chart
- Include the trend statistics (direction, rate, significance)
- Show the interpretation text

**How to capture:**
1. Click on any county on the map
2. Wait for the dashboard to load
3. Click on the "Climate Trends" tab
4. Wait for the chart to render
5. Take a screenshot of the entire dashboard
6. Save as `screenshots/climate-trends.png`

**Add to README:**
```markdown
### Climate Trends Analysis
![Climate Trends Analysis](screenshots/climate-trends.png)
*55 years of historical temperature data with statistical analysis*
```

---

### 4. **Air Quality Tab** (Optional)

**What to capture:**
- Dashboard with "Air Quality" tab selected
- Show the AQI value and category
- Include individual pollutant readings
- Show the health recommendations

**How to capture:**
1. Click on a county with air quality data (e.g., Los Angeles, CA)
2. Click on the "Air Quality" tab
3. Take a screenshot
4. Save as `screenshots/air-quality.png`

**Add to README:**
```markdown
### Air Quality Monitoring
![Air Quality](screenshots/air-quality.png)
*Real-time EPA AirNow data with AQI and pollutant levels*
```

---

### 5. **Severe Weather Tab** (Optional)

**What to capture:**
- Dashboard with "Severe Weather" tab selected
- Show the atmospheric sounding chart
- Include the severe weather indices (CAPE, SRH, etc.)

**How to capture:**
1. Click on any county
2. Click on the "Severe Weather" tab
3. Take a screenshot
4. Save as `screenshots/severe-weather.png`

**Add to README:**
```markdown
### Severe Weather Indices
![Severe Weather](screenshots/severe-weather.png)
*NOAA HRRR model data with CAPE, wind shear, and tornado parameters*
```

---

## 📁 Directory Structure

Create a `screenshots/` directory in the root of the project:

```
AgriClime-Sentinel/
├── screenshots/
│   ├── map-view.png
│   ├── dashboard-overview.png
│   ├── climate-trends.png
│   ├── air-quality.png (optional)
│   └── severe-weather.png (optional)
├── README.md
└── ...
```

---

## 🎨 Screenshot Best Practices

### Resolution
- **Minimum:** 1920x1080 (Full HD)
- **Recommended:** 2560x1440 (2K) or higher
- Use high-DPI displays if available

### Format
- **Format:** PNG (for better quality)
- **Compression:** Use tools like TinyPNG to reduce file size
- **Max Size:** Keep under 500KB per image

### Content
- **Clean UI:** No browser dev tools, no personal information
- **Good Data:** Select counties with interesting data (e.g., active alerts, high AQI)
- **Full Context:** Include legends, labels, and UI elements
- **Consistent Theme:** Use the same browser and zoom level

### Timing
- **Wait for Loading:** Ensure all data has loaded before capturing
- **No Loading Spinners:** Wait for charts and data to fully render
- **Stable State:** Don't capture during animations or transitions

---

## 🔧 Tools for Screenshots

### macOS
- **Built-in:** Cmd + Shift + 4 (select area) or Cmd + Shift + 3 (full screen)
- **Preview:** For cropping and editing

### Windows
- **Built-in:** Windows + Shift + S (Snipping Tool)
- **Snagit:** Professional screenshot tool

### Linux
- **GNOME:** Shift + PrtScn (select area)
- **Flameshot:** Advanced screenshot tool

### Browser Extensions
- **Awesome Screenshot:** Chrome/Firefox extension
- **Nimbus Screenshot:** Full page screenshots

---

## ✅ Checklist

Before adding screenshots to README:

- [ ] Created `screenshots/` directory
- [ ] Captured map view with data layer selected
- [ ] Captured dashboard overview with Weather Alerts tab
- [ ] Captured Climate Trends tab with chart
- [ ] (Optional) Captured Air Quality tab
- [ ] (Optional) Captured Severe Weather tab
- [ ] All images are PNG format
- [ ] All images are under 500KB
- [ ] All images are at least 1920x1080
- [ ] No personal information visible
- [ ] No browser dev tools visible
- [ ] All data has finished loading
- [ ] Updated README.md with image paths

---

## 📝 Example README Section

Here's how the screenshots section should look in README.md:

```markdown
## 📸 Screenshots

### Interactive Map View
![Interactive Map View](screenshots/map-view.png)
*Interactive map showing 3,221 US counties with climate data layers*

### Atmospheric Science Dashboard
![Atmospheric Science Dashboard](screenshots/dashboard-overview.png)
*Real-time weather alerts, severe weather indices, air quality, and climate trends*

### Climate Trends Analysis
![Climate Trends Analysis](screenshots/climate-trends.png)
*55 years of historical temperature data with statistical analysis*

### Air Quality Monitoring
![Air Quality](screenshots/air-quality.png)
*Real-time EPA AirNow data with AQI and pollutant levels*

### Severe Weather Indices
![Severe Weather](screenshots/severe-weather.png)
*NOAA HRRR model data with CAPE, wind shear, and tornado parameters*
```

---

## 🚀 Next Steps

1. Create the `screenshots/` directory
2. Take the required screenshots following this guide
3. Optimize images (compress to <500KB)
4. Update README.md with the actual image paths
5. Commit and push to GitHub
6. Verify images display correctly on GitHub

---

**Note:** GitHub automatically renders images in README.md files. Make sure to use relative paths (e.g., `screenshots/map-view.png`) so they work both locally and on GitHub.

