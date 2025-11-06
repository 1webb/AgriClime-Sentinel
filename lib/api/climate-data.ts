import axios from "axios";
import { supabase } from "@/lib/supabase";
import { ClimateData, TemperatureAnomaly, CropYieldRiskIndex } from "@/types";

/**
 * Fetch historical climate data from Open-Meteo API
 */
export async function fetchOpenMeteoData(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
) {
  const params = {
    latitude,
    longitude,
    start_date: startDate,
    end_date: endDate,
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "temperature_2m_mean",
      "precipitation_sum",
      "soil_moisture_0_to_10cm",
    ].join(","),
    timezone: "America/Chicago",
  };

  try {
    const response = await axios.get(
      "https://archive-api.open-meteo.com/v1/archive",
      {
        params,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching Open-Meteo data:", error);
    throw error;
  }
}

/**
 * Get current climate data for a county
 */
export async function getCurrentClimateData(
  countyFips: string
): Promise<ClimateData | null> {
  const { data, error } = await supabase
    .from("climate_data")
    .select("*")
    .eq("county_fips", countyFips)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Error fetching current climate data:", error);
    return null;
  }

  return data;
}

/**
 * Get climate data for a date range
 */
export async function getClimateDataRange(
  countyFips: string,
  startDate: string,
  endDate: string
): Promise<ClimateData[]> {
  const { data, error } = await supabase
    .from("climate_data")
    .select("*")
    .eq("county_fips", countyFips)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching climate data range:", error);
    return [];
  }

  return data || [];
}

/**
 * Get current drought status for all counties using pagination
 */
export async function getCurrentDroughtStatus() {
  const allData: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("current_drought_status")
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching drought status:", error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allData.length} drought status records`);
  return allData;
}

/**
 * Get 30-day precipitation totals for all counties using pagination
 */
export async function get30DayPrecipitation() {
  const allData: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("precipitation_30day")
      .select("*")
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching 30-day precipitation:", error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allData.length} precipitation records`);
  return allData;
}

/**
 * Calculate temperature anomaly for a county
 */
export async function getTemperatureAnomaly(
  countyFips: string,
  date: string
): Promise<TemperatureAnomaly | null> {
  const { data, error } = await supabase.rpc("calculate_temperature_anomaly", {
    p_county_fips: countyFips,
    p_date: date,
  });

  if (error) {
    console.error("Error calculating temperature anomaly:", error);
    return null;
  }

  return data;
}

/**
 * Get temperature anomalies for all counties using pagination
 */
export async function getAllTemperatureAnomalies(date: string) {
  // Get current climate data - fetch all records with pagination
  const allClimateData: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("climate_data")
      .select("county_fips, temperature_avg")
      .eq("date", date)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching climate data:", error);
      break;
    }

    if (data && data.length > 0) {
      allClimateData.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  // Get baselines for current month - fetch all records with pagination
  const month = new Date(date).getMonth() + 1;
  const allBaselines: Record<string, unknown>[] = [];
  page = 0;
  hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("climate_baselines")
      .select("county_fips, temperature_avg")
      .eq("month", month)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error("Error fetching baselines:", error);
      break;
    }

    if (data && data.length > 0) {
      allBaselines.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  // Calculate anomalies
  const baselineMap = new Map(
    allBaselines.map((b) => [
      (b as { county_fips: string }).county_fips,
      (b as { temperature_avg: number }).temperature_avg,
    ])
  );

  const result = allClimateData.map((cd) => {
    const climateData = cd as { county_fips: string; temperature_avg: number };
    return {
      fips: climateData.county_fips,
      county_fips: climateData.county_fips,
      current_avg: climateData.temperature_avg,
      baseline_avg: baselineMap.get(climateData.county_fips) || 0,
      anomaly:
        climateData.temperature_avg -
        (baselineMap.get(climateData.county_fips) || 0),
    };
  });

  console.log(`Calculated ${result.length} temperature anomalies`);
  return result;
}

/**
 * Get crop yield risk index for a county and crop type
 */
export async function getCropRiskIndex(
  countyFips: string,
  cropType: string,
  date?: string
): Promise<CropYieldRiskIndex | null> {
  let query = supabase
    .from("crop_risk_index")
    .select("*")
    .eq("county_fips", countyFips)
    .eq("crop_type", cropType)
    .order("date", { ascending: false })
    .limit(1);

  if (date) {
    query = query.eq("date", date);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error("Error fetching crop risk index:", error);
    return null;
  }

  return data
    ? {
        county_fips: data.county_fips,
        crop_type: data.crop_type,
        risk_score: data.risk_score,
        factors: {
          rainfall_deficit: data.rainfall_deficit_score,
          soil_moisture_stress: data.soil_moisture_score,
          heat_stress: data.heat_stress_score,
          drought_severity: data.drought_severity_score,
        },
        growth_stage: data.growth_stage,
      }
    : null;
}

/**
 * Get crop risk indices for all counties for a specific crop using pagination
 */
export async function getAllCropRiskIndices(cropType: string, date?: string) {
  const allData: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("crop_risk_index")
      .select("*")
      .eq("crop_type", cropType)
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (date) {
      query = query.eq("date", date);
    } else {
      // Get most recent for each county
      query = query.order("date", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching crop risk indices:", error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allData.length} crop risk records for ${cropType}`);
  return allData;
}

/**
 * Get historical drought events for a county
 */
export async function getDroughtEvents(countyFips: string, startYear?: number) {
  let query = supabase
    .from("drought_events")
    .select("*")
    .eq("county_fips", countyFips)
    .order("start_date", { ascending: true });

  if (startYear) {
    query = query.gte("start_date", `${startYear}-01-01`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching drought events:", error);
    return [];
  }

  return data || [];
}

/**
 * Get growing degree days for a county
 */
export async function getGrowingDegreeDays(
  countyFips: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("growing_degree_days")
    .select("*")
    .eq("county_fips", countyFips)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching GDD data:", error);
    return [];
  }

  return data || [];
}

/**
 * Calculate year-to-date GDD sum
 */
export async function getYTDGrowingDegreeDays(countyFips: string) {
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = new Date().toISOString().split("T")[0];

  const gddData = await getGrowingDegreeDays(countyFips, startDate, endDate);

  return gddData.reduce((sum, record) => sum + (record.gdd_value || 0), 0);
}
