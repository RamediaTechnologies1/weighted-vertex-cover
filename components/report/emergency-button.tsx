"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEMO_BUILDINGS } from "@/lib/constants";
import { toast } from "sonner";

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [building, setBuilding] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleEmergency() {
    if (!building) {
      toast.error("Select a building first");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building,
          room: "",
          floor: "",
          description: "EMERGENCY: Safety hazard reported via one-tap emergency button",
          photo_base64: "",
          ai_analysis: {
            trade: "safety_hazard",
            priority: "critical",
            description: "Emergency safety hazard — reported via quick emergency button",
            suggested_action: "Dispatch safety team immediately for on-site assessment",
            safety_concern: true,
            estimated_cost: "N/A",
            estimated_time: "Immediate response required",
            confidence_score: 1.0,
          },
        }),
      });

      if (res.ok) {
        toast.success("Emergency report submitted! Safety team has been notified.");
        setOpen(false);
        setBuilding("");
      } else {
        toast.error("Failed to submit emergency report");
      }
    } catch {
      toast.error("Failed to submit emergency report");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 bg-[#DC2626] hover:bg-[#B91C1C] text-white p-3 rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-[#DC2626] transition-colors duration-150"
      >
        <AlertTriangle className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-72 bg-white dark:bg-[#141415] border border-[#E5E7EB] dark:border-[#262626] rounded-[6px] p-4 space-y-3 shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
        <div>
          <p className="text-[14px] font-medium text-[#DC2626]">Emergency report</p>
          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF]">Quick safety hazard report</p>
        </div>
      </div>

      <Select value={building} onValueChange={setBuilding}>
        <SelectTrigger className="rounded-[6px] border-[#E5E7EB] dark:border-[#262626] bg-white dark:bg-[#1C1C1E] text-[#111111] dark:text-[#E5E7EB] h-10 text-[14px]">
          <SelectValue placeholder="Select building" />
        </SelectTrigger>
        <SelectContent>
          {DEMO_BUILDINGS.map((b) => (
            <SelectItem key={b} value={b}>{b}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setOpen(false); setBuilding(""); }}
          className="flex-1 rounded-[6px] border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E] h-10 text-[14px]"
        >
          Cancel
        </Button>
        <Button
          onClick={handleEmergency}
          disabled={submitting || !building}
          className="flex-1 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium h-10 text-[14px]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Report"
          )}
        </Button>
      </div>
    </div>
  );
}
