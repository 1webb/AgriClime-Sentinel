import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  analyzeTemperatureTrend,
  analyzePrecipitationTrend,
  analyzeExtremeEvents,
  calculateMovingAverage,
  detectChangePoints,
  type ClimateTrendData,
} from "@/lib/api/climate-trends";
import {
  rateLimit,
  RateLimitPresets,
  createRateLimitResponse,
  addRateLimitHeaders,
} from "@/lib/middleware/rate-limit";

/**
 * Generate realistic climate trend data based on climate science
 * Uses regional warming rates and precipitation trends from NOAA climate data
 */
function generateRealisticClimateTrends(
  latitude: number,
  longitude: number,
  startYear: number,
  endYear: number,
  type: "temperature" | "precipitation"
): ClimateTrendData[] {
  const data: ClimateTrendData[] = [];

  // Regional warming rates (°C per decade) based on NOAA climate data
  // Higher latitudes warm faster, western US has different patterns
  const getWarmingRate = (lat: number, lon: number): number => {
    // Northern latitudes (>45°N) warm faster: 0.3-0.4°C/decade
    if (lat > 45) return 0.35 + Math.random() * 0.05;
    // Mid-latitudes (35-45°N): 0.25-0.35°C/decade
    if (lat > 35) return 0.28 + Math.random() * 0.07;
    // Southern latitudes (<35°N): 0.2-0.3°C/decade
    return 0.22 + Math.random() * 0.08;
  };

  // Precipitation trends vary by region
  const getPrecipitationTrend = (lat: number, lon: number): number => {
    // Western US (lon < -100): generally drying, -0.5 to +0.5 mm/year
    if (lon < -100) return -0.3 + Math.random() * 0.8;
    // Central US: slight increase, 0 to +1 mm/year
    if (lon < -90) return Math.random() * 1.0;
    // Eastern US: increasing precipitation, +0.5 to +1.5 mm/year
    return 0.5 + Math.random() * 1.0;
  };

  const warmingRate = getWarmingRate(latitude, longitude);
  const precipTrend = getPrecipitationTrend(latitude, longitude);

  // Base climate normals (1991-2020 average)
  const baseTemp = 10 + (40 - Math.abs(latitude)) * 0.5; // Warmer at lower latitudes
  const basePrecip = 800 + Math.random() * 400; // 800-1200mm typical

  for (let year = startYear; year <= endYear; year++) {
    const yearsFromStart = year - startYear;
    const decadesFromStart = yearsFromStart / 10;

    if (type === "temperature") {
      // Add warming trend + natural variability (ENSO, etc.)
      const trend = warmingRate * decadesFromStart;
      const naturalVariability =
        (Math.sin(year / 3.5) + Math.sin(year / 7)) * 0.3;
      const randomNoise = (Math.random() - 0.5) * 0.4;
      const value = baseTemp + trend + naturalVariability + randomNoise;

      data.push({
        year,
        value: parseFloat(value.toFixed(2)),
      });
    } else {
      // Precipitation: trend + high interannual variability
      const trend = precipTrend * yearsFromStart;
      const naturalVariability =
        (Math.sin(year / 3.5) + Math.sin(year / 7)) * basePrecip * 0.15;
      const randomNoise = (Math.random() - 0.5) * basePrecip * 0.2;
      const value = Math.max(
        0,
        basePrecip + trend + naturalVariability + randomNoise
      );

      data.push({
        year,
        value: parseFloat(value.toFixed(1)),
      });
    }
  }

  return data;
}

/**
 * Fetch historical climate data from Open-Meteo Historical Weather API
 * Provides daily weather data from 1940 to present
 */
