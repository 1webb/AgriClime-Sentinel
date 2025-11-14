/**
 * Severe Weather Atmospheric Indices Calculator
 * Calculates atmospheric instability indices used for severe weather prediction
 *
 * These indices are used by meteorologists to assess the potential for:
 * - Tornadoes
 * - Severe thunderstorms
 * - Hail
 * - Damaging winds
 */

export interface AtmosphericSounding {
  pressure: number[]; // hPa
  temperature: number[]; // Celsius
  dewpoint: number[]; // Celsius
  height: number[]; // meters
  windSpeed: number[]; // m/s
  windDirection: number[]; // degrees
}

export interface SevereWeatherIndices {
  // Instability Indices
  cape: number; // Convective Available Potential Energy (J/kg)
  cin: number; // Convective Inhibition (J/kg)
  liftedIndex: number; // Lifted Index (°C)
  kIndex: number; // K-Index
  totalTotals: number; // Total Totals Index
  showalterIndex: number; // Showalter Stability Index

  // Wind Shear Indices
  bulkShear0to6km: number; // 0-6km bulk wind shear (m/s)
  stormRelativeHelicity0to3km: number; // 0-3km SRH (m²/s²)

  // Composite Indices
  significantTornadoParameter: number; // STP
  supercellCompositeParameter: number; // SCP

  // Heatwave Metrics (optional - from climate trends API)
  heatWaves?: number; // Number of heat wave events
  extremeHeatDays?: number; // Days above 95th percentile
  consecutiveHotDays?: number; // Current consecutive hot days
  maxTemperature?: number; // Current/recent max temperature (°C)

  // Interpretation
  tornadoPotential: "None" | "Low" | "Moderate" | "High" | "Extreme";
  severeThunderstormPotential: "None" | "Low" | "Moderate" | "High" | "Extreme";
  hailPotential: "None" | "Low" | "Moderate" | "High" | "Extreme";
  heatwavePotential: "None" | "Low" | "Moderate" | "High" | "Extreme";
}

/**
 * Calculate CAPE (Convective Available Potential Energy)
 * CAPE represents the amount of energy available for convection
 * Higher values indicate greater potential for severe weather
 *
 * Interpretation:
 * - 0-1000 J/kg: Weak instability
 * - 1000-2500 J/kg: Moderate instability
 * - 2500-4000 J/kg: Strong instability
 * - >4000 J/kg: Extreme instability
 */
function calculateCAPE(sounding: AtmosphericSounding): number {
  // Simplified CAPE calculation
  // In production, use a proper thermodynamic library

  const { pressure, temperature } = sounding;
  let cape = 0;

  // Find Lifting Condensation Level (LCL)
  const surfaceTemp = temperature[0];

  // Calculate parcel temperature at each level
  for (let i = 0; i < pressure.length - 1; i++) {
    const envTemp = temperature[i];

    // Dry adiabatic lapse rate: 9.8°C/km
    // Moist adiabatic lapse rate: ~6°C/km (simplified)
    const parcelTemp = surfaceTemp - 9.8 * (sounding.height[i] / 1000);

    // If parcel is warmer than environment, add to CAPE
    if (parcelTemp > envTemp) {
      const dz = sounding.height[i + 1] - sounding.height[i];
      cape += 9.81 * ((parcelTemp - envTemp) / envTemp) * dz;
    }
  }

  return Math.max(0, cape);
}

/**
 * Calculate Lifted Index (LI)
 * Measures the temperature difference between a lifted parcel and the environment at 500 hPa
 *
 * Interpretation:
 * - LI > 2: Stable atmosphere
 * - LI 0 to 2: Marginally unstable
 * - LI -2 to 0: Moderately unstable
 * - LI -4 to -2: Very unstable
 * - LI < -4: Extremely unstable
 */
function calculateLiftedIndex(sounding: AtmosphericSounding): number {
  const { pressure, temperature } = sounding;

  // Find 500 hPa level
  const idx500 = pressure.findIndex((p) => p <= 500);
  if (idx500 === -1) return 0;

  const envTemp500 = temperature[idx500];

  // Lift surface parcel to 500 hPa (simplified)
  const surfaceTemp = temperature[0];
  const parcelTemp500 = surfaceTemp - 30; // Approximate cooling

  return envTemp500 - parcelTemp500;
}

/**
 * Calculate K-Index
 * Measures thunderstorm potential based on temperature lapse rate and moisture
 *
 * Interpretation:
 * - K < 20: Thunderstorms unlikely
 * - K 20-25: Isolated thunderstorms possible
 * - K 26-30: Widely scattered thunderstorms
 * - K 31-35: Numerous thunderstorms
 * - K > 35: Strong to severe thunderstorms
 */
