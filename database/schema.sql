-- AgriClime Sentinel Database Schema
-- PostgreSQL with PostGIS extension

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Counties table with geospatial data
CREATE TABLE IF NOT EXISTS counties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fips VARCHAR(5) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(2) NOT NULL,
    geometry GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create spatial index on counties
CREATE INDEX IF NOT EXISTS idx_counties_geometry ON counties USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_counties_fips ON counties(fips);
CREATE INDEX IF NOT EXISTS idx_counties_state ON counties(state);

-- Climate data table (daily records)
CREATE TABLE IF NOT EXISTS climate_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_fips VARCHAR(5) REFERENCES counties(fips),
    date DATE NOT NULL,
    temperature_avg DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    temperature_min DECIMAL(5,2),
    precipitation DECIMAL(6,2), -- in mm
    soil_moisture DECIMAL(5,2), -- percentage
    drought_index INTEGER CHECK (drought_index >= 0 AND drought_index <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(county_fips, date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_climate_data_county_date ON climate_data(county_fips, date DESC);
CREATE INDEX IF NOT EXISTS idx_climate_data_date ON climate_data(date DESC);

-- Historical climate baselines (30-year averages)
CREATE TABLE IF NOT EXISTS climate_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_fips VARCHAR(5) REFERENCES counties(fips),
    month INTEGER CHECK (month >= 1 AND month <= 12),
    temperature_avg DECIMAL(5,2),
    precipitation_avg DECIMAL(6,2),
    baseline_period VARCHAR(20), -- e.g., "1991-2020"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(county_fips, month, baseline_period)
);

CREATE INDEX IF NOT EXISTS idx_baselines_county ON climate_baselines(county_fips);

-- Crop yield risk index (calculated values)
CREATE TABLE IF NOT EXISTS crop_risk_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_fips VARCHAR(5) REFERENCES counties(fips),
    crop_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    risk_score DECIMAL(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    rainfall_deficit_score DECIMAL(5,2),
    soil_moisture_score DECIMAL(5,2),
    heat_stress_score DECIMAL(5,2),
    drought_severity_score DECIMAL(5,2),
    growth_stage VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(county_fips, crop_type, date)
);

CREATE INDEX IF NOT EXISTS idx_crop_risk_county_crop ON crop_risk_index(county_fips, crop_type, date DESC);

-- Drought events (historical tracking)
CREATE TABLE IF NOT EXISTS drought_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_fips VARCHAR(5) REFERENCES counties(fips),
    start_date DATE NOT NULL,
    end_date DATE,
    max_severity INTEGER CHECK (max_severity >= 0 AND max_severity <= 5),
    avg_severity DECIMAL(3,2),
    duration_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drought_events_county ON drought_events(county_fips, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_drought_events_year ON drought_events(EXTRACT(YEAR FROM start_date));

-- Growing degree days tracking
CREATE TABLE IF NOT EXISTS growing_degree_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_fips VARCHAR(5) REFERENCES counties(fips),
    date DATE NOT NULL,
    gdd_value DECIMAL(6,2),
    base_temp DECIMAL(4,2) DEFAULT 10.0, -- Base temperature in Celsius
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(county_fips, date, base_temp)
);

CREATE INDEX IF NOT EXISTS idx_gdd_county_date ON growing_degree_days(county_fips, date DESC);

-- Materialized view for current drought status by county
CREATE MATERIALIZED VIEW IF NOT EXISTS current_drought_status AS
SELECT 
    c.fips,
    c.name,
    c.state,
    cd.drought_index,
    cd.date,
    cd.soil_moisture,
    cd.precipitation,
    cd.temperature_avg
FROM counties c
LEFT JOIN LATERAL (
    SELECT *
    FROM climate_data
    WHERE county_fips = c.fips
    ORDER BY date DESC
    LIMIT 1
) cd ON true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_current_drought_fips ON current_drought_status(fips);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_current_drought_status()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_drought_status;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for 30-day precipitation totals
CREATE MATERIALIZED VIEW IF NOT EXISTS precipitation_30day AS
SELECT 
    county_fips,
    SUM(precipitation) as total_precipitation,
    MAX(date) as latest_date
FROM climate_data
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY county_fips;

CREATE UNIQUE INDEX IF NOT EXISTS idx_precip_30day_county ON precipitation_30day(county_fips);

-- Function to calculate temperature anomaly
CREATE OR REPLACE FUNCTION calculate_temperature_anomaly(
    p_county_fips VARCHAR(5),
    p_date DATE
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_current_temp DECIMAL(5,2);
    v_baseline_temp DECIMAL(5,2);
    v_month INTEGER;
BEGIN
    v_month := EXTRACT(MONTH FROM p_date);
    
    -- Get current temperature
    SELECT temperature_avg INTO v_current_temp
    FROM climate_data
    WHERE county_fips = p_county_fips AND date = p_date;
    
    -- Get baseline temperature
    SELECT temperature_avg INTO v_baseline_temp
    FROM climate_baselines
    WHERE county_fips = p_county_fips AND month = v_month
    LIMIT 1;
    
    RETURN v_current_temp - COALESCE(v_baseline_temp, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate crop yield risk index
CREATE OR REPLACE FUNCTION calculate_crop_risk_score(
    p_rainfall_deficit DECIMAL,
    p_soil_moisture DECIMAL,
    p_heat_stress DECIMAL,
    p_drought_severity INTEGER
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_risk_score DECIMAL(5,2);
BEGIN
    -- Weighted composite score
    -- Weights: rainfall (30%), soil moisture (25%), heat stress (25%), drought (20%)
    v_risk_score := (
        (p_rainfall_deficit * 0.30) +
        ((100 - p_soil_moisture) * 0.25) +
        (p_heat_stress * 0.25) +
        (p_drought_severity * 20 * 0.20)
    );
    
    -- Ensure score is between 0 and 100
    v_risk_score := LEAST(GREATEST(v_risk_score, 0), 100);
    
    RETURN v_risk_score;
END;
$$ LANGUAGE plpgsql;

