"use client";

import { useState, useMemo } from "react";
import { Search, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/manager/dashboard-header";
import { ReportDetailSheet } from "@/components/manager/report-detail-sheet";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

const TRADES = ["all", "plumbing", "electrical", "hvac", "structural", "custodial", "landscaping", "safety_hazard"];
const PRIORITIES = ["all", "critical", "high", "medium", "low"];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "bg-[#F59E0B]/10", text: "text-[#FBBF24]" },
  analyzing: { bg: "bg-[#8B5CF6]/10", text: "text-[#A78BFA]" },
  dispatched: { bg: "bg-[#3B82F6]/10", text: "text-[#60A5FA]" },
  in_progress: { bg: "bg-[#3B82F6]/10", text: "text-[#60A5FA]" },
  resolved: { bg: "bg-[#10B981]/10", text: "text-[#34D399]" },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-[#DC2626]/10", text: "text-[#F87171]" },
  high: { bg: "bg-[#F59E0B]/10", text: "text-[#FBBF24]" },
  medium: { bg: "bg-[#3B82F6]/10", text: "text-[#60A5FA]" },
  low: { bg: "bg-[#10B981]/10", text: "text-[#34D399]" },
};

export default function ReportsPage() {
  const { reports, assignments, loading, aiAssignAll } = useDashboardStore();
  const [statusFilter, setStatusFilter] = useState("all");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [assigningAll, setAssigningAll] = useState(false);

  const unassignedCount = reports.filter((r) => r.status === "submitted").length;

  const filtered = useMemo(() => {
    let result = [...reports];
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (tradeFilter !== "all") result = result.filter((r) => r.trade === tradeFilter);
    if (priorityFilter !== "all") result = result.filter((r) => r.priority === priorityFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.ai_description?.toLowerCase().includes(q) ||
          r.building?.toLowerCase().includes(q) ||
          r.room?.toLowerCase().includes(q) ||
          r.trade?.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reports, statusFilter, tradeFilter, priorityFilter, search]);

  const selectedReport = selectedReportId ? reports.find((r) => r.id === selectedReportId) || null : null;

  async function handleAssignAll() {
    setAssigningAll(true);
    await aiAssignAll();
    toast.success("AI assignment complete");
    setAssigningAll(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-10 w-48 bg-[#141415] rounded-[6px] animate-pulse" />
        <div className="h-[400px] bg-[#141415] border border-[#262626] rounded-[8px] animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Reports"
        subtitle={`${reports.length} total reports`}

        actions={
          unassignedCount > 0 ? (
            <Button
              onClick={handleAssignAll}
              disabled={assigningAll}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-[6px] h-8 px-3 text-[13px] font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI assign all ({unassignedCount})
            </Button>
          ) : null
        }
      />

      <div className="p-6 space-y-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-[#141415] border border-[#262626] rounded-[6px] p-1 w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-[4px] text-[12px] font-medium transition-colors duration-150 ${
                statusFilter === tab.value
                  ? "bg-[#1C1C1E] text-[#E5E7EB]"
                  : "text-[#6B7280] hover:text-[#E5E7EB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports..."
              className="w-full h-8 pl-9 pr-3 rounded-[6px] bg-[#141415] border border-[#262626] text-[13px] text-[#E5E7EB] placeholder:text-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            />
          </div>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="h-8 rounded-[6px] bg-[#141415] border border-[#262626] text-[12px] text-[#9CA3AF] px-2 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          >
            {TRADES.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All trades" : t.replace("_", " ")}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-[6px] bg-[#141415] border border-[#262626] text-[12px] text-[#9CA3AF] px-2 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{p === "all" ? "All priorities" : p}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#141415] border border-[#262626] rounded-[8px] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_120px_80px_90px_80px] gap-2 px-4 py-2.5 border-b border-[#262626] text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
            <span>Issue</span>
            <span>Status</span>
            <span>Building</span>
            <span>Trade</span>
            <span>Priority</span>
            <span>Time</span>
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#6B7280]">No reports match filters</div>
          ) : (
            <div className="divide-y divide-[#262626]">
              {filtered.map((report) => {
                const ss = STATUS_STYLES[report.status] || STATUS_STYLES.submitted;
                const ps = PRIORITY_STYLES[report.priority] || PRIORITY_STYLES.medium;
                const hasAssignment = assignments.some((a) => a.report_id === report.id && a.status !== "cancelled");
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className="grid grid-cols-[1fr_100px_120px_80px_90px_80px] gap-2 px-4 py-3 items-center hover:bg-[#1C1C1E] cursor-pointer transition-colors duration-100"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {report.safety_concern && <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626] shrink-0" />}
                      <span className="text-[13px] text-[#E5E7EB] truncate">{report.ai_description}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium w-fit ${ss.bg} ${ss.text}`}>
                      {report.status.replace("_", " ")}
                    </span>
                    <span className="text-[12px] text-[#9CA3AF] truncate">{report.building}</span>
                    <span className="text-[12px] text-[#9CA3AF]">{report.trade.replace("_", " ")}</span>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium w-fit ${ps.bg} ${ps.text}`}>
                      {report.priority}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">{getTimeAgo(report.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ReportDetailSheet
        report={selectedReport}
        open={!!selectedReport}
        onClose={() => setSelectedReportId(null)}
      />
    </>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
