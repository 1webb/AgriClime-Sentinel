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
 * Export atmospheric science data to PDF with professional formatting and colors
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
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 20;
    const leftMargin = 20;
    const pageWidth = 170;

    // Helper to add colored box
    const addColorBox = (
      color: [number, number, number],
      height: number = 8
    ) => {
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.rect(leftMargin, yPos, pageWidth, height, "F");
      yPos += height;
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
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        pdf.text(line, leftMargin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 3;
    };

    // Title with blue background
    pdf.setFillColor(37, 99, 235); // Blue
    pdf.rect(leftMargin, yPos, pageWidth, 12, "F");

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("Atmospheric Science Report", leftMargin + 3, yPos + 8);
    yPos += 15;

    // Location
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${countyName}, ${state}`, leftMargin, yPos);
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generated: ${new Date().toLocaleString()}`, leftMargin, yPos);
    yPos += 10;

    // Weather Alerts Section
    if (data.alerts && data.alerts.length > 0) {
      pdf.setFillColor(239, 68, 68); // Red
      pdf.rect(leftMargin, yPos, pageWidth, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("⚠ Active Weather Alerts", leftMargin + 3, yPos + 5.5);
      yPos += 11;

      data.alerts.forEach((alert: any) => {
        pdf.setTextColor(0, 0, 0);
        addText(`Event: ${alert.event || "N/A"}`, 11, true, [220, 38, 38]);
        addText(`Severity: ${alert.severity || "N/A"}`, 10);
        addText(`Headline: ${alert.headline || "N/A"}`, 10);
        if (alert.onset)
          addText(`Onset: ${new Date(alert.onset).toLocaleString()}`, 9);
        if (alert.expires)
          addText(`Expires: ${new Date(alert.expires).toLocaleString()}`, 9);
        yPos += 3;
      });
    } else {
      pdf.setFillColor(34, 197, 94); // Green
      pdf.rect(leftMargin, yPos, pageWidth, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("✓ No Active Weather Alerts", leftMargin + 3, yPos + 5.5);
      yPos += 11;
    }

    // Air Quality Section
    if (data.airQuality) {
      const aqi = data.airQuality.overall?.aqi || 0;
      const category = data.airQuality.overall?.category?.name || "Unknown";

      // Color based on AQI
      let aqiColor: [number, number, number] = [34, 197, 94]; // Green
      if (aqi > 150) aqiColor = [220, 38, 38]; // Red
      else if (aqi > 100) aqiColor = [249, 115, 22]; // Orange
      else if (aqi > 50) aqiColor = [234, 179, 8]; // Yellow

      pdf.setFillColor(aqiColor[0], aqiColor[1], aqiColor[2]);
      pdf.rect(leftMargin, yPos, pageWidth, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("Air Quality Index", leftMargin + 3, yPos + 5.5);
      yPos += 11;

      pdf.setTextColor(0, 0, 0);
      addText(`AQI: ${aqi} - ${category}`, 12, true);

      if (data.airQuality.recommendations) {
        addText("Health Recommendations:", 11, true);
        data.airQuality.recommendations.forEach((rec: string) => {
          addText(`• ${rec}`, 9);
        });
      }
      yPos += 5;
    }

    // Severe Weather Indices
    if (data.severeWeather) {
      pdf.setFillColor(168, 85, 247); // Purple
      pdf.rect(leftMargin, yPos, pageWidth, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text("Severe Weather Indices", leftMargin + 3, yPos + 5.5);
      yPos += 11;

      pdf.setTextColor(0, 0, 0);
      const indices = data.severeWeather.indices || data.severeWeather;

      if (indices.cape !== undefined) {
        addText(
          `CAPE: ${indices.cape.toFixed(0)} J/kg - ${
            indices.cape_category || "N/A"
          }`,
          10
        );
      }
      if (indices.k_index !== undefined) {
        addText(`K-Index: ${indices.k_index.toFixed(1)}`, 10);
      }
      if (indices.lifted_index !== undefined) {
        addText(`Lifted Index: ${indices.lifted_index.toFixed(1)}`, 10);
      }
      if (indices.total_totals !== undefined) {
        addText(`Total Totals Index: ${indices.total_totals.toFixed(1)}`, 10);
      }
      yPos += 5;
    }

    // Footer
    yPos = 280;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      "AgriClime Sentinel - Atmospheric Science Dashboard",
      leftMargin,
      yPos
    );
    pdf.text(
      "https://github.com/clevernat/AgriClime-Sentinel",
      leftMargin,
      yPos + 4
    );

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
