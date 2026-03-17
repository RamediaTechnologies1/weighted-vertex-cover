"use client";

import {
  MapPin, Clock, User, CheckCircle2, XCircle, ArrowRight, Camera, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";
import type { Assignment } from "@/lib/types";
import { useState } from "react";
import { ManualAssignDialog } from "./manual-assign-dialog";

interface AssignmentDetailSheetProps {
  assignment: Assignment | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-[#F59E0B]/10", text: "text-[#FBBF24]" },
  accepted: { bg: "bg-[#3B82F6]/10", text: "text-[#60A5FA]" },
  in_progress: { bg: "bg-[#3B82F6]/10", text: "text-[#60A5FA]" },
  completed: { bg: "bg-[#10B981]/10", text: "text-[#34D399]" },
  cancelled: { bg: "bg-[#6B7280]/10", text: "text-[#9CA3AF]" },
};

export function AssignmentDetailSheet({ assignment, open, onClose }: AssignmentDetailSheetProps) {
  const { loadData, addActivity } = useDashboardStore();
  const [cancelling, setCancelling] = useState(false);
  const [showReassign, setShowReassign] = useState(false);

  if (!assignment) return null;

  const report = assignment.report;
  const tech = assignment.technician;
  const statusStyle = STATUS_STYLES[assignment.status] || STATUS_STYLES.pending;

  async function handleCancel() {
    if (!confirm("Cancel this assignment?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/assignments/${assignment!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        toast.success("Assignment cancelled");
        addActivity({
          type: "assign",
          message: `Assignment cancelled for ${tech?.name || "technician"}`,
          reportId: assignment!.report_id,
          technicianName: tech?.name,
        });
        await loadData();
        onClose();
      }
    } catch {
      toast.error("Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  async function handleRejectAndReassign() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/assignments/${assignment!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        addActivity({
          type: "assign",
          message: `Completion rejected — reassigning (was: ${tech?.name})`,
          reportId: assignment!.report_id,
          technicianName: tech?.name,
        });
        await loadData();
        setShowReassign(true);
        toast.info("Assignment cancelled. Select a new technician.");
      }
    } catch {
      toast.error("Failed to cancel");
    } finally {
      setCancelling(false);
    }
  }

  // Duration calculations
  function getDuration(start: string, end: string) {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { onClose(); setShowReassign(false); } }}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0A0A0B] border-[#262626] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {assignment.status.replace("_", " ")}
            </span>
            <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium ${
              assignment.assigned_by === "ai" ? "bg-[#8B5CF6]/10 text-[#A78BFA]" : "bg-[#3B82F6]/10 text-[#60A5FA]"
            }`}>
              {assignment.assigned_by === "ai" ? "AI Assigned" : "Manual"}
            </span>
          </div>
          <SheetTitle className="text-[15px] font-medium text-[#E5E7EB] text-left leading-snug">
            {report?.ai_description || "Assignment"}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Report Info */}
          {report && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 space-y-2">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">Report</h4>
              {report.photo_base64 && (
                <img src={report.photo_base64} alt="Issue" className="w-full rounded-[4px] border border-[#262626]" />
              )}
              <div className="flex items-center gap-2 text-[13px]">
                <MapPin className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="text-[#E5E7EB]">
                  {report.building}{report.floor ? `, Floor ${report.floor}` : ""}{report.room ? `, Room ${report.room}` : ""}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#1C1C1E] text-[#9CA3AF]">
                  {report.trade.replace("_", " ")}
                </span>
                <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${
                  report.priority === "critical" ? "bg-[#DC2626]/10 text-[#F87171]"
                  : report.priority === "high" ? "bg-[#F59E0B]/10 text-[#FBBF24]"
                  : "bg-[#3B82F6]/10 text-[#60A5FA]"
                }`}>
                  {report.priority}
                </span>
              </div>
              <p className="text-[12px] text-[#9CA3AF] leading-relaxed">{report.suggested_action}</p>
            </div>
          )}

          {/* Technician */}
          {tech && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-2">Technician</h4>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1C1C1E] flex items-center justify-center text-[12px] font-medium text-[#E5E7EB]">
                  {tech.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-[13px] text-[#E5E7EB]">{tech.name}</p>
                  <p className="text-[11px] text-[#6B7280]">{tech.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3">
            <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-3">Timeline</h4>
            <div className="space-y-3">
              <TimelineStep
                label="Assigned"
                time={assignment.created_at}
                active={true}
              />
              <TimelineStep
                label="Accepted"
                time={assignment.started_at}
                active={!!assignment.started_at}
                duration={assignment.started_at ? getDuration(assignment.created_at, assignment.started_at) : undefined}
              />
              <TimelineStep
                label="Completed"
                time={assignment.completed_at}
                active={!!assignment.completed_at}
                duration={assignment.completed_at && assignment.started_at ? getDuration(assignment.started_at, assignment.completed_at) : undefined}
                isLast
              />
            </div>
          </div>

          {/* Completion Verification */}
          {assignment.status === "completed" && (
            <div className="bg-[#141415] border border-[#10B981]/20 rounded-[6px] p-4 space-y-3">
              <h4 className="text-[12px] font-medium text-[#10B981] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Completion Verification
              </h4>

              {/* Before/After comparison */}
              {(report?.photo_base64 || assignment.completion_photo_base64) && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-[#6B7280] mb-1 uppercase">Before</p>
                    {report?.photo_base64 ? (
                      <img src={report.photo_base64} alt="Before" className="w-full rounded-[4px] border border-[#262626] aspect-square object-cover" />
                    ) : (
                      <div className="w-full rounded-[4px] border border-[#262626] aspect-square bg-[#1C1C1E] flex items-center justify-center">
                        <Camera className="h-5 w-5 text-[#4B5563]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6B7280] mb-1 uppercase">After</p>
                    {assignment.completion_photo_base64 ? (
                      <img src={assignment.completion_photo_base64} alt="After" className="w-full rounded-[4px] border border-[#262626] aspect-square object-cover" />
                    ) : (
                      <div className="w-full rounded-[4px] border border-[#262626] aspect-square bg-[#1C1C1E] flex items-center justify-center">
                        <Camera className="h-5 w-5 text-[#4B5563]" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {assignment.completion_notes && (
                <div>
                  <p className="text-[11px] text-[#6B7280] mb-1">Technician Notes</p>
                  <p className="text-[13px] text-[#E5E7EB] leading-relaxed">{assignment.completion_notes}</p>
                </div>
              )}

              {assignment.completed_at && (
                <div className="flex items-center gap-2 text-[12px] text-[#6B7280]">
                  <Clock className="h-3 w-3" />
                  <span>Completed {new Date(assignment.completed_at).toLocaleString()}</span>
                </div>
              )}

              {assignment.completed_at && assignment.created_at && (
                <div className="bg-[#1C1C1E] rounded-[4px] p-2 text-center">
                  <p className="text-[11px] text-[#6B7280]">Total Duration</p>
                  <p className="text-[14px] font-medium text-[#E5E7EB]">{getDuration(assignment.created_at, assignment.completed_at)}</p>
                </div>
              )}

              <Button
                onClick={handleRejectAndReassign}
                disabled={cancelling}
                variant="outline"
                className="w-full h-9 rounded-[6px] border-[#DC2626]/30 bg-transparent text-[#F87171] hover:bg-[#DC2626]/10 text-[13px]"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject & Reassign
              </Button>
            </div>
          )}

          {/* Active assignment actions */}
          {["pending", "accepted", "in_progress"].includes(assignment.status) && !showReassign && (
            <div className="space-y-2">
              <Button
                onClick={() => { handleCancel(); setShowReassign(true); }}
                disabled={cancelling}
                variant="outline"
                className="w-full h-9 rounded-[6px] border-[#262626] bg-transparent text-[#9CA3AF] hover:bg-[#1C1C1E] text-[13px]"
              >
                Cancel & Reassign
              </Button>
            </div>
          )}

          {/* Reassign section */}
          {showReassign && report && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 space-y-2">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">Reassign</h4>
              <ManualAssignDialog
                reportId={assignment.report_id}
                trade={report.trade}
                onAssigned={() => { setShowReassign(false); onClose(); }}
              />
            </div>
          )}

          {/* Notes */}
          {assignment.notes && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-1">Assignment Notes</h4>
              <p className="text-[13px] text-[#E5E7EB]">{assignment.notes}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TimelineStep({ label, time, active, duration, isLast }: {
  label: string;
  time: string | null | undefined;
  active: boolean;
  duration?: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
          active ? "bg-[#3B82F6]" : "bg-[#262626]"
        }`} />
        {!isLast && <div className="w-px h-6 bg-[#262626] mt-1" />}
      </div>
      <div className="-mt-0.5">
        <p className={`text-[12px] font-medium ${active ? "text-[#E5E7EB]" : "text-[#4B5563]"}`}>{label}</p>
        {time && (
          <p className="text-[11px] text-[#6B7280]">
            {new Date(time).toLocaleString()}
            {duration && <span className="text-[#4B5563]"> ({duration})</span>}
          </p>
        )}
      </div>
    </div>
  );
}
