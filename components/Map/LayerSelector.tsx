"use client";

import { MapDataLayer, CropType } from "@/types";
import { MAP_LAYERS, CROP_TYPES } from "@/lib/constants";

interface LayerSelectorProps {
  selectedLayer: MapDataLayer;
  selectedCrop?: CropType;
  onLayerChange: (layer: MapDataLayer) => void;
  onCropChange?: (crop: CropType) => void;
}

export default function LayerSelector({
  selectedLayer,
  selectedCrop,
  onLayerChange,
  onCropChange,
}: LayerSelectorProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg space-y-4">
      <div>
        <label className="block text-sm font-bold mb-2 text-gray-900">
          Select Data Layer
        </label>
        <select
          value={selectedLayer}
          onChange={(e) => onLayerChange(e.target.value as MapDataLayer)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
        >
          {Object.values(MAP_LAYERS).map((layer) => (
            <option key={layer.id} value={layer.id}>
              {layer.name}
            </option>
          ))}
        </select>
      </div>

      {selectedLayer === "crop_risk" && onCropChange && (
        <div>
          <label className="block text-sm font-bold mb-2 text-gray-900">
            Select Crop Type
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => onCropChange(e.target.value as CropType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          >
            {Object.entries(CROP_TYPES).map(([key, crop]) => (
              <option key={key} value={key}>
                {crop.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
