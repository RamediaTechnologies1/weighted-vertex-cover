"use client";

import { User, Clock, MapPin, ArrowRight, Sparkles, ClipboardCheck } from "lucide-react";
import type { Assignment } from "@/lib/types";

function getAssignmentSLA(assignment: Assignment): { label: string; color: string } {
  const created = new Date(assignment.created_at).getTime();
  const now = Date.now();
  const hours = Math.floor((now - created) / (1000 * 60 * 60));
  const mins = Math.floor((now - created) / (1000 * 60)) % 60;
  const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (assignment.status === "completed") return { label, color: "text-[#10B981]" };
  if (hours >= 4) return { label, color: "text-[#DC2626]" };
  if (hours >= 2) return { label, color: "text-[#F59E0B]" };
  return { label, color: "text-[#9CA3AF]" };
}

interface AssignmentPanelProps {
  assignments: Assignment[];
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-[#F3F4F6] dark:bg-[#1C1C1E]", text: "text-[#6B7280]", border: "border-[#6B7280]/20" },
  accepted: { bg: "bg-[#EFF6FF] dark:bg-[#3B82F6]/10", text: "text-[#00539F] dark:text-[#60A5FA]", border: "border-[#00539F]/20 dark:border-[#3B82F6]/20" },
  in_progress: { bg: "bg-[#FFFBEB] dark:bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]/20" },
  completed: { bg: "bg-[#ECFDF5] dark:bg-[#10B981]/10", text: "text-[#10B981]", border: "border-[#10B981]/20" },
  cancelled: { bg: "bg-[#F3F4F6] dark:bg-[#1C1C1E]", text: "text-[#9CA3AF]", border: "border-[#9CA3AF]/20" },
};

export function AssignmentPanel({ assignments }: AssignmentPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[16px] font-medium text-[#111111] dark:text-[#E5E7EB]">Assignments</h2>
        <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">{assignments.length} total</p>
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF]">No assignments yet</p>
          <p className="text-[13px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">Use AI Assign to automatically route reports to technicians.</p>
        </div>
      )}

      <div className="space-y-2">
        {assignments.map((a) => {
          const status = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
          const sla = getAssignmentSLA(a);
          return (
            <div key={a.id} className="bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none p-4 hover:border-[#D1D5DB] dark:hover:border-[#3F3F46] transition-colors duration-150">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] font-medium border ${status.bg} ${status.text} ${status.border}`}>
                    {a.status.replace("_", " ")}
                  </span>
                  {a.assigned_by === "ai" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#EFF6FF] dark:bg-[#3B82F6]/10 text-[#00539F] dark:text-[#60A5FA] border border-[#00539F]/20 dark:border-[#3B82F6]/20">
                      <Sparkles className="h-2.5 w-2.5" /> AI
                    </span>
                  )}
                </div>
                <span className="text-[12px] text-[#9CA3AF] dark:text-[#6B7280] font-mono">
                  #{a.id.slice(0, 8)}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                {a.report && (
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <MapPin className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
                    <span className="text-[#111111] dark:text-[#E5E7EB]">
                      {a.report.building}
                      {a.report.room ? `, ${a.report.room}` : ""}
                    </span>
                  </div>
                )}
                <ArrowRight className="h-3 w-3 text-[#9CA3AF] dark:text-[#6B7280] flex-shrink-0" />
                {a.technician && (
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <User className="h-3.5 w-3.5 text-[#6B7280] dark:text-[#9CA3AF]" />
                    <span className="font-medium text-[#111111] dark:text-[#E5E7EB]">{a.technician.name}</span>
                  </div>
                )}
              </div>

              {a.report && (
                <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                  {a.report.ai_description}
                </p>
              )}

              <div className="flex items-center gap-2 mt-2 text-[12px] text-[#9CA3AF] dark:text-[#6B7280]">
                <Clock className="h-3 w-3" />
                {new Date(a.created_at).toLocaleString()}
                {a.status !== "completed" && (
                  <span className={`font-medium ${sla.color}`}>({sla.label})</span>
                )}
                {a.notes && <span className="text-[#6B7280] dark:text-[#9CA3AF]">— {a.notes}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
