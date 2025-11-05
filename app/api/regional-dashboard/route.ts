import { NextRequest, NextResponse } from 'next/server';
import { getCountyByFips } from '@/lib/api/counties';
import {
  getCurrentClimateData,
  getClimateDataRange,
  getDroughtEvents,
  getYTDGrowingDegreeDays,
} from '@/lib/api/climate-data';
import { RegionalDashboardData, HistoricalTrend } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fips = searchParams.get('fips');

  if (!fips) {
    return NextResponse.json(
      { error: 'fips parameter required' },
      { status: 400 }
    );
  }

  try {
    const county = await getCountyByFips(fips);
    
    if (!county) {
      return NextResponse.json(
        { error: 'County not found' },
        { status: 404 }
      );
    }

    const currentClimate = await getCurrentClimateData(fips);
    const gddYTD = await getYTDGrowingDegreeDays(fips);

    // Get historical trends (last 50 years)
    const currentYear = new Date().getFullYear();
    const droughtEvents = await getDroughtEvents(fips, currentYear - 50);

    // Calculate historical trends by year
    const trendsByYear = new Map<number, HistoricalTrend>();
    
    droughtEvents.forEach((event) => {
      const year = new Date(event.start_date).getFullYear();
      
      if (!trendsByYear.has(year)) {
        trendsByYear.set(year, {
          year,
          drought_frequency: 0,
          drought_severity_avg: 0,
          extreme_heat_days: 0,
          precipitation_total: 0,
        });
      }

      const trend = trendsByYear.get(year)!;
      trend.drought_frequency += 1;
      trend.drought_severity_avg = 
        (trend.drought_severity_avg * (trend.drought_frequency - 1) + event.max_severity) / 
        trend.drought_frequency;
    });

    const historical_trends = Array.from(trendsByYear.values()).sort(
      (a, b) => a.year - b.year
    );

    // Get current year precipitation data
    const currentYearStart = `${currentYear}-01-01`;
    const today = new Date().toISOString().split('T')[0];
    const currentYearData = await getClimateDataRange(fips, currentYearStart, today);

    const ytdPrecipitation = currentYearData.reduce(
      (sum, record) => sum + (record.precipitation || 0),
      0
    );

    const extremeHeatDaysYTD = currentYearData.filter(
      (record) => (record.temperature_max || 0) > 35 // 35°C threshold
    ).length;

    // Calculate historical average precipitation (simplified - would need baseline data)
    const historicalAvgPrecipitation = 800; // Placeholder - should come from baselines

    const dashboardData: RegionalDashboardData = {
      county,
      current_climate: currentClimate!,
      historical_trends,
      growing_degree_days: gddYTD,
      extreme_heat_days_ytd: extremeHeatDaysYTD,
      precipitation_vs_avg: {
        current: ytdPrecipitation,
        historical_avg: historicalAvgPrecipitation,
        percent_difference: 
          ((ytdPrecipitation - historicalAvgPrecipitation) / historicalAvgPrecipitation) * 100,
      },
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error in regional-dashboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional dashboard data' },
      { status: 500 }
    );
  }
}

