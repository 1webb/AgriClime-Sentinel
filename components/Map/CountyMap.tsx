"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map only once
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [39.8283, -98.5795],
        4
      );

      // Add base tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    // Load and display county data
    loadMapData();

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [layer, cropType]);

  const loadMapData = async () => {
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

      // Create a map of county data by FIPS
      const dataMap = new Map();
      result.data.forEach((item: any) => {
        const fips = item.fips || item.county_fips;
        dataMap.set(fips, item);
      });

      // Clear existing layers (except base layer)
      if (mapRef.current) {
        mapRef.current.eachLayer((layer) => {
          if (layer instanceof L.GeoJSON) {
            mapRef.current?.removeLayer(layer);
          }
        });

        // Add county polygons with colors
        const layerConfig = MAP_LAYERS[layer];

        const geoJsonLayer = L.geoJSON(
          {
            type: "FeatureCollection",
            features: counties.map((county: any) => ({
              type: "Feature",
              properties: {
                fips: county.fips,
                name: county.name,
                state: county.state,
              },
              geometry: county.geometry,
            })),
          } as GeoJSON.FeatureCollection,
          {
            style: (feature) => {
              const fips = feature?.properties?.fips;
              const countyData = dataMap.get(fips);

              let value = 0;
              if (countyData) {
                switch (layer) {
                  case "drought":
                    value = countyData.drought_index || 0;
                    break;
                  case "soil_moisture":
                    value = countyData.soil_moisture || 0;
                    break;
                  case "precipitation_30day":
                    value = countyData.total_precipitation || 0;
                    break;
                  case "temperature_anomaly":
                    value = countyData.anomaly || 0;
                    break;
                  case "crop_risk":
                    value = countyData.risk_score || 0;
                    break;
                }
              }

              const color = getColorForValue(value, layerConfig);

              return {
                fillColor: color,
                weight: 1,
                opacity: 1,
                color: "#666",
                fillOpacity: 0.7,
              };
            },
            onEachFeature: (feature, leafletLayer) => {
              const fips = feature.properties.fips;
              const countyData = dataMap.get(fips);

              // Add popup
              let popupContent = `<strong>${feature.properties.name}, ${feature.properties.state}</strong><br/>`;

              if (countyData) {
                popupContent += `${layerConfig.name}: `;
                switch (layer) {
                  case "drought":
                    popupContent += `Level ${countyData.drought_index || 0}`;
                    break;
                  case "soil_moisture":
                    popupContent += `${countyData.soil_moisture || 0}%`;
                    break;
                  case "precipitation_30day":
                    popupContent += `${countyData.total_precipitation || 0} mm`;
                    break;
                  case "temperature_anomaly":
                    popupContent += `${(countyData.anomaly || 0).toFixed(1)}°C`;
                    break;
                  case "crop_risk":
                    popupContent += `${(countyData.risk_score || 0).toFixed(
                      1
                    )}`;
                    break;
                }
              } else {
                popupContent += "No data available";
              }

              leafletLayer.bindPopup(popupContent);

              // Add click handler
              leafletLayer.on("click", () => {
                if (onCountyClick) {
                  onCountyClick(fips);
                }
              });

              // Add hover effect
              leafletLayer.on("mouseover", (e) => {
                e.target.setStyle({
                  weight: 3,
                  color: "#000",
                });
              });

              leafletLayer.on("mouseout", (e) => {
                e.target.setStyle({
                  weight: 1,
                  color: "#666",
                });
              });
            },
          }
        );

        geoJsonLayer.addTo(mapRef.current);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading map data:", err);
      setError(err instanceof Error ? err.message : "Failed to load map data");
      setLoading(false);
    }
  };

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
