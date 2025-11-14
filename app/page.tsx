"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Menu, X } from "lucide-react";
import { MapDataLayer, CropType } from "@/types";
import { getDashboardConfigForLayer } from "@/lib/utils/layer-dashboard-mapping";
import LayerSelector from "@/components/Map/LayerSelector";
import MapLegend from "@/components/Map/MapLegend";
import CountySearch from "@/components/Search/CountySearch";
import L from "leaflet";

// Dynamically import map component to avoid SSR issues with Leaflet
const CountyMap = dynamic(() => import("@/components/Map/CountyMap"), {
  ssr: false,
});

const RegionalDashboard = dynamic(
  () => import("@/components/Dashboard/RegionalDashboard"),
  { ssr: false }
);

const AtmosphericScienceDashboard = dynamic(
  () => import("@/components/Dashboard/AtmosphericScienceDashboard"),
  { ssr: false }
);

const ComparisonDashboard = dynamic(
  () => import("@/components/Comparison/ComparisonDashboard"),
  { ssr: false }
);

const MultiCountySelector = dynamic(
  () => import("@/components/Comparison/MultiCountySelector"),
  { ssr: false }
);

const TimeSlider = dynamic(
  () => import("@/components/Map/TimeSlider"),
  { ssr: false }
);

const RadarOverlay = dynamic(
  () => import("@/components/Map/RadarOverlay"),
  { ssr: false }
);

interface SelectedCountyData {
  fips: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

export default function Home() {
  const [selectedLayer, setSelectedLayer] = useState<MapDataLayer>("drought");
  const [selectedCrop, setSelectedCrop] = useState<CropType>("corn");
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedCountyData, setSelectedCountyData] =
    useState<SelectedCountyData | null>(null);
  const [dashboardType, setDashboardType] = useState<
    "agricultural" | "atmospheric"
  >("atmospheric");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Comparison mode state
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [selectedCountiesForComparison, setSelectedCountiesForComparison] = useState<SelectedCountyData[]>([]);
  const [showComparisonDashboard, setShowComparisonDashboard] = useState(false);

  // Use ref to track latest comparison mode state for event handlers
  const isComparisonModeRef = useRef(isComparisonMode);
  const selectedCountiesRef = useRef(selectedCountiesForComparison);

  // Keep refs in sync with state
  useEffect(() => {
    isComparisonModeRef.current = isComparisonMode;
    console.log("🔄 Comparison mode ref updated:", isComparisonMode);
  }, [isComparisonMode]);

  useEffect(() => {
    selectedCountiesRef.current = selectedCountiesForComparison;
  }, [selectedCountiesForComparison]);

  // Auto-update dashboard type when layer changes (if no county is selected)
  useEffect(() => {
    if (!selectedCounty) {
      const layerConfig = getDashboardConfigForLayer(selectedLayer);
      console.log("🔄 Layer changed to:", selectedLayer, "→ Setting default dashboard type to:", layerConfig.dashboardType);
      setDashboardType(layerConfig.dashboardType);
    }
  }, [selectedLayer, selectedCounty]);

