"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Calendar } from "lucide-react";

interface TimeSliderProps {
  startYear: number;
  endYear: number;
  currentYear: number;
  onYearChange: (year: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  playbackSpeed?: number; // milliseconds per year
}

export default function TimeSlider({
  startYear,
  endYear,
  currentYear,
  onYearChange,
  isPlaying,
  onPlayPause,
  playbackSpeed = 1000,
}: TimeSliderProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        const now = Date.now();
        const elapsed = now - lastUpdateRef.current;

        if (elapsed >= playbackSpeed) {
          lastUpdateRef.current = now;
          
          if (currentYear < endYear) {
            onYearChange(currentYear + 1);
          } else {
            // Loop back to start
            onYearChange(startYear);
          }
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isPlaying, currentYear, startYear, endYear, playbackSpeed, onYearChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onYearChange(parseInt(e.target.value));
  };

  const handleStepBack = () => {
    if (currentYear > startYear) {
      onYearChange(currentYear - 1);
    }
  };

  const handleStepForward = () => {
    if (currentYear < endYear) {
      onYearChange(currentYear + 1);
    }
  };

  const handleJumpToYear = (year: number) => {
    onYearChange(year);
    setShowDatePicker(false);
  };

  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4">
      {/* Top Row: Controls */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Left: Play Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onPlayPause}
            className="p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors flex-shrink-0"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            onClick={handleStepBack}
            disabled={currentYear <= startYear}
            className="p-1.5 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Previous year"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={handleStepForward}
            disabled={currentYear >= endYear}
            className="p-1.5 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            title="Next year"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Center: Year Display */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-3 py-1.5 bg-purple-100 rounded-lg font-bold text-base text-purple-900 hover:bg-purple-200 transition-colors flex items-center gap-1.5"
            title="Select year"
          >
            <Calendar size={16} />
            {currentYear}
          </button>

          {/* Year Picker Dropdown */}
          {showDatePicker && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white border-2 border-gray-300 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
              <div className="p-2 grid grid-cols-5 gap-1">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleJumpToYear(year)}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
                      year === currentYear
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Progress */}
        <div className="text-xs text-gray-600 font-medium">
          {currentYear - startYear + 1}/{endYear - startYear + 1}
        </div>
      </div>

      {/* Bottom Row: Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={startYear}
          max={endYear}
          value={currentYear}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          style={{
            background: `linear-gradient(to right, #9333EA 0%, #9333EA ${
              ((currentYear - startYear) / (endYear - startYear)) * 100
            }%, #E5E7EB ${
              ((currentYear - startYear) / (endYear - startYear)) * 100
            }%, #E5E7EB 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{startYear}</span>
          <span className="text-gray-600 font-medium">
            {isPlaying ? "▶ Playing..." : "⏸ Paused"}
          </span>
          <span>{endYear}</span>
        </div>
      </div>
    </div>
  );
}

