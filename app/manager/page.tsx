"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle, Clock, Users, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/manager/dashboard-header";
import { AIActivityFeed } from "@/components/manager/ai-activity-feed";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function ManagerOverview() {
  const router = useRouter();
  const {
    reports, assignments, technicians, aiActivities, loading, aiAssignAll,
  } = useDashboardStore();
  const [assigningAll, setAssigningAll] = useState(false);

  const openReports = reports.filter((r) => r.status !== "resolved").length;
  const safetyIssues = reports.filter((r) => r.safety_concern && r.status !== "resolved").length;
  const resolved = reports.filter((r) => r.status === "resolved").length;
  const unassigned = reports.filter((r) => r.status === "submitted");
  const activeJobs = assignments.filter((a) => ["pending", "accepted", "in_progress"].includes(a.status)).length;
  const availableTechs = technicians.filter((t) => t.is_available).length;
  const busyTechs = technicians.length - availableTechs;

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

  async function handleAssignAll() {
    if (unassigned.length === 0) {
      toast.info("No unassigned reports");
      return;
    }
    setAssigningAll(true);
    await aiAssignAll();
    toast.success(`AI processed ${unassigned.length} report(s)`);
    setAssigningAll(false);
  }

  const recentUnassigned = [...unassigned]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const stats = [
    { label: "Open Reports", value: openReports, icon: AlertTriangle, color: "#F59E0B", href: "/manager/reports" },
    { label: "Safety Issues", value: safetyIssues, icon: AlertTriangle, color: "#DC2626", href: "/manager/safety" },
    { label: "Active Jobs", value: activeJobs, icon: Clock, color: "#3B82F6", href: "/manager/assignments" },
    { label: "Resolved", value: resolved, icon: CheckCircle2, color: "#10B981", href: "/manager/reports" },
    { label: "Technicians", value: technicians.length, icon: Users, color: "#8B5CF6", href: "/manager/technicians" },
    { label: "Avg Response", value: `${avgResponse}m`, icon: Zap, color: "#6B7280", href: "" },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <div className="h-10 w-64 skeleton-pulse rounded-[6px]" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[88px] bg-[#141415] border border-[#262626] rounded-[8px] animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-[#141415] border border-[#262626] rounded-[8px] animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Overview"
        subtitle="AI-powered maintenance command center"
        actions={
          unassigned.length > 0 ? (
            <Button
              onClick={handleAssignAll}
              disabled={assigningAll}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-[6px] h-8 px-3 text-[13px] font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI assign all ({unassigned.length})
            </Button>
          ) : null
        }
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                onClick={() => stat.href && router.push(stat.href)}
                className={`bg-[#141415] border border-[#262626] rounded-[8px] p-4 transition-colors duration-150 ${
                  stat.href ? "cursor-pointer hover:bg-[#1C1C1E] hover:border-[#3B3B3D]" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-[6px] flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-[24px] font-semibold text-[#E5E7EB] leading-none">{stat.value}</p>
                <p className="text-[12px] text-[#6B7280] mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Unassigned */}
          <div className="lg:col-span-2 space-y-4">
            {/* Technician Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#141415] border border-[#262626] rounded-[8px] p-4">
                <p className="text-[20px] font-semibold text-[#10B981]">{availableTechs}</p>
                <p className="text-[12px] text-[#6B7280]">Available</p>
              </div>
              <div className="bg-[#141415] border border-[#262626] rounded-[8px] p-4">
                <p className="text-[20px] font-semibold text-[#F59E0B]">{busyTechs}</p>
                <p className="text-[12px] text-[#6B7280]">Busy</p>
              </div>
              <div className="bg-[#141415] border border-[#262626] rounded-[8px] p-4">
                <p className="text-[20px] font-semibold text-[#E5E7EB]">{technicians.length}</p>
                <p className="text-[12px] text-[#6B7280]">Total</p>
              </div>
            </div>

            {/* Recent unassigned reports */}
            <div className="bg-[#141415] border border-[#262626] rounded-[8px]">
              <div className="px-4 py-3 border-b border-[#262626] flex items-center justify-between">
                <h3 className="text-[13px] font-medium text-[#E5E7EB]">Recent Unassigned Reports</h3>
                <button
                  onClick={() => router.push("/manager/reports")}
                  className="text-[12px] text-[#3B82F6] hover:text-[#60A5FA]"
                >
                  View all
                </button>
              </div>
              {recentUnassigned.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-2" />
                  <p className="text-[13px] text-[#6B7280]">All reports assigned</p>
                </div>
              ) : (
                <div className="divide-y divide-[#262626]">
                  {recentUnassigned.map((report) => (
                    <div
                      key={report.id}
                      className="px-4 py-3 flex items-center gap-3 hover:bg-[#1C1C1E] transition-colors duration-100 cursor-pointer"
                      onClick={() => router.push(`/manager/reports?selected=${report.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#E5E7EB] truncate">{report.ai_description}</p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">
                          {report.building}{report.room ? `, Room ${report.room}` : ""} &middot; {report.trade.replace("_", " ")}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-[4px] text-[11px] font-medium border ${
                        report.priority === "critical"
                          ? "bg-[#DC2626]/10 text-[#F87171] border-[#DC2626]/20"
                          : report.priority === "high"
                          ? "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/20"
                          : report.priority === "medium"
                          ? "bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/20"
                          : "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20"
                      }`}>
                        {report.priority}
                      </span>
                      {report.safety_concern && (
                        <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626] shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Activity Feed */}
          <div className="lg:col-span-1">
            <AIActivityFeed activities={aiActivities} maxHeight="480px" />
          </div>
        </div>
      </div>
    </>
  );
}
