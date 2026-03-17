"use client";

import { MapPin, Clock, AlertTriangle, Sparkles, Inbox, User, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Report, Assignment } from "@/lib/types";

function getSLAInfo(report: Report): { label: string; color: string; urgent: boolean } {
  const created = new Date(report.created_at).getTime();
  const now = Date.now();
  const hours = Math.floor((now - created) / (1000 * 60 * 60));
  const mins = Math.floor((now - created) / (1000 * 60)) % 60;

  const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (report.status === "resolved") return { label, color: "text-[#10B981]", urgent: false };
  if (report.priority === "critical" && hours >= 2) return { label, color: "text-[#DC2626]", urgent: true };
  if (report.priority === "critical" && hours >= 1) return { label, color: "text-[#F59E0B]", urgent: true };
  if (report.priority === "high" && hours >= 4) return { label, color: "text-[#DC2626]", urgent: true };
  if (report.priority === "high" && hours >= 2) return { label, color: "text-[#F59E0B]", urgent: true };
  if (hours >= 8) return { label, color: "text-[#F59E0B]", urgent: true };
  if (hours >= 4) return { label, color: "text-[#F59E0B]", urgent: false };
  return { label, color: "text-[#9CA3AF]", urgent: false };
}

interface ReportsTableProps {
  reports: Report[];
  assignments: Assignment[];
  onAssign: (reportId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  submitted: { bg: "bg-[#F3F4F6] dark:bg-[#1C1C1E]", text: "text-[#6B7280]", border: "border-[#6B7280]/20" },
  analyzing: { bg: "bg-[#F3F4F6] dark:bg-[#1C1C1E]", text: "text-[#6B7280]", border: "border-[#6B7280]/20" },
  dispatched: { bg: "bg-[#FFFBEB] dark:bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/20" },
  in_progress: { bg: "bg-[#EFF6FF] dark:bg-[#3B82F6]/10", text: "text-[#00539F] dark:text-[#60A5FA]", border: "border-[#00539F]/20 dark:border-[#3B82F6]/20" },
  resolved: { bg: "bg-[#ECFDF5] dark:bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/20" },
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-[#DC2626]",
  high: "bg-[#F59E0B]",
  medium: "bg-[#00539F] dark:bg-[#3B82F6]",
  low: "bg-[#10B981]",
};

export function ReportsTable({
  reports,
  assignments,
  onAssign,
  statusFilter,
  onStatusFilterChange,
}: ReportsTableProps) {
  const assignmentByReport: Record<string, Assignment> = {};
  for (const a of assignments) {
    if (a.report_id) assignmentByReport[a.report_id] = a;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">Reports</h2>
          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{reports.length} total</p>
        </div>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-40 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] h-9 text-[14px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="dispatched">Dispatched</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {reports.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF]">No reports found</p>
        </div>
      )}

      {reports.length > 0 && (
        <div className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2.5 border-b-2 border-[#E5E7EB] dark:border-[#262626]">
            <span className="text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.05em]">Issue</span>
            <span className="text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.05em] w-24">Status</span>
            <span className="text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.05em] w-28">Building</span>
            <span className="text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.05em] w-20">Time</span>
            <span className="text-[13px] font-medium text-[#6B7280] dark:text-[#9CA3AF] uppercase tracking-[0.05em] w-20">Action</span>
          </div>

          {reports.map((report) => {
            const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.submitted;
            const reportAssignment = assignmentByReport[report.id];
            const sla = getSLAInfo(report);
            return (
              <div key={report.id} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-3 border-b border-[#E5E7EB] dark:border-[#262626] hover:bg-[#F9FAFB] dark:hover:bg-[#1C1C1E] transition-colors duration-150 items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[report.priority] || ""}`} />
                    <span className="text-[14px] text-[#111111] dark:text-[#E5E7EB] truncate">{report.ai_description}</span>
                    {report.safety_concern && (
                      <AlertTriangle className="h-3.5 w-3.5 text-[#DC2626] flex-shrink-0" />
                    )}
                  </div>
                  {reportAssignment ? (
                    <span className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] flex items-center gap-1 ml-4">
                      <UserCheck className="h-3 w-3 text-[#10B981]" />
                      {reportAssignment.technician?.name || "Assigned"}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#DC2626] ml-4">Unassigned</span>
                  )}
                </div>

                <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-medium border w-24 justify-center ${status.bg} ${status.text} ${status.border}`}>
                  {report.status.replace("_", " ")}
                </span>

                <span className="text-[14px] text-[#111111] dark:text-[#E5E7EB] w-28 truncate">
                  {report.building}
                </span>

                <span className={`text-[13px] w-20 ${sla.color}`}>
                  {sla.label}
                </span>

                <div className="w-20">
                  {report.status === "submitted" && (
                    <Button
                      size="sm"
                      onClick={() => onAssign(report.id)}
                      className="bg-[#00539F] dark:bg-[#3B82F6] hover:bg-[#003d75] dark:hover:bg-[#2563EB] text-white text-[12px] rounded-[4px] h-7 px-2"
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Assign
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
