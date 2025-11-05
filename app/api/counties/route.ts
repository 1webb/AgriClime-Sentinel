import { NextRequest, NextResponse } from 'next/server';
import { getAllCounties, searchCounties } from '@/lib/api/counties';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search');

  try {
    if (search) {
      const counties = await searchCounties(search);
      return NextResponse.json(counties);
    }

    const counties = await getAllCounties();
    return NextResponse.json(counties);
  } catch (error) {
    console.error('Error in counties API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch counties' },
      { status: 500 }
    );
  }
}

