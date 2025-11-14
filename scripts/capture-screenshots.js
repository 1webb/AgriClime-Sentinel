const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const APP_URL = 'http://localhost:3000';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to false to see what's happening
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });

  const page = await browser.newPage();

  try {
    // Navigate to the app
    console.log('📍 Navigating to app...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for map to load
    console.log('🗺️  Waiting for map to load...');
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Extra wait for map tiles

    // Screenshot 1: Map View with Historical Playback and Comparison Mode
    console.log('\n📸 Capturing Screenshot 1: Map View with features...');
    
    // Turn on Historical Playback
    console.log('   ⏰ Enabling Historical Playback...');
    await page.evaluate(() => {
      const historicalToggle = document.querySelector('input[type="checkbox"]');
      if (historicalToggle && !historicalToggle.checked) {
        historicalToggle.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Turn on Comparison Mode
    console.log('   🔄 Enabling Comparison Mode...');
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const comparisonToggle = Array.from(checkboxes).find(cb => {
        const label = cb.parentElement?.textContent || '';
        return label.includes('Comparison Mode');
      });
      if (comparisonToggle && !comparisonToggle.checked) {
        comparisonToggle.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click on a few counties to select them
    console.log('   🎯 Selecting counties...');
    await page.evaluate(() => {
      // Simulate clicking on map to select counties
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        // We'll trigger clicks at specific coordinates
        const event1 = new MouseEvent('click', { bubbles: true, clientX: 800, clientY: 400 });
        const event2 = new MouseEvent('click', { bubbles: true, clientX: 900, clientY: 450 });
        const event3 = new MouseEvent('click', { bubbles: true, clientX: 850, clientY: 500 });
        mapContainer.dispatchEvent(event1);
        setTimeout(() => mapContainer.dispatchEvent(event2), 200);
        setTimeout(() => mapContainer.dispatchEvent(event3), 400);
      }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Capture map view
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'map-view.png'),
      fullPage: false,
    });
    console.log('   ✅ Saved: screenshots/map-view.png');

    // Screenshot 2: Dashboard Overview
    console.log('\n📸 Capturing Screenshot 2: Dashboard Overview...');
    
    // Turn off comparison mode first
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const comparisonToggle = Array.from(checkboxes).find(cb => {
        const label = cb.parentElement?.textContent || '';
        return label.includes('Comparison Mode');
      });
      if (comparisonToggle && comparisonToggle.checked) {
        comparisonToggle.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click on a county to open dashboard
    console.log('   🎯 Opening county dashboard...');
    await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        const event = new MouseEvent('click', { bubbles: true, clientX: 800, clientY: 400 });
        mapContainer.dispatchEvent(event);
      }
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for dashboard to appear
    await page.waitForSelector('h2', { timeout: 5000 }).catch(() => {
      console.log('   ⚠️  Dashboard might not have opened, continuing anyway...');
    });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'dashboard-overview.png'),
      fullPage: true,
    });
    console.log('   ✅ Saved: screenshots/dashboard-overview.png');

    // Screenshot 3: Comparison Dashboard
    console.log('\n📸 Capturing Screenshot 3: Comparison Dashboard...');
    
    // Close current dashboard if open
    await page.evaluate(() => {
      const closeButton = document.querySelector('button[aria-label="Close"]') || 
                         Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('×'));
      if (closeButton) closeButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Turn on comparison mode again
    console.log('   🔄 Re-enabling Comparison Mode...');
    await page.evaluate(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      const comparisonToggle = Array.from(checkboxes).find(cb => {
        const label = cb.parentElement?.textContent || '';
        return label.includes('Comparison Mode');
      });
      if (comparisonToggle && !comparisonToggle.checked) {
        comparisonToggle.click();
      }
    });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Select multiple counties
    console.log('   🎯 Selecting multiple counties...');
    await page.evaluate(() => {
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        const coords = [
          { x: 800, y: 400 },
          { x: 900, y: 450 },
          { x: 850, y: 500 },
          { x: 750, y: 450 },
        ];
        coords.forEach((coord, i) => {
          setTimeout(() => {
            const event = new MouseEvent('click', { bubbles: true, clientX: coord.x, clientY: coord.y });
            mapContainer.dispatchEvent(event);
          }, i * 300);
        });
      }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click the "Compare X Counties" button
    console.log('   📊 Opening comparison dashboard...');
    await page.evaluate(() => {
      const compareButton = Array.from(document.querySelectorAll('button')).find(b =>
        b.textContent.includes('Compare') && b.textContent.includes('Counties')
      );
      if (compareButton) compareButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for comparison dashboard
    await page.waitForSelector('h2', { timeout: 5000 }).catch(() => {
      console.log('   ⚠️  Comparison dashboard might not have opened, continuing anyway...');
    });

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'comparison-dashboard.png'),
      fullPage: true,
    });
    console.log('   ✅ Saved: screenshots/comparison-dashboard.png');

    console.log('\n✨ All screenshots captured successfully!\n');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots().catch(console.error);

