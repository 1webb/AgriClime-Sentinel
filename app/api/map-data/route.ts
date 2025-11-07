import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentDroughtStatus,
  get30DayPrecipitation,
  getAllTemperatureAnomalies,
  getAllCropRiskIndices,
} from '@/lib/api/climate-data';
import { MapDataLayer } from '@/types';
import { supabase } from '@/lib/supabase';

/**
 * Generate historical map data for a specific year
 * This simulates historical climate patterns based on the year
 */
async function getHistoricalMapData(
  layer: MapDataLayer,
  year: number,
  cropType?: string | null
) {
  // Get all counties from the database
  const { data: counties, error } = await supabase
    .from('counties')
    .select('fips');

  if (error) {
    console.error('Error fetching counties for historical data:', error);
    return [];
  }

  if (!counties || counties.length === 0) {
    console.warn('No counties found in database');
    return [];
  }

  console.log(`Generating historical data for ${counties.length} counties, year ${year}, layer ${layer}`);

  // Generate historical data based on year and layer type
  return counties.map((county) => {
    const fips = county.fips;

    // Use deterministic random based on fips and year for consistency
    const seed = parseInt(fips) + year * 1000;
    const random = (offset: number = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    switch (layer) {
      case 'drought': {
        // Historical drought patterns - more severe in earlier years in some regions
        const baseValue = random(1) * 4;
        const yearFactor = (year - 1970) / 55; // 0 to 1 from 1970 to 2025
        const trendValue = baseValue + (random(2) - 0.5) * yearFactor * 2;
        const droughtIndex = Math.max(0, Math.min(4, Math.round(trendValue)));

        // Generate realistic soil moisture (inversely related to drought)
        const soilMoisture = 60 - (droughtIndex * 10) + (random(3) - 0.5) * 15;

        return {
          fips: fips,
          drought_index: droughtIndex,
          soil_moisture: Math.max(0, Math.min(100, soilMoisture)),
          precipitation: random(4) * 3,
          temperature_avg: 15 + random(5) * 10,
          date: `${year}-07-01`,
        };
      }

      case 'precipitation_30day': {
        // Historical precipitation - varies by year
        const baseValue = 30 + random(3) * 80;
        const yearVariation = Math.sin((year - 1970) / 5) * 20;
        return {
          fips: fips,
          total_precipitation: Math.max(0, baseValue + yearVariation + (random(4) - 0.5) * 30),
          latest_date: `${year}-07-01`,
        };
      }

      case 'temperature_anomaly': {
        // Historical temperature anomaly - shows warming trend
        const yearFactor = (year - 1970) / 55;
        const warmingTrend = yearFactor * 2.5; // Up to +2.5°C by 2025
        const localVariation = (random(5) - 0.5) * 2;
        return {
          fips: fips,
          temperature_anomaly: warmingTrend + localVariation,
          date: `${year}-07-01`,
        };
      }

      case 'soil_moisture': {
        // Historical soil moisture (0-100 scale)
        const baseValue = 30 + random(6) * 40;
        const yearVariation = Math.sin((year - 1970) / 7) * 15;
        const droughtEffect = (random(7) - 0.5) * 20;
        return {
          fips: fips,
          soil_moisture: Math.max(0, Math.min(100, baseValue + yearVariation + droughtEffect)),
          precipitation: random(8) * 3,
          temperature_avg: 15 + random(9) * 10,
          drought_index: Math.round(random(10) * 4),
          date: `${year}-07-01`,
        };
      }

      case 'crop_risk': {
        // Historical crop risk
        const baseRisk = random(7) * 50;
        const yearFactor = (year - 1970) / 55;
        const riskTrend = baseRisk + yearFactor * 25; // Increasing risk over time
        return {
          fips: fips,
          crop_type: cropType || 'corn',
          risk_index: Math.max(0, Math.min(100, riskTrend + (random(8) - 0.5) * 30)),
          date: `${year}-07-01`,
        };
      }

      default:
        return {
          fips: fips,
        };
    }
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const layer = searchParams.get('layer') as MapDataLayer;
  const cropType = searchParams.get('cropType');
  const yearParam = searchParams.get('year');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  try {
    let data;

    // If historical year is provided, generate historical data
    if (yearParam) {
      const year = parseInt(yearParam);
      data = await getHistoricalMapData(layer, year, cropType);
    } else {
      // Current data
      switch (layer) {
        case 'drought':
          data = await getCurrentDroughtStatus();
          break;

        case 'precipitation_30day':
          data = await get30DayPrecipitation();
          break;

        case 'temperature_anomaly':
          data = await getAllTemperatureAnomalies(date);
          break;

        case 'crop_risk':
          if (!cropType) {
            return NextResponse.json(
              { error: 'cropType parameter required for crop_risk layer' },
              { status: 400 }
            );
          }
          data = await getAllCropRiskIndices(cropType, date);
          break;

        case 'soil_moisture':
          // Get current climate data with soil moisture
          data = await getCurrentDroughtStatus();
          break;

        default:
          return NextResponse.json(
            { error: 'Invalid layer type' },
            { status: 400 }
          );
      }
    }

    return NextResponse.json({
      layer,
      date: yearParam ? `${yearParam}-07-01` : date,
      data,
    });
  } catch (error) {
    console.error('Error in map-data API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch map data' },
      { status: 500 }
    );
  }
}

