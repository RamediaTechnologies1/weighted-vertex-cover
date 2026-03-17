"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";
import type { Technician, Trade } from "@/lib/types";

const TRADES: Trade[] = ["plumbing", "electrical", "hvac", "structural", "custodial", "landscaping", "safety_hazard"];
const BUILDINGS = ["Gore Hall", "Smith Hall"];

interface TechnicianFormDialogProps {
  open: boolean;
  onClose: () => void;
  technician?: Technician | null;
}

export function TechnicianFormDialog({ open, onClose, technician }: TechnicianFormDialogProps) {
  const { createTechnician, updateTechnician } = useDashboardStore();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [trade, setTrade] = useState<Trade>("hvac");
  const [buildings, setBuildings] = useState<string[]>([]);

  const isEdit = !!technician;

  useEffect(() => {
    if (technician) {
      setName(technician.name);
      setEmail(technician.email);
      setPhone(technician.phone || "");
      setTrade(technician.trade);
      setBuildings(technician.assigned_buildings || []);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setTrade("hvac");
      setBuildings([]);
    }
  }, [technician, open]);

  function toggleBuilding(b: string) {
    setBuildings((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    const data = { name, email, phone: phone || null, trade, assigned_buildings: buildings };

    let success: boolean;
    if (isEdit) {
      success = await updateTechnician(technician!.id, data);
    } else {
      success = await createTechnician(data);
    }

    if (success) {
      toast.success(isEdit ? "Technician updated" : "Technician created");
      onClose();
    } else {
      toast.error(isEdit ? "Update failed" : "Creation failed");
    }
    setSaving(false);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#141415] border border-[#262626] rounded-[8px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626]">
          <h2 className="text-[15px] font-medium text-[#E5E7EB]">
            {isEdit ? "Edit Technician" : "Add Technician"}
          </h2>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#E5E7EB]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[12px] text-[#6B7280] mb-1.5 block">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full h-9 rounded-[6px] bg-[#1C1C1E] border border-[#262626] text-[13px] text-[#E5E7EB] px-3 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] placeholder:text-[#4B5563]"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#6B7280] mb-1.5 block">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@udel.edu"
              className="w-full h-9 rounded-[6px] bg-[#1C1C1E] border border-[#262626] text-[13px] text-[#E5E7EB] px-3 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] placeholder:text-[#4B5563]"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#6B7280] mb-1.5 block">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(302) 555-0100"
              className="w-full h-9 rounded-[6px] bg-[#1C1C1E] border border-[#262626] text-[13px] text-[#E5E7EB] px-3 focus:outline-none focus:ring-1 focus:ring-[#3B82F6] placeholder:text-[#4B5563]"
            />
          </div>

          <div>
            <label className="text-[12px] text-[#6B7280] mb-1.5 block">Trade *</label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value as Trade)}
              className="w-full h-9 rounded-[6px] bg-[#1C1C1E] border border-[#262626] text-[13px] text-[#E5E7EB] px-3 focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] text-[#6B7280] mb-1.5 block">Assigned Buildings</label>
            <div className="flex flex-wrap gap-2">
              {BUILDINGS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBuilding(b)}
                  className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium border transition-colors duration-150 ${
                    buildings.includes(b)
                      ? "bg-[#3B82F6]/10 text-[#60A5FA] border-[#3B82F6]/30"
                      : "bg-[#1C1C1E] text-[#6B7280] border-[#262626] hover:border-[#3B3B3D]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 rounded-[6px] border-[#262626] bg-transparent text-[#9CA3AF] hover:bg-[#1C1C1E] text-[13px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 h-9 rounded-[6px] bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEdit ? "Save Changes" : "Add Technician"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