  // Historical playback state
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isPlaying, setIsPlaying] = useState(false);

  // Radar overlay state
  const [radarEnabled, setRadarEnabled] = useState(false);
  const [radarOpacity, setRadarOpacity] = useState(0.6);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  /**
   * Handle county click with optimized single-county fetch
   *
   * Performance optimization:
   * - Before: Fetched all 3,221 counties (30+ seconds)
   * - After: Fetches only the clicked county (<100ms)
   * - 99.7% faster response time
   *
   * Smart Dashboard Opening (Option 2):
   * - Automatically sets dashboard type based on selected map layer
   * - Opens to the relevant tab/section for the selected layer
   */
  const handleCountyClick = useCallback(async (fips: string) => {
    // Use ref to get the latest state value
    const currentComparisonMode = isComparisonModeRef.current;
    const currentSelectedCounties = selectedCountiesRef.current;

    console.log("🗺️ County clicked:", fips, "Comparison mode (ref):", currentComparisonMode);

    // Get dashboard configuration for the selected layer
    const layerConfig = getDashboardConfigForLayer(selectedLayer);
    console.log("📊 Auto-setting dashboard type to:", layerConfig.dashboardType, "for layer:", selectedLayer);

    // Fetch only the clicked county (fast, <100ms)
    try {
      const response = await fetch(`/api/counties?fips=${fips}`);

      if (!response.ok) {
        throw new Error("County not found");
      }

      const county = await response.json();

      // Use pre-calculated centroid from API
      const latitude = county.centroid?.latitude || 39.8283; // Default: center of US
      const longitude = county.centroid?.longitude || -98.5795;

      const countyData = {
        fips,
        name: county.name,
        state: county.state,
        latitude,
        longitude,
      };

      // If in comparison mode, add to comparison list
      if (currentComparisonMode) {
        console.log("📊 Adding to comparison:", countyData.name, countyData.state);

        // Check if already selected
        if (currentSelectedCounties.some(c => c.fips === fips)) {
          console.log("⚠️ County already selected");
          return; // Already selected
        }

        // Check max limit (5 counties)
        if (currentSelectedCounties.length >= 5) {
          alert("Maximum 5 counties can be compared at once");
          return;
        }

        setSelectedCountiesForComparison(prev => {
          const updated = [...prev, countyData];
          console.log("✅ Updated comparison list:", updated);
          return updated;
        });
      } else {
        // Normal single-county mode
        console.log("📍 Opening dashboard for:", countyData.name, countyData.state);

        // Auto-set dashboard type based on selected layer
        setDashboardType(layerConfig.dashboardType);

        setSelectedCountyData(countyData);
        setTimeout(() => {
          setSelectedCounty(fips);
        }, 150);
      }
    } catch (error) {
      console.error("Error fetching county data:", error);
      // Use default location on error
      const countyData = {
        fips,
        name: "Unknown",
        state: "Unknown",
        latitude: 39.8283,
        longitude: -98.5795,
      };

      if (currentComparisonMode) {
        if (!currentSelectedCounties.some(c => c.fips === fips) && currentSelectedCounties.length < 5) {
          setSelectedCountiesForComparison(prev => [...prev, countyData]);
        }
      } else {
        // Auto-set dashboard type even on error
        setDashboardType(layerConfig.dashboardType);

        setSelectedCountyData(countyData);
        setTimeout(() => {
          setSelectedCounty(fips);
        }, 150);
      }
    }
  }, [selectedLayer]);

  const handleCloseDashboard = () => {
    setSelectedCounty(null);
    setSelectedCountyData(null);
  };

  const handleRemoveCountyFromComparison = (fips: string) => {
    setSelectedCountiesForComparison(prev => prev.filter(c => c.fips !== fips));
  };

  const handleToggleComparisonMode = () => {
    const newMode = !isComparisonMode;
    console.log("🔄 Toggling comparison mode:", newMode ? "ON" : "OFF");
    setIsComparisonMode(newMode);
    if (isComparisonMode) {
      // Exiting comparison mode - clear selections
      console.log("🧹 Clearing comparison selections");
      setSelectedCountiesForComparison([]);
      setShowComparisonDashboard(false);
    }
  };

  const handleShowComparison = () => {
    if (selectedCountiesForComparison.length < 2) {
      alert("Please select at least 2 counties to compare");
      return;
    }
    setShowComparisonDashboard(true);
  };

  const handleCloseComparison = () => {
    setShowComparisonDashboard(false);
  };

  const handleToggleHistoricalMode = () => {
    setIsHistoricalMode(!isHistoricalMode);
    if (!isHistoricalMode) {
      setSelectedYear(new Date().getFullYear());
      setIsPlaying(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    console.log(`Historical Playback: Year ${year}`);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header
        className={`bg-gradient-to-r from-green-700 to-blue-700 text-white p-3 sm:p-4 md:p-6 shadow-lg overflow-visible transition-all duration-300 ${
          isMobileSidebarOpen ? 'md:blur-0 blur-sm brightness-50' : ''
        }`}
      >
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-3 sm:gap-4 lg:gap-6">
            <div className="text-center lg:text-left flex-shrink-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                AgriClime Sentinel
              </h1>
              <p className="text-xs sm:text-sm mt-1 opacity-90">
                Advanced Atmospheric Science & Agricultural Climate Risk
                Platform
              </p>
            </div>

            {/* Dashboard Type Selector */}
            <div className="flex flex-col gap-2 sm:gap-3 w-full lg:max-w-2xl flex-shrink-0">
              <p className="text-xs sm:text-sm font-bold text-white text-center tracking-wide uppercase">
                📊 Dashboard Mode
              </p>
              <div className="flex flex-col sm:flex-row bg-white bg-opacity-40 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-xl backdrop-blur-md gap-1.5 sm:gap-2">
                <button
                  onClick={() => setDashboardType("atmospheric")}
                  className={`flex-1 px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${
                    dashboardType === "atmospheric"
                      ? "bg-blue-600 text-white shadow-xl"
                      : "bg-white bg-opacity-50 text-blue-800 hover:bg-opacity-80 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span className="text-xl sm:text-2xl">🌪️</span>
                    <span>Atmospheric</span>
                  </div>
                </button>
                <button
                  onClick={() => setDashboardType("agricultural")}
                  className={`flex-1 px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${
                    dashboardType === "agricultural"
                      ? "bg-green-600 text-white shadow-xl"
                      : "bg-white bg-opacity-50 text-green-800 hover:bg-opacity-80 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span className="text-xl sm:text-2xl">🌾</span>
                    <span>Agricultural</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Mobile Sidebar Toggle Button - Bottom-right for easy thumb reach */}
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="md:hidden fixed bottom-6 right-4 z-[1000] bg-blue-600 text-white p-3 rounded-full shadow-2xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
          aria-label="Toggle sidebar"
        >
          {isMobileSidebarOpen ? (
            <X size={24} />
          ) : (
            <>
              <Menu size={24} />
              <span className="text-xs font-bold">Controls</span>
            </>
          )}
        </button>

        {/* Backdrop for mobile sidebar - Click to close */}
        {isMobileSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-[998]"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Slide-in on mobile, always visible on desktop */}
        <aside
          className={`
            fixed md:relative
            top-0 left-0
            h-full md:h-auto
            w-80 md:w-72 lg:w-80
            bg-gray-50 p-3 sm:p-4
            overflow-y-auto
            border-r border-gray-200
            z-[999] md:z-auto
            transform transition-transform duration-300 ease-in-out
            ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Close button for mobile */}
            <div className="md:hidden flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Map Controls</h2>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="text-gray-600 hover:text-gray-900 p-2"
                aria-label="Close sidebar"
              >
                <X size={24} />
              </button>
            </div>
            {/* Comparison Mode Toggle */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">
                  Comparison Mode
                </h3>
                <button
                  onClick={handleToggleComparisonMode}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    isComparisonMode
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {isComparisonMode ? "ON" : "OFF"}
                </button>
              </div>
              <p className="text-xs text-gray-600">
                {isComparisonMode
                  ? "Click counties to add to comparison (2-5)"
                  : "Toggle to compare multiple counties"}
              </p>
              {isComparisonMode && selectedCountiesForComparison.length >= 2 && (
                <button
                  onClick={handleShowComparison}
                  className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  Compare {selectedCountiesForComparison.length} Counties
                </button>
              )}
            </div>

            {/* Multi-County Selector (only in comparison mode) */}
            {isComparisonMode && (
              <MultiCountySelector
                selectedCounties={selectedCountiesForComparison}
                onRemoveCounty={handleRemoveCountyFromComparison}
                maxCounties={5}
              />
            )}

            {/* Historical Playback Mode Toggle */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">
                  Historical Playback
                </h3>
                <button
                  onClick={handleToggleHistoricalMode}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    isHistoricalMode
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {isHistoricalMode ? "ON" : "OFF"}
                </button>
              </div>
              <p className="text-xs text-gray-600">
                {isHistoricalMode
                  ? "View historical climate data (1970-2025)"
                  : "Toggle to view historical data"}
              </p>
            </div>

            {/* Time Slider (only in historical mode) */}
            {isHistoricalMode && (
              <TimeSlider
                startYear={1970}
                endYear={2025}
                currentYear={selectedYear}
                onYearChange={handleYearChange}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                playbackSpeed={500}
              />
            )}

            {/* County Search */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2 text-sm sm:text-base text-gray-900">
                Find County
              </h3>
              <CountySearch onCountySelect={handleCountyClick} />
            </div>

            <LayerSelector
              selectedLayer={selectedLayer}
              selectedCrop={selectedCrop}
              onLayerChange={setSelectedLayer}
              onCropChange={setSelectedCrop}
            />
            <MapLegend layer={selectedLayer} />

            {/* NEXRAD Radar Toggle */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm sm:text-base text-gray-900">
                  NEXRAD Radar
                </h3>
                <button
                  onClick={() => setRadarEnabled(!radarEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    radarEnabled
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {radarEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <p className="text-xs text-gray-600">
                {radarEnabled
                  ? "Real-time NEXRAD radar overlay active"
                  : "Toggle to show precipitation radar"}
              </p>
              {radarEnabled && (
                <>
                  <p className="text-xs text-green-700 mt-2 font-semibold">
                    ✅ Live radar from RainViewer
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    🔄 Updates every 5 minutes
                  </p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Opacity
                      </label>
                      <span className="text-xs text-gray-600">
                        {Math.round(radarOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={radarOpacity * 100}
                      onChange={(e) => setRadarOpacity(Number(e.target.value) / 100)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Info Panel - Now visible on all screen sizes */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2 text-sm sm:text-base text-gray-900">
                About This Tool
              </h3>
              {dashboardType === "agricultural" ? (
                <>
                  <p className="text-xs sm:text-sm text-gray-800">
                    AgriClime Sentinel monitors climate-related risks to U.S.
                    agriculture by analyzing drought conditions, soil moisture,
                    precipitation patterns, and temperature anomalies.
                  </p>
                  <p className="text-xs sm:text-sm text-gray-800 mt-2">
                    Click on any county to view detailed regional climate data
                    and historical trends.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-gray-800">
                    Advanced atmospheric science platform providing real-time
                    severe weather analysis, air quality monitoring, and climate
                    trend assessment.
                  </p>
                  <p className="text-xs sm:text-sm text-gray-800 mt-2">
                    Click on any county to access weather alerts, atmospheric
                    instability indices, air quality data, and long-term climate
                    trends.
                  </p>
                </>
              )}
            </div>

            {/* Data Sources - Now visible on all screen sizes */}
            <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2 text-xs sm:text-sm text-gray-900">
                Data Sources
              </h3>
              {dashboardType === "agricultural" ? (
                <ul className="text-xs text-gray-800 space-y-1">
                  <li>• Open-Meteo Historical Weather API</li>
                  <li>• NOAA U.S. Drought Monitor</li>
                  <li>• USDA Agricultural Statistics</li>
                </ul>
              ) : (
                <ul className="text-xs text-gray-800 space-y-1">
                  <li>• NOAA Weather Alerts & Forecasts</li>
                  <li>• EPA AirNow Air Quality Data</li>
                  <li>• NOAA Climate Data (1970-Present)</li>
                  <li>• Atmospheric Sounding Models</li>
                </ul>
              )}
            </div>
          </div>
        </aside>

        {/* Map Container - Full height on mobile */}
        <main
          className={`flex-1 relative h-full md:min-h-0 transition-all duration-300 ${
            isMobileSidebarOpen ? 'blur-sm brightness-50' : ''
          }`}
        >
          <CountyMap
            layer={selectedLayer}
            cropType={selectedCrop}
            onCountyClick={handleCountyClick}
            hideMobileZoomControls={isMobileSidebarOpen}
            radarEnabled={radarEnabled}
            onMapReady={setMapInstance}
            historicalYear={isHistoricalMode ? selectedYear : null}
          />

          {/* NEXRAD Radar Overlay */}
          <RadarOverlay
            map={mapInstance}
            enabled={radarEnabled}
            opacity={radarOpacity}
          />

          {/* Comparison Mode Active Banner */}
          {isComparisonMode && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-none">
              <div className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                <span className="font-bold text-sm sm:text-base">
                  Comparison Mode Active - Click counties to compare ({selectedCountiesForComparison.length}/5)
                </span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Dashboard Modals */}
      {selectedCounty && dashboardType === "agricultural" && (
        <RegionalDashboard
          countyFips={selectedCounty}
          onClose={handleCloseDashboard}
          selectedLayer={selectedLayer}
          initialSection={getDashboardConfigForLayer(selectedLayer).initialSection}
        />
      )}

      {selectedCounty &&
        dashboardType === "atmospheric" &&
        selectedCountyData && (
          <AtmosphericScienceDashboard
            fips={selectedCountyData.fips}
            countyName={selectedCountyData.name}
            state={selectedCountyData.state}
            latitude={selectedCountyData.latitude}
            longitude={selectedCountyData.longitude}
            onClose={handleCloseDashboard}
            selectedLayer={selectedLayer}
            initialTab={getDashboardConfigForLayer(selectedLayer).initialTab}
          />
        )}

      {/* Comparison Dashboard Modal */}
      {showComparisonDashboard && selectedCountiesForComparison.length >= 2 && (
        <ComparisonDashboard
          counties={selectedCountiesForComparison}
          onClose={handleCloseComparison}
          dashboardType={dashboardType}
        />
      )}

      {/* Footer */}
      <footer
        className={`bg-gradient-to-r from-green-700 to-blue-700 text-white border-t border-green-600 transition-all duration-300 ${
          isMobileSidebarOpen ? 'md:blur-0 blur-sm brightness-50' : ''
        }`}
      >
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          {/* Mobile Layout: Single Column */}
          <div className="flex flex-col gap-2 sm:gap-3 md:hidden">
            {/* Copyright */}
            <div className="text-center text-xs">
              © 2025 Nathaniel Oteng. All rights reserved.
            </div>

            {/* Data Sources */}
            <div className="text-center text-xs opacity-90">
              Data: NOAA, EPA, USDA, Open-Meteo
            </div>

            {/* Links */}
            <div className="flex justify-center gap-4 text-xs">
              <a
                href="https://github.com/clevernat/AgriClime-Sentinel"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-200 transition-colors underline"
              >
                GitHub
              </a>
              <a
                href="https://github.com/clevernat/AgriClime-Sentinel#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-200 transition-colors underline"
              >
                Documentation
              </a>
            </div>
          </div>

          {/* Desktop/Tablet Layout: Multi-Column */}
          <div className="hidden md:flex md:flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-6">
            {/* Left Section: Copyright & Purpose */}
            <div className="flex-shrink-0">
              <div className="text-sm font-semibold">
                © 2025 Nathaniel Oteng
              </div>
              <div className="text-xs opacity-90 mt-1">
                Advanced Climate Risk Monitoring Platform
              </div>
            </div>

            {/* Center Section: Data Sources */}
            <div className="flex-1 flex justify-center">
              <div className="text-xs">
                <div className="font-semibold mb-1">Data Sources</div>
                <div className="opacity-90">
                  NOAA • EPA AirNow • USDA • Open-Meteo
                </div>
              </div>
            </div>

            {/* Right Section: Links */}
            <div className="flex-shrink-0 flex gap-4 text-sm">
              <a
                href="https://github.com/clevernat/AgriClime-Sentinel"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-200 transition-colors underline"
              >
                GitHub
              </a>
              <a
                href="https://github.com/clevernat/AgriClime-Sentinel#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-200 transition-colors underline"
              >
                Docs
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
