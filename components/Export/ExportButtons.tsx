"use client";

import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Image } from "lucide-react";
import {
  exportToCSV,
  exportToPDF,
  exportChartAsPNG,
  generateFilename,
} from "@/lib/utils/export";
import { RegionalDashboardData } from "@/types";

interface ExportButtonsProps {
  data: RegionalDashboardData;
  dashboardElementId?: string;
  chartElementId?: string;
  type?: "agricultural" | "atmospheric";
}

export default function ExportButtons({
  data,
  dashboardElementId = "dashboard-content",
  chartElementId,
  type = "agricultural",
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const filename = generateFilename(
        `${data.county.name.replace(/\s+/g, "-")}_${
          data.county.state
        }_climate-data`,
        "csv"
      );
      exportToCSV(data, filename);
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

      const filename = generateFilename(
        `${data.county.name.replace(/\s+/g, "-")}_${
          data.county.state
        }_climate-report`,
        "pdf"
      );
      await exportToPDF(dashboardElementId, data, filename);

      alert("PDF exported successfully! ✅");
    } catch (error) {
      console.error("Export error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(
        `Failed to export PDF:\n\n${errorMessage}\n\nPlease try again or use CSV export instead.`
      );
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  const handleExportChart = async () => {
    if (!chartElementId) {
      alert(
        "Chart export is only available when viewing the Historical Trends section. Please scroll down to see the chart."
      );
      return;
    }

    try {
      setIsExporting(true);
      const filename = generateFilename(
        `${data.county.name.replace(/\s+/g, "-")}_${data.county.state}_chart`,
        "png"
      );
      await exportChartAsPNG(chartElementId, filename);
    } catch (error) {
      console.error("Export error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(
        `Failed to export chart:\n\n${errorMessage}\n\nPlease make sure the Historical Trends chart is visible.`
      );
    } finally {
      setIsExporting(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="relative">
      {/* Export Button - Improved mobile visibility */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base font-medium shadow-lg"
        title={isExporting ? "Exporting..." : "Export data"}
      >
        <Download size={18} className={isExporting ? "animate-pulse" : ""} />
        <span>
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

              {/* Chart Export (if available) */}
              {chartElementId && (
                <button
                  onClick={handleExportChart}
                  className="w-full px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors text-left"
                >
                  <Image size={18} className="text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      Export Chart
                    </div>
                    <div className="text-xs text-gray-500">PNG image</div>
                  </div>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
              <p className="text-xs text-gray-500">
                Data from {data.county.name}, {data.county.state}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
