import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAssignmentEmail } from "@/lib/email";
import { BATCH_WINDOW_HOURS, ASSIGNMENT_SCORE } from "@/lib/constants";
import type { Report, Technician } from "@/lib/types";

interface BatchGroup {
  building: string;
  trade: string;
  reports: Report[];
}

export async function POST() {
  try {
    const actions: string[] = [];

    // Find reports that are dispatched but have no active assignment
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - BATCH_WINDOW_HOURS);

    const { data: dispatchedReports } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("status", "dispatched")
      .is("duplicate_of", null)
      .gte("created_at", cutoff.toISOString())
      .order("building", { ascending: true })
      .order("trade", { ascending: true });

    if (!dispatchedReports || dispatchedReports.length === 0) {
      return NextResponse.json({ success: true, actions: ["No batchable reports found"], batches: [] });
    }

    // Check which reports already have active assignments
    const reportIds = dispatchedReports.map((r: Report) => r.id);
    const { data: existingAssignments } = await supabaseAdmin
      .from("assignments")
      .select("report_id")
      .in("report_id", reportIds)
      .in("status", ["pending", "accepted", "in_progress"]);

    const assignedReportIds = new Set((existingAssignments || []).map((a: { report_id: string }) => a.report_id));
    const unassignedReports = dispatchedReports.filter((r: Report) => !assignedReportIds.has(r.id));

    if (unassignedReports.length === 0) {
      return NextResponse.json({ success: true, actions: ["All dispatched reports already assigned"], batches: [] });
    }

    // Group by building + trade
    const groups: Record<string, BatchGroup> = {};
    for (const report of unassignedReports as Report[]) {
      const key = `${report.building}::${report.trade}`;
      if (!groups[key]) {
        groups[key] = { building: report.building, trade: report.trade, reports: [] };
      }
      groups[key].reports.push(report);
    }

    const batches: { building: string; trade: string; reportCount: number; techAssigned: string }[] = [];

    // For each group, assign to best technician with batch notes
    for (const group of Object.values(groups)) {
      // Find best technician for this building + trade combo
      const { data: techs } = await supabaseAdmin
        .from("technicians")
        .select("*")
        .eq("is_available", true);

      if (!techs || techs.length === 0) continue;

      // Score technicians
      const { data: activeCounts } = await supabaseAdmin
        .from("assignments")
        .select("technician_id")
        .in("technician_id", techs.map((t: Technician) => t.id))
        .in("status", ["pending", "accepted", "in_progress"]);

      const loads: Record<string, number> = {};
      (activeCounts || []).forEach((a: { technician_id: string }) => {
        loads[a.technician_id] = (loads[a.technician_id] || 0) + 1;
      });

      const scored = techs.map((tech: Technician) => {
        let score = tech.is_available ? ASSIGNMENT_SCORE.AVAILABLE : 0;
        if (tech.assigned_buildings?.includes(group.building)) score += ASSIGNMENT_SCORE.BUILDING_MATCH;
        if (tech.trade === group.trade) score += ASSIGNMENT_SCORE.TRADE_MATCH;
        const load = loads[tech.id] || 0;
        if (load < ASSIGNMENT_SCORE.MAX_ACTIVE_ASSIGNMENTS) {
          score += (ASSIGNMENT_SCORE.MAX_ACTIVE_ASSIGNMENTS - load) * ASSIGNMENT_SCORE.LOW_WORKLOAD_BONUS;
        }
        return { tech, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const bestTech = scored[0].tech as Technician;

      // Sort reports by floor for optimal route
      const sortedReports = group.reports.sort((a, b) => {
        const floorA = parseInt(a.floor || "0", 10);
        const floorB = parseInt(b.floor || "0", 10);
        return floorA - floorB;
      });

      const roomList = sortedReports
        .map((r) => `Floor ${r.floor || "?"}, Room ${r.room || "?"}`)
        .join(" → ");

      // Create one assignment per report but with batch context
      for (let i = 0; i < sortedReports.length; i++) {
        const report = sortedReports[i];
        await supabaseAdmin
          .from("assignments")
          .insert({
            report_id: report.id,
            technician_id: bestTech.id,
            assigned_by: "batch_engine",
            status: "pending",
            notes: `BATCHED JOB (${i + 1}/${sortedReports.length}) — ${group.building} ${group.trade.replace("_", " ")} sweep. Route: ${roomList}`,
          });
      }

      // Send one consolidated email for the batch
      const batchReport = sortedReports[0];
      try {
        await sendAssignmentEmail(
          bestTech.email,
          bestTech.name,
          {
            ...batchReport,
            ai_description: `BATCHED: ${sortedReports.length} ${group.trade.replace("_", " ")} issues in ${group.building}. Route: ${roomList}`,
            suggested_action: `Complete all ${sortedReports.length} jobs in a single visit. Start from the lowest floor and work up.`,
          } as Report
        );
      } catch { /* non-fatal */ }

      batches.push({
        building: group.building,
        trade: group.trade,
        reportCount: sortedReports.length,
        techAssigned: bestTech.name,
      });

      actions.push(`Batched ${sortedReports.length} ${group.trade} jobs at ${group.building} → assigned to ${bestTech.name}`);
    }

    return NextResponse.json({ success: true, actions, batches });
  } catch (error) {
    console.error("[/api/batch-jobs]", error);
    return NextResponse.json({ error: "Batch engine failed" }, { status: 500 });
  }
}
