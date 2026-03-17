"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";
import type { Trade } from "@/lib/types";

interface ManualAssignDialogProps {
  reportId: string;
  trade: Trade;
  onAssigned: () => void;
}

export function ManualAssignDialog({ reportId, trade, onAssigned }: ManualAssignDialogProps) {
  const { technicians, loadData, addActivity } = useDashboardStore();
  const [selectedTechId, setSelectedTechId] = useState("");
  const [notes, setNotes] = useState("");
  const [assigning, setAssigning] = useState(false);

  const matchingTechs = technicians.filter((t) => t.trade === trade && t.is_available);
  const otherTechs = technicians.filter((t) => t.trade !== trade || !t.is_available);

  async function handleAssign() {
    if (!selectedTechId) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          technician_id: selectedTechId,
          assigned_by: "manager",
          notes: notes || undefined,
        }),
      });

      if (res.ok) {
        const tech = technicians.find((t) => t.id === selectedTechId);
        toast.success(`Assigned to ${tech?.name || "technician"}`);
        addActivity({
          type: "assign",
          message: `Manager assigned to ${tech?.name}`,
          reportId,
          technicianName: tech?.name,
        });
        await loadData();
        onAssigned();
      } else {
        const data = await res.json();
        toast.error(data.error || "Assignment failed");
      }
    } catch {
      toast.error("Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[12px] text-[#6B7280] mb-1.5 block">Select Technician</label>
        <select
          value={selectedTechId}
          onChange={(e) => setSelectedTechId(e.target.value)}
          className="w-full h-9 rounded-[6px] bg-[#1C1C1E] border border-[#262626] text-[13px] text-[#E5E7EB] px-3 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
        >
          <option value="">Choose technician...</option>
          {matchingTechs.length > 0 && (
            <optgroup label={`${trade} specialists (available)`}>
              {matchingTechs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.trade}
                </option>
              ))}
            </optgroup>
          )}
          {otherTechs.length > 0 && (
            <optgroup label="Other technicians">
              {otherTechs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.trade} {!t.is_available ? "(busy)" : ""}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div>
        <label className="text-[12px] text-[#6B7280] mb-1.5 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special instructions..."
          rows={2}
          className="w-full rounded-[6px] bg-[#1C1C1E] border border-[#262626] text-[13px] text-[#E5E7EB] px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#3B82F6] placeholder:text-[#4B5563]"
        />
      </div>

      <Button
        onClick={handleAssign}
        disabled={!selectedTechId || assigning}
        className="w-full h-9 rounded-[6px] bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-medium disabled:opacity-50"
      >
        {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Assign Technician"}
      </Button>
    </div>
  );
}
