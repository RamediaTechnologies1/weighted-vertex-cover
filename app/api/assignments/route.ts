import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendAssignmentEmail } from "@/lib/email";
import type { Report, Technician } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get("technician_id");
    const status = searchParams.get("status");
    const techEmail = searchParams.get("technician_email");

    let query = supabaseAdmin.from("assignments").select("*");

    if (technicianId) query = query.eq("technician_id", technicianId);
    if (status) query = query.eq("status", status);

    const { data: assignments, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If filtering by tech email, look up technician ID first
    if (techEmail && !technicianId) {
      const { data: tech } = await supabaseAdmin
        .from("technicians")
        .select("id")
        .eq("email", techEmail)
        .single();

      if (tech) {
        const { data: techAssignments, error: techErr } = await supabaseAdmin
          .from("assignments")
          .select("*")
          .eq("technician_id", tech.id)
          .order("created_at", { ascending: false });

        if (techErr) {
          return NextResponse.json({ error: techErr.message }, { status: 500 });
        }

        // Enrich with report data
        const enriched = await enrichAssignments(techAssignments || []);
        return NextResponse.json({ assignments: enriched });
      }
    }

    const enriched = await enrichAssignments(assignments || []);
    return NextResponse.json({ assignments: enriched });
  } catch (error) {
    console.error("Fetch assignments error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function enrichAssignments(assignments: Record<string, unknown>[]) {
  const reportIds = [...new Set(assignments.map((a) => a.report_id as string))];
  const techIds = [...new Set(assignments.map((a) => a.technician_id as string))];

  const [reportsRes, techsRes] = await Promise.all([
    reportIds.length > 0
      ? supabaseAdmin.from("reports").select("*").in("id", reportIds)
      : { data: [] },
    techIds.length > 0
      ? supabaseAdmin.from("technicians").select("*").in("id", techIds)
      : { data: [] },
  ]);

  const reportsMap = new Map((reportsRes.data || []).map((r: Record<string, unknown>) => [r.id, r]));
  const techsMap = new Map((techsRes.data || []).map((t: Record<string, unknown>) => [t.id, t]));

  return assignments.map((a) => ({
    ...a,
    report: reportsMap.get(a.report_id as string) || null,
    technician: techsMap.get(a.technician_id as string) || null,
  }));
}

export async function POST(request: Request) {
  try {
    const { report_id, technician_id, assigned_by = "manager", notes } = await request.json();

    if (!report_id || !technician_id) {
      return NextResponse.json(
        { error: "report_id and technician_id required" },
        { status: 400 }
      );
    }

    const { data: assignment, error } = await supabaseAdmin
      .from("assignments")
      .insert({
        report_id,
        technician_id,
        assigned_by,
        notes,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update report status
    await supabaseAdmin
      .from("reports")
      .update({ status: "dispatched" })
      .eq("id", report_id);

    // Send email to technician
    try {
      const { data: tech } = await supabaseAdmin
        .from("technicians")
        .select("*")
        .eq("id", technician_id)
        .single();

      const { data: report } = await supabaseAdmin
        .from("reports")
        .select("*")
        .eq("id", report_id)
        .single();

      if (tech && report) {
        await sendAssignmentEmail(
          tech.email,
          tech.name,
          report as Report
        );
      }
    } catch (emailErr) {
      console.error("Assignment email failed:", emailErr);
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("Create assignment error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
