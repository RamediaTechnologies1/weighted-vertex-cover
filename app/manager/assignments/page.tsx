"use client";

import { useState, useMemo } from "react";
import { DashboardHeader } from "@/components/manager/dashboard-header";
import { AssignmentDetailSheet } from "@/components/manager/assignment-detail-sheet";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import type { Assignment } from "@/lib/types";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-[#F59E0B]/10", text: "text-[#FBBF24]" },
  accepted: { bg: "bg-[#3B82F6]/10", text: "text-[#60A5FA]" },
  in_progress: { bg: "bg-[#3B82F6]/10", text: "text-[#60A5FA]" },
  completed: { bg: "bg-[#10B981]/10", text: "text-[#34D399]" },
  cancelled: { bg: "bg-[#6B7280]/10", text: "text-[#9CA3AF]" },
};

export default function AssignmentsPage() {
  const { assignments, loading } = useDashboardStore();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...assignments];
    if (statusFilter !== "all") result = result.filter((a) => a.status === statusFilter);
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [assignments, statusFilter]);

  const selectedAssignment = selectedId ? assignments.find((a) => a.id === selectedId) || null : null;

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
        title="Assignments"
        subtitle={`${assignments.length} total assignments`}

      />

      <div className="p-6 space-y-4">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-[#141415] border border-[#262626] rounded-[6px] p-1 w-fit overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-[4px] text-[12px] font-medium whitespace-nowrap transition-colors duration-150 ${
                statusFilter === tab.value
                  ? "bg-[#1C1C1E] text-[#E5E7EB]"
                  : "text-[#6B7280] hover:text-[#E5E7EB]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#141415] border border-[#262626] rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_90px_90px_100px] gap-2 px-4 py-2.5 border-b border-[#262626] text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
            <span>Report</span>
            <span>Technician</span>
            <span>Status</span>
            <span>Assigned By</span>
            <span>Created</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#6B7280]">No assignments match filter</div>
          ) : (
            <div className="divide-y divide-[#262626]">
              {filtered.map((assignment) => {
                const ss = STATUS_STYLES[assignment.status] || STATUS_STYLES.pending;
                return (
                  <div
                    key={assignment.id}
                    onClick={() => setSelectedId(assignment.id)}
                    className="grid grid-cols-[1fr_120px_90px_90px_100px] gap-2 px-4 py-3 items-center hover:bg-[#1C1C1E] cursor-pointer transition-colors duration-100"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-[#E5E7EB] truncate">
                        {assignment.report?.ai_description || "Report"}
                      </p>
                      <p className="text-[11px] text-[#6B7280] truncate">
                        {assignment.report?.building || ""}
                        {assignment.report?.room ? `, Room ${assignment.report.room}` : ""}
                      </p>
                    </div>
                    <span className="text-[12px] text-[#9CA3AF] truncate">
                      {assignment.technician?.name || "Unknown"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium w-fit ${ss.bg} ${ss.text}`}>
                      {assignment.status.replace("_", " ")}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium w-fit ${
                      assignment.assigned_by === "ai" ? "bg-[#8B5CF6]/10 text-[#A78BFA]" : "bg-[#3B82F6]/10 text-[#60A5FA]"
                    }`}>
                      {assignment.assigned_by === "ai" ? "AI" : "Manual"}
                    </span>
                    <span className="text-[11px] text-[#6B7280]">{getTimeAgo(assignment.created_at)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AssignmentDetailSheet
        assignment={selectedAssignment}
        open={!!selectedAssignment}
        onClose={() => setSelectedId(null)}
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