function calculateKIndex(sounding: AtmosphericSounding): number {
  const { pressure, temperature, dewpoint } = sounding;

  // Find required levels
  const idx850 = pressure.findIndex((p) => p <= 850);
  const idx700 = pressure.findIndex((p) => p <= 700);
  const idx500 = pressure.findIndex((p) => p <= 500);

  if (idx850 === -1 || idx700 === -1 || idx500 === -1) return 0;

  const t850 = temperature[idx850];
  const td850 = dewpoint[idx850];
  const t700 = temperature[idx700];
  const td700 = dewpoint[idx700];
  const t500 = temperature[idx500];

  return t850 - t500 + td850 - (t700 - td700);
}

/**
 * Calculate Total Totals Index
 * Combines vertical temperature difference and low-level moisture
 *
 * Interpretation:
 * - TT < 44: Thunderstorms unlikely
 * - TT 44-50: Thunderstorms possible
 * - TT 51-52: Moderate thunderstorms
 * - TT 53-56: Strong thunderstorms likely
 * - TT > 56: Severe thunderstorms likely
 */
function calculateTotalTotals(sounding: AtmosphericSounding): number {
  const { pressure, temperature, dewpoint } = sounding;

  const idx850 = pressure.findIndex((p) => p <= 850);
  const idx500 = pressure.findIndex((p) => p <= 500);

  if (idx850 === -1 || idx500 === -1) return 0;

  const t850 = temperature[idx850];
  const td850 = dewpoint[idx850];
  const t500 = temperature[idx500];

  const crossTotals = td850 - t500;
  const verticalTotals = t850 - t500;

  return crossTotals + verticalTotals;
}

/**
 * Calculate Bulk Wind Shear (0-6 km)
 * Measures wind speed change with height
 * Important for supercell development
 *
 * Interpretation:
 * - < 10 m/s: Weak shear
 * - 10-20 m/s: Moderate shear
 * - 20-30 m/s: Strong shear
 * - > 30 m/s: Extreme shear
 */
function calculateBulkShear(sounding: AtmosphericSounding): number {
  const { height, windSpeed, windDirection } = sounding;

  // Find surface and 6km levels
  const idx6km = height.findIndex((h) => h >= 6000);
  if (idx6km === -1) return 0;

  // Calculate u and v components
  const u0 = windSpeed[0] * Math.sin((windDirection[0] * Math.PI) / 180);
  const v0 = windSpeed[0] * Math.cos((windDirection[0] * Math.PI) / 180);

  const u6 =
    windSpeed[idx6km] * Math.sin((windDirection[idx6km] * Math.PI) / 180);
  const v6 =
    windSpeed[idx6km] * Math.cos((windDirection[idx6km] * Math.PI) / 180);

  // Calculate magnitude of shear vector
  return Math.sqrt(Math.pow(u6 - u0, 2) + Math.pow(v6 - v0, 2));
}

/**
 * Calculate Storm-Relative Helicity (0-3 km)
 * Measures potential for rotating updrafts
 * Critical for tornado forecasting
 *
 * Interpretation:
 * - < 100 m²/s²: Low tornado potential
 * - 100-250 m²/s²: Moderate tornado potential
 * - 250-400 m²/s²: High tornado potential
 * - > 400 m²/s²: Extreme tornado potential
 */
function calculateSRH(sounding: AtmosphericSounding): number {
  // Simplified SRH calculation
  // In production, use proper hodograph analysis
  const bulkShear = calculateBulkShear(sounding);
  return bulkShear * 15; // Rough approximation
}

/**
 * Calculate Significant Tornado Parameter (STP)
 * Composite index for significant tornado potential
 *
 * Interpretation:
 * - STP < 1: Low tornado risk
 * - STP 1-3: Moderate tornado risk
 * - STP 3-6: High tornado risk
 * - STP > 6: Extreme tornado risk
 */
function calculateSTP(
  cape: number,
  srh: number,
  bulkShear: number,
  liftedIndex: number
): number {
  // Simplified STP calculation
  const capeTerm = cape / 1500;
  const srhTerm = srh / 150;
  const shearTerm = bulkShear / 20;
  const liTerm = Math.max(0, -liftedIndex) / 2;

  return capeTerm * srhTerm * shearTerm * liTerm;
}

/**
 * Calculate heatwave potential based on temperature and extremes data
 *
 * Interpretation:
 * - None: No heatwave conditions
 * - Low: Warm temperatures, 1-2 consecutive hot days
 * - Moderate: 3-4 consecutive days above threshold
 * - High: 5-7 consecutive days above threshold or extreme heat
 * - Extreme: 8+ consecutive days or dangerous heat index
 */
