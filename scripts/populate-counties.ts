/**
 * Script to populate the counties table with U.S. county GeoJSON data
 * 
 * Data source: https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json
 * 
 * Run with: npx tsx scripts/populate-counties.ts
 */

import axios from 'axios';
import { supabase } from '../lib/supabase';

const COUNTIES_GEOJSON_URL = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';

// State FIPS to state code mapping (first 2 digits of county FIPS)
const STATE_FIPS_TO_CODE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '72': 'PR',
};

async function populateCounties() {
  console.log('Fetching county GeoJSON data...');
  
  try {
    const response = await axios.get(COUNTIES_GEOJSON_URL);
    const geojson = response.data;
    
    console.log(`Found ${geojson.features.length} counties`);
    
    // Process counties in batches
    const batchSize = 100;
    let processed = 0;
    
    for (let i = 0; i < geojson.features.length; i += batchSize) {
      const batch = geojson.features.slice(i, i + batchSize);
      
      const counties = batch.map((feature: any) => {
        const fips = feature.id;
        const stateFips = fips.substring(0, 2);
        const stateCode = STATE_FIPS_TO_CODE[stateFips] || 'XX';
        
        // Extract county name from properties (if available)
        const name = feature.properties?.NAME || `County ${fips}`;
        
        return {
          fips,
          name,
          state: stateCode,
          geometry: feature.geometry,
        };
      });
      
      // Insert batch into database
      const { error } = await supabase
        .from('counties')
        .upsert(counties, { onConflict: 'fips' });
      
      if (error) {
        console.error('Error inserting batch:', error);
      } else {
        processed += counties.length;
        console.log(`Processed ${processed}/${geojson.features.length} counties`);
      }
    }
    
    console.log('✓ County data population complete!');
  } catch (error) {
    console.error('Error populating counties:', error);
    throw error;
  }
}

// Run the script
populateCounties()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

