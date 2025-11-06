import Papa from "papaparse";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { RegionalDashboardData } from "@/types";

/**
 * Export dashboard data to CSV format
 */
export function exportToCSV(
  data: RegionalDashboardData,
  filename: string = "climate-data.csv"
) {
  const csvData = [
    // Header
    ["AgriClime Sentinel - Climate Data Export"],
    [""],
    ["County Information"],
    ["County Name", data.county.name],
    ["State", data.county.state],
    ["FIPS Code", data.county.fips],
    [""],
    ["Current Climate Conditions"],
    [
      "Temperature (°C)",
      data.current_climate?.temperature_avg?.toFixed(2) || "N/A",
    ],
    [
      "Max Temperature (°C)",
      data.current_climate?.temperature_max?.toFixed(2) || "N/A",
    ],
    [
      "Min Temperature (°C)",
      data.current_climate?.temperature_min?.toFixed(2) || "N/A",
    ],
    [
      "Precipitation (mm)",
      data.current_climate?.precipitation?.toFixed(2) || "N/A",
    ],
    [
      "Soil Moisture (%)",
      data.current_climate?.soil_moisture?.toFixed(2) || "N/A",
    ],
    ["Drought Index", data.current_climate?.drought_index?.toFixed(2) || "N/A"],
    [""],
    ["Agricultural Metrics"],
    [
      "Growing Degree Days (YTD)",
      data.growing_degree_days?.toString() || "N/A",
    ],
    [
      "Extreme Heat Days (YTD)",
      data.extreme_heat_days_ytd?.toString() || "N/A",
    ],
    [""],
    ["Precipitation Analysis"],
    ["Current (mm)", data.precipitation_vs_avg?.current?.toFixed(2) || "N/A"],
    [
      "Historical Average (mm)",
      data.precipitation_vs_avg?.historical_avg?.toFixed(2) || "N/A",
    ],
    [
      "Difference (%)",
      data.precipitation_vs_avg?.percent_difference?.toFixed(2) || "N/A",
    ],
    [""],
    ["Historical Trends (Last 10 Years)"],
    [
      "Year",
      "Drought Frequency",
      "Drought Severity",
      "Extreme Heat Days",
      "Precipitation (mm)",
    ],
  ];

  // Add historical trends
  if (data.historical_trends && data.historical_trends.length > 0) {
    const recentTrends = data.historical_trends.slice(-10);
    recentTrends.forEach((trend) => {
      csvData.push([
        trend.year.toString(),
        trend.drought_frequency.toString(),
        trend.drought_severity_avg.toFixed(2),
        trend.extreme_heat_days.toString(),
        trend.precipitation_total.toFixed(2),
      ]);
    });
  }

  csvData.push(
    [""],
    ["Export Date", new Date().toISOString()],
    [
      "Source",
      "AgriClime Sentinel - https://github.com/clevernat/AgriClime-Sentinel",
    ]
  );

  const csv = Papa.unparse(csvData);
  downloadFile(csv, filename, "text/csv");
}

/**
 * Export dashboard to PDF format using jsPDF text (no html2canvas)
 * This avoids CSS compatibility issues
 */
