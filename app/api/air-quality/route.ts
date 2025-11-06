import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentAirQuality,
  getAirQualityForecast,
  getAirQualityByZip,
  calculateOverallAQI,
  getHealthRecommendations,
  getAQICategory,
} from "@/lib/api/air-quality";
import {
  rateLimit,
  RateLimitPresets,
  createRateLimitResponse,
  addRateLimitHeaders,
} from "@/lib/middleware/rate-limit";

/**
 * GET /api/air-quality
 *
 * Query parameters:
 * - lat: Latitude (optional)
 * - lon: Longitude (optional)
 * - zip: ZIP code (optional)
 * - forecast: Set to "true" for forecast data (optional)
 * - date: Forecast date in YYYY-MM-DD format (optional, defaults to today)
 *
 * Returns air quality data from EPA AirNow API
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
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const zip = searchParams.get("zip");
    const forecast = searchParams.get("forecast") === "true";
    const date = searchParams.get("date");

    // Get air quality by ZIP code
    if (zip) {
      const observations = await getAirQualityByZip(zip);

      if (observations.length === 0) {
        return NextResponse.json({
          success: true,
          zip,
          message: "No air quality data available for this location",
          observations: [],
        });
      }

      // Enrich observations with full category object (including color)
      const enrichedObservations = observations.map((obs) => ({
        ...obs,
        category: getAQICategory(obs.aqi),
      }));

      const overall = calculateOverallAQI(observations);
      const recommendations = getHealthRecommendations(overall.aqi);

      return NextResponse.json({
        success: true,
        zip,
        overall,
        recommendations,
        observations: enrichedObservations,
      });
    }

    // Get air quality by lat/lon
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: "Invalid latitude or longitude" },
          { status: 400 }
        );
      }

      // Get forecast or current observations
      if (forecast) {
        const forecastData = await getAirQualityForecast(
          latitude,
          longitude,
          date || undefined
        );

        return NextResponse.json({
          success: true,
          location: { latitude, longitude },
          type: "forecast",
          date: date || new Date().toISOString().split("T")[0],
          forecasts: forecastData,
        });
      } else {
        const observations = await getCurrentAirQuality(latitude, longitude);

        if (observations.length === 0) {
          return NextResponse.json({
            success: true,
            location: { latitude, longitude },
            message: "No air quality data available for this location",
            observations: [],
          });
        }

        // Enrich observations with full category object (including color)
        const enrichedObservations = observations.map((obs) => ({
          ...obs,
          category: getAQICategory(obs.aqi),
        }));

        const overall = calculateOverallAQI(observations);
        const recommendations = getHealthRecommendations(overall.aqi);

        const response = NextResponse.json({
          success: true,
          location: { latitude, longitude },
          overall,
          recommendations,
          observations: enrichedObservations,
        });

        return addRateLimitHeaders(response, rateLimitResult);
      }
    }

    return NextResponse.json(
      { error: "Please provide either lat/lon or zip code" },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch air quality data" },
      { status: 500 }
    );
  }
}
