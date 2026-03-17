"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Glasses } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobCard } from "@/components/technician/job-card";
import type { Assignment } from "@/lib/types";
import { useRealtimeTable } from "@/hooks/use-realtime";
import { useNotifications } from "@/hooks/use-notifications";

export default function TechnicianPortal() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [refreshing, setRefreshing] = useState(false);
  const { notify } = useNotifications();
  const prevCountRef = useRef(0);

  const loadAssignments = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      if (!sessionRes.ok) return;
      const { email } = await sessionRes.json();

      const res = await fetch(`/api/assignments?technician_email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useRealtimeTable("assignments", loadAssignments);

  useEffect(() => {
    const activeCount = assignments.filter((a) => ["pending", "accepted", "in_progress"].includes(a.status)).length;
    if (prevCountRef.current > 0 && activeCount > prevCountRef.current) {
      const newest = assignments
        .filter((a) => a.status === "pending")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      if (newest?.report) {
        notify(
          "New Job Assigned",
          `${newest.report.building}${newest.report.room ? `, Room ${newest.report.room}` : ""} — ${newest.report.ai_description || "New maintenance task"}`,
          () => router.push(`/technician/job/${newest.id}`)
        );
      }
    }
    prevCountRef.current = activeCount;
  }, [assignments, notify, router]);

  useEffect(() => {
    loadAssignments();
    const interval = setInterval(loadAssignments, 30000);
    return () => clearInterval(interval);
  }, [loadAssignments]);

  const activeCount = assignments.filter((a) => ["pending", "accepted", "in_progress"].includes(a.status)).length;
  const completedCount = assignments.filter((a) => a.status === "completed").length;

  const filtered = assignments.filter((a) => {
    if (filter === "active") return ["pending", "accepted", "in_progress"].includes(a.status);
    if (filter === "completed") return a.status === "completed";
    return true;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-medium text-[#111111] dark:text-[#E5E7EB] tracking-[-0.01em]">My Jobs</h1>
          <p className="text-[13px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
            {activeCount > 0 ? `${activeCount} active assignment${activeCount !== 1 ? "s" : ""}` : "No active assignments"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/technician/voice")}
            className="rounded-[6px] h-8 gap-1.5 px-3 border-[#3B82F6]/30 text-[#3B82F6] hover:bg-[#3B82F6]/10 dark:hover:bg-[#3B82F6]/10 text-[12px]"
          >
            <Glasses className="h-3.5 w-3.5" /> Glasses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRefreshing(true); loadAssignments(); }}
            className="rounded-[6px] h-8 w-8 p-0 border-[#E5E7EB] dark:border-[#262626] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#1C1C1E]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full rounded-[6px] h-9 bg-[#F3F4F6] dark:bg-[#1C1C1E] border border-[#E5E7EB] dark:border-[#262626] p-0.5">
          <TabsTrigger value="active" className="flex-1 rounded-[4px] text-[13px] font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-[#141415] data-[state=active]:text-[#111111] dark:data-[state=active]:text-[#E5E7EB] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#6B7280] dark:text-[#9CA3AF]">
            Active ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 rounded-[4px] text-[13px] font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-[#141415] data-[state=active]:text-[#111111] dark:data-[state=active]:text-[#E5E7EB] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#6B7280] dark:text-[#9CA3AF]">
            Done ({completedCount})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1 rounded-[4px] text-[13px] font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-[#141415] data-[state=active]:text-[#111111] dark:data-[state=active]:text-[#E5E7EB] data-[state=active]:shadow-[0_1px_2px_rgba(0,0,0,0.05)] text-[#6B7280] dark:text-[#9CA3AF]">
            All ({assignments.length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-[6px] skeleton-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[14px] text-[#6B7280] dark:text-[#9CA3AF]">
            {filter === "completed" ? "No completed jobs" : filter === "active" ? "No active jobs" : "No jobs found"}
          </p>
          <p className="text-[13px] text-[#9CA3AF] dark:text-[#6B7280] mt-1">
            {filter === "active" ? "New assignments will appear here automatically." : "Jobs will appear here when assigned."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((assignment) => (
          <JobCard
            key={assignment.id}
            assignment={assignment}
            onClick={() => router.push(`/technician/job/${assignment.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
