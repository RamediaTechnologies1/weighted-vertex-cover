"use client";

import {
  MapPin, Clock, AlertTriangle, Shield, User, Sparkles, Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { ManualAssignDialog } from "./manual-assign-dialog";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";
import type { Report } from "@/lib/types";

interface ReportDetailSheetProps {
  report: Report | null;
  open: boolean;
  onClose: () => void;
}

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

export function ReportDetailSheet({ report, open, onClose }: ReportDetailSheetProps) {
  const { assignments, aiAssign } = useDashboardStore();

  if (!report) return null;

  const assignment = assignments.find((a) => a.report_id === report.id && a.status !== "cancelled");
  const statusStyle = STATUS_STYLES[report.status] || STATUS_STYLES.submitted;
  const priorityStyle = PRIORITY_STYLES[report.priority] || PRIORITY_STYLES.medium;

  async function handleAIAssign() {
    const result = await aiAssign(report!.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  const timeAgo = getTimeAgo(report.created_at);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg bg-[#0A0A0B] border-[#262626] p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {report.status.replace("_", " ")}
            </span>
            <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
              {report.priority}
            </span>
            <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#1C1C1E] text-[#9CA3AF]">
              {report.trade.replace("_", " ")}
            </span>
            {report.safety_concern && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#DC2626]/10 text-[#F87171]">
                <AlertTriangle className="h-3 w-3" /> Safety
              </span>
            )}
          </div>
          <SheetTitle className="text-[15px] font-medium text-[#E5E7EB] text-left leading-snug">
            {report.ai_description}
          </SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4 space-y-4">
          {/* Photo */}
          {report.photo_base64 && (
            <img
              src={report.photo_base64}
              alt="Reported issue"
              className="w-full rounded-[6px] border border-[#262626]"
            />
          )}

          {/* Location */}
          <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 space-y-2">
            <div className="flex items-center gap-2 text-[13px]">
              <MapPin className="h-3.5 w-3.5 text-[#6B7280]" />
              <span className="text-[#E5E7EB]">
                {report.building}
                {report.floor ? `, Floor ${report.floor}` : ""}
                {report.room ? `, Room ${report.room}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
              <span className="text-[#9CA3AF]">{timeAgo}</span>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 space-y-3">
            <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">AI Analysis</h4>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] text-[#6B7280]">Suggested Action</p>
                <p className="text-[13px] text-[#E5E7EB] leading-relaxed">{report.suggested_action}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[11px] text-[#6B7280]">Est. Cost</p>
                  <p className="text-[13px] text-[#E5E7EB]">{report.estimated_cost}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280]">Est. Time</p>
                  <p className="text-[13px] text-[#E5E7EB]">{report.estimated_time}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#6B7280]">Confidence</p>
                  <p className="text-[13px] text-[#E5E7EB]">{Math.round(report.confidence_score * 100)}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reporter Info */}
          {(report.reporter_name || report.reporter_email) && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-2">Reporter</h4>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="text-[13px] text-[#E5E7EB]">
                  {report.reporter_name || "Anonymous"}
                  {report.reporter_email && ` (${report.reporter_email})`}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          {report.description && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-2">Reporter Notes</h4>
              <p className="text-[13px] text-[#E5E7EB] leading-relaxed">{report.description}</p>
            </div>
          )}

          {/* Assignment Info */}
          {assignment && (
            <div className="bg-[#141415] border border-[#262626] rounded-[6px] p-3 space-y-2">
              <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider">Assignment</h4>
              <div className="flex items-center gap-2 text-[13px]">
                <User className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="text-[#E5E7EB]">{assignment.technician?.name || "Unknown"}</span>
                <span className={`ml-auto px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium ${
                  assignment.assigned_by === "ai" ? "bg-[#8B5CF6]/10 text-[#A78BFA]" : "bg-[#3B82F6]/10 text-[#60A5FA]"
                }`}>
                  {assignment.assigned_by === "ai" ? "AI" : "Manual"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[13px]">
                <Building className="h-3.5 w-3.5 text-[#6B7280]" />
                <span className="text-[#9CA3AF]">
                  Status: {assignment.status.replace("_", " ")}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          {report.status === "submitted" && !assignment && (
            <div className="space-y-3 pt-2">
              <Button
                onClick={handleAIAssign}
                className="w-full h-9 rounded-[6px] bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-[13px] font-medium"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Auto-Assign
              </Button>

              <div className="border-t border-[#262626] pt-3">
                <h4 className="text-[12px] font-medium text-[#6B7280] uppercase tracking-wider mb-3">Manual Assignment</h4>
                <ManualAssignDialog
                  reportId={report.id}
                  trade={report.trade}
                  onAssigned={onClose}
                />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
