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
}

export default function CountyMap({
  layer,
  cropType,
  onCountyClick,
}: CountyMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch map data from API
      const params = new URLSearchParams({ layer });
      if (cropType && layer === "crop_risk") {
        params.append("cropType", cropType);
      }

      const response = await fetch(`/api/map-data?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch map data");
      }

      const result = await response.json();

      // Fetch county geometries
      const countiesResponse = await fetch("/api/counties");
      if (!countiesResponse.ok) {
        throw new Error("Failed to fetch counties");
      }

      const counties = await countiesResponse.json();

      if (!mapRef.current) return;

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

      // Add GeoJSON layer with styling
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
              fillOpacity: 0.7,
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

      setLoading(false);
    } catch (err) {
      // Error handling - log to error monitoring service in production
      setError(err instanceof Error ? err.message : "Failed to load map data");
      setLoading(false);
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

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-lg font-semibold">Loading map data...</div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
