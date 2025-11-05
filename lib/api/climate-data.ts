import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { ClimateData, TemperatureAnomaly, CropYieldRiskIndex } from '@/types';

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
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'precipitation_sum',
      'soil_moisture_0_to_10cm',
    ].join(','),
    timezone: 'America/Chicago',
  };

  try {
    const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', error);
    throw error;
  }
}

/**
 * Get current climate data for a county
 */
export async function getCurrentClimateData(countyFips: string): Promise<ClimateData | null> {
  const { data, error } = await supabase
    .from('climate_data')
    .select('*')
    .eq('county_fips', countyFips)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching current climate data:', error);
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
    .from('climate_data')
    .select('*')
    .eq('county_fips', countyFips)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching climate data range:', error);
    return [];
  }

  return data || [];
}

/**
 * Get current drought status for all counties
 */
export async function getCurrentDroughtStatus() {
  const { data, error } = await supabase
    .from('current_drought_status')
    .select('*');

  if (error) {
    console.error('Error fetching drought status:', error);
    return [];
  }

  return data || [];
}

/**
 * Get 30-day precipitation totals for all counties
 */
export async function get30DayPrecipitation() {
  const { data, error } = await supabase
    .from('precipitation_30day')
    .select('*');

  if (error) {
    console.error('Error fetching 30-day precipitation:', error);
    return [];
  }

  return data || [];
}

/**
 * Calculate temperature anomaly for a county
 */
export async function getTemperatureAnomaly(
  countyFips: string,
  date: string
): Promise<TemperatureAnomaly | null> {
  const { data, error } = await supabase.rpc('calculate_temperature_anomaly', {
    p_county_fips: countyFips,
    p_date: date,
  });

  if (error) {
    console.error('Error calculating temperature anomaly:', error);
    return null;
  }

  return data;
}

/**
 * Get temperature anomalies for all counties
 */
export async function getAllTemperatureAnomalies(date: string) {
  // Get current climate data
  const { data: climateData, error: climateError } = await supabase
    .from('climate_data')
    .select('county_fips, temperature_avg')
    .eq('date', date);

  if (climateError) {
    console.error('Error fetching climate data:', climateError);
    return [];
  }

  // Get baselines for current month
  const month = new Date(date).getMonth() + 1;
  const { data: baselines, error: baselineError } = await supabase
    .from('climate_baselines')
    .select('county_fips, temperature_avg')
    .eq('month', month);

  if (baselineError) {
    console.error('Error fetching baselines:', baselineError);
    return [];
  }

  // Calculate anomalies
  const baselineMap = new Map(
    baselines?.map((b) => [b.county_fips, b.temperature_avg]) || []
  );

  return (
    climateData?.map((cd) => ({
      county_fips: cd.county_fips,
      current_avg: cd.temperature_avg,
      baseline_avg: baselineMap.get(cd.county_fips) || 0,
      anomaly: cd.temperature_avg - (baselineMap.get(cd.county_fips) || 0),
    })) || []
  );
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
    .from('crop_risk_index')
    .select('*')
    .eq('county_fips', countyFips)
    .eq('crop_type', cropType)
    .order('date', { ascending: false })
    .limit(1);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('Error fetching crop risk index:', error);
    return null;
  }

  return data ? {
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
  } : null;
}

/**
 * Get crop risk indices for all counties for a specific crop
 */
export async function getAllCropRiskIndices(cropType: string, date?: string) {
  let query = supabase
    .from('crop_risk_index')
    .select('*')
    .eq('crop_type', cropType);

  if (date) {
    query = query.eq('date', date);
  } else {
    // Get most recent for each county
    query = query.order('date', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching crop risk indices:', error);
    return [];
  }

  return data || [];
}

/**
 * Get historical drought events for a county
 */
export async function getDroughtEvents(countyFips: string, startYear?: number) {
  let query = supabase
    .from('drought_events')
    .select('*')
    .eq('county_fips', countyFips)
    .order('start_date', { ascending: true });

  if (startYear) {
    query = query.gte('start_date', `${startYear}-01-01`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching drought events:', error);
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
    .from('growing_degree_days')
    .select('*')
    .eq('county_fips', countyFips)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching GDD data:', error);
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
  const endDate = new Date().toISOString().split('T')[0];

  const gddData = await getGrowingDegreeDays(countyFips, startDate, endDate);
  
  return gddData.reduce((sum, record) => sum + (record.gdd_value || 0), 0);
}

