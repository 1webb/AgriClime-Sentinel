"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { exportChartAsPNG } from "@/lib/utils/export";

interface ChartExportButtonProps {
  chartId: string;
  chartName: string;
  countyName: string;
  state: string;
}

export default function ChartExportButton({
  chartId,
  chartName,
  countyName,
  state,
}: ChartExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const filename = `${countyName.replace(/\s+/g, "-")}_${state}_${chartName.replace(/\s+/g, "-")}_${new Date().toISOString().split("T")[0]}.png`;
      await exportChartAsPNG(chartId, filename);
    } catch (error) {
      console.error("Export error:", error);
      alert(
        `Failed to export chart:\n\n${error instanceof Error ? error.message : "Unknown error"}\n\nPlease try again.`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium shadow-sm hover:shadow-md"
      title={`Export ${chartName} as PNG`}
    >
      <Download size={14} className={isExporting ? "animate-pulse" : ""} />
      <span className="hidden sm:inline">
        {isExporting ? "Exporting..." : "Export PNG"}
      </span>
      <span className="sm:hidden">{isExporting ? "..." : "PNG"}</span>
    </button>
  );
}

