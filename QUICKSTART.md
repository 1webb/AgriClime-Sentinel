# AgriClime Sentinel - Quick Start Guide

Get the platform running in under 30 minutes!

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)

## Step 1: Clone and Install (2 minutes)

```bash
git clone <your-repo-url>
cd "AgriClime Sentinel"
npm install
```

## Step 2: Set Up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (~2 minutes)
3. In the SQL Editor, run this command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Copy the entire contents of `database/schema.sql` and run it in the SQL Editor
5. Go to Settings → API and copy:
   - Project URL
   - anon/public key

## Step 3: Configure Environment (1 minute)

```bash
cp .env.example .env
```

Edit `.env` and paste your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## Step 4: Populate Data (10 minutes)

```bash
# Install tsx if you haven't already
npm install -g tsx

# Populate counties (~3 minutes)
tsx scripts/populate-counties.ts

# Populate sample climate data (~5 minutes)
tsx scripts/populate-sample-data.ts
```

## Step 5: Run the App (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## What You Should See

1. **Header**: "AgriClime Sentinel" with green-to-blue gradient
2. **Sidebar**: Layer selector and legend
3. **Map**: U.S. counties colored by drought status
4. **Interactive**: Click any county to see detailed dashboard

## Troubleshooting

### "Failed to fetch map data"
- Check that your `.env` file has the correct Supabase credentials
- Verify the database schema was created successfully

### Map is empty
- Make sure you ran both data population scripts
- Check Supabase Table Editor to verify `counties` and `climate_data` have records

### Build errors
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall

## Next Steps

1. **Deploy to Vercel**: See `docs/SETUP_GUIDE.md`
2. **Customize**: Update README with your personal information
3. **Integrate Real Data**: Replace sample data with Open-Meteo API
4. **Add Screenshots**: Capture images for your EB2-NIW petition

## Support

- Full setup guide: `docs/SETUP_GUIDE.md`
- EB2-NIW documentation: `docs/EB2_NIW_DOCUMENTATION.md`
- Project summary: `docs/PROJECT_SUMMARY.md`

---

**Estimated Total Time**: 20-30 minutes  
**Result**: Fully functional climate risk dashboard

