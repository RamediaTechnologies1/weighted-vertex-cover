"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import type { Report } from "@/lib/types";

export function SafetyAlerts() {
  const [reports, setReports] = useState<Report[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reports?status=submitted");
        if (!res.ok) {
          const allRes = await fetch("/api/reports");
          if (allRes.ok) {
            const data = await allRes.json();
            const safetyReports = (data.reports || []).filter(
              (r: Report) => r.safety_concern && r.status !== "resolved"
            );
            setReports(safetyReports);
          }
          return;
        }
        const data = await res.json();
        const safetyReports = (data.reports || []).filter(
          (r: Report) => r.safety_concern && r.status !== "resolved"
        );
        setReports(safetyReports);
      } catch {
        // silent
      }
    }
    load();
  }, []);

  if (reports.length === 0 || dismissed) return null;

  const criticalCount = reports.filter((r) => r.priority === "critical").length;
  const buildings = [...new Set(reports.map((r) => r.building))];

  return (
    <div className="mx-4 mt-3 rounded-[6px] border border-[#DC2626]/20 bg-[#FEF2F2] dark:bg-[#DC2626]/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
          <div className="text-left">
            <p className="text-[13px] font-medium text-[#DC2626]">
              {reports.length} active safety alert{reports.length !== 1 ? "s" : ""}
              {criticalCount > 0 && ` (${criticalCount} critical)`}
            </p>
            <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
              {buildings.slice(0, 3).join(", ")}
              {buildings.length > 3 ? ` +${buildings.length - 3} more` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
            className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-[#E5E7EB] px-2 py-1"
          >
            Dismiss
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[#6B7280]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6B7280]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] px-1">
            Use caution in these locations. Reports are being addressed by maintenance.
          </p>
          {reports.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className={`flex items-start gap-2 p-2 rounded-[6px] border ${
                r.priority === "critical"
                  ? "bg-white dark:bg-[#141415] border-[#DC2626]/20"
                  : "bg-white dark:bg-[#141415] border-[#E5E7EB] dark:border-[#262626]"
              }`}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                r.priority === "critical" ? "bg-[#DC2626]" : "bg-[#F59E0B]"
              }`} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#111111] dark:text-[#E5E7EB] leading-snug">
                  {r.ai_description}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3 w-3 text-[#6B7280] dark:text-[#9CA3AF]" />
                  <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF]">
                    {r.building}{r.room ? `, Room ${r.room}` : ""}
                  </span>
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-[4px] ${
                    r.priority === "critical"
                      ? "bg-[#FEF2F2] dark:bg-[#DC2626]/10 text-[#DC2626]"
                      : "bg-[#FFFBEB] dark:bg-[#F59E0B]/10 text-[#F59E0B]"
                  }`}>
                    {r.priority}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {reports.length > 5 && (
            <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] text-center py-1">
              +{reports.length - 5} more alerts
            </p>
          )}
        </div>
      )}
    </div>
  );
}