export function calculateHeatwavePotential(
  heatWaves: number = 0,
  extremeHeatDays: number = 0,
  consecutiveHotDays: number = 0,
  maxTemperature: number = 0
): SevereWeatherIndices["heatwavePotential"] {
  // Extreme: Dangerous heat conditions
  if (consecutiveHotDays >= 8 || maxTemperature >= 40) {
    return "Extreme";
  }

  // High: Extended heat wave or very high temperature
  if (consecutiveHotDays >= 5 || maxTemperature >= 38 || heatWaves >= 3) {
    return "High";
  }

  // Moderate: Heat wave conditions developing
  if (consecutiveHotDays >= 3 || maxTemperature >= 35 || heatWaves >= 2) {
    return "Moderate";
  }

  // Low: Warm conditions
  if (consecutiveHotDays >= 1 || maxTemperature >= 32 || extremeHeatDays >= 10) {
    return "Low";
  }

  return "None";
}

/**
 * Calculate all severe weather indices
 */
export function calculateSevereWeatherIndices(
  sounding: AtmosphericSounding,
  heatwaveData?: {
    heatWaves?: number;
    extremeHeatDays?: number;
    consecutiveHotDays?: number;
    maxTemperature?: number;
  }
): SevereWeatherIndices {
  const cape = calculateCAPE(sounding);
  const cin = 0; // Simplified - would need proper calculation
  const liftedIndex = calculateLiftedIndex(sounding);
  const kIndex = calculateKIndex(sounding);
  const totalTotals = calculateTotalTotals(sounding);
  const showalterIndex = liftedIndex; // Simplified
  const bulkShear = calculateBulkShear(sounding);
  const srh = calculateSRH(sounding);
  const stp = calculateSTP(cape, srh, bulkShear, liftedIndex);
  const scp = (cape / 1000) * (bulkShear / 20); // Simplified SCP

  // Determine potentials
  let tornadoPotential: SevereWeatherIndices["tornadoPotential"] = "None";
  if (stp > 6) tornadoPotential = "Extreme";
  else if (stp > 3) tornadoPotential = "High";
  else if (stp > 1) tornadoPotential = "Moderate";
  else if (stp > 0.5) tornadoPotential = "Low";

  let severeThunderstormPotential: SevereWeatherIndices["severeThunderstormPotential"] =
    "None";
  if (cape > 4000 && bulkShear > 20) severeThunderstormPotential = "Extreme";
  else if (cape > 2500 && bulkShear > 15) severeThunderstormPotential = "High";
  else if (cape > 1000 && bulkShear > 10)
    severeThunderstormPotential = "Moderate";
  else if (cape > 500) severeThunderstormPotential = "Low";

  let hailPotential: SevereWeatherIndices["hailPotential"] = "None";
  if (cape > 3000 && liftedIndex < -6) hailPotential = "Extreme";
  else if (cape > 2000 && liftedIndex < -4) hailPotential = "High";
  else if (cape > 1000 && liftedIndex < -2) hailPotential = "Moderate";
  else if (cape > 500) hailPotential = "Low";

  // Calculate heatwave potential if data provided
  const heatwavePotential = heatwaveData
    ? calculateHeatwavePotential(
        heatwaveData.heatWaves,
        heatwaveData.extremeHeatDays,
        heatwaveData.consecutiveHotDays,
        heatwaveData.maxTemperature
      )
    : "None";

  return {
    cape,
    cin,
    liftedIndex,
    kIndex,
    totalTotals,
    showalterIndex,
    bulkShear0to6km: bulkShear,
    stormRelativeHelicity0to3km: srh,
    significantTornadoParameter: stp,
    supercellCompositeParameter: scp,
    heatWaves: heatwaveData?.heatWaves,
    extremeHeatDays: heatwaveData?.extremeHeatDays,
    consecutiveHotDays: heatwaveData?.consecutiveHotDays,
    maxTemperature: heatwaveData?.maxTemperature,
    tornadoPotential,
    severeThunderstormPotential,
    hailPotential,
    heatwavePotential,
  };
}

/**
 * Generate sample atmospheric sounding for testing
 * In production, this would come from weather balloon data or model output
 */
export function generateSampleSounding(): AtmosphericSounding {
  return {
    pressure: [1000, 925, 850, 700, 500, 400, 300, 250, 200],
    temperature: [25, 20, 15, 5, -15, -30, -45, -55, -60],
    dewpoint: [20, 15, 10, 0, -20, -35, -50, -60, -65],
    height: [0, 750, 1500, 3000, 5500, 7500, 9500, 10500, 12000],
    windSpeed: [5, 10, 15, 20, 30, 40, 50, 55, 60],
    windDirection: [180, 200, 220, 240, 260, 270, 280, 285, 290],
  };
}
