"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportAtmosphericDataToCSV, exportToPDF, generateFilename } from "@/lib/utils/export";

interface AtmosphericExportButtonsProps {
  countyName: string;
  state: string;
  data: {
    alerts?: any[];
    severeWeather?: any;
    airQuality?: any;
    climateTrends?: any;
  };
  dashboardElementId?: string;
}

export default function AtmosphericExportButtons({
  countyName,
  state,
  data,
  dashboardElementId = "atmospheric-dashboard-content",
}: AtmosphericExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const filename = generateFilename(
        `${countyName.replace(/\s+/g, "-")}_${state}_atmospheric-data`,
        "csv"
      );
      exportAtmosphericDataToCSV(countyName, state, data, filename);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const element = document.getElementById(dashboardElementId);
      if (!element) {
        throw new Error("Dashboard element not found");
      }

      const filename = generateFilename(
        `${countyName.replace(/\s+/g, "-")}_${state}_atmospheric-report`,
        "pdf"
      );

      // Create a minimal data object for PDF export
      const pdfData: any = {
        county: { name: countyName, state, fips: "" },
        current_climate: {},
        historical_trends: [],
        growing_degree_days: 0,
        extreme_heat_days_ytd: 0,
        precipitation_vs_avg: { current: 0, historical_avg: 0, percent_difference: 0 },
      };

      await exportToPDF(dashboardElementId, pdfData, filename);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      {/* Export Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
      >
        <Download size={16} className={isExporting ? "animate-pulse" : ""} />
        <span className="hidden sm:inline">
          {isExporting ? "Exporting..." : "Export"}
        </span>
      </button>

      {/* Export Menu */}
      {showMenu && !isExporting && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="py-1">
              {/* CSV Export */}
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors text-left"
              >
                <FileSpreadsheet size={18} className="text-green-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Export as CSV
                  </div>
                  <div className="text-xs text-gray-500">
                    Spreadsheet format
                  </div>
                </div>
              </button>

              {/* PDF Export */}
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors text-left"
              >
                <FileText size={18} className="text-red-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Export as PDF
                  </div>
                  <div className="text-xs text-gray-500">
                    Full dashboard report
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
              <p className="text-xs text-gray-500">
                Data from {countyName}, {state}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

