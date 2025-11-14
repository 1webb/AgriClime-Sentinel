/**
 * Mapping logic for map layers to dashboard types and initial tabs/sections
 * 
 * This file defines how selecting a map layer should influence:
 * 1. Which dashboard opens (Atmospheric vs Agricultural)
 * 2. Which tab/section is initially displayed
 * 3. Visual indicators for user context
 */

import { MapDataLayer } from "@/types";

export type DashboardType = "atmospheric" | "agricultural";
export type AtmosphericTab = "alerts" | "severe" | "airquality" | "trends" | "forecast";
export type AgriculturalSection = "crop-risk" | "drought" | "soil-moisture" | "precipitation" | "temperature";

export interface LayerDashboardMapping {
  dashboardType: DashboardType;
  initialTab?: AtmosphericTab;
  initialSection?: AgriculturalSection;
  displayName: string;
  icon: string;
  description: string;
}

/**
 * Map each data layer to its corresponding dashboard and initial view
 */
export const LAYER_DASHBOARD_MAP: Record<MapDataLayer, LayerDashboardMapping> = {
  drought: {
    dashboardType: "agricultural",
    initialSection: "drought",
    displayName: "Drought Analysis",
    icon: "🏜️",
    description: "Viewing drought conditions and historical trends"
  },
  soil_moisture: {
    dashboardType: "agricultural",
    initialSection: "soil-moisture",
    displayName: "Soil Moisture Analysis",
    icon: "💧",
    description: "Viewing soil moisture levels and agricultural impacts"
  },
  temperature_anomaly: {
    dashboardType: "atmospheric",
    initialTab: "trends",
    displayName: "Temperature Trends",
    icon: "🌡️",
    description: "Viewing 55-year temperature trends and climate analysis"
  },
  precipitation_30day: {
    dashboardType: "atmospheric",
    initialTab: "trends",
    displayName: "Precipitation & Climate",
    icon: "🌧️",
    description: "Viewing precipitation patterns and climate trends"
  },
  crop_risk: {
    dashboardType: "agricultural",
    initialSection: "crop-risk",
    displayName: "Crop Risk Assessment",
    icon: "🌾",
    description: "Viewing crop-specific climate risk analysis"
  }
};

/**
 * Get the dashboard configuration for a given map layer
 */
export function getDashboardConfigForLayer(layer: MapDataLayer): LayerDashboardMapping {
  return LAYER_DASHBOARD_MAP[layer];
}

/**
 * Get a user-friendly description of what data will be shown
 */
export function getLayerContextDescription(layer: MapDataLayer): string {
  const config = LAYER_DASHBOARD_MAP[layer];
  return `${config.icon} ${config.displayName}`;
}

/**
 * Check if a layer should open the Atmospheric dashboard
 */
export function shouldOpenAtmosphericDashboard(layer: MapDataLayer): boolean {
  return LAYER_DASHBOARD_MAP[layer].dashboardType === "atmospheric";
}

/**
 * Check if a layer should open the Agricultural dashboard
 */
export function shouldOpenAgriculturalDashboard(layer: MapDataLayer): boolean {
  return LAYER_DASHBOARD_MAP[layer].dashboardType === "agricultural";
}

