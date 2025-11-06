# AgriClime Sentinel - Complete Setup Guide

This guide will walk you through setting up the AgriClime Sentinel platform from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup (Supabase)](#database-setup-supabase)
3. [Local Development Setup](#local-development-setup)
4. [Data Population](#data-population)
5. [Deployment to Vercel](#deployment-to-vercel)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- A **Supabase** account ([Sign up](https://supabase.com/))
- A **Vercel** account for deployment ([Sign up](https://vercel.com/))

---

## Database Setup (Supabase)

### Step 1: Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in the details:
   - **Name**: `agriclime-sentinel`
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest to your target users
4. Click "Create new project" and wait for provisioning (~2 minutes)

### Step 2: Enable PostGIS Extension

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Run the following SQL:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

4. Click "Run" to execute

### Step 3: Create Database Schema

1. In the SQL Editor, create a new query
2. Copy the entire contents of `database/schema.sql` from this repository
3. Paste into the SQL Editor
4. Click "Run" to create all tables, indexes, and functions

### Step 4: Get Your API Credentials

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
3. Save these for the next step

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/clevernat/AgriClime-Sentinel.git
cd AgriClime-Sentinel
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 4: Run the Development Server

```bash
npm run dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000)

**Note**: At this point, the map will be empty because we haven't populated data yet.

---

## Data Population

### Step 1: Install TypeScript Execution Tool

```bash
npm install -g tsx
```

### Step 2: Populate County Boundaries

This script fetches U.S. county GeoJSON data and populates the database:

```bash
tsx scripts/populate-counties.ts
```

**Expected output**:

```
Fetching county GeoJSON data...
Found 3220 counties
Processed 100/3220 counties
Processed 200/3220 counties
...
✓ County data population complete!
```

**Time**: ~2-5 minutes depending on your connection

### Step 3: Populate Sample Climate Data

This script generates realistic sample climate data for demonstration:

```bash
tsx scripts/populate-sample-data.ts
```

**Expected output**:

```
Fetching counties...
Generating sample data for 3220 counties...
Inserting 96600 climate records...
Inserted 1000/96600 records
...
✓ Sample data population complete!
```

**Time**: ~5-10 minutes

**Note**: This creates synthetic data for the last 30 days. For production, you would integrate with the Open-Meteo API to fetch real historical data.

### Step 4: Verify Data Population

1. Go to your Supabase Dashboard
2. Navigate to **Table Editor**
3. Check that the following tables have data:
   - `counties` (~3,220 rows)
   - `climate_data` (~96,600 rows for 100 counties × 30 days)
   - `growing_degree_days` (~96,600 rows)

---

## Deployment to Vercel

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Push your code:

```bash
git remote add origin https://github.com/clevernat/AgriClime-Sentinel.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Add Environment Variables

In the Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add the following:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
3. Click "Save"

### Step 4: Deploy

1. Click "Deploy"
2. Wait for the build to complete (~2-3 minutes)
3. Your app will be live at `https://your-project.vercel.app`

### Step 5: Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain (e.g., `agriclime-sentinel.com`)
3. Follow Vercel's instructions to configure DNS

---

## Troubleshooting

### Issue: Map not displaying

**Solution**:

- Check browser console for errors
- Ensure Leaflet CSS is imported in `app/layout.tsx`
- Verify that county data is populated in the database

### Issue: "Failed to fetch map data" error

**Solution**:

- Check that environment variables are set correctly
- Verify Supabase connection by testing in SQL Editor
- Check browser network tab for API errors

### Issue: No data showing on map

**Solution**:

- Verify that `climate_data` table has records
- Check that materialized views are populated:
  ```sql
  SELECT COUNT(*) FROM current_drought_status;
  ```
- Manually refresh materialized views:
  ```sql
  REFRESH MATERIALIZED VIEW current_drought_status;
  REFRESH MATERIALIZED VIEW precipitation_30day;
  ```

### Issue: TypeScript errors during build

**Solution**:

- Run `npm install` to ensure all dependencies are installed
- Check that `@types/leaflet` is in devDependencies
- Clear `.next` folder and rebuild:
  ```bash
  rm -rf .next
  npm run build
  ```

### Issue: Slow map performance

**Solution**:

- Ensure database indexes are created (check `schema.sql`)
- Consider reducing the number of counties displayed
- Implement pagination or clustering for large datasets

---

## Next Steps

1. **Integrate Real Data**: Replace sample data with Open-Meteo API integration
2. **Add Authentication**: Implement user accounts for saved preferences
3. **Set Up Monitoring**: Add error tracking (e.g., Sentry)
4. **Optimize Performance**: Implement caching and CDN
5. **Add Tests**: Write unit and integration tests

---

## Support

If you encounter issues not covered here:

1. Check the [main README](../README.md)
2. Review the [database schema](../database/schema.sql)
3. Open an issue on GitHub: [AgriClime-Sentinel Issues](https://github.com/clevernat/AgriClime-Sentinel/issues)
4. Contact: otengabrokwah950@gmail.com

---

**Last Updated**: January 2025
