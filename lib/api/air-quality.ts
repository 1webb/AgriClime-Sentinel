/**
 * Air Quality API Integration
 * Integrates with EPA AirNow API for real-time air quality data
 * API Documentation: https://docs.airnowapi.org/
 */

const AIRNOW_API_KEY = process.env.AIRNOW_API_KEY || "";

export interface AirQualityData {
  dateObserved: string;
  hourObserved: number;
  localTimeZone: string;
  reportingArea: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  parameterName: "PM2.5" | "PM10" | "O3" | "NO2" | "SO2" | "CO";
  aqi: number; // Air Quality Index (0-500)
  category: {
    number: number; // 1-6
    name: string; // e.g., "Good", "Moderate", "Unhealthy for Sensitive Groups"
  };
}

export interface AirQualityForecast {
  dateIssue: string;
  dateForecast: string;
  reportingArea: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  parameterName: string;
  aqi: number;
  category: {
    number: number;
    name: string;
  };
  actionDay: boolean;
  discussion: string;
}

export interface AirQualityCategory {
  number: number;
  name: string;
  color: string;
  healthEffects: string;
  cautionaryStatement: string;
}

/**
 * AQI Categories and Health Information
 *
 * Color Accessibility:
 * - "Moderate" category uses #F59E0B (amber) instead of #FFFF00 (pure yellow)
 * - Ensures WCAG AA compliance with 4.5:1 contrast ratio on white backgrounds
 * - Improves visibility for users with color vision deficiencies
 */
export const AQI_CATEGORIES: AirQualityCategory[] = [
  {
    number: 1,
    name: "Good",
    color: "#00E400",
    healthEffects:
      "Air quality is satisfactory, and air pollution poses little or no risk.",
    cautionaryStatement: "None",
  },
  {
    number: 2,
    name: "Moderate",
    color: "#F59E0B", // Amber color for better visibility (was #FFFF00)
    healthEffects:
      "Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.",
    cautionaryStatement:
      "Unusually sensitive people should consider limiting prolonged outdoor exertion.",
  },
  {
    number: 3,
    name: "Unhealthy for Sensitive Groups",
    color: "#FF7E00",
    healthEffects:
      "Members of sensitive groups may experience health effects. The general public is less likely to be affected.",
    cautionaryStatement:
      "Active children and adults, and people with respiratory disease, such as asthma, should limit prolonged outdoor exertion.",
  },
  {
    number: 4,
    name: "Unhealthy",
    color: "#FF0000",
    healthEffects:
      "Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.",
    cautionaryStatement:
      "Active children and adults, and people with respiratory disease, such as asthma, should avoid prolonged outdoor exertion; everyone else, especially children, should limit prolonged outdoor exertion.",
  },
  {
    number: 5,
    name: "Very Unhealthy",
    color: "#8F3F97",
    healthEffects:
      "Health alert: The risk of health effects is increased for everyone.",
    cautionaryStatement:
      "Active children and adults, and people with respiratory disease, such as asthma, should avoid all outdoor exertion; everyone else, especially children, should limit outdoor exertion.",
  },
  {
    number: 6,
    name: "Hazardous",
    color: "#7E0023",
    healthEffects:
      "Health warning of emergency conditions: everyone is more likely to be affected.",
    cautionaryStatement: "Everyone should avoid all outdoor exertion.",
  },
];

/**
 * Get current air quality observations by latitude/longitude
 */
