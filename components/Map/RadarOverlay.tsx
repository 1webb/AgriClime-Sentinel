"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface RadarOverlayProps {
  map: L.Map | null;
  enabled: boolean;
  opacity?: number;
}

/**
 * NEXRAD Radar Overlay Component
 *
 * Displays real-time NEXRAD radar imagery from Iowa State Mesonet
 * on the Leaflet map using their Tile Map Service.
 *
 * Data Source: Iowa State University Environmental Mesonet
 * Product: N0Q (8-bit Base Reflectivity at 0.5 dBZ resolution)
 * Documentation: https://mesonet.agron.iastate.edu/GIS/ridge.phtml
 * Updates: Every 5 minutes
 */
export default function RadarOverlay({
  map,
  enabled,
  opacity = 0.6,
}: RadarOverlayProps) {
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle radar layer creation/removal
  useEffect(() => {
    if (!map) return;

    const updateRadar = async () => {
      // Remove existing radar layer
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }

      if (!enabled) return;

      console.log('🔴 Adding NEXRAD radar layer...');

      try {
        // Fetch the latest radar timestamp from RainViewer API
        console.log('🔴 Fetching latest radar timestamp...');
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();

        if (!data.radar || !data.radar.past || data.radar.past.length === 0) {
          console.error('❌ No radar data available from RainViewer');
          return;
        }

        // Get the most recent radar timestamp
        const latestTimestamp = data.radar.past[data.radar.past.length - 1].time;
        console.log('🔴 Latest radar timestamp:', latestTimestamp, new Date(latestTimestamp * 1000));

        // Build the tile URL with the correct timestamp
        const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${latestTimestamp}/256/{z}/{x}/{y}/2/1_1.png`;
        console.log('🔴 Radar tile URL:', tileUrl);

        // Create tile layer
        radarLayerRef.current = L.tileLayer(tileUrl, {
          opacity: opacity,
          attribution: 'NEXRAD Radar: RainViewer',
          maxZoom: 12,
          minZoom: 3,
          tileSize: 256,
        });

        // Add event listeners for debugging
        radarLayerRef.current.on('loading', () => {
          console.log('🔴 Radar tiles loading...');
        });

        radarLayerRef.current.on('load', () => {
          console.log('✅ Radar tiles loaded successfully');
        });

        radarLayerRef.current.on('tileerror', (error: any) => {
          console.error('❌ Radar tile error:', error);
        });

        radarLayerRef.current.addTo(map);
        console.log('🔴 Radar layer added to map with opacity:', opacity);
      } catch (error) {
        console.error('❌ Failed to fetch radar data:', error);
      }
    };

    // Initial update
    updateRadar();

    // Auto-update every 5 minutes (NEXRAD updates every 5 minutes)
    if (enabled) {
      updateIntervalRef.current = setInterval(updateRadar, 5 * 60 * 1000);
    }

    return () => {
      // Cleanup
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
        radarLayerRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [map, enabled]);

  // Separate effect to handle opacity changes without recreating the layer
  useEffect(() => {
    if (radarLayerRef.current) {
      radarLayerRef.current.setOpacity(opacity);
      console.log('🔴 Radar opacity updated to:', opacity);
    }
  }, [opacity]);

  return null; // This component doesn't render anything directly
}

