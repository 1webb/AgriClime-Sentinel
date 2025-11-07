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
 * Force render all charts in Agricultural Dashboard by ensuring they're visible
 */
async function forceRenderAgriculturalCharts(): Promise<() => void> {
  console.log("[Agricultural Chart Rendering] Ensuring all charts are rendered...");

  // Find the regional dashboard content container
  const dashboardContent = document.getElementById("regional-dashboard-content");

  if (!dashboardContent) {
    console.warn("[Agricultural Chart Rendering] ❌ Dashboard content not found");
    return () => {}; // Return no-op cleanup function
  }

  console.log("[Agricultural Chart Rendering] Dashboard content found");

  // Store original scroll position
  const originalScrollTop = dashboardContent.scrollTop;
  console.log("[Agricultural Chart Rendering] Original scroll position:", originalScrollTop);

  // Check if charts exist
  const chart1 = document.getElementById("historical-trends-chart");
  const chart2 = document.getElementById("extreme-heat-chart");

  console.log("[Agricultural Chart Rendering] Chart 1 (historical-trends-chart):", chart1 ? "✅ Found" : "❌ Not found");
  console.log("[Agricultural Chart Rendering] Chart 2 (extreme-heat-chart):", chart2 ? "✅ Found" : "❌ Not found");

  // Scroll charts into view to ensure they're rendered
  if (chart1) {
    console.log("[Agricultural Chart Rendering] Scrolling Chart 1 into view...");
    chart1.scrollIntoView({ behavior: "auto", block: "center" });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rect1 = chart1.getBoundingClientRect();
    console.log("[Agricultural Chart Rendering] Chart 1 dimensions:", { width: rect1.width, height: rect1.height });
  }

  if (chart2) {
    console.log("[Agricultural Chart Rendering] Scrolling Chart 2 into view...");
    chart2.scrollIntoView({ behavior: "auto", block: "center" });
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rect2 = chart2.getBoundingClientRect();
    console.log("[Agricultural Chart Rendering] Chart 2 dimensions:", { width: rect2.width, height: rect2.height });
  }

  // Wait for Recharts to fully render all SVG charts
  console.log("[Agricultural Chart Rendering] Waiting 2 more seconds for charts to fully render...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("[Agricultural Chart Rendering] ✅ All charts should be rendered now");

  // Return cleanup function to restore scroll position
  return () => {
    console.log("[Agricultural Chart Rendering] Restoring scroll position...");
    dashboardContent.scrollTop = originalScrollTop;
    console.log("[Agricultural Chart Rendering] Cleanup complete");
  };
}

/**
 * Export Agricultural Dashboard to professional thesis-quality PDF with charts
 * Matches the quality and formatting of the Atmospheric Science Dashboard PDF
 */
export async function exportToPDF(
  elementId: string,
  data: RegionalDashboardData,
  filename: string = "climate-report.pdf"
) {
  let restoreVisibility: (() => void) | null = null;

  try {
    console.log("========================================");
    console.log("Starting Agricultural PDF export with charts...");
    console.log("========================================");

    // Force render all charts before capturing
    console.log("Force rendering all charts...");
    restoreVisibility = await forceRenderAgriculturalCharts();

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 25;
    const leftMargin = 25;
    const rightMargin = 25;
    const pageWidth = 210;
    const pageHeight = 297;
    const contentWidth = pageWidth - leftMargin - rightMargin;

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number = 20) => {
      if (yPos + requiredSpace > pageHeight - 25) {
        pdf.addPage();
        yPos = 25;
        return true;
      }
      return false;
    };

    // Helper function to add text with professional formatting
    const addText = (
      text: string,
      fontSize: number = 11,
      isBold: boolean = false,
      color: [number, number, number] = [40, 40, 40],
      lineHeight: number = 1.5,
      indent: number = 0
    ) => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");

      const lines = pdf.splitTextToSize(text, contentWidth - indent);
      lines.forEach((line: string) => {
        checkPageBreak();
        pdf.text(line, leftMargin + indent, yPos);
        yPos += fontSize * 0.35 * lineHeight;
      });
      yPos += 2;
    };

    // Helper function to add bullet points
    const addBullet = (
      text: string,
      fontSize: number = 11,
      bulletChar: string = "•"
    ) => {
      checkPageBreak();
      pdf.setFontSize(fontSize);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont("helvetica", "normal");

      pdf.text(bulletChar, leftMargin + 2, yPos);
      const lines = pdf.splitTextToSize(text, contentWidth - 8);
      lines.forEach((line: string, index: number) => {
        if (index > 0) checkPageBreak();
        pdf.text(line, leftMargin + 8, yPos);
        yPos += fontSize * 0.35 * 1.5;
      });
      yPos += 1;
    };

    // Helper function to add section headers
    const addSectionHeader = (
      title: string,
      color: [number, number, number],
      level: number = 1 // 1 = main section, 2 = subsection
    ) => {
      checkPageBreak(level === 1 ? 25 : 15);

      if (level === 1) {
        // Main section header with colored background bar
        yPos += 3;
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.rect(leftMargin, yPos - 2, contentWidth, 10, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, leftMargin + 3, yPos + 5);
        yPos += 13;
      } else {
        // Subsection header
        yPos += 2;
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, leftMargin, yPos);
        yPos += 8;
      }
    };

    // Helper function to add professional footer
    const addFooter = () => {
      const footerY = pageHeight - 15;

      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(leftMargin, footerY - 3, pageWidth - rightMargin, footerY - 3);

      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.setFont("helvetica", "normal");
      pdf.text("AgriClime Sentinel - Agricultural Climate Risk Assessment", leftMargin, footerY);

      pdf.setFont("helvetica", "italic");
      pdf.text(
        `Page ${pdf.getCurrentPageInfo().pageNumber}`,
        leftMargin + contentWidth,
        footerY,
        { align: "right" }
      );
    };

    // Helper function to add chart image (same pattern as Atmospheric PDF)
    const addChartImage = async (
      chartId: string,
      chartTitle: string,
      maxWidth: number = contentWidth,
      maxHeight: number = 100
    ) => {
      console.log(`\n[Agricultural PDF] ========================================`);
      console.log(`[Agricultural PDF] Adding chart: ${chartTitle}`);
      console.log(`[Agricultural PDF] Chart ID: ${chartId}`);

      const imageData = await captureChartAsImage(chartId);

      if (!imageData) {
        console.error(`[Agricultural PDF] ❌ Chart image not available: ${chartTitle}`);
        addText(
          `⚠ Chart visualization unavailable: ${chartTitle}`,
          10,
          false,
          [150, 150, 150]
        );
        return;
      }

      console.log(`[Agricultural PDF] Image data received, length: ${imageData.length}`);
      checkPageBreak(maxHeight + 15);

      // Add chart title
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(60, 60, 60);
      pdf.text(chartTitle, leftMargin, yPos);
      yPos += 7;

      // Add image
      try {
        console.log(`[Agricultural PDF] Adding image to PDF at position y=${yPos}...`);
        pdf.addImage(imageData, "PNG", leftMargin, yPos, maxWidth, maxHeight);
        console.log(`[Agricultural PDF] ✅ Successfully added chart: ${chartTitle}`);
        yPos += maxHeight + 8;
      } catch (error) {
        console.error(
          `[Agricultural PDF] ❌ Failed to add image to PDF: ${chartTitle}`,
          error
        );
        addText(
          `⚠ Failed to embed chart: ${chartTitle}`,
          10,
          false,
          [150, 150, 150]
        );
      }
    };

    // ==================== TITLE PAGE ====================

    // Decorative top bar
    pdf.setFillColor(34, 197, 94); // Green
    pdf.rect(0, 0, pageWidth, 15, "F");

    // Main title
    yPos = 80;
    pdf.setTextColor(34, 197, 94);
    pdf.setFontSize(28);
    pdf.setFont("helvetica", "bold");
    pdf.text("AGRICULTURAL CLIMATE", pageWidth / 2, yPos, { align: "center" });
    yPos += 12;
    pdf.text("RISK ASSESSMENT", pageWidth / 2, yPos, { align: "center" });

    // Subtitle
    yPos += 20;
    pdf.setTextColor(80, 80, 80);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${data.county.name}, ${data.county.state}`, pageWidth / 2, yPos, { align: "center" });

    // Date
    yPos += 15;
    pdf.setFontSize(12);
    pdf.setTextColor(120, 120, 120);
    const reportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.text(reportDate, pageWidth / 2, yPos, { align: "center" });

    // Decorative middle section
    yPos += 30;
    pdf.setDrawColor(34, 197, 94);
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos);

    // Report type
    yPos += 10;
    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    pdf.setFont("helvetica", "italic");
    pdf.text("Comprehensive Agricultural Climate Analysis", pageWidth / 2, yPos, { align: "center" });
    pdf.text("Historical Trends & Risk Assessment", pageWidth / 2, yPos + 6, { align: "center" });

    // Decorative bottom bar
    pdf.setFillColor(34, 197, 94);
    pdf.rect(0, pageHeight - 15, pageWidth, 15, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("AgriClime Sentinel", pageWidth / 2, pageHeight - 7, { align: "center" });

    // Start new page for content
    pdf.addPage();
    yPos = 25;

    // ==================== SECTION 1: EXECUTIVE SUMMARY ====================
    addSectionHeader("1. Executive Summary", [34, 197, 94]);

    const climate = data.current_climate;
    const gdd = data.growing_degree_days;
    const heatDays = data.extreme_heat_days_ytd;

    addText(
      `This report provides a comprehensive agricultural climate risk assessment for ${data.county.name}, ${data.county.state}. ` +
      `The analysis includes current climate conditions, agricultural metrics, historical drought trends, and extreme weather patterns ` +
      `spanning multiple decades.`,
      11, false, [40, 40, 40], 1.6
    );

    yPos += 3;
    addText("Key Findings:", 12, true, [34, 197, 94]);

    if (climate) {
      const droughtIdx = climate.drought_index ?? 0;
      const droughtLevel = droughtIdx === 0 ? "None" :
                          droughtIdx === 1 ? "Abnormally Dry" :
                          droughtIdx === 2 ? "Moderate Drought" :
                          droughtIdx === 3 ? "Severe Drought" :
                          droughtIdx === 4 ? "Extreme Drought" : "Exceptional Drought";

      addBullet(`Current drought status: ${droughtLevel} (Index: ${droughtIdx})`);
      addBullet(`Average temperature: ${climate.temperature_avg?.toFixed(1) ?? "N/A"}°C`);
      addBullet(`Soil moisture level: ${climate.soil_moisture?.toFixed(1) ?? "N/A"}%`);
    }

    if (gdd !== null && gdd !== undefined) {
      addBullet(`Growing Degree Days (YTD): ${gdd.toFixed(0)} GDD`);
    }

    if (heatDays !== null && heatDays !== undefined) {
      addBullet(`Extreme heat days this year: ${heatDays} days above 35°C`);
    }

    yPos += 5;

    // ==================== SECTION 2: CURRENT CLIMATE CONDITIONS ====================
    addSectionHeader("2. Current Climate Conditions", [59, 130, 246]);

    if (climate) {
      addSectionHeader("2.1 Temperature Metrics", [59, 130, 246], 2);
      addBullet(`Average Temperature: ${climate.temperature_avg?.toFixed(1) ?? "N/A"}°C`);
      addBullet(`Maximum Temperature: ${climate.temperature_max?.toFixed(1) ?? "N/A"}°C`);
      addBullet(`Minimum Temperature: ${climate.temperature_min?.toFixed(1) ?? "N/A"}°C`);

      yPos += 3;
      addSectionHeader("2.2 Precipitation & Soil Moisture", [59, 130, 246], 2);
      addBullet(`Current Precipitation: ${climate.precipitation?.toFixed(2) ?? "N/A"} mm`);
      addBullet(`Soil Moisture: ${climate.soil_moisture?.toFixed(1) ?? "N/A"}%`);

      yPos += 3;
      addSectionHeader("2.3 Drought Status", [59, 130, 246], 2);
      const droughtIdx = climate.drought_index ?? 0;
      addBullet(`Drought Index: ${droughtIdx} (Scale: 0=None, 5=Exceptional)`);

      const droughtDescription = droughtIdx === 0 ? "No drought conditions detected." :
                                 droughtIdx === 1 ? "Abnormally dry conditions. Short-term dryness slowing planting, growth of crops." :
                                 droughtIdx === 2 ? "Moderate drought. Some damage to crops; streams, reservoirs low." :
                                 droughtIdx === 3 ? "Severe drought. Crop losses likely; water shortages common." :
                                 droughtIdx === 4 ? "Extreme drought. Major crop losses; widespread water shortages." :
                                 "Exceptional drought. Exceptional and widespread crop losses; water emergencies.";

      addText(droughtDescription, 10, false, [80, 80, 80], 1.5, 5);
    } else {
      addText("No current climate data available for this location.", 11, false, [150, 150, 150]);
    }

    yPos += 5;

    // ==================== SECTION 3: AGRICULTURAL METRICS ====================
    addSectionHeader("3. Agricultural Metrics", [249, 115, 22]);

    addSectionHeader("3.1 Growing Degree Days (GDD)", [249, 115, 22], 2);
    if (gdd !== null && gdd !== undefined) {
      addBullet(`Year-to-Date GDD: ${gdd.toFixed(0)} degree-days`);
      addText(
        "Growing Degree Days (GDD) measure heat accumulation for crop development. Higher GDD values indicate " +
        "more favorable conditions for crop growth, while lower values may indicate delayed development.",
        10, false, [80, 80, 80], 1.5, 5
      );
    } else {
      addText("GDD data not available for this location.", 11, false, [150, 150, 150]);
    }

    yPos += 3;
    addSectionHeader("3.2 Extreme Heat Events", [249, 115, 22], 2);
    if (heatDays !== null && heatDays !== undefined) {
      addBullet(`Days Above 35°C (YTD): ${heatDays} days`);
      addText(
        "Extreme heat days (>35°C) can cause heat stress in crops, reduce yields, and increase irrigation demands. " +
        "Prolonged heat waves are particularly damaging during critical growth stages.",
        10, false, [80, 80, 80], 1.5, 5
      );
    } else {
      addText("Extreme heat data not available for this location.", 11, false, [150, 150, 150]);
    }

    yPos += 3;
    addSectionHeader("3.3 Precipitation Analysis", [249, 115, 22], 2);
    if (data.precipitation_vs_avg) {
      const pctDiff = data.precipitation_vs_avg.percent_difference;
      const current = data.precipitation_vs_avg.current;
      const historical = data.precipitation_vs_avg.historical_avg;

      addBullet(`Current YTD Precipitation: ${current?.toFixed(1) ?? "N/A"} mm`);
      addBullet(`Historical Average: ${historical?.toFixed(1) ?? "N/A"} mm`);
      addBullet(`Difference from Average: ${pctDiff !== null && pctDiff !== undefined ? (pctDiff > 0 ? "+" : "") + pctDiff.toFixed(1) : "N/A"}%`);

      if (pctDiff !== null && pctDiff !== undefined) {
        const precipStatus = pctDiff > 20 ? "significantly above average (potential flooding risk)" :
                            pctDiff > 10 ? "above average (favorable for most crops)" :
                            pctDiff > -10 ? "near average (normal conditions)" :
                            pctDiff > -20 ? "below average (monitor for drought)" :
                            "significantly below average (drought conditions likely)";

        addText(
          `Precipitation is ${precipStatus}.`,
          10, false, [80, 80, 80], 1.5, 5
        );
      }
    } else {
      addText("Precipitation comparison data not available.", 11, false, [150, 150, 150]);
    }

    yPos += 5;

    // ==================== SECTION 4: HISTORICAL TRENDS & VISUALIZATIONS ====================
    addSectionHeader("4. Historical Climate Trends", [168, 85, 247]);

    if (data.historical_trends && data.historical_trends.length > 0) {
      addText(
        "This section presents long-term climate trends based on historical data analysis. " +
        "The visualizations below show drought frequency, severity patterns, and extreme heat events over time.",
        11, false, [40, 40, 40], 1.6
      );

      yPos += 5;

      // ========== CHART 1: Historical Drought Trends ==========
      addSectionHeader("4.1 Drought Frequency and Severity (50-Year Analysis)", [168, 85, 247], 2);

      await addChartImage(
        "historical-trends-chart",
        "Figure 1: Historical Drought Trends",
        contentWidth,
        100
      );

      addText(
        "The chart above shows the historical pattern of drought events and their average severity. " +
        "Increasing trends may indicate growing climate risks for agricultural operations.",
        10, false, [80, 80, 80], 1.5, 5
      );

      yPos += 5;

      // ========== CHART 2: Extreme Heat Days ==========
      addSectionHeader("4.2 Extreme Heat Days by Year", [168, 85, 247], 2);

      await addChartImage(
        "extreme-heat-chart",
        "Figure 2: Extreme Heat Days by Year",
        contentWidth,
        100
      );

      addText(
        "Days exceeding 35°C can cause significant crop stress, particularly during flowering and grain-filling stages. " +
        "Increasing frequency of extreme heat days may require adaptation strategies.",
        10, false, [80, 80, 80], 1.5, 5
      );

      yPos += 5;

      // ========== DATA TABLE ==========
      checkPageBreak(60);

      addSectionHeader("4.3 Historical Data Summary (Last 10 Years)", [168, 85, 247], 2);

      const recentTrends = data.historical_trends.slice(-10);

      // Table header
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(60, 60, 60);
      pdf.text("Year", leftMargin + 5, yPos);
      pdf.text("Drought Events", leftMargin + 30, yPos);
      pdf.text("Avg Severity", leftMargin + 70, yPos);
      pdf.text("Heat Days", leftMargin + 110, yPos);
      pdf.text("Precip (mm)", leftMargin + 145, yPos);
      yPos += 5;

      // Table separator
      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftMargin, yPos, leftMargin + contentWidth, yPos);
      yPos += 4;

      // Table rows
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(40, 40, 40);
      recentTrends.forEach((trend, index) => {
        checkPageBreak();

        // Alternate row background
        if (index % 2 === 0) {
          pdf.setFillColor(248, 248, 248);
          pdf.rect(leftMargin, yPos - 3, contentWidth, 6, "F");
        }

        pdf.text(trend.year.toString(), leftMargin + 5, yPos);
        pdf.text(trend.drought_frequency.toString(), leftMargin + 30, yPos);
        pdf.text(trend.drought_severity_avg.toFixed(1), leftMargin + 70, yPos);
        pdf.text(trend.extreme_heat_days.toString(), leftMargin + 110, yPos);
        pdf.text(trend.precipitation_total.toFixed(0), leftMargin + 145, yPos);
        yPos += 6;
      });

    } else {
      addText("No historical trend data available for this location.", 11, false, [150, 150, 150]);
    }

    yPos += 5;

    // ==================== SECTION 5: RECOMMENDATIONS ====================
    checkPageBreak(80);
    addSectionHeader("5. Agricultural Risk Management Recommendations", [220, 38, 38]);

    addText(
      "Based on the climate analysis presented in this report, the following recommendations are provided " +
      "for agricultural risk management and adaptation strategies:",
      11, false, [40, 40, 40], 1.6
    );

    yPos += 3;

    // Drought-specific recommendations
    if (climate && climate.drought_index && climate.drought_index >= 2) {
      addSectionHeader("5.1 Drought Mitigation Strategies", [220, 38, 38], 2);
      addBullet("Implement water conservation practices and efficient irrigation systems");
      addBullet("Consider drought-resistant crop varieties for future planting seasons");
      addBullet("Monitor soil moisture levels regularly to optimize irrigation timing");
      addBullet("Develop contingency plans for water supply shortages");
      yPos += 3;
    }

    // Heat stress recommendations
    if (heatDays && heatDays > 10) {
      addSectionHeader("5.2 Heat Stress Management", [220, 38, 38], 2);
      addBullet("Adjust planting dates to avoid extreme heat during critical growth stages");
      addBullet("Increase irrigation frequency during heat waves");
      addBullet("Consider heat-tolerant crop varieties");
      addBullet("Implement shade structures or windbreaks where feasible");
      yPos += 3;
    }

    // General recommendations
    addSectionHeader("5.3 Long-Term Climate Adaptation", [220, 38, 38], 2);
    addBullet("Diversify crop selection to spread climate risk");
    addBullet("Invest in climate monitoring and early warning systems");
    addBullet("Improve soil health to enhance resilience to climate extremes");
    addBullet("Consider crop insurance options to mitigate financial risks");
    addBullet("Stay informed about regional climate forecasts and agricultural advisories");

    yPos += 8;

    // ==================== DATA SOURCES & METHODOLOGY ====================
    checkPageBreak(40);
    addSectionHeader("Data Sources & Methodology", [100, 100, 100]);

    addText(
      "This report integrates data from multiple authoritative sources including NOAA climate databases, " +
      "USDA agricultural statistics, and regional weather monitoring networks. Historical trends are analyzed " +
      "using statistical methods to identify significant patterns and anomalies.",
      10, false, [80, 80, 80], 1.5
    );

    yPos += 5;

    // ==================== FOOTER ON ALL PAGES ====================
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      const footerY = pageHeight - 15;

      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(leftMargin, footerY - 3, pageWidth - rightMargin, footerY - 3);

      // Footer text - left side
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.setFont("helvetica", "normal");
      pdf.text("AgriClime Sentinel - Agricultural Climate Risk Assessment", leftMargin, footerY);

      // Footer text - center
      pdf.setFont("helvetica", "italic");
      pdf.text(
        "github.com/clevernat/AgriClime-Sentinel",
        pageWidth / 2,
        footerY,
        { align: "center" }
      );

      // Footer text - right side (page number)
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - rightMargin,
        footerY,
        { align: "right" }
      );

      // Bottom line - date
      pdf.setFontSize(7);
      pdf.setTextColor(140, 140, 140);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString('en-US')}`,
        leftMargin,
        pageHeight - 8
      );
    }

    // Add metadata
    pdf.setProperties({
      title: `Agricultural Climate Risk Assessment - ${data.county.name}, ${data.county.state}`,
      subject: "Agricultural Climate Risk Assessment with Historical Trends",
      author: "AgriClime Sentinel",
      keywords: "climate, agriculture, drought, weather, risk assessment, historical trends",
      creator: "AgriClime Sentinel",
    });

    console.log("Saving PDF...");
    pdf.save(filename);
    console.log("✅ Agricultural PDF export complete!");
  } catch (error) {
    console.error("Error generating Agricultural PDF:", error);
    throw new Error(
      `Failed to export PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    // Restore original visibility states
    if (restoreVisibility) {
      restoreVisibility();
    }
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
 * Force render all charts by temporarily making all tab content visible
 */
async function forceRenderAllCharts(): Promise<() => void> {
  console.log("[Chart Rendering] Force rendering all charts...");

  const originalStates: Array<{ element: HTMLElement; display: string }> = [];

  // Find the atmospheric dashboard content container
  const dashboardContent = document.getElementById('atmospheric-dashboard-content');

  if (dashboardContent) {
    // Find all direct child divs (these are the tab content containers)
    const tabContainers = dashboardContent.querySelectorAll(':scope > div');

    console.log(`[Chart Rendering] Found ${tabContainers.length} tab containers`);

    tabContainers.forEach((container, index) => {
      const element = container as HTMLElement;
      const originalDisplay = element.style.display;

      // Store original state
      originalStates.push({ element, display: originalDisplay });

      // Force visible if hidden
      if (originalDisplay === 'none') {
        element.style.display = 'block';
        console.log(`[Chart Rendering] Made tab ${index + 1} visible (was hidden)`);
      }
    });
  } else {
    console.warn("[Chart Rendering] Dashboard content container not found, trying fallback...");

    // Fallback: Find all elements with display:none that contain charts
    const hiddenContainers = document.querySelectorAll('div[style*="display: none"]');
    hiddenContainers.forEach((container) => {
      const element = container as HTMLElement;
      // Check if it contains chart elements
      if (element.querySelector('svg') || element.id.includes('chart')) {
        const originalDisplay = element.style.display;
        originalStates.push({ element, display: originalDisplay });
        element.style.display = 'block';
        console.log(`[Chart Rendering] Made visible: ${element.id || 'unnamed container'}`);
      }
    });
  }

  // Wait for charts to render (Recharts needs time to render SVGs)
  console.log("[Chart Rendering] Waiting for charts to fully render...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return cleanup function
  return () => {
    console.log("[Chart Rendering] Restoring original visibility states...");
    originalStates.forEach(({ element, display }) => {
      element.style.display = display;
    });
    console.log("[Chart Rendering] ✅ Visibility restored");
  };
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
  let restoreVisibility: (() => void) | null = null;

  try {
    console.log("========================================");
    console.log("Starting PDF export with charts...");
    console.log("========================================");

    // Force render all charts before capturing
    console.log("Force rendering all charts...");
    restoreVisibility = await forceRenderAllCharts();

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 20;
    const leftMargin = 25; // Increased for professional look
    const rightMargin = 25;
    const pageWidth = 160; // 210mm - 25mm - 25mm
    const pageHeight = 297; // A4 height in mm
    const contentWidth = pageWidth;

    // Helper to check if new page is needed
    const checkNewPage = (spaceNeeded: number = 30) => {
      if (yPos + spaceNeeded > pageHeight - 30) {
        pdf.addPage();
        yPos = 30; // Top margin for new pages
        return true;
      }
      return false;
    };

    // Helper to add section header (thesis-style)
    const addSectionHeader = (
      title: string,
      color: [number, number, number],
      level: number = 1 // 1 = main section, 2 = subsection
    ) => {
      checkNewPage(20);

      if (level === 1) {
        // Main section header
        yPos += 5; // Extra space before main sections
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.rect(leftMargin, yPos, contentWidth, 12, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, leftMargin + 5, yPos + 8.5);
        yPos += 17;
      } else {
        // Subsection header
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, leftMargin, yPos);
        yPos += 8;
      }
    };

    // Helper to add text (enhanced for readability)
    const addText = (
      text: string,
      fontSize: number = 11,
      isBold: boolean = false,
      color: [number, number, number] = [40, 40, 40], // Slightly softer black
      lineHeight: number = 1.5,
      indent: number = 0
    ) => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);
      if (isBold) {
        pdf.setFont("helvetica", "bold");
      } else {
        pdf.setFont("helvetica", "normal");
      }

      const lines = pdf.splitTextToSize(text, contentWidth - indent);
      lines.forEach((line: string) => {
        checkNewPage();
        pdf.text(line, leftMargin + indent, yPos);
        yPos += fontSize * 0.35 * lineHeight;
      });
      yPos += 2;
    };

    // Helper to add bullet point
    const addBullet = (
      text: string,
      fontSize: number = 11,
      bulletChar: string = "•"
    ) => {
      checkNewPage();
      pdf.setFontSize(fontSize);
      pdf.setTextColor(40, 40, 40);
      pdf.setFont("helvetica", "normal");

      // Add bullet
      pdf.text(bulletChar, leftMargin + 3, yPos);

      // Add text with proper wrapping
      const lines = pdf.splitTextToSize(text, contentWidth - 10);
      lines.forEach((line: string, index: number) => {
        if (index > 0) checkNewPage();
        pdf.text(line, leftMargin + 8, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 1;
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

    // ========== PROFESSIONAL TITLE PAGE ==========

    // Top decorative bar
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, 210, 8, "F");

    // University/Institution style header
    yPos = 40;
    pdf.setTextColor(37, 99, 235);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text("AGRICLIME SENTINEL", 105, yPos, { align: "center" });

    yPos += 5;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Climate Risk Monitoring & Agricultural Security Platform", 105, yPos, { align: "center" });

    // Main title
    yPos += 25;
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.text("ATMOSPHERIC SCIENCE", 105, yPos, { align: "center" });

    yPos += 10;
    pdf.setFontSize(22);
    pdf.text("COMPREHENSIVE REPORT", 105, yPos, { align: "center" });

    // Subtitle
    yPos += 15;
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(60, 60, 60);
    pdf.text("Climate & Air Quality Analysis", 105, yPos, { align: "center" });

    // Decorative line
    yPos += 10;
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.5);
    pdf.line(55, yPos, 155, yPos);

    // Location information box
    yPos += 20;
    pdf.setFillColor(245, 247, 250);
    pdf.rect(40, yPos, 130, 35, "F");
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.rect(40, yPos, 130, 35, "S");

    yPos += 10;
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Study Area", 105, yPos, { align: "center" });

    yPos += 8;
    pdf.setFontSize(16);
    pdf.setTextColor(37, 99, 235);
    pdf.text(`${countyName} County, ${state}`, 105, yPos, { align: "center" });

    yPos += 8;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    const coords = data.airQuality?.observations?.[0];
    if (coords?.latitude && coords?.longitude) {
      pdf.text(
        `Geographic Coordinates: ${coords.latitude.toFixed(4)}°N, ${Math.abs(
          coords.longitude
        ).toFixed(4)}°W`,
        105,
        yPos,
        { align: "center" }
      );
    }

    // Report metadata
    yPos += 25;
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text("Report Generated", 105, yPos, { align: "center" });

    yPos += 5;
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    const reportDate = new Date();
    const formattedDate = reportDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = reportDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    pdf.text(`${formattedDate} at ${formattedTime}`, 105, yPos, { align: "center" });

    // Data sources footer on title page
    yPos = 260;
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.setFont("helvetica", "italic");
    pdf.text("Data Sources: NOAA National Weather Service | EPA AirNow | Open-Meteo Archive", 105, yPos, { align: "center" });

    // Bottom decorative bar
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 289, 210, 8, "F");

    // Start content on new page
    pdf.addPage();
    yPos = 30;

    // ========== EXECUTIVE SUMMARY ==========
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(20, 20, 20);
    pdf.text("EXECUTIVE SUMMARY", leftMargin, yPos);
    yPos += 3;

    // Underline
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.8);
    pdf.line(leftMargin, yPos, leftMargin + 60, yPos);
    yPos += 10;

    // Summary box with border
    const summaryBoxHeight = 75;
    pdf.setFillColor(248, 250, 252);
    pdf.rect(leftMargin, yPos, contentWidth, summaryBoxHeight, "F");
    pdf.setDrawColor(37, 99, 235);
    pdf.setLineWidth(0.4);
    pdf.rect(leftMargin, yPos, contentWidth, summaryBoxHeight, "S");

    yPos += 8;
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");

    const summaryText = `This comprehensive atmospheric science report presents a detailed analysis of environmental conditions for ${countyName} County, ${state}. The assessment integrates multiple data streams from authoritative government sources to provide actionable intelligence for agricultural planning, public health management, and climate risk evaluation.`;

    const summaryLines = pdf.splitTextToSize(summaryText, contentWidth - 10);
    summaryLines.forEach((line: string) => {
      pdf.text(line, leftMargin + 5, yPos);
      yPos += 5.5;
    });

    yPos += 3;
    pdf.setFont("helvetica", "bold");
    pdf.text("Key Components:", leftMargin + 5, yPos);
    yPos += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const components = [
      "Real-time air quality measurements and pollutant analysis (EPA AirNow)",
      "Severe weather risk indices and atmospheric instability metrics (NOAA HRRR)",
      "Active weather alerts, warnings, and advisories (NOAA NWS)",
      "Long-term climate trend analysis with statistical significance testing (Open-Meteo)"
    ];

    components.forEach((component) => {
      const compLines = pdf.splitTextToSize(component, contentWidth - 18);
      compLines.forEach((line: string, idx: number) => {
        if (idx === 0) {
          pdf.text("•", leftMargin + 8, yPos);
          pdf.text(line, leftMargin + 13, yPos);
        } else {
          pdf.text(line, leftMargin + 13, yPos);
        }
        yPos += 4.5;
      });
    });

    yPos += summaryBoxHeight - (yPos - (summaryBoxHeight + leftMargin + 8)) + 15;

    // ========== SECTION 1: WEATHER ALERTS ==========
    if (data.alerts && data.alerts.length > 0) {
      addSectionHeader("SECTION 1: ACTIVE WEATHER ALERTS", [220, 38, 38], 1);

      addText(
        `As of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, the following weather alerts are active for this region:`,
        11,
        false,
        [40, 40, 40],
        1.5
      );
      yPos += 5;

      data.alerts.forEach((alert: any, index: number) => {
        checkNewPage(40);

        // Alert box
        pdf.setFillColor(254, 242, 242);
        pdf.rect(leftMargin, yPos, contentWidth, 8, "F");
        pdf.setTextColor(220, 38, 38);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(`Alert ${index + 1}: ${alert.event || "N/A"}`, leftMargin + 3, yPos + 5.5);
        yPos += 11;

        addText(`Severity Level: ${alert.severity || "N/A"}`, 10, true, [40, 40, 40], 1.4);
        addText(`${alert.headline || "N/A"}`, 11, false, [60, 60, 60], 1.5);

        if (alert.onset) {
          addText(`Effective: ${new Date(alert.onset).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
          })}`, 10, false, [80, 80, 80], 1.4);
        }
        if (alert.expires) {
          addText(`Expires: ${new Date(alert.expires).toLocaleString('en-US', {
            dateStyle: 'full',
            timeStyle: 'short'
          })}`, 10, false, [80, 80, 80], 1.4);
        }

        if (alert.description) {
          yPos += 3;
          addText("Detailed Description:", 10, true, [40, 40, 40], 1.4);
          addText(alert.description, 10, false, [60, 60, 60], 1.5, 3);
        }
        yPos += 8;
      });
    } else {
      addSectionHeader("SECTION 1: WEATHER ALERTS", [34, 197, 94], 1);

      // Success box
      pdf.setFillColor(240, 253, 244);
      pdf.rect(leftMargin, yPos, contentWidth, 15, "F");
      pdf.setDrawColor(34, 197, 94);
      pdf.setLineWidth(0.5);
      pdf.rect(leftMargin, yPos, contentWidth, 15, "S");

      yPos += 10;
      pdf.setTextColor(22, 163, 74);
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("✓ NO ACTIVE WEATHER ALERTS", leftMargin + contentWidth / 2, yPos, { align: "center" });
      yPos += 10;

      addText("There are currently no active weather alerts, warnings, or advisories for this location. Conditions are within normal parameters.", 10, false, [60, 60, 60], 1.5);
      yPos += 5;
    }

    // ========== SECTION 2: AIR QUALITY ANALYSIS ==========
    if (data.airQuality && data.airQuality.overall) {
      const aqi = data.airQuality.overall.aqi || 0;
      const category = data.airQuality.overall.category?.name || "Unknown";

      // Color based on AQI
      let aqiColor: [number, number, number] = [34, 197, 94]; // Green
      if (aqi > 150) aqiColor = [220, 38, 38]; // Red
      else if (aqi > 100) aqiColor = [249, 115, 22]; // Orange
      else if (aqi > 50) aqiColor = [234, 179, 8]; // Yellow

      addSectionHeader("SECTION 2: AIR QUALITY INDEX (AQI) ANALYSIS", aqiColor, 1);

      addText(
        "The Air Quality Index (AQI) is a standardized indicator developed by the U.S. Environmental Protection Agency (EPA) to communicate air pollution levels to the public. The index ranges from 0 to 500, with higher values indicating greater health concerns.",
        11,
        false,
        [40, 40, 40],
        1.5
      );
      yPos += 8;

      // AQI Summary Box
      checkNewPage(25);
      const aqiBoxColor = aqi <= 50 ? [240, 253, 244] : aqi <= 100 ? [254, 252, 232] : aqi <= 150 ? [255, 247, 237] : [254, 242, 242];
      pdf.setFillColor(aqiBoxColor[0], aqiBoxColor[1], aqiBoxColor[2]);
      pdf.rect(leftMargin, yPos, contentWidth, 20, "F");
      pdf.setDrawColor(aqiColor[0], aqiColor[1], aqiColor[2]);
      pdf.setLineWidth(0.6);
      pdf.rect(leftMargin, yPos, contentWidth, 20, "S");

      yPos += 8;
      pdf.setTextColor(aqiColor[0], aqiColor[1], aqiColor[2]);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Current Air Quality Status", leftMargin + 5, yPos);

      yPos += 8;
      pdf.setFontSize(20);
      pdf.text(`AQI: ${aqi}`, leftMargin + 5, yPos);
      pdf.setFontSize(14);
      pdf.text(`(${category})`, leftMargin + 35, yPos);
      yPos += 15;

      if (data.airQuality.overall.dominantPollutant) {
        addText(
          `Primary Pollutant of Concern: ${data.airQuality.overall.dominantPollutant}`,
          11,
          true,
          [40, 40, 40],
          1.4
        );
      }
      yPos += 5;

      // Individual pollutants subsection
      if (
        data.airQuality.observations &&
        data.airQuality.observations.length > 0
      ) {
        addSectionHeader("2.1 Individual Pollutant Measurements", [37, 99, 235], 2);

        addText(
          "The following table presents detailed measurements for each monitored pollutant:",
          10,
          false,
          [60, 60, 60],
          1.5
        );
        yPos += 5;

        data.airQuality.observations.forEach((obs: any) => {
          const pollutantName = obs.parameterName || "Unknown";
          const pollutantAQI = obs.aqi || "N/A";
          const pollutantCategory = obs.category?.name || "N/A";
          addBullet(
            `${pollutantName}: AQI ${pollutantAQI} — ${pollutantCategory}`,
            10
          );
        });
        yPos += 3;
      }

      // Health recommendations subsection
      if (data.airQuality.recommendations) {
        yPos += 5;
        addSectionHeader("2.2 Health Recommendations", [37, 99, 235], 2);

        addText(
          "Based on current air quality conditions, the following health guidance is provided:",
          10,
          false,
          [60, 60, 60],
          1.5
        );
        yPos += 5;

        const recs = data.airQuality.recommendations;
        if (recs.general) {
          addText("General Population:", 10, true, [40, 40, 40], 1.4);
          addText(recs.general, 10, false, [60, 60, 60], 1.5, 3);
          yPos += 2;
        }
        if (recs.sensitiveGroups) {
          addText("Sensitive Groups (children, elderly, respiratory conditions):", 10, true, [40, 40, 40], 1.4);
          addText(recs.sensitiveGroups, 10, false, [60, 60, 60], 1.5, 3);
          yPos += 2;
        }
        if (recs.activities) {
          addText("Outdoor Activities:", 10, true, [40, 40, 40], 1.4);
          addText(recs.activities, 10, false, [60, 60, 60], 1.5, 3);
        }
      }

      // Add pollutant comparison chart
      yPos += 10;
      await addChartImage(
        "pollutant-comparison-chart",
        "Figure 1: Pollutant Comparison Chart",
        160,
        85
      );
    } else {
      addSectionHeader("SECTION 2: AIR QUALITY INDEX (AQI) ANALYSIS", [156, 163, 175], 1);
      addText("Air quality data is currently unavailable for this location. This may be due to the absence of monitoring stations in the immediate vicinity.", 11, false, [60, 60, 60], 1.5);
      yPos += 5;
    }

    // ========== SECTION 3: SEVERE WEATHER RISK INDICES ==========
    if (data.severeWeather) {
      addSectionHeader("SECTION 3: SEVERE WEATHER RISK ASSESSMENT", [168, 85, 247], 1);

      const indices = data.severeWeather.indices || data.severeWeather;

      addText(
        "Atmospheric instability indices are quantitative measures derived from vertical atmospheric soundings that assess the potential for severe convective weather development. These indices integrate temperature, moisture, and wind profiles to evaluate thunderstorm potential, tornado risk, and precipitation intensity.",
        11,
        false,
        [40, 40, 40],
        1.5
      );
      yPos += 8;

      addSectionHeader("3.1 Convective Available Potential Energy (CAPE)", [168, 85, 247], 2);

      if (indices.cape !== undefined) {
        const capeValue = indices.cape.toFixed(0);
        const capeInterpretation = indices.cape < 1000
          ? "Low atmospheric instability. Thunderstorm development unlikely."
          : indices.cape < 2500
          ? "Moderate instability. Conditions favorable for ordinary thunderstorms."
          : "High instability. Significant potential for severe thunderstorms and supercells.";

        addText(
          `Measured Value: ${capeValue} J/kg`,
          11,
          true,
          [40, 40, 40],
          1.4
        );
        addText(
          `Classification: ${indices.cape_category || "N/A"}`,
          10,
          false,
          [60, 60, 60],
          1.4
        );
        addText(
          `Interpretation: ${capeInterpretation}`,
          10,
          false,
          [60, 60, 60],
          1.5
        );
        yPos += 5;
      }

      addSectionHeader("3.2 K-Index", [168, 85, 247], 2);

      if (indices.k_index !== undefined) {
        const kInterpretation = indices.k_index < 20
          ? "Thunderstorm development is unlikely under current atmospheric conditions."
          : indices.k_index < 30
          ? "Isolated thunderstorms are possible, particularly in areas of enhanced lift."
          : "Widespread thunderstorm activity is likely. Monitor for potential severe weather.";

        addText(`Measured Value: ${indices.k_index.toFixed(1)}°C`, 11, true, [40, 40, 40], 1.4);
        addText(`Interpretation: ${kInterpretation}`, 10, false, [60, 60, 60], 1.5);
        yPos += 5;
      }

      addSectionHeader("3.3 Lifted Index (LI)", [168, 85, 247], 2);

      if (indices.lifted_index !== undefined) {
        const liInterpretation = indices.lifted_index > 2
          ? "Stable atmospheric conditions. Convection is suppressed."
          : indices.lifted_index > -3
          ? "Marginally unstable atmosphere. Weak thunderstorms possible with sufficient forcing."
          : "Very unstable atmosphere. Strong to severe thunderstorms likely.";

        addText(`Measured Value: ${indices.lifted_index.toFixed(1)}°C`, 11, true, [40, 40, 40], 1.4);
        addText(`Interpretation: ${liInterpretation}`, 10, false, [60, 60, 60], 1.5);
        yPos += 5;
      }

      addSectionHeader("3.4 Total Totals Index (TT)", [168, 85, 247], 2);

      if (indices.total_totals !== undefined) {
        const ttInterpretation = indices.total_totals < 44
          ? "Thunderstorm development is not expected."
          : indices.total_totals < 50
          ? "Isolated thunderstorms may develop, particularly during peak heating."
          : "Severe thunderstorms are possible. Conditions support organized convection.";

        addText(`Measured Value: ${indices.total_totals.toFixed(1)}`, 11, true, [40, 40, 40], 1.4);
        addText(`Interpretation: ${ttInterpretation}`, 10, false, [60, 60, 60], 1.5);
        yPos += 5;
      }

      // Add atmospheric indices chart
      yPos += 8;
      await addChartImage(
        "atmospheric-indices-chart",
        "Figure 2: Atmospheric Instability Indices Visualization",
        160,
        85
      );
    } else {
      addSectionHeader("SECTION 3: SEVERE WEATHER RISK ASSESSMENT", [156, 163, 175], 1);
      addText("Severe weather index data is currently unavailable for this location. This may be due to data source limitations or temporary service interruptions.", 11, false, [60, 60, 60], 1.5);
      yPos += 5;
    }

    // ========== SECTION 4: CLIMATE TRENDS ANALYSIS ==========
    if (data.climateTrends && data.climateTrends.trend) {
      addSectionHeader("SECTION 4: LONG-TERM CLIMATE TREND ANALYSIS", [14, 165, 233], 1);

      const trend = data.climateTrends.trend;
      const period = data.climateTrends.period;

      addText(
        `This section presents a comprehensive statistical analysis of historical temperature trends for ${countyName} County. The analysis employs linear regression and Mann-Kendall trend testing to identify significant long-term climate patterns and assess their implications for agricultural productivity, water resources, and public health planning.`,
        11,
        false,
        [40, 40, 40],
        1.5
      );
      yPos += 8;

      addSectionHeader("4.1 Temporal Scope and Methodology", [14, 165, 233], 2);

      addText(
        `Analysis Period: ${period.startYear}–${period.endYear} (${period.yearsAnalyzed} years of continuous data)`,
        11,
        true,
        [40, 40, 40],
        1.4
      );
      addText(
        "Data Source: Open-Meteo Historical Weather Archive (ERA5 reanalysis)",
        10,
        false,
        [60, 60, 60],
        1.4
      );
      addText(
        "Statistical Methods: Linear regression analysis with Mann-Kendall significance testing",
        10,
        false,
        [60, 60, 60],
        1.4
      );
      yPos += 6;

      addSectionHeader("4.2 Key Findings", [14, 165, 233], 2);

      addText(`Trend Direction: ${trend.trendDirection}`, 11, true, [40, 40, 40], 1.4);

      const changeSymbol = trend.percentChange > 0 ? "+" : "";
      const changeColor: [number, number, number] = trend.percentChange > 0 ? [220, 38, 38] : [34, 197, 94];
      addText(
        `Temperature Change: ${changeSymbol}${trend.percentChange.toFixed(2)}% over the analysis period`,
        11,
        true,
        changeColor,
        1.4
      );

      addText(
        `Statistical Significance: ${trend.isSignificant ? "Statistically significant" : "Not statistically significant"} (p-value: ${trend.pValue.toFixed(4)})`,
        10,
        false,
        [60, 60, 60],
        1.4
      );

      addText(
        `Coefficient of Determination (R²): ${trend.rSquared.toFixed(4)} — ${
          trend.rSquared > 0.7 ? "Strong linear relationship" :
          trend.rSquared > 0.4 ? "Moderate linear relationship" :
          "Weak linear relationship"
        }`,
        10,
        false,
        [60, 60, 60],
        1.4
      );
      yPos += 6;

      addSectionHeader("4.3 Interpretation and Implications", [14, 165, 233], 2);

      addText(trend.interpretation, 11, false, [40, 40, 40], 1.5);
      yPos += 5;

      // Add temperature trend chart
      yPos += 8;
      await addChartImage(
        "temperature-trend-chart",
        "Figure 3: Historical Temperature Trend Analysis with Linear Regression",
        160,
        85
      );
    } else {
      addSectionHeader("SECTION 4: LONG-TERM CLIMATE TREND ANALYSIS", [156, 163, 175], 1);
      addText("Climate trend data is currently unavailable for this location. Historical temperature records may be incomplete or unavailable for this geographic area.", 11, false, [60, 60, 60], 1.5);
      yPos += 5;
    }

    // ========== SECTION 5: CONCLUSIONS AND RECOMMENDATIONS ==========
    checkNewPage(60);
    addSectionHeader("SECTION 5: CONCLUSIONS AND RECOMMENDATIONS", [37, 99, 235], 1);

    addText(
      `This comprehensive atmospheric science report synthesizes multi-source environmental data to provide an integrated assessment of current and historical atmospheric conditions for ${countyName} County, ${state}. The analysis combines real-time observational data with long-term climatological trends to support evidence-based decision-making in agricultural management, public health planning, and climate adaptation strategies.`,
      11,
      false,
      [40, 40, 40],
      1.5
    );
    yPos += 8;

    addSectionHeader("5.1 Summary of Key Findings", [37, 99, 235], 2);

    const findings = [
      "Weather alert status and current atmospheric hazards have been documented and assessed for immediate risk evaluation.",
      "Air quality measurements provide current pollutant concentrations and health guidance for sensitive populations.",
      "Severe weather indices quantify atmospheric instability and convective potential for thunderstorm forecasting.",
      "Long-term climate trend analysis reveals statistically significant patterns in temperature evolution over multiple decades."
    ];

    findings.forEach((finding) => {
      addBullet(finding, 10);
    });
    yPos += 6;

    addSectionHeader("5.2 Recommendations for Stakeholders", [37, 99, 235], 2);

    addText("Agricultural Sector:", 11, true, [40, 40, 40], 1.4);
    addText(
      "Utilize air quality and severe weather data for crop protection planning. Monitor climate trends to inform long-term crop selection and irrigation infrastructure investments.",
      10,
      false,
      [60, 60, 60],
      1.5,
      3
    );
    yPos += 4;

    addText("Public Health Officials:", 11, true, [40, 40, 40], 1.4);
    addText(
      "Issue health advisories based on air quality index values, particularly for vulnerable populations. Prepare emergency response protocols for severe weather events.",
      10,
      false,
      [60, 60, 60],
      1.5,
      3
    );
    yPos += 4;

    addText("Climate Adaptation Planners:", 11, true, [40, 40, 40], 1.4);
    addText(
      "Incorporate long-term temperature trends into infrastructure planning and resource management strategies. Regular monitoring is essential for adaptive management.",
      10,
      false,
      [60, 60, 60],
      1.5,
      3
    );
    yPos += 10;

    // Data Sources Section
    addSectionHeader("5.3 Data Sources and Methodology", [37, 99, 235], 2);

    addText(
      "This report integrates data from multiple authoritative sources to ensure accuracy and reliability:",
      10,
      false,
      [60, 60, 60],
      1.5
    );
    yPos += 4;

    addBullet("U.S. Environmental Protection Agency (EPA) AirNow — Real-time air quality monitoring network", 10);
    addBullet("NOAA National Weather Service (NWS) — Active weather alerts and warnings", 10);
    addBullet("NOAA High-Resolution Rapid Refresh (HRRR) Model — Atmospheric sounding data and severe weather indices", 10);
    addBullet("Open-Meteo Historical Weather Archive — ERA5 reanalysis climate data (1970–present)", 10);

    // Professional footer on every page (except title page)
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);

      if (i === 1) {
        // Title page already has decorative bars, skip footer
        continue;
      }

      // Footer separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(leftMargin, pageHeight - 20, leftMargin + contentWidth, pageHeight - 20);

      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.setFont("helvetica", "normal");

      // Left side - Report title
      pdf.text(
        "AgriClime Sentinel | Atmospheric Science Report",
        leftMargin,
        pageHeight - 12
      );

      // Right side - Page number
      pdf.text(
        `Page ${i} of ${totalPages}`,
        leftMargin + contentWidth,
        pageHeight - 12,
        { align: "right" }
      );

      // Bottom line - URL and date
      pdf.setFontSize(7);
      pdf.setTextColor(140, 140, 140);
      pdf.setFont("helvetica", "italic");
      pdf.text(
        "github.com/clevernat/AgriClime-Sentinel",
        leftMargin,
        pageHeight - 8
      );

      pdf.text(
        `Generated: ${new Date().toLocaleDateString('en-US')}`,
        leftMargin + contentWidth,
        pageHeight - 8,
        { align: "right" }
      );
    }

    console.log("Saving PDF...");
    pdf.save(filename);
    console.log("✅ PDF export complete!");
  } catch (error) {
    console.error("Error generating atmospheric PDF:", error);
    throw new Error(
      `Failed to export PDF: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    // Restore original visibility states
    if (restoreVisibility) {
      restoreVisibility();
    }
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
