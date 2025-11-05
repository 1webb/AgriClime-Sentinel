import { MapLayerConfig, DroughtStatus } from '@/types';

// Drought status levels based on U.S. Drought Monitor
export const DROUGHT_LEVELS: Record<number, DroughtStatus> = {
  0: { level: 0, label: 'None', color: '#FFFFFF' },
  1: { level: 1, label: 'D0 - Abnormally Dry', color: '#FFFF00' },
  2: { level: 2, label: 'D1 - Moderate Drought', color: '#FCD37F' },
  3: { level: 3, label: 'D2 - Severe Drought', color: '#FFAA00' },
  4: { level: 4, label: 'D3 - Extreme Drought', color: '#E60000' },
  5: { level: 5, label: 'D4 - Exceptional Drought', color: '#730000' },
};

// Map layer configurations
export const MAP_LAYERS: Record<string, MapLayerConfig> = {
  drought: {
    id: 'drought',
    name: 'Drought Status',
    description: 'Current drought conditions based on U.S. Drought Monitor classification',
    colorScale: ['#FFFFFF', '#FFFF00', '#FCD37F', '#FFAA00', '#E60000', '#730000'],
    valueRange: [0, 5],
    unit: 'Drought Level',
  },
  soil_moisture: {
    id: 'soil_moisture',
    name: 'Soil Moisture',
    description: 'Current soil moisture content as percentage of field capacity',
    colorScale: ['#8B4513', '#D2691E', '#F4A460', '#90EE90', '#32CD32', '#006400'],
    valueRange: [0, 100],
    unit: '%',
  },
  precipitation_30day: {
    id: 'precipitation_30day',
    name: '30-Day Precipitation',
    description: 'Total precipitation over the last 30 days',
    colorScale: ['#FFF5E6', '#FFE4B3', '#B3D9FF', '#66B2FF', '#0066CC', '#003366'],
    valueRange: [0, 200],
    unit: 'mm',
  },
  temperature_anomaly: {
    id: 'temperature_anomaly',
    name: 'Temperature Anomaly',
    description: 'Deviation from 30-year average temperature',
    colorScale: ['#0000FF', '#6699FF', '#FFFFFF', '#FF9966', '#FF0000'],
    valueRange: [-10, 10],
    unit: '°C',
  },
  crop_risk: {
    id: 'crop_risk',
    name: 'Crop Yield Risk',
    description: 'Composite risk index for crop yield based on climate factors',
    colorScale: ['#006400', '#90EE90', '#FFFF00', '#FFA500', '#FF0000'],
    valueRange: [0, 100],
    unit: 'Risk Score',
  },
};

// Major crop types and their critical growth stages
export const CROP_TYPES = {
  corn: {
    name: 'Corn',
    critical_stages: [
      { stage: 'Planting', months: [4, 5] },
      { stage: 'Pollination', months: [6, 7] },
      { stage: 'Grain Fill', months: [7, 8] },
    ],
    base_temp: 10, // Base temperature for GDD calculation (°C)
  },
  wheat: {
    name: 'Wheat',
    critical_stages: [
      { stage: 'Planting', months: [9, 10] },
      { stage: 'Heading', months: [4, 5] },
      { stage: 'Grain Fill', months: [5, 6] },
    ],
    base_temp: 0,
  },
  soybeans: {
    name: 'Soybeans',
    critical_stages: [
      { stage: 'Planting', months: [5, 6] },
      { stage: 'Flowering', months: [7, 8] },
      { stage: 'Pod Fill', months: [8, 9] },
    ],
    base_temp: 10,
  },
  cotton: {
    name: 'Cotton',
    critical_stages: [
      { stage: 'Planting', months: [4, 5] },
      { stage: 'Flowering', months: [6, 7] },
      { stage: 'Boll Development', months: [7, 8] },
    ],
    base_temp: 12,
  },
  rice: {
    name: 'Rice',
    critical_stages: [
      { stage: 'Planting', months: [4, 5] },
      { stage: 'Tillering', months: [5, 6] },
      { stage: 'Grain Fill', months: [7, 8] },
    ],
    base_temp: 10,
  },
};

// Major agricultural regions
export const AGRICULTURAL_REGIONS = {
  'corn-belt': {
    name: "Corn Belt",
    states: ['IA', 'IL', 'IN', 'OH', 'MO', 'NE', 'KS', 'MN', 'SD', 'WI'],
    primary_crops: ['corn', 'soybeans'],
  },
  'great-plains': {
    name: "Great Plains",
    states: ['ND', 'SD', 'NE', 'KS', 'OK', 'TX', 'MT', 'WY', 'CO', 'NM'],
    primary_crops: ['wheat', 'corn'],
  },
  'california-central-valley': {
    name: "California Central Valley",
    states: ['CA'],
    primary_crops: ['rice', 'cotton', 'wheat'],
  },
  'southeast': {
    name: "Southeast",
    states: ['GA', 'AL', 'MS', 'LA', 'AR', 'TN', 'NC', 'SC'],
    primary_crops: ['cotton', 'soybeans'],
  },
  'pacific-northwest': {
    name: "Pacific Northwest",
    states: ['WA', 'OR', 'ID'],
    primary_crops: ['wheat'],
  },
};

// API endpoints
export const API_ENDPOINTS = {
  OPEN_METEO: 'https://archive-api.open-meteo.com/v1/archive',
  NOAA_DROUGHT: 'https://www.drought.gov/data-maps-tools/download-data',
};

// Color scale helper function
export function getColorForValue(
  value: number,
  layer: MapLayerConfig
): string {
  const { colorScale, valueRange } = layer;
  const [min, max] = valueRange;
  
  // Normalize value to 0-1 range
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  
  // Get color index
  const index = Math.floor(normalized * (colorScale.length - 1));
  
  return colorScale[index];
}

// Calculate growing degree days
export function calculateGDD(
  tempMax: number,
  tempMin: number,
  baseTemp: number = 10
): number {
  const avgTemp = (tempMax + tempMin) / 2;
  return Math.max(0, avgTemp - baseTemp);
}

