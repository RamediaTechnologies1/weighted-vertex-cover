"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/manager/dashboard-header";
import { TechnicianFormDialog } from "@/components/manager/technician-form-dialog";
import { TechnicianDetailSheet } from "@/components/manager/technician-detail-sheet";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { toast } from "sonner";
import type { Technician } from "@/lib/types";

export default function TechniciansPage() {
  const { technicians, assignments, loading, deleteTechnician } = useDashboardStore();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return technicians;
    const q = search.toLowerCase();
    return technicians.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.trade.toLowerCase().includes(q)
    );
  }, [technicians, search]);

  function getActiveJobs(techId: string) {
    return assignments.filter(
      (a) => a.technician_id === techId && ["pending", "accepted", "in_progress"].includes(a.status)
    ).length;
  }

  async function handleDelete(tech: Technician) {
    if (!confirm(`Delete ${tech.name}? This cannot be undone.`)) return;
    setDeleting(tech.id);
    const success = await deleteTechnician(tech.id);
    if (success) {
      toast.success(`${tech.name} deleted`);
    } else {
      toast.error("Cannot delete — may have active assignments");
    }
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-10 w-48 bg-[#141415] rounded-[6px] animate-pulse" />
        <div className="h-[400px] bg-[#141415] border border-[#262626] rounded-[8px] animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="Technicians"
        subtitle={`${technicians.length} team members`}

        actions={
          <Button
            onClick={() => { setEditingTech(null); setFormOpen(true); }}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-[6px] h-8 px-3 text-[13px] font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Technician
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B7280]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search technicians..."
            className="w-full h-8 pl-9 pr-3 rounded-[6px] bg-[#141415] border border-[#262626] text-[13px] text-[#E5E7EB] placeholder:text-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
          />
        </div>

        {/* Table */}
        <div className="bg-[#141415] border border-[#262626] rounded-[8px] overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_140px_80px_80px_80px] gap-2 px-4 py-2.5 border-b border-[#262626] text-[11px] font-medium text-[#6B7280] uppercase tracking-wider">
            <span>Name</span>
            <span>Trade</span>
            <span>Buildings</span>
            <span>Status</span>
            <span>Jobs</span>
            <span>Actions</span>
          </div>

          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#6B7280]">
              {technicians.length === 0 ? "No technicians yet. Add one to get started." : "No results match your search."}
            </div>
          ) : (
            <div className="divide-y divide-[#262626]">
              {filtered.map((tech) => {
                const activeJobs = getActiveJobs(tech.id);
                return (
                  <div
                    key={tech.id}
                    className="grid grid-cols-[1fr_100px_140px_80px_80px_80px] gap-2 px-4 py-3 items-center hover:bg-[#1C1C1E] cursor-pointer transition-colors duration-100"
                    onClick={() => setSelectedTech(tech)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#1C1C1E] flex items-center justify-center text-[12px] font-medium text-[#E5E7EB] shrink-0">
                        {tech.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] text-[#E5E7EB] truncate">{tech.name}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{tech.email}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#3B82F6]/10 text-[#60A5FA] w-fit">
                      {tech.trade.replace("_", " ")}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tech.assigned_buildings.map((b) => (
                        <span key={b} className="px-1.5 py-0.5 rounded-[3px] bg-[#1C1C1E] text-[#9CA3AF] text-[10px]">{b}</span>
                      ))}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      tech.is_available ? "text-[#34D399]" : "text-[#F87171]"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tech.is_available ? "bg-[#10B981]" : "bg-[#DC2626]"}`} />
                      {tech.is_available ? "Available" : "Busy"}
                    </span>
                    <span className="text-[13px] text-[#E5E7EB]">{activeJobs}</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setEditingTech(tech); setFormOpen(true); }}
                        className="h-7 w-7 flex items-center justify-center rounded-[4px] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-[#262626] transition-colors duration-150"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(tech)}
                        disabled={deleting === tech.id}
                        className="h-7 w-7 flex items-center justify-center rounded-[4px] text-[#6B7280] hover:text-[#DC2626] hover:bg-[#DC2626]/10 transition-colors duration-150 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <TechnicianFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTech(null); }}
        technician={editingTech}
      />

      <TechnicianDetailSheet
        technician={selectedTech}
        open={!!selectedTech}
        onClose={() => setSelectedTech(null)}
        onEdit={(t) => { setSelectedTech(null); setEditingTech(t); setFormOpen(true); }}
      />
    </>
  );
}
