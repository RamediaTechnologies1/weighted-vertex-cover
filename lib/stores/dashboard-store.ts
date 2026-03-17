import { create } from "zustand";
import type { Report, Assignment, Technician, AIActivity } from "@/lib/types";

interface DashboardStore {
  reports: Report[];
  assignments: Assignment[];
  technicians: Technician[];
  aiActivities: AIActivity[];
  loading: boolean;
  refreshing: boolean;
  sidebarOpen: boolean;

  loadData: () => Promise<void>;
  setRefreshing: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;

  // AI actions
  aiAssign: (reportId: string) => Promise<{ success: boolean; message: string }>;
  aiAssignAll: () => Promise<void>;
  addActivity: (activity: Omit<AIActivity, "id" | "timestamp">) => void;

  // Technician CRUD
  createTechnician: (data: Partial<Technician>) => Promise<boolean>;
  updateTechnician: (id: string, data: Partial<Technician>) => Promise<boolean>;
  deleteTechnician: (id: string) => Promise<boolean>;
}

let activityCounter = 0;

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  reports: [],
  assignments: [],
  technicians: [],
  aiActivities: [],
  loading: true,
  refreshing: false,
  sidebarOpen: false,

  loadData: async () => {
    try {
      const [reportsRes, assignmentsRes, techRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/assignments"),
        fetch("/api/technicians"),
      ]);

      const updates: Partial<DashboardStore> = { loading: false, refreshing: false };

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        updates.reports = data.reports || [];
      }
      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        updates.assignments = data.assignments || [];
      }
      if (techRes.ok) {
        const data = await techRes.json();
        updates.technicians = data.technicians || [];
      }

      set(updates);
    } catch {
      set({ loading: false, refreshing: false });
    }
  },

  setRefreshing: (v) => set({ refreshing: v }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addActivity: (activity) => {
    const entry: AIActivity = {
      ...activity,
      id: `act-${++activityCounter}-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      aiActivities: [entry, ...s.aiActivities].slice(0, 50),
    }));
  },

  aiAssign: async (reportId) => {
    const { addActivity, loadData } = get();
    try {
      const res = await fetch("/api/ai-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: reportId }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "AI assignment failed";
        addActivity({ type: "error", message: msg, reportId });
        return { success: false, message: msg };
      }

      const data = await res.json();
      const msg = `Assigned to ${data.technician.name} (score: ${data.score})`;
      addActivity({
        type: "assign",
        message: msg,
        reportId,
        technicianName: data.technician.name,
        details: `Trade match + proximity scoring`,
      });
      await loadData();
      return { success: true, message: msg };
    } catch {
      addActivity({ type: "error", message: "AI assignment failed", reportId });
      return { success: false, message: "AI assignment failed" };
    }
  },

  aiAssignAll: async () => {
    const { reports, aiAssign, addActivity } = get();
    const unassigned = reports.filter((r) => r.status === "submitted");
    if (unassigned.length === 0) return;

    addActivity({
      type: "analyze",
      message: `Processing ${unassigned.length} unassigned report${unassigned.length > 1 ? "s" : ""}...`,
    });

    for (const report of unassigned) {
      await aiAssign(report.id);
    }
  },

  createTechnician: async (data) => {
    try {
      const res = await fetch("/api/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await get().loadData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  updateTechnician: async (id, data) => {
    try {
      const res = await fetch(`/api/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await get().loadData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  deleteTechnician: async (id) => {
    try {
      const res = await fetch(`/api/technicians/${id}`, { method: "DELETE" });
      if (res.ok) {
        await get().loadData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
}));