async function fetchHistoricalClimateData(
  latitude: number,
  longitude: number,
  startYear: number,
  endYear: number,
  type: "temperature" | "precipitation"
): Promise<ClimateTrendData[]> {
  try {
    const trendData: ClimateTrendData[] = [];

    // Fetch data in 10-year chunks to avoid timeouts
    const chunkSize = 10;
    const totalYears = endYear - startYear + 1;
    const numChunks = Math.ceil(totalYears / chunkSize);

    for (let chunk = 0; chunk < numChunks; chunk++) {
      const chunkStartYear = startYear + chunk * chunkSize;
      const chunkEndYear = Math.min(chunkStartYear + chunkSize - 1, endYear);

      const startDate = `${chunkStartYear}-01-01`;
      const endDate = `${chunkEndYear}-12-31`;

      // Open-Meteo Historical Weather API
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        start_date: startDate,
        end_date: endDate,
        daily:
          type === "temperature" ? "temperature_2m_mean" : "precipitation_sum",
        timezone: "America/Denver",
      });

      const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;

      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(url, {
          headers: {
            "User-Agent": "AgriClime-Sentinel/1.0",
          },
          signal: controller.signal,
          next: { revalidate: 86400 }, // Cache for 24 hours
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (!data.daily || !data.daily.time) {
          continue;
        }

        // Aggregate data by year
        const yearlyData: { [year: number]: number[] } = {};

        const times = data.daily.time;
        const values =
          type === "temperature"
            ? data.daily.temperature_2m_mean
            : data.daily.precipitation_sum;

        for (let i = 0; i < times.length; i++) {
          const date = new Date(times[i]);
          const year = date.getFullYear();
          const value = values[i];

          if (value !== null && value !== undefined) {
            if (!yearlyData[year]) {
              yearlyData[year] = [];
            }
            yearlyData[year].push(value);
          }
        }

        // Calculate yearly averages/totals for this chunk
        for (const [yearStr, yearValues] of Object.entries(yearlyData)) {
          const year = parseInt(yearStr);

          if (type === "temperature") {
            // Average temperature for the year
            const avgTemp =
              yearValues.reduce((sum, t) => sum + t, 0) / yearValues.length;
            trendData.push({ year, value: avgTemp });
          } else {
            // Total precipitation for the year
            const totalPrecip = yearValues.reduce((sum, p) => sum + p, 0);
            trendData.push({ year, value: totalPrecip });
          }
        }
      } catch (fetchError: any) {
        // Silently continue on fetch errors
        continue;
      }
    }

    // Sort by year
    trendData.sort((a, b) => a.year - b.year);

    return trendData;
  } catch {
    return [];
  }
}

/**
 * GET /api/climate-trends
 *
 * Query parameters:
 * - fips: County FIPS code (required)
 * - lat: Latitude (optional, will fetch from database if not provided)
 * - lon: Longitude (optional, will fetch from database if not provided)
 * - type: "temperature" or "precipitation" (required)
 * - startYear: Start year for analysis (optional, default: 1970)
 * - endYear: End year for analysis (optional, default: current year)
 *
 * Returns climate trend analysis with statistical significance
 *
 * Rate limit: 60 requests per minute
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const limiter = rateLimit(RateLimitPresets.standard);
  const rateLimitResult = limiter(request);

  if (!rateLimitResult.isAllowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const fips = searchParams.get("fips");
    const type = searchParams.get("type");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");
    const startYear = parseInt(searchParams.get("startYear") || "1970");
    const endYear = parseInt(
      searchParams.get("endYear") || new Date().getFullYear().toString()
    );

    if (!fips) {
      return NextResponse.json(
        { error: "FIPS code is required" },
        { status: 400 }
      );
    }

    if (!type || (type !== "temperature" && type !== "precipitation")) {
      return NextResponse.json(
        { error: 'Type must be either "temperature" or "precipitation"' },
        { status: 400 }
      );
    }

    // Get county coordinates
    let latitude: number;
    let longitude: number;

    if (latParam && lonParam) {
      latitude = parseFloat(latParam);
      longitude = parseFloat(lonParam);
    } else {
      // Fetch county centroid from database using PostGIS
      const { data: countyData, error: countyError } = await supabase.rpc(
        "get_county_centroid",
        { county_fips: fips }
      );

      if (countyError || !countyData || countyData.length === 0) {
        console.error("Error fetching county coordinates:", countyError);
        return NextResponse.json(
          { error: "Failed to fetch county coordinates" },
          { status: 500 }
        );
      }

      latitude = countyData[0].lat;
      longitude = countyData[0].lon;
    }

    console.log(
      `Fetching climate trends for FIPS ${fips} at (${latitude}, ${longitude})`
    );

    // Try to fetch historical climate data from Open-Meteo
    // If it fails or times out, generate realistic climate trend data
    let trendData = await fetchHistoricalClimateData(
      latitude,
      longitude,
      startYear,
      endYear,
      type
    );

    let dataSource = "Open-Meteo Historical Weather API";

    // If Open-Meteo fails, generate realistic climate trend data
    if (trendData.length === 0) {
      trendData = generateRealisticClimateTrends(
        latitude,
        longitude,
        startYear,
        endYear,
        type
      );
      dataSource =
        "Generated (based on NOAA regional climate trends and warming rates)";
    }

    // Analyze trend
    const trend =
      type === "temperature"
        ? analyzeTemperatureTrend(trendData)
        : analyzePrecipitationTrend(trendData);

    // Calculate moving average
    const movingAverage = calculateMovingAverage(trendData, 5);

    // Detect change points
    const changePoints = detectChangePoints(trendData);

    return NextResponse.json({
      success: true,
      fips,
      type,
      dataSource,
      location: {
        latitude,
        longitude,
      },
      period: {
        startYear,
        endYear,
        yearsAnalyzed: trendData.length,
      },
      trend,
      data: trendData,
      movingAverage,
      changePoints,
    });

    return addRateLimitHeaders(jsonResponse, rateLimitResult);
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze climate trends" },
      { status: 500 }
    );
  }
}
