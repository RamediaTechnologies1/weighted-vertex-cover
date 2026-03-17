import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAssignmentEmail } from "@/lib/email";
import { ASSIGNMENT_SCORE } from "@/lib/constants";
import type { Report, Technician } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { report_id } = await request.json();

    if (!report_id) {
      return NextResponse.json(
        { error: "report_id required" },
        { status: 400 }
      );
    }

    // Fetch the report
    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("id", report_id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Fetch available technicians
    const { data: technicians, error: techError } = await supabaseAdmin
      .from("technicians")
      .select("*")
      .eq("is_available", true);

    if (techError || !technicians || technicians.length === 0) {
      return NextResponse.json(
        { error: "No available technicians" },
        { status: 404 }
      );
    }

    // Get current assignment counts for each technician
    const techIds = technicians.map((t: Technician) => t.id);
    const { data: activeAssignments } = await supabaseAdmin
      .from("assignments")
      .select("technician_id")
      .in("technician_id", techIds)
      .in("status", ["pending", "accepted", "in_progress"]);

    const assignmentCounts: Record<string, number> = {};
    (activeAssignments || []).forEach((a: { technician_id: string }) => {
      assignmentCounts[a.technician_id] = (assignmentCounts[a.technician_id] || 0) + 1;
    });

    // Score each technician
    const scored = technicians.map((tech: Technician) => {
      let score = 0;

      // Availability bonus
      if (tech.is_available) score += ASSIGNMENT_SCORE.AVAILABLE;

      // Building match
      if (tech.assigned_buildings?.includes(report.building)) {
        score += ASSIGNMENT_SCORE.BUILDING_MATCH;
      }

      // Trade match
      if (tech.trade === report.trade) {
        score += ASSIGNMENT_SCORE.TRADE_MATCH;
      }

      // Low workload bonus
      const currentLoad = assignmentCounts[tech.id] || 0;
      if (currentLoad < ASSIGNMENT_SCORE.MAX_ACTIVE_ASSIGNMENTS) {
        score +=
          (ASSIGNMENT_SCORE.MAX_ACTIVE_ASSIGNMENTS - currentLoad) *
          ASSIGNMENT_SCORE.LOW_WORKLOAD_BONUS;
      }

      return { tech, score, currentLoad };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const bestTech = scored[0].tech;

    // Create assignment
    const { data: assignment, error: assignError } = await supabaseAdmin
      .from("assignments")
      .insert({
        report_id,
        technician_id: bestTech.id,
        assigned_by: "ai",
        status: "pending",
        notes: `AI auto-assigned. Score: ${scored[0].score}. Workload: ${scored[0].currentLoad} active jobs.`,
      })
      .select()
      .single();

    if (assignError) {
      return NextResponse.json(
        { error: assignError.message },
        { status: 500 }
      );
    }

    // Update report status
    await supabaseAdmin
      .from("reports")
      .update({ status: "dispatched" })
      .eq("id", report_id);

    // Send email to technician
    try {
      await sendAssignmentEmail(
        bestTech.email,
        bestTech.name,
        report as Report
      );
    } catch (emailErr) {
      console.error("AI assignment email failed:", emailErr);
    }

    return NextResponse.json({
      assignment,
      technician: bestTech,
      score: scored[0].score,
      all_scores: scored.map((s) => ({
        name: s.tech.name,
        score: s.score,
        load: s.currentLoad,
      })),
    });
  } catch (error) {
    console.error("AI assign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
