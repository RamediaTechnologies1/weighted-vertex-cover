import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendSLAEscalationEmail, sendAssignmentEmail } from "@/lib/email";
import { ESCALATION_THRESHOLDS } from "@/lib/constants";
import type { Report, Technician } from "@/lib/types";

function minutesSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export async function POST() {
  try {
    const actions: string[] = [];

    // 1. Find unassigned reports past SLA
    const { data: unassignedReports } = await supabaseAdmin
      .from("reports")
      .select("*")
      .in("status", ["submitted", "dispatched"])
      .is("duplicate_of", null)
      .order("created_at", { ascending: true });

    // Check which ones have no assignment
    for (const report of unassignedReports || []) {
      const { data: assignments } = await supabaseAdmin
        .from("assignments")
        .select("id")
        .eq("report_id", report.id)
        .in("status", ["pending", "accepted", "in_progress"])
        .limit(1);

      if (assignments && assignments.length > 0) continue;

      const elapsed = minutesSince(report.created_at);
      const threshold = report.priority === "critical"
        ? ESCALATION_THRESHOLDS.UNASSIGNED_CRITICAL
        : report.priority === "high"
          ? ESCALATION_THRESHOLDS.UNASSIGNED_HIGH
          : ESCALATION_THRESHOLDS.UNASSIGNED_DEFAULT;

      if (elapsed >= threshold) {
        // Try auto-reassign first
        const { data: techs } = await supabaseAdmin
          .from("technicians")
          .select("*")
          .eq("is_available", true);

        if (techs && techs.length > 0) {
          // Pick tech with lowest workload
          const { data: activeCounts } = await supabaseAdmin
            .from("assignments")
            .select("technician_id")
            .in("technician_id", techs.map((t: Technician) => t.id))
            .in("status", ["pending", "accepted", "in_progress"]);

          const loads: Record<string, number> = {};
          (activeCounts || []).forEach((a: { technician_id: string }) => {
            loads[a.technician_id] = (loads[a.technician_id] || 0) + 1;
          });

          const sorted = techs.sort(
            (a: Technician, b: Technician) => (loads[a.id] || 0) - (loads[b.id] || 0)
          );
          const bestTech = sorted[0] as Technician;

          const { data: assignment } = await supabaseAdmin
            .from("assignments")
            .insert({
              report_id: report.id,
              technician_id: bestTech.id,
              assigned_by: "escalation_engine",
              status: "pending",
              notes: `Auto-assigned by escalation engine after ${elapsed}m without assignment.`,
            })
            .select()
            .single();

          if (assignment) {
            try {
              await sendAssignmentEmail(bestTech.email, bestTech.name, report as Report);
            } catch { /* email failure non-fatal */ }
            actions.push(`Auto-assigned report ${report.id.slice(0, 8)} to ${bestTech.name} (${elapsed}m overdue)`);
          }
        }

        // Also notify manager
        try {
          await sendSLAEscalationEmail({
            reports: [{
              id: report.id,
              building: report.building,
              room: report.room,
              trade: report.trade,
              priority: report.priority,
              created_at: report.created_at,
              minutesElapsed: elapsed,
            }],
            reason: `Report unassigned for ${elapsed} minutes (SLA: ${threshold}m for ${report.priority} priority)`,
          });
        } catch { /* non-fatal */ }
        actions.push(`SLA escalation: report ${report.id.slice(0, 8)} unassigned for ${elapsed}m`);
      }
    }

    // 2. Find pending assignments not accepted within threshold
    const { data: pendingAssignments } = await supabaseAdmin
      .from("assignments")
      .select("*, report:reports(*), technician:technicians(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    for (const assignment of pendingAssignments || []) {
      const elapsed = minutesSince(assignment.created_at);
      const report = assignment.report as Report | null;
      const threshold = report?.priority === "critical"
        ? ESCALATION_THRESHOLDS.UNACCEPTED_CRITICAL
        : ESCALATION_THRESHOLDS.UNACCEPTED_DEFAULT;

      if (elapsed >= threshold) {
        // Cancel this assignment
        await supabaseAdmin
          .from("assignments")
          .update({ status: "cancelled", notes: `Auto-cancelled: not accepted within ${threshold}m` })
          .eq("id", assignment.id);

        // Find another tech (exclude current)
        const { data: otherTechs } = await supabaseAdmin
          .from("technicians")
          .select("*")
          .eq("is_available", true)
          .neq("id", assignment.technician_id);

        if (otherTechs && otherTechs.length > 0 && report) {
          const newTech = otherTechs[0] as Technician;
          await supabaseAdmin
            .from("assignments")
            .insert({
              report_id: assignment.report_id,
              technician_id: newTech.id,
              assigned_by: "escalation_engine",
              status: "pending",
              notes: `Reassigned: previous tech did not accept within ${threshold}m.`,
            });

          try {
            await sendAssignmentEmail(newTech.email, newTech.name, report);
          } catch { /* non-fatal */ }
          actions.push(`Reassigned ${assignment.report_id.slice(0, 8)} from ${(assignment.technician as Technician)?.name} to ${newTech.name}`);
        }

        if (report) {
          try {
            await sendSLAEscalationEmail({
              reports: [{
                id: report.id,
                building: report.building,
                room: report.room,
                trade: report.trade,
                priority: report.priority,
                created_at: report.created_at,
                minutesElapsed: elapsed,
              }],
              reason: `Assignment not accepted for ${elapsed} minutes — auto-reassigned`,
            });
          } catch { /* non-fatal */ }
        }
      }
    }

    // 3. Find stale in_progress assignments
    const { data: staleJobs } = await supabaseAdmin
      .from("assignments")
      .select("*, report:reports(*)")
      .eq("status", "in_progress")
      .order("started_at", { ascending: true });

    const staleReports: { id: string; building: string; room: string; trade: string; priority: string; created_at: string; minutesElapsed: number }[] = [];

    for (const job of staleJobs || []) {
      const elapsed = minutesSince(job.started_at || job.created_at);
      if (elapsed >= ESCALATION_THRESHOLDS.STALE_IN_PROGRESS && job.report) {
        const r = job.report as Report;
        staleReports.push({
          id: r.id,
          building: r.building,
          room: r.room,
          trade: r.trade,
          priority: r.priority,
          created_at: r.created_at,
          minutesElapsed: elapsed,
        });
      }
    }

    if (staleReports.length > 0) {
      try {
        await sendSLAEscalationEmail({
          reports: staleReports,
          reason: `${staleReports.length} job(s) in progress for over ${ESCALATION_THRESHOLDS.STALE_IN_PROGRESS / 60} hours without completion`,
        });
      } catch { /* non-fatal */ }
      actions.push(`Flagged ${staleReports.length} stale in-progress jobs to manager`);
    }

    return NextResponse.json({
      success: true,
      actions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/escalation]", error);
    return NextResponse.json({ error: "Escalation engine failed" }, { status: 500 });
  }
}
