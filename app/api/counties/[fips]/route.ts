import { NextRequest, NextResponse } from 'next/server';
import { getCountyByFips } from '@/lib/api/counties';
import { getCurrentClimateData } from '@/lib/api/climate-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fips: string }> }
) {
  const { fips } = await params;

  try {
    const county = await getCountyByFips(fips);
    
    if (!county) {
      return NextResponse.json(
        { error: 'County not found' },
        { status: 404 }
      );
    }

    const climateData = await getCurrentClimateData(fips);

    return NextResponse.json({
      county,
      current_climate: climateData,
    });
  } catch (error) {
    console.error('Error in county API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch county data' },
      { status: 500 }
    );
  }
}

