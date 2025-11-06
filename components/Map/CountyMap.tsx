"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapDataLayer } from "@/types";
import { MAP_LAYERS, getColorForValue } from "@/lib/constants";

interface CountyMapProps {
  layer: MapDataLayer;
  cropType?: string;
  onCountyClick?: (fips: string) => void;
  hideMobileZoomControls?: boolean;
}

export default function CountyMap({
  layer,
  cropType,
  onCountyClick,
  hideMobileZoomControls = false,
}: CountyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState("Initializing...");
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    setLoadingStep("Fetching climate data...");
    setDataLoaded(false);

    try {
      // Step 1: Fetch map data from API
      setLoadingProgress(10);
      const params = new URLSearchParams({ layer });
      if (cropType && layer === "crop_risk") {
        params.append("cropType", cropType);
      }

      const response = await fetch(`/api/map-data?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch map data");
      }

      const result = await response.json();
      setLoadingProgress(30);

      // Step 2: Fetch county geometries (with caching)
      setLoadingStep("Loading county boundaries...");
      let counties;
      const CACHE_KEY = "counties_cache";
      const CACHE_TIMESTAMP_KEY = "counties_cache_timestamp";
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

      try {
        const cachedCounties = localStorage.getItem(CACHE_KEY);
        const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

        if (
          cachedCounties &&
          cacheTimestamp &&
          Date.now() - parseInt(cacheTimestamp) < ONE_WEEK
        ) {
          // Use cached data (instant!)
          counties = JSON.parse(cachedCounties);
          setLoadingProgress(70);
          setLoadingStep("Using cached county data...");
        } else {
          // Fetch fresh data
          setLoadingStep("Downloading county boundaries (first time)...");
          const countiesResponse = await fetch("/api/counties");
          if (!countiesResponse.ok) {
            throw new Error("Failed to fetch counties");
          }

          counties = await countiesResponse.json();
          setLoadingProgress(60);

          // Cache for future use
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(counties));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            setLoadingStep("Cached county data for faster future loads...");
          } catch (cacheError) {
            // localStorage might be full or disabled, continue without caching
            console.warn("Failed to cache counties:", cacheError);
          }
          setLoadingProgress(70);
        }
      } catch (cacheError) {
        // If caching fails, fall back to regular fetch
        console.warn("Cache error, fetching counties normally:", cacheError);
        const countiesResponse = await fetch("/api/counties");
        if (!countiesResponse.ok) {
          throw new Error("Failed to fetch counties");
        }
        counties = await countiesResponse.json();
        setLoadingProgress(70);
      }

      if (!mapRef.current) return;

      // Step 3: Prepare data for rendering
      setLoadingProgress(80);
      setLoadingStep("Rendering map...");

      // Clear existing layers
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
          mapRef.current?.removeLayer(layer);
        }
      });

      // Determine the value field and label based on layer type
      let valueField: string;
      let label: string;
      const layerConfig = MAP_LAYERS[layer];

      switch (layer) {
        case "drought":
          valueField = "drought_index";
          label = "Drought Level";
          break;
        case "soil_moisture":
          valueField = "soil_moisture";
          label = "Soil Moisture";
          break;
        case "precipitation_30day":
          valueField = "total_precipitation";
          label = "30-Day Precipitation";
          break;
        case "temperature_anomaly":
          valueField = "anomaly";
          label = "Temperature Anomaly";
          break;
        case "crop_risk":
          valueField = "risk_score";
          label = "Crop Risk Score";
          break;
        default:
          valueField = "drought_index";
          label = "Value";
      }

      // Create a map of county data by FIPS code
      const dataMap = new Map(
        result.data.map((item: { county_fips?: string; fips?: string }) => [
          item.county_fips || item.fips,
          item,
        ])
      );

      // Step 4: Add GeoJSON layer with styling (start invisible for fade-in)
      setLoadingProgress(90);
      setLoadingStep("Applying colors...");

      L.geoJSON(
        {
          type: "FeatureCollection",
          features: counties.map(
            (county: {
              fips: string;
              geometry: L.GeoJSON;
              [key: string]: unknown;
            }) => ({
              type: "Feature" as const,
              properties: {
                ...county,
                data: dataMap.get(county.fips),
              },
              geometry: county.geometry,
            })
          ),
        } as GeoJSON.FeatureCollection,
        {
          style: (feature) => {
            const data = feature?.properties?.data;
            const value = data?.[valueField];
            const color =
              value !== null && value !== undefined
                ? getColorForValue(value, layerConfig)
                : "#CCCCCC"; // Gray for missing data

            return {
              fillColor: color,
              weight: 1,
              opacity: 1,
              color: "white",
              fillOpacity: 0, // Start invisible for fade-in animation
              className: "county-polygon",
            };
          },
          onEachFeature: (feature, layer) => {
            const fips = feature.properties.fips;
            const name = feature.properties.name;
            const state = feature.properties.state;
            const data = feature.properties.data;
            const value = data?.[valueField];

            // Add tooltip
            layer.bindTooltip(
              `<strong>${name}, ${state}</strong><br/>${label}: ${
                value !== null && value !== undefined ? value.toFixed(2) : "N/A"
              } ${layerConfig.unit}`
            );

            // Add hover effects
            layer.on("mouseover", function (this: L.Path) {
              this.setStyle({
                weight: 3,
                fillOpacity: 0.9,
              });
            });

            layer.on("mouseout", function (this: L.Path) {
              this.setStyle({
                weight: 1,
                fillOpacity: 0.7,
              });
            });

            // Add click handler
            layer.on("click", () => {
              if (onCountyClick) {
                onCountyClick(fips);
              }
            });
          },
        }
      ).addTo(mapRef.current);

      // Step 5: Trigger smooth fade-in animation
      setLoadingProgress(95);
      setLoadingStep("Finalizing...");
      setLoading(false);

      // Fade in the counties smoothly
      setTimeout(() => {
        setDataLoaded(true);
        mapRef.current?.eachLayer((layer) => {
          if (layer instanceof L.Path) {
            layer.setStyle({ fillOpacity: 0.7 });
          }
        });
        setLoadingProgress(100);
      }, 100);
    } catch (err) {
      // Error handling - log to error monitoring service in production
      setError(err instanceof Error ? err.message : "Failed to load map data");
      setLoading(false);
      setLoadingProgress(0);
    }
  }, [layer, cropType, onCountyClick]);

  // Initialize map once
  useEffect(() => {
    try {
      if (!mapContainerRef.current || mapRef.current) return;

      mapRef.current = L.map(mapContainerRef.current).setView(
        [39.8283, -98.5795],
        4
      );

      // Add base tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(mapRef.current);
    } catch {
      // Error handling - log to error monitoring service in production
      setError("Failed to initialize map");
    }

    return () => {
      // Cleanup on unmount
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch {
        // Silently handle cleanup errors
      }
    };
  }, []);

  // Load data when layer or crop changes
  useEffect(() => {
    if (mapRef.current) {
      loadMapData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, cropType]);

  // Toggle zoom controls visibility based on mobile sidebar state
  useEffect(() => {
    if (mapContainerRef.current) {
      if (hideMobileZoomControls) {
        mapContainerRef.current.classList.add("hide-mobile-zoom");
      } else {
        mapContainerRef.current.classList.remove("hide-mobile-zoom");
      }
    }
  }, [hideMobileZoomControls]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          {/* Animated skeleton map background */}
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-gradient-to-br from-blue-100 via-green-100 to-yellow-100 animate-pulse" />
            {/* Simulated county shapes */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-1 p-4">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white/40 rounded animate-pulse"
                  style={{ animationDelay: `${i * 20}ms` }}
                />
              ))}
            </div>
          </div>

          {/* Loading indicator with progress */}
          <div className="relative z-10 bg-white/95 backdrop-blur-sm px-6 py-5 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <div className="text-gray-800 font-bold text-lg">
                {loadingStep}
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            {/* Progress percentage */}
            <div className="text-sm text-gray-600 text-center font-semibold">
              {loadingProgress}%
            </div>

            {/* Helpful tip for first-time load */}
            {loadingProgress < 50 && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                💡 County boundaries are being cached for faster future loads
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-md">
          <div className="font-semibold mb-1">Error Loading Map</div>
          <div className="text-sm">{error}</div>
        </div>
      )}
    </div>
  );
}
