"use client";

import type { Report, Assignment } from "@/lib/types";

interface StatsCardsProps {
  reports: Report[];
  assignments: Assignment[];
  onFilterChange?: (filter: string) => void;
  activeFilter?: string;
}

export function StatsCards({ reports, assignments, onFilterChange, activeFilter }: StatsCardsProps) {
  const openReports = reports.filter((r) => r.status !== "resolved").length;
  const safetyIssues = reports.filter((r) => r.safety_concern && r.status !== "resolved").length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const aiAssigned = assignments.filter((a) => a.assigned_by === "ai").length;
  const activeJobs = assignments.filter((a) => ["pending", "accepted", "in_progress"].includes(a.status)).length;
  const avgResponse = assignments.length > 0
    ? Math.round(
        assignments
          .filter((a) => a.started_at)
          .reduce((acc, a) => {
            const created = new Date(a.created_at).getTime();
            const started = new Date(a.started_at!).getTime();
            return acc + (started - created) / (1000 * 60);
          }, 0) / Math.max(1, assignments.filter((a) => a.started_at).length)
      )
    : 0;

  const stats = [
    { label: "Open Reports", value: openReports, borderColor: "#00539F", filterKey: "open" },
    { label: "Safety Issues", value: safetyIssues, borderColor: "#DC2626", filterKey: "safety" },
    { label: "Resolved", value: resolved, borderColor: "#10B981", filterKey: "resolved" },
    { label: "AI Assigned", value: aiAssigned, borderColor: "#00539F", filterKey: "ai_assigned" },
    { label: "Active Jobs", value: activeJobs, borderColor: "#F59E0B", filterKey: "active_jobs" },
    { label: "Avg Response", value: `${avgResponse}m`, borderColor: "#6B7280", filterKey: "" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat) => {
        const isActive = activeFilter === stat.filterKey;
        const isClickable = !!stat.filterKey;
        return (
          <div
            key={stat.label}
            onClick={() => {
              if (!isClickable || !onFilterChange) return;
              onFilterChange(isActive ? "" : stat.filterKey);
            }}
            className={`bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors duration-150 ${
              isClickable ? "cursor-pointer hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E]" : ""
            } ${isActive ? "ring-1 ring-[#00539F] dark:ring-[#3B82F6] bg-[#EFF6FF] dark:bg-[#1E293B]" : ""}`}
            style={{ borderBottomWidth: '3px', borderBottomColor: stat.borderColor }}
          >
            <p className="text-[28px] font-semibold text-[#111111] dark:text-[#E5E7EB]">{stat.value}</p>
            <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
