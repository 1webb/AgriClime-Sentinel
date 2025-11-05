"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapDataLayer, CropType } from "@/types";
import LayerSelector from "@/components/Map/LayerSelector";
import MapLegend from "@/components/Map/MapLegend";

// Dynamically import map component to avoid SSR issues with Leaflet
const CountyMap = dynamic(() => import("@/components/Map/CountyMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-lg font-semibold">Loading map...</div>
    </div>
  ),
});

const RegionalDashboard = dynamic(
  () => import("@/components/Dashboard/RegionalDashboard"),
  { ssr: false }
);

export default function Home() {
  const [selectedLayer, setSelectedLayer] = useState<MapDataLayer>("drought");
  const [selectedCrop, setSelectedCrop] = useState<CropType>("corn");
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);

  const handleCountyClick = (fips: string) => {
    setSelectedCounty(fips);
  };

  const handleCloseDashboard = () => {
    setSelectedCounty(null);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-700 to-blue-700 text-white p-6 shadow-lg">
        <h1 className="text-3xl font-bold">AgriClime Sentinel</h1>
        <p className="text-sm mt-1 opacity-90">
          A Climate Risk Dashboard for U.S. Agricultural Security
        </p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-50 p-4 overflow-y-auto border-r border-gray-200">
          <div className="space-y-4">
            <LayerSelector
              selectedLayer={selectedLayer}
              selectedCrop={selectedCrop}
              onLayerChange={setSelectedLayer}
              onCropChange={setSelectedCrop}
            />
            <MapLegend layer={selectedLayer} />

            {/* Info Panel */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2 text-gray-900">About This Tool</h3>
              <p className="text-sm text-gray-800">
                AgriClime Sentinel monitors climate-related risks to U.S.
                agriculture by analyzing drought conditions, soil moisture,
                precipitation patterns, and temperature anomalies.
              </p>
              <p className="text-sm text-gray-800 mt-2">
                Click on any county to view detailed regional climate data and
                historical trends.
              </p>
            </div>

            {/* Data Sources */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-bold mb-2 text-sm text-gray-900">
                Data Sources
              </h3>
              <ul className="text-xs text-gray-800 space-y-1">
                <li>• Open-Meteo Historical Weather API</li>
                <li>• NOAA U.S. Drought Monitor</li>
                <li>• USDA Agricultural Statistics</li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative">
          <CountyMap
            layer={selectedLayer}
            cropType={selectedCrop}
            onCountyClick={handleCountyClick}
          />
        </main>
      </div>

      {/* Regional Dashboard Modal */}
      {selectedCounty && (
        <RegionalDashboard
          countyFips={selectedCounty}
          onClose={handleCloseDashboard}
        />
      )}
    </div>
  );
}
