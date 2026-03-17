"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, MapPin, AlertTriangle, ClipboardList, Camera, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Report } from "@/lib/types";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  submitted: { bg: "bg-[#F3F4F6] dark:bg-[#1C1C1E]", text: "text-[#6B7280]", border: "border-[#6B7280]/20" },
  analyzing: { bg: "bg-[#F3F4F6] dark:bg-[#1C1C1E]", text: "text-[#6B7280]", border: "border-[#6B7280]/20" },
  dispatched: { bg: "bg-[#FFFBEB] dark:bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/20" },
  in_progress: { bg: "bg-[#EFF6FF] dark:bg-[#3B82F6]/10", text: "text-[#00539F] dark:text-[#60A5FA]", border: "border-[#00539F]/20 dark:border-[#3B82F6]/20" },
  resolved: { bg: "bg-[#ECFDF5] dark:bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/20" },
};

const STATUS_STEPS = ["submitted", "dispatched", "in_progress", "resolved"];

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const created = new Date(dateStr).getTime();
  const diff = now - created;
  const mins = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "Just now";
}

function StatusTimeline({ status }: { status: string }) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  const progress = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="flex items-center gap-1 mt-3">
      {STATUS_STEPS.map((step, i) => {
        const isCompleted = i <= progress;
        return (
          <div key={step} className="flex flex-col items-center flex-1">
            <div
              className={`w-full h-1 rounded-full ${
                isCompleted
                  ? status === "resolved" && i === STATUS_STEPS.length - 1
                    ? "bg-[#10B981]"
                    : "bg-[#00539F] dark:bg-[#3B82F6]"
                  : "bg-[#E5E7EB] dark:bg-[#262626]"
              }`}
            />
            <span className={`text-[9px] mt-1 ${
              isCompleted ? "text-[#6B7280] dark:text-[#9CA3AF]" : "text-[#9CA3AF] dark:text-[#6B7280]"
            }`}>
              {step.replace("_", " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-l-[#DC2626]",
  high: "border-l-[#F59E0B]",
  medium: "border-l-[#00539F] dark:border-l-[#3B82F6]",
  low: "border-l-[#10B981]",
};

export default function MyReports() {
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

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 10000);
    return () => clearInterval(interval);
  }, [loadReports]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-medium text-[#111111] dark:text-[#E5E7EB] tracking-[-0.01em]">My Reports</h1>
          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Track the status of your submissions</p>
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

      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: reports.length },
            { label: "Active", value: reports.filter((r) => r.status !== "resolved").length },
            { label: "Resolved", value: reports.filter((r) => r.status === "resolved").length },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-3 text-center shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none">
              <p className="text-[28px] font-semibold text-[#111111] dark:text-[#E5E7EB]">{stat.value}</p>
              <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-[6px] skeleton-pulse" />
          ))}
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF] mb-4">No reports yet</p>
          <Link href="/user">
            <Button className="bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white rounded-[6px] h-11 px-6 text-[14px] font-medium">
              <Camera className="mr-2 h-4 w-4" />
              Report an issue
            </Button>
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((report) => {
          const status = STATUS_STYLES[report.status] || STATUS_STYLES.submitted;
          return (
            <div
              key={report.id}
              className={`bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none overflow-hidden border-l-[3px] ${PRIORITY_COLORS[report.priority] || ""}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-[#6B7280] dark:text-[#9CA3AF] bg-[#F3F4F6] dark:bg-[#1C1C1E] px-2 py-0.5 rounded-[4px] border border-[#E5E7EB] dark:border-[#262626]">
                      {report.trade.replace("_", " ")}
                    </span>
                    {report.safety_concern && (
                      <span className="text-[12px] font-medium text-[#DC2626] bg-[#FEF2F2] dark:bg-[#DC2626]/10 px-2 py-0.5 rounded-[4px] border border-[#DC2626]/20 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> safety
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#9CA3AF] dark:text-[#6B7280]">{getTimeAgo(report.created_at)}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[12px] font-medium border ${status.bg} ${status.text} ${status.border}`}>
                      {report.status === "resolved" && <CheckCircle2 className="h-3 w-3" />}
                      {report.status.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <p className="text-[14px] font-medium text-[#111111] dark:text-[#E5E7EB] mb-1 leading-snug">
                  {report.ai_description}
                </p>

                <div className="flex items-center gap-3 text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {report.building}
                    {report.room ? `, ${report.room}` : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>

                <StatusTimeline status={report.status} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
