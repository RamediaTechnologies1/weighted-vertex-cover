"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Report } from "@/lib/types";
import { useRealtimeTable } from "@/hooks/use-realtime";

const CampusMap = dynamic(
  () => import("@/components/map/campus-map").then((mod) => mod.CampusMap),
  {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-180px)] skeleton-pulse rounded-[6px]" />,
  }
);

export default function TechnicianMapPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useRealtimeTable("reports", loadReports);

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 30000);
    return () => clearInterval(interval);
  }, [loadReports]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">Campus Map</h1>
          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
            {reports.filter((r) => r.status !== "resolved").length} active issues
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setRefreshing(true); loadReports(); }}
          className="rounded-[6px] h-8 w-8 p-0 border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E]"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="h-[calc(100vh-180px)] skeleton-pulse rounded-[6px]" />
      ) : (
        <div className="rounded-[6px] overflow-hidden border border-[#E5E7EB] dark:border-[#262626]">
          <CampusMap reports={reports} />
        </div>
      )}
    </div>
  );
}
