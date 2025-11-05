'use client';

import { useEffect, useState } from 'react';
import { RegionalDashboardData } from '@/types';
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
} from 'recharts';

interface RegionalDashboardProps {
  countyFips: string;
  onClose: () => void;
}

export default function RegionalDashboard({ countyFips, onClose }: RegionalDashboardProps) {
  const [data, setData] = useState<RegionalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [countyFips]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/regional-dashboard?fips=${countyFips}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <div className="text-lg font-semibold">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-4 text-red-600">Error</h2>
          <p>{error || 'No data available'}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {data.county.name}, {data.county.state}
            </h2>
            <p className="text-gray-600">Regional Climate Dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Temperature</div>
              <div className="text-2xl font-bold">
                {data.current_climate.temperature_avg?.toFixed(1)}°C
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Soil Moisture</div>
              <div className="text-2xl font-bold">
                {data.current_climate.soil_moisture?.toFixed(0)}%
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Growing Degree Days (YTD)</div>
              <div className="text-2xl font-bold">
                {data.growing_degree_days.toFixed(0)}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Extreme Heat Days (YTD)</div>
              <div className="text-2xl font-bold">
                {data.extreme_heat_days_ytd}
              </div>
            </div>
          </div>

          {/* Precipitation Comparison */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Precipitation vs. Historical Average
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Current (YTD)</div>
                <div className="text-xl font-bold">
                  {data.precipitation_vs_avg.current.toFixed(0)} mm
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Historical Average</div>
                <div className="text-xl font-bold">
                  {data.precipitation_vs_avg.historical_avg.toFixed(0)} mm
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Difference</div>
                <div
                  className={`text-xl font-bold ${
                    data.precipitation_vs_avg.percent_difference >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {data.precipitation_vs_avg.percent_difference >= 0 ? '+' : ''}
                  {data.precipitation_vs_avg.percent_difference.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Historical Drought Trends */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Historical Drought Trends (50-Year Analysis)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.historical_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="drought_frequency"
                  stroke="#E60000"
                  name="Drought Events"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="drought_severity_avg"
                  stroke="#FF9966"
                  name="Avg Severity"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Extreme Heat Days Trend */}
          {data.historical_trends.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">
                Extreme Heat Days by Year
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.historical_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="extreme_heat_days"
                    fill="#FF6B6B"
                    name="Days >35°C"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

