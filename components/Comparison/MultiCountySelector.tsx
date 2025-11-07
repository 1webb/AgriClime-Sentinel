"use client";

import { X, Plus } from "lucide-react";

interface SelectedCounty {
  fips: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface MultiCountySelectorProps {
  selectedCounties: SelectedCounty[];
  onRemoveCounty: (fips: string) => void;
  maxCounties?: number;
}

export default function MultiCountySelector({
  selectedCounties,
  onRemoveCounty,
  maxCounties = 5,
}: MultiCountySelectorProps) {
  const canAddMore = selectedCounties.length < maxCounties;

  console.log("🎯 MultiCountySelector rendered, counties:", selectedCounties.length);

  return (
    <div className="bg-white p-3 sm:p-4 rounded-lg shadow border-2 border-blue-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm sm:text-base text-gray-900">
          Selected Counties ({selectedCounties.length}/{maxCounties})
        </h3>
      </div>

      {selectedCounties.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <Plus size={32} className="mx-auto mb-2 text-gray-400" />
          <p className="text-xs sm:text-sm">
            Click on counties to add them to comparison
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Select 2-{maxCounties} counties to compare
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedCounties.map((county, index) => (
            <div
              key={county.fips}
              className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {county.name}
                  </p>
                  <p className="text-xs text-gray-600">{county.state}</p>
                </div>
              </div>
              <button
                onClick={() => onRemoveCounty(county.fips)}
                className="p-1 hover:bg-red-100 rounded-full transition-colors"
                title="Remove county"
              >
                <X size={16} className="text-red-600" />
              </button>
            </div>
          ))}

          {!canAddMore && (
            <p className="text-xs text-amber-600 text-center mt-2">
              Maximum {maxCounties} counties reached
            </p>
          )}
        </div>
      )}
    </div>
  );
}

