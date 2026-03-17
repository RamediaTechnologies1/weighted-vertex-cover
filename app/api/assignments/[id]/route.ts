import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendReporterStatusEmail } from "@/lib/email";
import type { Report } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, completion_notes, completion_photo_base64 } = body;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (completion_notes) updateData.completion_notes = completion_notes;
    if (completion_photo_base64) updateData.completion_photo_base64 = completion_photo_base64;

    if (status === "accepted") {
      updateData.started_at = new Date().toISOString();
    }

    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: assignment, error } = await supabaseAdmin
      .from("assignments")
      .update(updateData)
      .eq("id", id)
      .select("*, technician:technicians(name, email)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map assignment status to report status
    const reportStatusMap: Record<string, string> = {
      accepted: "in_progress",
      in_progress: "in_progress",
      completed: "resolved",
    };

    const newReportStatus = reportStatusMap[status];

    if (newReportStatus && assignment) {
      await supabaseAdmin
        .from("reports")
        .update({ status: newReportStatus })
        .eq("id", assignment.report_id);

      // --- Automated Follow-up: notify reporter ---
      const { data: report } = await supabaseAdmin
        .from("reports")
        .select("*")
        .eq("id", assignment.report_id)
        .single();

      if (report && report.reporter_email) {
        const techName = (assignment.technician as { name: string } | null)?.name;
        try {
          await sendReporterStatusEmail(
            report.reporter_email,
            report as Report,
            newReportStatus,
            {
              techName: techName || undefined,
              completionNotes: completion_notes || undefined,
            }
          );
        } catch (emailErr) {
          console.error("[follow-up email]", emailErr);
        }
      }
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Update assignment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
