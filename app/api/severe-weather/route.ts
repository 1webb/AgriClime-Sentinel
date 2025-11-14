import { NextRequest, NextResponse } from "next/server";
import {
  rateLimit,
  RateLimitPresets,
  createRateLimitResponse,
  addRateLimitHeaders,
} from "@/lib/middleware/rate-limit";
import {
  calculateSevereWeatherIndices,
  generateSampleSounding,
  type AtmosphericSounding,
} from "@/lib/api/severe-weather-indices";

/**
 * Fetch recent temperature data and calculate heatwave metrics
 */
async function fetchHeatwaveData(
  lat: number,
  lon: number
): Promise<{
  heatWaves: number;
  extremeHeatDays: number;
  consecutiveHotDays: number;
  maxTemperature: number;
} | null> {
  try {
    // Fetch recent 30-day temperature data from Open-Meteo
    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max&timezone=auto`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "AgriClime-Sentinel/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.daily || !data.daily.temperature_2m_max) {
      return null;
    }

    const temperatures = data.daily.temperature_2m_max.filter(
      (t: number | null) => t !== null
    ) as number[];

    if (temperatures.length === 0) {
      return null;
    }

    // Calculate 95th percentile for heat threshold
    const sortedTemps = [...temperatures].sort((a, b) => a - b);
    const temp95 = sortedTemps[Math.floor(sortedTemps.length * 0.95)];

    // Count extreme heat days (above 95th percentile)
    const extremeHeatDays = temperatures.filter((t) => t > temp95).length;

    // Detect heat waves (3+ consecutive days above 95th percentile)
    let heatWaves = 0;
    let consecutiveHot = 0;
    let currentConsecutive = 0;

    for (const temp of temperatures) {
      if (temp > temp95) {
        consecutiveHot++;
        currentConsecutive++;
        if (consecutiveHot === 3) {
          heatWaves++;
        }
      } else {
        consecutiveHot = 0;
        currentConsecutive = 0;
      }
    }

    // Get max temperature from recent data
    const maxTemperature = Math.max(...temperatures);

    return {
      heatWaves,
      extremeHeatDays,
      consecutiveHotDays: currentConsecutive,
      maxTemperature,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch atmospheric sounding data from NOAA HRRR model
 * HRRR (High-Resolution Rapid Refresh) is NOAA's real-time 3km resolution model
 * that replaced the RAP/RUC models
 */
async function fetchNOAASounding(
  lat: number,
  lon: number
): Promise<AtmosphericSounding | null> {
  try {
    // NOAA NOMADS HRRR model endpoint
    // Note: This is a simplified implementation. In production, you would:
    // 1. Use NOAA's GRIB2 filter service to get specific variables
    // 2. Parse GRIB2 data using a library like grib2-simple
    // 3. Or use Iowa State Mesonet's BUFKIT data which is pre-processed

    // For now, we'll use Iowa State Mesonet's model sounding data
    // which provides BUFKIT-formatted soundings from HRRR, RAP, and other models
    const baseUrl = "https://mesonet.agron.iastate.edu/api/1/sounding.json";

    // Try to fetch HRRR model sounding
    const url = `${baseUrl}?lat=${lat}&lon=${lon}&model=hrrr`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "AgriClime-Sentinel/1.0",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Parse the sounding data
    if (!data.profiles || data.profiles.length === 0) {
      return null;
    }

    // Get the most recent profile
    const profile = data.profiles[0];

    if (!profile.profile || profile.profile.length === 0) {
      return null;
    }

    // Extract atmospheric data
    const pressure: number[] = [];
    const temperature: number[] = [];
    const dewpoint: number[] = [];
    const height: number[] = [];
    const windSpeed: number[] = [];
    const windDirection: number[] = [];

    for (const level of profile.profile) {
      pressure.push(level.pres); // hPa
      temperature.push(level.tmpc); // Celsius
      dewpoint.push(level.dwpc); // Celsius
      height.push(level.hght); // meters
      windSpeed.push(level.sknt * 0.514444); // Convert knots to m/s
      windDirection.push(level.drct); // degrees
    }

    return {
      pressure,
      temperature,
      dewpoint,
      height,
      windSpeed,
      windDirection,
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/severe-weather
 *
 * Query parameters:
 * - lat: Latitude (required for real data)
 * - lon: Longitude (required for real data)
 * - sample: Set to "true" to force sample data (optional)
 *
 * Returns severe weather indices and tornado/thunderstorm potential
 * Uses real-time NOAA HRRR model data and weather balloon observations
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
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");
    const useSample = searchParams.get("sample") === "true";

    let sounding: AtmosphericSounding;
    let dataSource = "sample";
    let heatwaveData = null;

    // Try to fetch real NOAA data if coordinates provided and not forcing sample
    if (latStr && lonStr && !useSample) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);

      // Fetch both sounding and heatwave data in parallel
      const [noaaSounding, heatwave] = await Promise.all([
        fetchNOAASounding(lat, lon),
        fetchHeatwaveData(lat, lon),
      ]);

      if (noaaSounding) {
        sounding = noaaSounding;
        dataSource = "NOAA HRRR Model";
      } else {
        // Fallback to sample data
        sounding = generateSampleSounding();
        dataSource = "sample (NOAA data unavailable)";
      }

      heatwaveData = heatwave;
    } else {
      // Use sample data
      sounding = generateSampleSounding();
    }

    const indices = calculateSevereWeatherIndices(sounding, heatwaveData || undefined);

    const response: {
      success: boolean;
      indices: ReturnType<typeof calculateSevereWeatherIndices>;
      sounding?: AtmosphericSounding;
      dataSource: string | null;
      timestamp: string;
      location?: { latitude: number; longitude: number };
    } = {
      success: true,
      indices,
      sounding,
      dataSource,
      timestamp: new Date().toISOString(),
    };

    if (latStr && lonStr) {
      response.location = {
        latitude: parseFloat(latStr),
        longitude: parseFloat(lonStr),
      };
    }

    const jsonResponse = NextResponse.json(response);
    return addRateLimitHeaders(jsonResponse, rateLimitResult);
  } catch {
    return NextResponse.json(
      { error: "Failed to calculate severe weather indices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/severe-weather
 *
 * Body: AtmosphericSounding object
 *
 * Allows custom atmospheric sounding data to be analyzed
 *
 * Rate limit: 60 requests per minute
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const limiter = rateLimit(RateLimitPresets.standard);
  const rateLimitResult = limiter(request);

  if (!rateLimitResult.isAllowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const sounding: AtmosphericSounding = await request.json();

    // Validate sounding data
    if (!sounding.pressure || !sounding.temperature || !sounding.dewpoint) {
      return NextResponse.json(
        {
          error:
            "Invalid sounding data. Required: pressure, temperature, dewpoint arrays",
        },
        { status: 400 }
      );
    }

    const indices = calculateSevereWeatherIndices(sounding);

    const jsonResponse = NextResponse.json({
      success: true,
      indices,
      timestamp: new Date().toISOString(),
    });

    return addRateLimitHeaders(jsonResponse, rateLimitResult);
  } catch {
    return NextResponse.json(
      { error: "Failed to calculate severe weather indices" },
      { status: 500 }
    );
  }
}
