"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RegionalDashboardData, MapDataLayer } from "@/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ExportButtons from "@/components/Export/ExportButtons";
import { getLayerContextDescription } from "@/lib/utils/layer-dashboard-mapping";

interface RegionalDashboardProps {
  countyFips: string;
  onClose: () => void;
  selectedLayer?: string;
  initialSection?: "crop-risk" | "drought" | "soil-moisture" | "precipitation" | "temperature";
}

export default function RegionalDashboard({
  countyFips,
  onClose,
  selectedLayer,
  initialSection,
}: RegionalDashboardProps) {
  const [data, setData] = useState<RegionalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    countyName?: string;
    countyState?: string;
  } | null>(null);

  // Refs for scrolling to sections
  const cropRiskRef = useRef<HTMLDivElement>(null);
  const droughtRef = useRef<HTMLDivElement>(null);
  const soilMoistureRef = useRef<HTMLDivElement>(null);
  const precipitationRef = useRef<HTMLDivElement>(null);
  const temperatureRef = useRef<HTMLDivElement>(null);

  /**
   * Helper function to fetch with timeout
   */
  const fetchWithTimeout = async (url: string, timeout = 15000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`Request timeout for ${url}`);
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setLoadingProgress("Fetching agricultural data...");
    setError(null);
    setErrorDetails(null);

    try {
      setLoadingProgress("Loading climate and agricultural metrics...");
      const response = await fetchWithTimeout(
        `/api/regional-dashboard?fips=${countyFips}`,
        15000 // 15 second timeout
      );

      setLoadingProgress("Processing data...");
      const result = await response.json();

      if (!response.ok) {
        // Handle error response with county information
        setError(
          result.message || result.error || "Failed to fetch dashboard data"
        );
        if (result.county) {
          setErrorDetails({
            countyName: result.county.name,
            countyState: result.county.state,
          });
        }
        return;
      }

      setData(result);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [countyFips]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Scroll to initial section after data loads
  useEffect(() => {
    if (!loading && data && initialSection) {
      // Wait a bit for the DOM to render
      setTimeout(() => {
        let targetRef: React.RefObject<HTMLDivElement> | null = null;

        switch (initialSection) {
          case "crop-risk":
            targetRef = cropRiskRef;
            break;
          case "drought":
            targetRef = droughtRef;
            break;
          case "soil-moisture":
            targetRef = soilMoistureRef;
            break;
          case "precipitation":
            targetRef = precipitationRef;
            break;
          case "temperature":
            targetRef = temperatureRef;
            break;
        }

        if (targetRef?.current) {
          targetRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  }, [loading, data, initialSection]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-fadeIn p-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col items-center space-y-3 sm:space-y-4 animate-scaleIn max-w-md">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-800 text-base sm:text-xl font-semibold text-center">
            Loading agricultural dashboard...
          </div>
          <div className="text-gray-600 text-xs sm:text-sm text-center">
            {loadingProgress}
          </div>
          <div className="text-gray-400 text-xs text-center mt-2">
            Fetching climate and agricultural data
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 animate-fadeIn">
        <div className="bg-white p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full animate-slideUp">
          <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-900">
            {errorDetails?.countyName && errorDetails?.countyState
              ? `${errorDetails.countyName}, ${errorDetails.countyState}`
              : "Regional Climate Dashboard"}
          </h2>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-red-600">
            No Data Available
          </h3>
          <p className="mb-3 sm:mb-4 text-sm sm:text-base text-gray-700">
            {error ||
              "Climate data for this county is not yet available in the database."}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This is a demonstration dashboard. In
              production, climate data would be automatically fetched from
              Open-Meteo API and stored in the database for all U.S. counties.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              Currently, sample data is available for all 3,221 U.S. counties
              with realistic climate patterns and 50 years of historical drought
              data.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg transform hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[9999] p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-7xl w-full max-h-[98vh] sm:max-h-[95vh] overflow-hidden flex flex-col animate-slideUp my-2 sm:my-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 sm:p-4 md:p-6 flex justify-between items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold truncate">
              {data.county.name}, {data.county.state}
            </h2>
            <p className="text-blue-100 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">
              Regional Climate Dashboard
            </p>
            {selectedLayer && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-white bg-opacity-20 px-2.5 py-1 rounded-full text-xs sm:text-sm">
                <span className="font-semibold">Viewing:</span>
                <span>{getLayerContextDescription(selectedLayer as MapDataLayer)}</span>
              </div>
            )}
          </div>

          {/* Export Button */}
          <div className="flex-shrink-0">
            <ExportButtons
              data={data}
              dashboardElementId="regional-dashboard-content"
              chartElementId="historical-trends-chart"
              type="agricultural"
            />
          </div>

          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content - Scrollable */}
        <div
          id="regional-dashboard-content"
          className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 bg-gray-50"
        >
          {/* Current Conditions */}
          <div
            className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 sm:p-6 animate-slideUp"
            style={{ animationDelay: "0.1s", animationFillMode: "both" }}
          >
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-800 flex items-center">
              <span className="bg-blue-100 text-blue-600 rounded-lg p-1.5 sm:p-2 mr-2 sm:mr-3">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </span>
              Current Conditions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-5 rounded-lg sm:rounded-xl border border-orange-200">
                <div className="text-xs sm:text-sm font-medium text-orange-700 mb-1">
                  Temperature
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-orange-900">
                  {data.current_climate?.temperature_avg?.toFixed(1) ?? "N/A"}°C
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-5 rounded-lg sm:rounded-xl border border-blue-200">
                <div className="text-xs sm:text-sm font-medium text-blue-700 mb-1">
                  Soil Moisture
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-900">
                  {data.current_climate?.soil_moisture?.toFixed(0) ?? "N/A"}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-5 rounded-lg sm:rounded-xl border border-green-200">
                <div className="text-xs sm:text-sm font-medium text-green-700 mb-1">
                  Growing Degree Days (YTD)
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-green-900">
                  {data.growing_degree_days?.toFixed(0) ?? "N/A"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-5 rounded-lg sm:rounded-xl border border-red-200">
                <div className="text-xs sm:text-sm font-medium text-red-700 mb-1">
                  Extreme Heat Days (YTD)
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-red-900">
                  {data.extreme_heat_days_ytd ?? "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Precipitation Comparison */}
          <div
            className="bg-white rounded-xl shadow-md p-6 animate-slideUp"
            style={{ animationDelay: "0.2s", animationFillMode: "both" }}
          >
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-blue-100 text-blue-600 rounded-lg p-2 mr-3">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
              </span>
              Precipitation vs. Historical Average
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                <div className="text-sm font-medium text-blue-700 mb-1">
                  Current (YTD)
                </div>
                <div className="text-3xl font-bold text-blue-900">
                  {data.precipitation_vs_avg.current.toFixed(0)} mm
                </div>
              </div>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Historical Average
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {data.precipitation_vs_avg.historical_avg.toFixed(0)} mm
                </div>
              </div>
              <div
                className={`p-5 rounded-xl border ${
                  data.precipitation_vs_avg.percent_difference >= 0
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    data.precipitation_vs_avg.percent_difference >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  Difference
                </div>
                <div
                  className={`text-3xl font-bold ${
                    data.precipitation_vs_avg.percent_difference >= 0
                      ? "text-green-900"
                      : "text-red-900"
                  }`}
                >
                  {data.precipitation_vs_avg.percent_difference >= 0 ? "+" : ""}
                  {data.precipitation_vs_avg.percent_difference.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Historical Drought Trends */}
          <div
            className="bg-white rounded-xl shadow-md p-6 animate-slideUp"
            style={{ animationDelay: "0.3s", animationFillMode: "both" }}
          >
            <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
              <span className="bg-amber-100 text-amber-600 rounded-lg p-2 mr-3">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </span>
              Historical Drought Trends (50-Year Analysis)
            </h3>
            <div
              id="historical-trends-chart"
              className="bg-gray-50 rounded-lg p-4"
            >
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.historical_trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="year"
                    stroke="#6b7280"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#ef4444"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="drought_frequency"
                    stroke="#ef4444"
                    strokeWidth={3}
                    name="Drought Events"
                    dot={{ fill: "#ef4444", r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="drought_severity_avg"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    name="Avg Severity"
                    dot={{ fill: "#f59e0b", r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Extreme Heat Days Trend */}
          {data.historical_trends.length > 0 && (
            <div
              className="bg-white rounded-xl shadow-md p-6 animate-slideUp"
              style={{ animationDelay: "0.4s", animationFillMode: "both" }}
            >
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
                <span className="bg-red-100 text-red-600 rounded-lg p-2 mr-3">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </span>
                Extreme Heat Days by Year
              </h3>
              <div id="extreme-heat-chart" className="bg-gray-50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={data.historical_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="year"
                      stroke="#6b7280"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} />
                    <Bar
                      dataKey="extreme_heat_days"
                      fill="#ef4444"
                      name="Days >35°C"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
