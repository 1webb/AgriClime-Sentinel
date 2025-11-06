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

    // Helper function to add text with word wrap
    const addText = (
      text: string,
      fontSize: number = 10,
      isBold: boolean = false
    ) => {
      pdf.setFontSize(fontSize);
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

    // Title
    addText(
      `Climate Report: ${data.county.name}, ${data.county.state}`,
      18,
      true
    );
    addText(`Generated: ${new Date().toLocaleDateString()}`, 10);
    yPos += 5;

    // Current Climate Conditions
    addText("Current Climate Conditions", 14, true);
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
    addText("Agricultural Metrics", 14, true);
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
      addText("Historical Trends (Last 10 Years)", 14, true);
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