export async function exportToPDF(
  elementId: string,
  data: RegionalDashboardData,
  filename: string = "climate-report.pdf"
) {
  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 20;
    const leftMargin = 20;
    const pageWidth = 170; // 210mm - 40mm margins

    // Helper to add colored box
    const addColorBox = (
      color: [number, number, number],
      height: number = 8
    ) => {
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(leftMargin, yPos, pageWidth, height, "F");
      yPos += height;
    };

    // Helper function to add text with word wrap
    const addText = (
      text: string,
      fontSize: number = 10,
      isBold: boolean = false,
      color: [number, number, number] = [0, 0, 0]
    ) => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      if (isBold) {
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setFont("helvetica", "normal");
      }

      const lines = pdf.splitTextToSize(text, pageWidth);
      lines.forEach((line: string) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.text(line, leftMargin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 3;
    };

    // Title with green background
    pdf.setFillColor(34, 197, 94); // Green
    pdf.rect(leftMargin, yPos, pageWidth, 12, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Climate Risk Report", leftMargin + 3, yPos + 8);
    yPos += 15;

    // Location
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${data.county.name}, ${data.county.state}`, leftMargin, yPos);
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generated: ${new Date().toLocaleString()}`, leftMargin, yPos);
    yPos += 10;

    // Current Climate Conditions
    pdf.setFillColor(59, 130, 246); // Blue
    pdf.rect(leftMargin, yPos, pageWidth, 8, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("Current Climate Conditions", leftMargin + 3, yPos + 5.5);
    yPos += 11;

    pdf.setTextColor(0, 0, 0);
    const climate = data.current_climate;
    if (climate) {
      const temp = climate.temperature_avg;
      const tempMax = climate.temperature_max;
      const tempMin = climate.temperature_min;
      const precip = climate.precipitation;
      const soilMoisture = climate.soil_moisture;
      const droughtIdx = climate.drought_index;

      addText(
        `Temperature (Avg): ${
          temp !== null && temp !== undefined ? temp.toFixed(1) : "N/A"
        }°C`
      );
      addText(
        `Temperature (Max): ${
          tempMax !== null && tempMax !== undefined ? tempMax.toFixed(1) : "N/A"
        }°C`
      );
      addText(
        `Temperature (Min): ${
          tempMin !== null && tempMin !== undefined ? tempMin.toFixed(1) : "N/A"
        }°C`
      );
      addText(
        `Precipitation: ${
          precip !== null && precip !== undefined ? precip.toFixed(2) : "N/A"
        } mm`
      );
      addText(
        `Soil Moisture: ${
          soilMoisture !== null && soilMoisture !== undefined
            ? soilMoisture.toFixed(1)
            : "N/A"
        }%`
      );
      addText(
        `Drought Index: ${
          droughtIdx !== null && droughtIdx !== undefined
            ? droughtIdx.toFixed(0)
            : "N/A"
        } (0=None, 5=Exceptional)`
      );
    } else {
      addText("No current climate data available");
    }
    yPos += 5;

    // Agricultural Metrics
    pdf.setFillColor(249, 115, 22); // Orange
    pdf.rect(leftMargin, yPos, pageWidth, 8, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("Agricultural Metrics", leftMargin + 3, yPos + 5.5);
    yPos += 11;

    pdf.setTextColor(0, 0, 0);
    const gdd = data.growing_degree_days;
    const heatDays = data.extreme_heat_days_ytd;

    addText(
      `Growing Degree Days (YTD): ${
        gdd !== null && gdd !== undefined ? gdd.toFixed(0) : "N/A"
      }`
    );
    addText(
      `Extreme Heat Days (YTD): ${
        heatDays !== null && heatDays !== undefined ? heatDays : "N/A"
      }`
    );

    if (data.precipitation_vs_avg) {
      const pctDiff = data.precipitation_vs_avg.percent_difference;
      const current = data.precipitation_vs_avg.current;
      const historical = data.precipitation_vs_avg.historical_avg;

      addText(
        `Current YTD Precipitation: ${
          current !== null && current !== undefined ? current.toFixed(1) : "N/A"
        } mm`
      );
      addText(
        `Historical Average: ${
          historical !== null && historical !== undefined
            ? historical.toFixed(1)
            : "N/A"
        } mm`
      );
      addText(
        `Difference: ${
          pctDiff !== null && pctDiff !== undefined
            ? (pctDiff > 0 ? "+" : "") + pctDiff.toFixed(1)
            : "N/A"
        }%`
      );
    }
    yPos += 5;

    // Historical Trends
    if (data.historical_trends && data.historical_trends.length > 0) {
      pdf.setFillColor(168, 85, 247); // Purple
      pdf.rect(leftMargin, yPos, pageWidth, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("Historical Trends (Last 10 Years)", leftMargin + 3, yPos + 5.5);
      yPos += 11;

      pdf.setTextColor(0, 0, 0);
      const recentTrends = data.historical_trends.slice(-10);

      // Add table header
      addText(
        "Year | Drought Events | Avg Severity | Heat Days | Precip (mm)",
        9
      );
      addText(
        "----------------------------------------------------------------",
        9
      );

      recentTrends.forEach((trend) => {
        const year = trend.year;
        const droughtFreq = trend.drought_frequency;
        const severity = trend.drought_severity_avg.toFixed(1);
        const heatDays = trend.extreme_heat_days;
        const precip = trend.precipitation_total.toFixed(0);

        addText(
          `${year} | ${droughtFreq
            .toString()
            .padStart(14)} | ${severity.padStart(12)} | ${heatDays
            .toString()
            .padStart(9)} | ${precip.padStart(10)}`,
          9
        );
      });
    } else {
      addText("Historical Trends", 14, true);
      addText("No historical trend data available");
    }
    yPos += 5;

    // Footer
    addText("Data Source", 12, true);
    addText("AgriClime Sentinel - Climate Risk Dashboard", 9);
    addText("https://github.com/clevernat/AgriClime-Sentinel", 9);
    addText(`Report generated: ${new Date().toLocaleString()}`, 9);

    // Add metadata
    pdf.setProperties({
      title: `Climate Report - ${data.county.name}, ${data.county.state}`,
      subject: "Agricultural Climate Risk Assessment",
      author: "AgriClime Sentinel",
      keywords: "climate, agriculture, drought, weather",
      creator: "AgriClime Sentinel",
    });

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error(
      `Failed to export PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Export chart as PNG image
 * Uses SVG to canvas conversion to avoid CSS issues
 */
export async function exportChartAsPNG(
  elementId: string,
  filename: string = "chart.png"
) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(
        "Chart element not found. Please make sure the chart is visible."
      );
    }

    // Find the SVG element (Recharts renders as SVG)
    const svgElement = element.querySelector("svg");
    if (!svgElement) {
      throw new Error(
        "No chart found. Please make sure you're viewing the Historical Trends tab."
      );
    }

    // Get SVG dimensions
    const svgRect = svgElement.getBoundingClientRect();
    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = svgRect.width * 2; // 2x for better quality
    canvas.height = svgRect.height * 2;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to create canvas context");
    }

    // Set white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create image from SVG
    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      // Download as PNG
      canvas.toBlob((blob) => {
        if (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(downloadUrl);
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      throw new Error("Failed to load chart image");
    };

    img.src = url;
  } catch (error) {
    console.error("Error exporting chart:", error);
    throw new Error(
      `Failed to export chart: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Helper function to capture chart as image using html2canvas
 */
async function captureChartAsImage(chartId: string): Promise<string | null> {
  try {
    console.log(`[Chart Capture] Attempting to capture: ${chartId}`);

    const element = document.getElementById(chartId);
    if (!element) {
      console.error(`[Chart Capture] ❌ Element not found: ${chartId}`);
      return null;
    }

    // Check if element is visible
    const rect = element.getBoundingClientRect();
    console.log(`[Chart Capture] Element dimensions:`, {
      width: rect.width,
      height: rect.height,
      visible: rect.width > 0 && rect.height > 0,
    });

    if (rect.width === 0 || rect.height === 0) {
      console.error(
        `[Chart Capture] ❌ Element has zero dimensions: ${chartId}`
      );
      return null;
    }

    console.log(`[Chart Capture] Capturing with html2canvas...`);

    // Use html2canvas to capture the entire chart container
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2, // Higher quality
      logging: true, // Enable logging to see what's happening
      useCORS: true,
      allowTaint: true,
    });

    console.log(`[Chart Capture] Canvas created:`, {
      width: canvas.width,
      height: canvas.height,
    });

    const dataUrl = canvas.toDataURL("image/png");
    console.log(
      `[Chart Capture] ✅ Successfully captured ${chartId}, data URL length: ${dataUrl.length}`
    );
    return dataUrl;
  } catch (error) {
    console.error(`[Chart Capture] ❌ Error capturing ${chartId}:`, error);
    return null;
  }
}

/**
 * Export atmospheric science data to PDF with professional formatting and charts
 */
export async function exportAtmosphericDataToPDF(
  countyName: string,
  state: string,
  data: {
    alerts?: any[];
    severeWeather?: any;
    airQuality?: any;
    climateTrends?: any;
  },
  filename: string = "atmospheric-report.pdf"
) {
  try {
    console.log("========================================");
    console.log("Starting PDF export with charts...");
    console.log("========================================");

    // Delay to ensure all charts are fully rendered
    console.log("Waiting 1 second for charts to render...");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 20;
    const leftMargin = 20;
    const pageWidth = 170;
    const pageHeight = 277; // A4 height in mm

    // Helper to check if new page is needed
    const checkNewPage = (spaceNeeded: number = 30) => {
      if (yPos + spaceNeeded > pageHeight - 20) {
        pdf.addPage();
        yPos = 20;
        return true;
      }
      return false;
    };

    // Helper to add section header
    const addSectionHeader = (
      title: string,
      color: [number, number, number]
    ) => {
      checkNewPage(15);
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(leftMargin, yPos, pageWidth, 10, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, leftMargin + 3, yPos + 7);
      yPos += 13;
    };

    // Helper to add text
    const addText = (
      text: string,
      fontSize: number = 10,
      isBold: boolean = false,
      color: [number, number, number] = [0, 0, 0]
    ) => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      if (isBold) {
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setFont("helvetica", "normal");
      }

      const lines = pdf.splitTextToSize(text, pageWidth);
      lines.forEach((line: string) => {
        checkNewPage();
        pdf.text(line, leftMargin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 3;
    };

    // Helper to add chart image
    const addChartImage = async (
      chartId: string,
      chartTitle: string,
      maxWidth: number = 170,
      maxHeight: number = 100
    ) => {
      console.log(`\n[PDF] ========================================`);
      console.log(`[PDF] Adding chart to PDF: ${chartTitle}`);
      console.log(`[PDF] Chart ID: ${chartId}`);

      const imageData = await captureChartAsImage(chartId);

      if (!imageData) {
        console.error(`[PDF] ❌ Chart image not available: ${chartTitle}`);
        addText(
          `[Chart: ${chartTitle} - Image not available. Please ensure the chart is visible on screen.]`,
          9,
          false,
          [150, 150, 150]
        );
        return;
      }

      console.log(`[PDF] Image data received, length: ${imageData.length}`);
      checkNewPage(maxHeight + 15);

      // Add chart title
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(60, 60, 60);
      pdf.text(chartTitle, leftMargin, yPos);
      yPos += 7;

      // Add image
      try {
        console.log(`[PDF] Adding image to PDF at position y=${yPos}...`);
        pdf.addImage(imageData, "PNG", leftMargin, yPos, maxWidth, maxHeight);
        console.log(`[PDF] ✅ Successfully added chart to PDF: ${chartTitle}`);
      } catch (error) {
        console.error(
          `[PDF] ❌ Failed to add image to PDF: ${chartTitle}`,
          error
        );
        addText(
          `[Chart: ${chartTitle} - Failed to embed image]`,
          9,
          false,
          [150, 150, 150]
        );
      }
      yPos += maxHeight + 8;
      console.log(`[PDF] ========================================\n`);
    };

    // ========== TITLE PAGE ==========
    pdf.setFillColor(37, 99, 235); // Blue
    pdf.rect(0, 0, 210, 40, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont("helvetica", "bold");
    pdf.text("ATMOSPHERIC SCIENCE REPORT", 105, 20, { align: "center" });

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "normal");
    pdf.text("Comprehensive Climate & Air Quality Analysis", 105, 30, {
      align: "center",
    });

    yPos = 55;

    // Location and metadata
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${countyName}, ${state}`, 105, yPos, { align: "center" });
    yPos += 10;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    const coords = data.airQuality?.observations?.[0];
    if (coords?.latitude && coords?.longitude) {
      pdf.text(
        `Coordinates: ${coords.latitude.toFixed(4)}°N, ${Math.abs(
          coords.longitude
        ).toFixed(4)}°W`,
        105,
        yPos,
        { align: "center" }
      );
      yPos += 6;
    }

    pdf.text(`Report Generated: ${new Date().toLocaleString()}`, 105, yPos, {
      align: "center",
    });
    yPos += 20;

    // Executive Summary Box
    pdf.setFillColor(240, 249, 255); // Light blue background
    pdf.rect(leftMargin, yPos, pageWidth, 60, "F");
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.5);
    pdf.rect(leftMargin, yPos, pageWidth, 60, "S");

    yPos += 8;
    pdf.setTextColor(37, 99, 235);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("EXECUTIVE SUMMARY", leftMargin + 3, yPos);
    yPos += 8;

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    const summaryText = `This report provides a comprehensive atmospheric science analysis for ${countyName}, ${state}. It includes real-time air quality measurements, severe weather risk indices, active weather alerts, and long-term climate trend analysis. The data is sourced from EPA AirNow, NOAA Weather Service, and Open-Meteo climate databases. This analysis is intended for agricultural planning, public health assessment, and climate risk evaluation.`;

    const summaryLines = pdf.splitTextToSize(summaryText, pageWidth - 6);
    summaryLines.forEach((line: string) => {
      pdf.text(line, leftMargin + 3, yPos);
      yPos += 5;
    });

    yPos += 15;

    // ========== 1. WEATHER ALERTS SECTION ==========
    if (data.alerts && data.alerts.length > 0) {
      addSectionHeader("1. ACTIVE WEATHER ALERTS", [239, 68, 68]);

      data.alerts.forEach((alert: any, index: number) => {
        pdf.setTextColor(0, 0, 0);
        addText(
          `Alert ${index + 1}: ${alert.event || "N/A"}`,
          11,
          true,
          [220, 38, 38]
        );
        addText(`Severity: ${alert.severity || "N/A"}`, 10);
        addText(`Headline: ${alert.headline || "N/A"}`, 10);
        if (alert.onset)
          addText(`Onset: ${new Date(alert.onset).toLocaleString()}`, 9);
        if (alert.expires)
          addText(`Expires: ${new Date(alert.expires).toLocaleString()}`, 9);
        if (alert.description) {
          addText("Description:", 10, true);
          addText(alert.description, 9);
        }
        yPos += 5;
      });
    } else {
      addSectionHeader("1. WEATHER ALERTS", [34, 197, 94]);
      addText("✓ No active weather alerts for this location.", 10);
      yPos += 5;
    }

    // ========== 2. AIR QUALITY ANALYSIS ==========
    if (data.airQuality && data.airQuality.overall) {
      const aqi = data.airQuality.overall.aqi || 0;
      const category = data.airQuality.overall.category?.name || "Unknown";

      // Color based on AQI
      let aqiColor: [number, number, number] = [34, 197, 94]; // Green
      if (aqi > 150) aqiColor = [220, 38, 38]; // Red
      else if (aqi > 100) aqiColor = [249, 115, 22]; // Orange
      else if (aqi > 50) aqiColor = [234, 179, 8]; // Yellow

      addSectionHeader("2. AIR QUALITY INDEX (AQI)", aqiColor);

      pdf.setTextColor(0, 0, 0);
      addText(`Overall AQI: ${aqi} - ${category}`, 12, true);

      if (data.airQuality.overall.dominantPollutant) {
        addText(
          `Dominant Pollutant: ${data.airQuality.overall.dominantPollutant}`,
          10
        );
      }

      // Individual pollutants
      if (
        data.airQuality.observations &&
        data.airQuality.observations.length > 0
      ) {
        yPos += 3;
        addText("Individual Pollutant Measurements:", 11, true);
        data.airQuality.observations.forEach((obs: any) => {
          const pollutantName = obs.parameterName || "Unknown";
          const pollutantAQI = obs.aqi || "N/A";
          const pollutantCategory = obs.category?.name || "N/A";
          addText(
            `• ${pollutantName}: ${pollutantAQI} (${pollutantCategory})`,
            9
          );
        });
      }

      // Health recommendations
      if (data.airQuality.recommendations) {
        yPos += 5;
        addText("Health Recommendations:", 11, true);
        const recs = data.airQuality.recommendations;
        if (recs.general) addText(`• General Public: ${recs.general}`, 9);
        if (recs.sensitiveGroups)
          addText(`• Sensitive Groups: ${recs.sensitiveGroups}`, 9);
        if (recs.activities)
          addText(`• Outdoor Activities: ${recs.activities}`, 9);
      }

      // Add pollutant comparison chart
      yPos += 8;
      await addChartImage(
        "pollutant-comparison-chart",
        "Figure 1: Pollutant Comparison Chart",
        170,
        90
      );
    } else {
      addSectionHeader("2. AIR QUALITY INDEX (AQI)", [156, 163, 175]);
      addText("No air quality data available for this location.", 10);
      yPos += 5;
    }

    // ========== 3. SEVERE WEATHER RISK INDICES ==========
    if (data.severeWeather) {
      addSectionHeader("3. SEVERE WEATHER RISK INDICES", [168, 85, 247]);

      pdf.setTextColor(0, 0, 0);
      const indices = data.severeWeather.indices || data.severeWeather;

      addText(
        "Atmospheric instability indices measure the potential for severe weather development, including thunderstorms, tornadoes, and heavy precipitation.",
        9
      );
      yPos += 3;

      if (indices.cape !== undefined) {
        addText(
          `CAPE (Convective Available Potential Energy): ${indices.cape.toFixed(
            0
          )} J/kg`,
          10,
          true
        );
        addText(
          `Category: ${indices.cape_category || "N/A"} - ${
            indices.cape < 1000
              ? "Low instability"
              : indices.cape < 2500
              ? "Moderate instability"
              : "High instability"
          }`,
          9
        );
        yPos += 2;
      }

      if (indices.k_index !== undefined) {
        addText(`K-Index: ${indices.k_index.toFixed(1)}°C`, 10, true);
        addText(
          `Interpretation: ${
            indices.k_index < 20
              ? "Thunderstorms unlikely"
              : indices.k_index < 30
              ? "Isolated thunderstorms possible"
              : "Widespread thunderstorms likely"
          }`,
          9
        );
        yPos += 2;
      }

      if (indices.lifted_index !== undefined) {
        addText(`Lifted Index: ${indices.lifted_index.toFixed(1)}°C`, 10, true);
        addText(
          `Interpretation: ${
            indices.lifted_index > 2
              ? "Stable atmosphere"
              : indices.lifted_index > -3
              ? "Marginally unstable"
              : "Very unstable"
          }`,
          9
        );
        yPos += 2;
      }

      if (indices.total_totals !== undefined) {
        addText(
          `Total Totals Index: ${indices.total_totals.toFixed(1)}`,
          10,
          true
        );
        addText(
          `Interpretation: ${
            indices.total_totals < 44
              ? "Thunderstorms unlikely"
              : indices.total_totals < 50
              ? "Isolated thunderstorms"
              : "Severe thunderstorms possible"
          }`,
          9
        );
        yPos += 2;
      }

      // Add atmospheric indices chart
      yPos += 8;
      await addChartImage(
        "atmospheric-indices-chart",
        "Figure 2: Atmospheric Instability Indices",
        170,
        90
      );
    } else {
      addSectionHeader("3. SEVERE WEATHER RISK INDICES", [156, 163, 175]);
      addText("No severe weather data available for this location.", 10);
      yPos += 5;
    }

    // ========== 4. CLIMATE TRENDS ANALYSIS ==========
    if (data.climateTrends && data.climateTrends.trend) {
      addSectionHeader("4. LONG-TERM CLIMATE TRENDS", [14, 165, 233]);

      pdf.setTextColor(0, 0, 0);
      const trend = data.climateTrends.trend;
      const period = data.climateTrends.period;

      addText(
        `This section analyzes historical temperature trends to identify long-term climate patterns and their potential impacts on agriculture and public health.`,
        9
      );
      yPos += 3;

      addText(
        `Analysis Period: ${period.startYear} - ${period.endYear} (${period.yearsAnalyzed} years)`,
        10,
        true
      );
      addText(`Trend Direction: ${trend.trendDirection}`, 10);
      addText(
        `Temperature Change: ${
          trend.percentChange > 0 ? "+" : ""
        }${trend.percentChange.toFixed(1)}%`,
        10
      );
      addText(
        `Statistical Significance: ${
          trend.isSignificant ? "Yes" : "No"
        } (p-value: ${trend.pValue.toFixed(3)})`,
        9
      );
      addText(`Interpretation: ${trend.interpretation}`, 9);

      // Add temperature trend chart
      yPos += 8;
      await addChartImage(
        "temperature-trend-chart",
        "Figure 3: Historical Temperature Trend",
        170,
        90
      );
    } else {
      addSectionHeader("4. LONG-TERM CLIMATE TRENDS", [156, 163, 175]);
      addText("No climate trend data available for this location.", 10);
      yPos += 5;
    }

    // ========== CONCLUSION ==========
    checkNewPage(40);
    addSectionHeader("5. CONCLUSION & RECOMMENDATIONS", [37, 99, 235]);

    const conclusionText = `This comprehensive atmospheric analysis provides critical insights for ${countyName}, ${state}. The data presented includes real-time air quality measurements, severe weather risk assessment, and long-term climate trends. Stakeholders should use this information for agricultural planning, public health advisories, and climate adaptation strategies. Regular monitoring of these atmospheric parameters is recommended to ensure timely response to changing environmental conditions.`;

    const conclusionLines = pdf.splitTextToSize(conclusionText, pageWidth);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    conclusionLines.forEach((line: string) => {
      checkNewPage();
      pdf.text(line, leftMargin, yPos);
      yPos += 5;
    });

    yPos += 10;
    addText("Data Sources:", 11, true);
    addText("• EPA AirNow API - Real-time air quality measurements", 9);
    addText(
      "• NOAA National Weather Service - Weather alerts and forecasts",
      9
    );
    addText("• Open-Meteo API - Climate data and atmospheric indices", 9);

    // Footer on every page
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(
        "AgriClime Sentinel - Atmospheric Science Dashboard",
        leftMargin,
        pageHeight - 10
      );
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth + leftMargin - 20,
        pageHeight - 10
      );
      pdf.text(
        "https://github.com/clevernat/AgriClime-Sentinel",
        leftMargin,
        pageHeight - 6
      );
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating atmospheric PDF:", error);
    throw new Error(
      `Failed to export PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Export atmospheric science data to CSV
 */
export function exportAtmosphericDataToCSV(
  countyName: string,
  state: string,
  data: {
    alerts?: any[];
    severeWeather?: any;
    airQuality?: any;
    climateTrends?: any;
  },
  filename: string = "atmospheric-data.csv"
) {
  const csvData: any[] = [
    ["AgriClime Sentinel - Atmospheric Science Data Export"],
    [""],
    ["Location"],
    ["County", countyName],
    ["State", state],
    ["Export Date", new Date().toISOString()],
    [""],
  ];

  // Weather Alerts
  if (data.alerts && data.alerts.length > 0) {
    csvData.push(
      ["Weather Alerts"],
      ["Event", "Severity", "Headline", "Description", "Onset", "Expires"]
    );
    data.alerts.forEach((alert: any) => {
      csvData.push([
        alert.event || "",
        alert.severity || "",
        alert.headline || "",
        alert.description || "",
        alert.onset || "",
        alert.expires || "",
      ]);
    });
    csvData.push([""]);
  }

  // Severe Weather Indices
  if (data.severeWeather) {
    csvData.push(["Severe Weather Indices"], ["Index", "Value", "Category"]);
    const indices = data.severeWeather.indices || data.severeWeather;
    if (indices.cape !== undefined) {
      csvData.push([
        "CAPE",
        indices.cape.toFixed(0),
        indices.cape_category || "",
      ]);
    }
    if (indices.k_index !== undefined) {
      csvData.push(["K-Index", indices.k_index.toFixed(1), ""]);
    }
    if (indices.total_totals !== undefined) {
      csvData.push(["Total Totals", indices.total_totals.toFixed(1), ""]);
    }
    csvData.push([""]);
  }

  // Air Quality
  if (data.airQuality) {
    csvData.push(
      ["Air Quality"],
      ["Overall AQI", data.airQuality.overall?.aqi || "N/A"],
      ["Category", data.airQuality.overall?.category?.name || "N/A"],
      [""],
      ["Pollutant", "AQI", "Category"]
    );
    if (data.airQuality.observations) {
      data.airQuality.observations.forEach((obs: any) => {
        csvData.push([
          obs.parameterName || obs.ParameterName || "",
          obs.aqi || obs.AQI || "",
          obs.category?.name || "",
        ]);
      });
    }
    csvData.push([""]);
  }

  // Climate Trends
  if (data.climateTrends && data.climateTrends.data) {
    csvData.push(["Climate Trends"], ["Year", "Value"]);
    data.climateTrends.data.forEach((point: any) => {
      csvData.push([point.year.toString(), point.value.toFixed(2)]);
    });
    csvData.push([""]);
  }

  csvData.push(
    [""],
    [
      "Source",
      "AgriClime Sentinel - https://github.com/clevernat/AgriClime-Sentinel",
    ]
  );

  const csv = Papa.unparse(csvData);
  downloadFile(csv, filename, "text/csv");
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `${prefix}_${timestamp}.${extension}`;
}
