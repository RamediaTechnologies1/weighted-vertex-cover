"use client";

import { Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/stores/dashboard-store";

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({ title, subtitle, actions }: DashboardHeaderProps) {
  const { refreshing, setRefreshing, loadData, toggleSidebar } = useDashboardStore();

  return (
    <header className="sticky top-0 z-30 bg-[#0A0A0B]/95 backdrop-blur-sm border-b border-[#262626]">
      <div className="flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="md:hidden h-8 w-8 flex items-center justify-center rounded-[6px] text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1C1C1E]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-[16px] font-medium text-[#E5E7EB] tracking-[-0.01em]">{title}</h1>
            {subtitle && (
              <p className="text-[12px] text-[#6B7280] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            className="h-8 w-8 p-0 rounded-[6px] border-[#262626] bg-transparent text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1C1C1E]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </header>
  );
}