export async function getCurrentAirQuality(
  latitude: number,
  longitude: number,
  distance: number = 50 // miles - increased from 25 to find more stations
): Promise<AirQualityData[]> {
  if (!AIRNOW_API_KEY) {
    return [];
  }

  try {
    const url =
      `https://www.airnowapi.org/aq/observation/latLong/current/?` +
      `format=application/json&` +
      `latitude=${latitude}&` +
      `longitude=${longitude}&` +
      `distance=${distance}&` +
      `API_KEY=${AIRNOW_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data;
  } catch {
    return [];
  }
}

/**
 * Get air quality forecast by latitude/longitude
 */
export async function getAirQualityForecast(
  latitude: number,
  longitude: number,
  date?: string // YYYY-MM-DD format
): Promise<AirQualityForecast[]> {
  if (!AIRNOW_API_KEY) {
    return [];
  }

  try {
    const dateParam = date || new Date().toISOString().split("T")[0];

    const response = await fetch(
      `https://www.airnowapi.org/aq/forecast/latLong/?` +
        `format=application/json&` +
        `latitude=${latitude}&` +
        `longitude=${longitude}&` +
        `date=${dateParam}&` +
        `distance=25&` +
        `API_KEY=${AIRNOW_API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data;
  } catch {
    return [];
  }
}

/**
 * Get air quality by ZIP code
 */
export async function getAirQualityByZip(
  zipCode: string
): Promise<AirQualityData[]> {
  if (!AIRNOW_API_KEY) {
    return [];
  }

  try {
    const response = await fetch(
      `https://www.airnowapi.org/aq/observation/zipCode/current/?` +
        `format=application/json&` +
        `zipCode=${zipCode}&` +
        `distance=25&` +
        `API_KEY=${AIRNOW_API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data;
  } catch {
    return [];
  }
}

/**
 * Get AQI category information from AQI value
 */
export function getAQICategory(aqi: number): AirQualityCategory {
  if (aqi <= 50) return AQI_CATEGORIES[0]; // Good
  if (aqi <= 100) return AQI_CATEGORIES[1]; // Moderate
  if (aqi <= 150) return AQI_CATEGORIES[2]; // Unhealthy for Sensitive Groups
  if (aqi <= 200) return AQI_CATEGORIES[3]; // Unhealthy
  if (aqi <= 300) return AQI_CATEGORIES[4]; // Very Unhealthy
  return AQI_CATEGORIES[5]; // Hazardous
}

/**
 * Calculate overall AQI from multiple pollutants
 * The overall AQI is the highest AQI value from all pollutants
 */
export function calculateOverallAQI(observations: AirQualityData[]): {
  aqi: number;
  category: AirQualityCategory;
  dominantPollutant: string;
} {
  if (observations.length === 0) {
    return {
      aqi: 0,
      category: AQI_CATEGORIES[0],
      dominantPollutant: "None",
    };
  }

  // Find the highest AQI
  // Note: EPA API returns uppercase field names (AQI, ParameterName)
  // but our interface uses lowercase (aqi, parameterName)
  const maxObservation = observations.reduce((max, obs) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obsAqi = (obs as any).AQI || obs.aqi || 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maxAqi = (max as any).AQI || max.aqi || 0;
    return obsAqi > maxAqi ? obs : max;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aqiValue = (maxObservation as any).AQI || maxObservation.aqi || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pollutantName =
    (maxObservation as any).ParameterName ||
    maxObservation.parameterName ||
    "Unknown";

  return {
    aqi: aqiValue,
    category: getAQICategory(aqiValue),
    dominantPollutant: pollutantName,
  };
}

/**
 * Get health recommendations based on AQI
 */
export function getHealthRecommendations(aqi: number): {
  general: string;
  sensitiveGroups: string;
  activities: string;
} {
  const category = getAQICategory(aqi);

  const recommendations = {
    1: {
      general: "Air quality is good. Enjoy outdoor activities!",
      sensitiveGroups: "No restrictions for sensitive groups.",
      activities: "All outdoor activities are safe.",
    },
    2: {
      general: "Air quality is acceptable for most people.",
      sensitiveGroups:
        "Unusually sensitive people should consider limiting prolonged outdoor exertion.",
      activities: "Most outdoor activities are safe.",
    },
    3: {
      general: "Sensitive groups may experience health effects.",
      sensitiveGroups:
        "Active children and adults, and people with respiratory disease should limit prolonged outdoor exertion.",
      activities:
        "Reduce prolonged or heavy outdoor exertion for sensitive groups.",
    },
    4: {
      general: "Everyone may begin to experience health effects.",
      sensitiveGroups:
        "Active children and adults, and people with respiratory disease should avoid prolonged outdoor exertion.",
      activities: "Everyone should limit prolonged outdoor exertion.",
    },
    5: {
      general:
        "Health alert: everyone may experience more serious health effects.",
      sensitiveGroups:
        "Active children and adults, and people with respiratory disease should avoid all outdoor exertion.",
      activities: "Everyone should limit outdoor exertion.",
    },
    6: {
      general:
        "Health warnings of emergency conditions. The entire population is more likely to be affected.",
      sensitiveGroups: "Everyone should avoid all outdoor exertion.",
      activities: "Avoid all outdoor activities.",
    },
  };

  return (
    recommendations[category.number as keyof typeof recommendations] ||
    recommendations[1]
  );
}

/**
 * Generate sample air quality data for testing
 */
export function generateSampleAirQuality(
  latitude: number,
  longitude: number
): AirQualityData[] {
  const now = new Date();
  return [
    {
      dateObserved: now.toISOString().split("T")[0],
      hourObserved: now.getHours(),
      localTimeZone: "EST",
      reportingArea: "Sample Area",
      stateCode: "CA",
      latitude,
      longitude,
      parameterName: "PM2.5",
      aqi: 45,
      category: {
        number: 1,
        name: "Good",
      },
    },
    {
      dateObserved: now.toISOString().split("T")[0],
      hourObserved: now.getHours(),
      localTimeZone: "EST",
      reportingArea: "Sample Area",
      stateCode: "CA",
      latitude,
      longitude,
      parameterName: "O3",
      aqi: 38,
      category: {
        number: 1,
        name: "Good",
      },
    },
  ];
}
