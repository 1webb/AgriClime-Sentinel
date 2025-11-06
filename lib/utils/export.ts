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
 * Export dashboard to PDF format
 */
export async function exportToPDF(
  elementId: string,
  data: RegionalDashboardData,
  filename: string = "climate-report.pdf"
) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(
        `Element with ID "${elementId}" not found. Please make sure the dashboard is fully loaded.`
      );
    }

    // Capture the element as canvas with improved settings
    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

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
 */
export async function exportChartAsPNG(
  elementId: string,
  filename: string = "chart.png"
) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error("Element not found");
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      logging: false,
      backgroundColor: "#ffffff",
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error("Error exporting chart:", error);
    throw error;
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
