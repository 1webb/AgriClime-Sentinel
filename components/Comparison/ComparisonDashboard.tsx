"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, AlertTriangle, Wind, Cloud } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface CountyData {
  fips: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface ComparisonDashboardProps {
  counties: CountyData[];
  onClose: () => void;
  dashboardType: "agricultural" | "atmospheric";
}

interface CountyMetrics {
  fips: string;
  name: string;
  state: string;
  alerts: number;
  severeWeatherScore: number;
  airQualityAQI: number;
  temperatureTrend: number;
  loading: boolean;
  error: boolean;
}

export default function ComparisonDashboard({
  counties,
  onClose,
  dashboardType,
}: ComparisonDashboardProps) {
  const [metrics, setMetrics] = useState<CountyMetrics[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "detailed">("overview");

  console.log("🎨 ComparisonDashboard render - activeTab:", activeTab, "metrics count:", metrics.length);

  useEffect(() => {
    // Fetch data for all counties in parallel
    const fetchAllCountyData = async () => {
      console.log("🔄 ComparisonDashboard: Fetching data for", counties.length, "counties");

      const promises = counties.map(async (county) => {
        console.log("📍 Fetching data for:", county.name, county.state, "FIPS:", county.fips);
        console.log("📍 Coordinates:", county.latitude, county.longitude);

        try {
          const [alertsRes, severeRes, aqRes, trendsRes] = await Promise.all([
            fetch(`/api/weather-alerts?lat=${county.latitude}&lon=${county.longitude}`),
            fetch(`/api/severe-weather?lat=${county.latitude}&lon=${county.longitude}`),
            fetch(`/api/air-quality?lat=${county.latitude}&lon=${county.longitude}`),
            fetch(`/api/climate-trends?fips=${county.fips}&type=temperature`),
          ]);

          const [alertsData, severeData, aqData, trendsData] = await Promise.all([
            alertsRes.json().catch(() => ({ success: false })),
            severeRes.json().catch(() => ({ success: false })),
            aqRes.json().catch(() => ({ success: false })),
            trendsRes.json().catch(() => ({ success: false })),
          ]);

          console.log(`📊 ${county.name} API responses:`, {
            alerts: alertsData,
            severe: severeData,
            aq: aqData,
            trends: trendsData
          });

          // Calculate metrics
          const alertCount = alertsData.success ? (alertsData.alerts?.length || 0) : 0;
          const severeScore = severeData.success && severeData.indices?.cape
            ? severeData.indices.cape
            : 0;
          const aqi = aqData.success && aqData.overall?.aqi ? aqData.overall.aqi : 0;
          const tempTrend = trendsData.success && trendsData.trend?.slope
            ? trendsData.trend.slope
            : 0;

          console.log(`✅ ${county.name} metrics:`, {
            alertCount,
            severeScore,
            aqi,
            tempTrend
          });

          return {
            fips: county.fips,
            name: county.name,
            state: county.state,
            alerts: alertCount,
            severeWeatherScore: severeScore,
            airQualityAQI: aqi,
            temperatureTrend: tempTrend,
            loading: false,
            error: false,
          };
        } catch (error) {
          console.error(`Error fetching data for ${county.name}:`, error);
          return {
            fips: county.fips,
            name: county.name,
            state: county.state,
            alerts: 0,
            severeWeatherScore: 0,
            airQualityAQI: 0,
            temperatureTrend: 0,
            loading: false,
            error: true,
          };
        }
      });

      const results = await Promise.all(promises);
      console.log("🎯 Final metrics array:", results);
      setMetrics(results);
    };

    fetchAllCountyData();
  }, [counties]);

  // Prepare chart data
  const alertsChartData = metrics.map((m) => ({
    name: `${m.name}, ${m.state}`,
    alerts: m.alerts,
  }));

  const severeWeatherChartData = metrics.map((m) => ({
    name: `${m.name}, ${m.state}`,
    cape: m.severeWeatherScore,
  }));

  const airQualityChartData = metrics.map((m) => ({
    name: `${m.name}, ${m.state}`,
    aqi: m.airQualityAQI,
  }));

  const temperatureTrendChartData = metrics.map((m) => ({
    name: `${m.name}, ${m.state}`,
    trend: m.temperatureTrend,
  }));

  console.log("📊 Chart data prepared:", {
    alertsChartData,
    severeWeatherChartData,
    airQualityChartData,
    temperatureTrendChartData,
    metricsCount: metrics.length
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[9999]">
      <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg sm:rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Multi-County Comparison
            </h2>
            <p className="text-sm sm:text-base text-blue-100 mt-1">
              Comparing {counties.length} counties - {dashboardType === "atmospheric" ? "Atmospheric Science" : "Agricultural"} Data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors flex-shrink-0"
            aria-label="Close comparison"
          >
            <X size={24} className="sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-300 bg-white overflow-x-auto scrollbar-hide shadow-sm flex-shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-shrink-0 py-3 px-6 font-bold text-sm sm:text-base transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-blue-50 text-blue-700 border-b-4 border-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("detailed")}
            className={`flex-shrink-0 py-3 px-6 font-bold text-sm sm:text-base transition-all whitespace-nowrap ${
              activeTab === "detailed"
                ? "bg-blue-50 text-blue-700 border-b-4 border-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            Detailed Metrics
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Weather Alerts Comparison */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-orange-600" />
                  Active Weather Alerts
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={alertsChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="alerts" fill="#F59E0B" name="Active Alerts" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Severe Weather Comparison */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Wind size={20} className="text-red-600" />
                  Severe Weather Index (CAPE)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={severeWeatherChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="cape" fill="#DC2626" name="CAPE (J/kg)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Air Quality Comparison */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Cloud size={20} className="text-purple-600" />
                  Air Quality Index
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={airQualityChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="aqi" fill="#9333EA" name="AQI" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Temperature Trend Comparison */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-600" />
                  Temperature Trend (°F/year)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={temperatureTrendChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={120}
                      interval={0}
                      tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#374151' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="trend" fill="#3B82F6" name="Trend (°F/year)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "detailed" && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="border border-gray-300 px-4 py-3 text-left text-white font-bold">County</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-white font-bold">Alerts</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-white font-bold">CAPE (J/kg)</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-white font-bold">AQI</th>
                    <th className="border border-gray-300 px-4 py-3 text-center text-white font-bold">Temp Trend (°F/yr)</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, index) => (
                    <tr key={metric.fips} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border border-gray-300 px-4 py-3 font-bold text-gray-900">
                        {metric.name}, {metric.state}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-gray-900 font-semibold">
                        {metric.error ? "N/A" : metric.alerts}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-gray-900 font-semibold">
                        {metric.error ? "N/A" : metric.severeWeatherScore.toFixed(0)}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-gray-900 font-semibold">
                        {metric.error ? "N/A" : metric.airQualityAQI}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-gray-900 font-semibold">
                        {metric.error ? "N/A" : metric.temperatureTrend.toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

