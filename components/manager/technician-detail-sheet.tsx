"use client";

import { Mail, Phone, Wrench, Building, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";
import type { Technician } from "@/lib/types";

interface TechnicianDetailSheetProps {
  technician: Technician | null;
  open: boolean;
  onClose: () => void;
  onEdit: (t: Technician) => void;
}

export function TechnicianDetailSheet({ technician, open, onClose, onEdit }: TechnicianDetailSheetProps) {
  const { assignments, updateTechnician } = useDashboardStore();

  if (!technician) return null;

  const techAssignments = assignments.filter((a) => a.technician_id === technician.id);
  const activeAssignments = techAssignments.filter((a) => ["pending", "accepted", "in_progress"].includes(a.status));
  const completedAssignments = techAssignments.filter((a) => a.status === "completed");

  async function toggleAvailability() {
    const success = await updateTechnician(technician!.id, { is_available: !technician!.is_available });
    if (success) {
      toast.success(technician!.is_available ? "Marked as unavailable" : "Marked as available");
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0A0A0B] border-[#262626] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-[16px] font-medium text-[#E5E7EB] text-left">{technician.name}</SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Profile */}
          <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1C1C1E] flex items-center justify-center text-[16px] font-semibold text-[#E5E7EB]">
                {technician.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#E5E7EB]">{technician.name}</p>
                <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#3B82F6]/10 text-[#60A5FA]">
                  {technician.trade.replace("_", " ")}
                </span>
              </div>
              <div className="ml-auto">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-[11px] font-medium ${
                  technician.is_available
                    ? "bg-[#10B981]/10 text-[#34D399]"
                    : "bg-[#DC2626]/10 text-[#F87171]"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${technician.is_available ? "bg-[#10B981]" : "bg-[#DC2626]"}`} />
                  {technician.is_available ? "Available" : "Busy"}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 text-[13px]">
                <Mail className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="text-[#E5E7EB]">{technician.email}</span>
              </div>
              {technician.phone && (
                <div className="flex items-center gap-2 text-[13px]">
                  <Phone className="h-3.5 w-3.5 text-[#6B7280]" />
                  <span className="text-[#E5E7EB]">{technician.phone}</span>
                </div>
              )}
              {technician.assigned_buildings.length > 0 && (
                <div className="flex items-center gap-2 text-[13px]">
                  <Building className="h-3.5 w-3.5 text-[#6B7280]" />
                  <div className="flex flex-wrap gap-1">
                    {technician.assigned_buildings.map((b) => (
                      <span key={b} className="px-1.5 py-0.5 rounded-[3px] bg-[#1C1C1E] text-[#9CA3AF] text-[11px]">{b}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 text-center">
              <p className="text-[18px] font-semibold text-[#3B82F6]">{activeAssignments.length}</p>
              <p className="text-[11px] text-[#6B7280]">Active</p>
            </div>
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 text-center">
              <p className="text-[18px] font-semibold text-[#10B981]">{completedAssignments.length}</p>
              <p className="text-[11px] text-[#6B7280]">Completed</p>
            </div>
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 text-center">
              <p className="text-[18px] font-semibold text-[#E5E7EB]">{techAssignments.length}</p>
              <p className="text-[11px] text-[#6B7280]">Total</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleAvailability}
              variant="outline"
              className="flex-1 h-9 rounded-[6px] border-[#262626] bg-transparent text-[13px] text-[#9CA3AF] hover:bg-[#1C1C1E]"
            >
              {technician.is_available ? "Set Unavailable" : "Set Available"}
            </Button>
            <Button
              onClick={() => onEdit(technician)}
              className="flex-1 h-9 rounded-[6px] bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-medium"
            >
              Edit Profile
            </Button>
          </div>

          {/* Active assignments */}
          {activeAssignments.length > 0 && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-2">Active Jobs</h4>
              <div className="space-y-2">
                {activeAssignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 py-1.5 text-[12px]">
                    <Clock className="h-3 w-3 text-[#F59E0B]" />
                    <span className="text-[#E5E7EB] flex-1 truncate">{a.report?.ai_description || "Report"}</span>
                    <span className="text-[#6B7280]">{a.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed assignments */}
          {completedAssignments.length > 0 && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-2">
                Completed ({completedAssignments.length})
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {completedAssignments.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 py-1.5 text-[12px]">
                    <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                    <span className="text-[#9CA3AF] flex-1 truncate">{a.report?.ai_description || "Report"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
