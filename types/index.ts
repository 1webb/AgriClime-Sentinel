// Core data types for AgriClime Sentinel

export interface County {
  id: string;
  name: string;
  state: string;
  fips: string;
  geometry: GeoJSON.Geometry;
}

export interface ClimateData {
  id: string;
  county_fips: string;
  date: string;
  temperature_avg: number;
  temperature_max: number;
  temperature_min: number;
  precipitation: number;
  soil_moisture: number;
  drought_index: number;
  created_at: string;
}

export interface DroughtStatus {
  level: 0 | 1 | 2 | 3 | 4 | 5; // 0=None, 1=D0, 2=D1, 3=D2, 4=D3, 5=D4
  label: string;
  color: string;
}

export interface TemperatureAnomaly {
  county_fips: string;
  anomaly: number; // Deviation from 30-year average
  baseline_avg: number;
  current_avg: number;
}

export interface CropYieldRiskIndex {
  county_fips: string;
  crop_type: CropType;
  risk_score: number; // 0-100, higher = more risk
  factors: {
    rainfall_deficit: number;
    soil_moisture_stress: number;
    heat_stress: number;
    drought_severity: number;
  };
  growth_stage: string;
}

export type CropType = 'corn' | 'wheat' | 'soybeans' | 'cotton' | 'rice';

export interface HistoricalTrend {
  year: number;
  drought_frequency: number; // Number of drought events
  drought_severity_avg: number; // Average severity (0-5)
  extreme_heat_days: number;
  precipitation_total: number;
}

export interface RegionalDashboardData {
  county: County;
  current_climate: ClimateData;
  historical_trends: HistoricalTrend[];
  growing_degree_days: number;
  extreme_heat_days_ytd: number;
  precipitation_vs_avg: {
    current: number;
    historical_avg: number;
    percent_difference: number;
  };
}

export type MapDataLayer = 
  | 'drought' 
  | 'soil_moisture' 
  | 'precipitation_30day' 
  | 'temperature_anomaly'
  | 'crop_risk';

export interface MapLayerConfig {
  id: MapDataLayer;
  name: string;
  description: string;
  colorScale: string[];
  valueRange: [number, number];
  unit: string;
}

