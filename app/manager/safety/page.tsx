"use client";

import { DashboardHeader } from "@/components/manager/dashboard-header";
import { SafetyDashboard } from "@/components/manager/safety-dashboard";
import { useDashboardStore } from "@/lib/stores/dashboard-store";

export default function SafetyPage() {
  const { reports, assignments, loading } = useDashboardStore();
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
        title="Safety"
        subtitle="Campus safety intelligence"

      />
      <div className="p-6">
        <SafetyDashboard reports={reports} assignments={assignments} />
      </div>
    </>
  );
}
