"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/manager/dashboard-sidebar";
import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { useState } from "react";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);
  const { loadData, sidebarOpen, setSidebarOpen } = useDashboardStore();

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/auth/session");
      if (!res.ok) { router.replace("/login"); return; }
      const data = await res.json();
      if (data.role !== "manager") { router.replace(`/${data.role}`); return; }
      setEmail(data.email);
      setReady(true);
    }
    check();
  }, [router]);

  // Load data once ready
  useEffect(() => {
    if (ready) loadData();
  }, [ready, loadData]);

  // Polling
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [ready, loadData]);

  // Realtime subscriptions
  const stableLoadData = useCallback(() => { loadData(); }, [loadData]);
  useRealtimeTable("reports", stableLoadData);
  useRealtimeTable("assignments", stableLoadData);
  useRealtimeTable("technicians", stableLoadData);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      <DashboardSidebar
        email={email}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="md:pl-[240px] min-h-screen">
        <main>{children}</main>
      </div>
    </div>
  );
}
