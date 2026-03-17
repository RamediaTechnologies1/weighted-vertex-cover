"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X, Building } from "lucide-react";
import { DashboardHeader } from "@/components/manager/dashboard-header";
import { FloorPlanViewer } from "@/components/floor-plan/floor-plan-viewer";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { hasFloorPlan } from "@/lib/floor-plans";

const CampusMap = dynamic(
  () => import("@/components/map/campus-map").then((mod) => mod.CampusMap),
  {
    ssr: false,
    loading: () => <div className="h-[500px] bg-[#141415] border border-[#262626] rounded-[8px] animate-pulse" />,
  }
);

export default function MapPage() {
  const { reports, loading } = useDashboardStore();
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);

  const buildingReports = selectedBuilding
    ? reports.filter((r) => r.building === selectedBuilding && r.status !== "resolved")
    : [];

  // Build highlighted rooms map from active reports
  const highlightedRooms: Record<string, string> = {};
  const roomReportCounts: Record<string, number> = {};
  buildingReports.forEach((r) => {
    if (r.room) {
      const prefix = selectedBuilding === "Gore Hall" ? "GOR" : "SMI";
      const roomId = `${prefix}-${r.room}`;
      highlightedRooms[roomId] = r.priority === "critical" ? "#DC2626"
        : r.priority === "high" ? "#F59E0B"
        : "#3B82F6";
      roomReportCounts[roomId] = (roomReportCounts[roomId] || 0) + 1;
    }
  });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-10 w-48 bg-[#141415] rounded-[6px] animate-pulse" />
        <div className="h-[500px] bg-[#141415] border border-[#262626] rounded-[8px] animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Campus Map"
        subtitle="Click a building to view floor plans"
      />
      <div className="p-6 space-y-4">
        {/* Quick building selector */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#6B7280]">Quick select:</span>
          {["Gore Hall", "Smith Hall"].map((name) => (
            <button
              key={name}
              onClick={() => setSelectedBuilding(selectedBuilding === name ? null : name)}
              className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium border transition-colors duration-150 ${
                selectedBuilding === name
                  ? "bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/30"
                  : "bg-[#141415] text-[#9CA3AF] border-[#262626] hover:border-[#3B3B3D] hover:text-[#E5E7EB]"
              }`}
            >
              <Building className="h-3 w-3 inline mr-1.5" />
              {name}
            </button>
          ))}
          {selectedBuilding && (
            <button
              onClick={() => setSelectedBuilding(null)}
              className="px-2 py-1.5 rounded-[6px] text-[12px] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#1C1C1E]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className={`grid gap-4 ${selectedBuilding && hasFloorPlan(selectedBuilding) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* Map */}
          <div className="map-container">
            <CampusMap
              reports={reports}
              onBuildingSelect={(name) => {
                setSelectedBuilding(selectedBuilding === name ? null : name);
              }}
            />
          </div>

          {/* Floor Plan Panel */}
          {selectedBuilding && hasFloorPlan(selectedBuilding) && (
            <div className="bg-[#141415] border border-[#262626] rounded-[8px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-medium text-[#E5E7EB]">{selectedBuilding}</h3>
                  <p className="text-[12px] text-[#6B7280]">
                    {buildingReports.length} active report{buildingReports.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBuilding(null)}
                  className="h-7 w-7 flex items-center justify-center rounded-[4px] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#1C1C1E]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <FloorPlanViewer
                building={selectedBuilding}
                highlightedRooms={highlightedRooms}
                roomReportCounts={roomReportCounts}
                showRoomDetails
              />

              {/* Active issues list */}
              {buildingReports.length > 0 && (
                <div className="border-t border-[#262626] pt-3">
                  <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-2">Active Issues</h4>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {buildingReports.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 py-1.5 px-2 rounded-[4px] hover:bg-[#1C1C1E]">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          r.priority === "critical" ? "bg-[#DC2626]"
                          : r.priority === "high" ? "bg-[#F59E0B]"
                          : r.priority === "medium" ? "bg-[#3B82F6]"
                          : "bg-[#10B981]"
                        }`} />
                        <span className="text-[12px] text-[#E5E7EB] flex-1 truncate">{r.ai_description}</span>
                        {r.room && (
                          <span className="text-[10px] text-[#6B7280] shrink-0">Room {r.room}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
