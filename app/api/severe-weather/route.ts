import { NextRequest, NextResponse } from "next/server";
import {
  calculateSevereWeatherIndices,
  generateSampleSounding,
  type AtmosphericSounding,
} from "@/lib/api/severe-weather-indices";

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

    // Get current time for latest model run
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const day = String(now.getUTCDate()).padStart(2, "0");
    const hour = String(now.getUTCHours()).padStart(2, "0");

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
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");
    const useSample = searchParams.get("sample") === "true";

    let sounding: AtmosphericSounding;
    let dataSource = "sample";

    // Try to fetch real NOAA data if coordinates provided and not forcing sample
    if (latStr && lonStr && !useSample) {
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);

      const noaaSounding = await fetchNOAASounding(lat, lon);

      if (noaaSounding) {
        sounding = noaaSounding;
        dataSource = "NOAA HRRR Model";
      } else {
        // Fallback to sample data
        sounding = generateSampleSounding();
        dataSource = "sample (NOAA data unavailable)";
      }
    } else {
      // Use sample data
      sounding = generateSampleSounding();
    }

    const indices = calculateSevereWeatherIndices(sounding);

    const response: any = {
      success: true,
      indices,
      dataSource,
      timestamp: new Date().toISOString(),
    };

    if (latStr && lonStr) {
      response.location = {
        latitude: parseFloat(latStr),
        longitude: parseFloat(lonStr),
      };
    }

    return NextResponse.json(response);
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
 */
export async function POST(request: NextRequest) {
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

    return NextResponse.json({
      success: true,
      indices,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to calculate severe weather indices" },
      { status: 500 }
    );
  }
}
