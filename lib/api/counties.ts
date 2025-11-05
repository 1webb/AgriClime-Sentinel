import { supabase } from '@/lib/supabase';
import { County } from '@/types';

/**
 * Get all counties with their geometries
 */
export async function getAllCounties(): Promise<County[]> {
  const { data, error } = await supabase
    .from('counties')
    .select('id, fips, name, state, geometry');

  if (error) {
    console.error('Error fetching counties:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single county by FIPS code
 */
export async function getCountyByFips(fips: string): Promise<County | null> {
  const { data, error } = await supabase
    .from('counties')
    .select('*')
    .eq('fips', fips)
    .single();

  if (error) {
    console.error('Error fetching county:', error);
    return null;
  }

  return data;
}

/**
 * Get counties by state
 */
export async function getCountiesByState(state: string): Promise<County[]> {
  const { data, error } = await supabase
    .from('counties')
    .select('*')
    .eq('state', state)
    .order('name');

  if (error) {
    console.error('Error fetching counties by state:', error);
    return [];
  }

  return data || [];
}

/**
 * Search counties by name
 */
export async function searchCounties(searchTerm: string): Promise<County[]> {
  const { data, error } = await supabase
    .from('counties')
    .select('*')
    .ilike('name', `%${searchTerm}%`)
    .limit(20);

  if (error) {
    console.error('Error searching counties:', error);
    return [];
  }

  return data || [];
}

