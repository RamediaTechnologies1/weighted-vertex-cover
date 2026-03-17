import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendDispatchEmail } from "@/lib/email";
import { PRIORITY_BASE_SCORE, DEDUP_WINDOW_DAYS, UDEL_BUILDINGS } from "@/lib/constants";
import type { Report, SubmitReportPayload } from "@/lib/types";

function calcUrgencyScore(report: {
  priority: string;
  upvote_count: number;
  safety_concern: boolean;
}): number {
  const base = PRIORITY_BASE_SCORE[report.priority] ?? 1;
  return base + report.upvote_count * 1.5 + (report.safety_concern ? 3 : 0);
}

export async function POST(req: NextRequest) {
  try {
    const payload: SubmitReportPayload = await req.json();

    const {
      building,
      room,
      floor,
      latitude,
      longitude,
      description,
      photo_base64,
      reporter_email,
      reporter_name,
      ai_analysis,
      anonymous,
    } = payload;

    // If anonymous, strip reporter identity
    const effectiveReporterEmail = anonymous ? null : (reporter_email ?? null);
    const effectiveReporterName = anonymous ? "Anonymous Reporter" : (reporter_name ?? null);

    if (!building || !ai_analysis) {
      return NextResponse.json(
        { error: "building and ai_analysis are required" },
        { status: 400 }
      );
    }

    // Look up building coordinates if not provided
    const bldg = UDEL_BUILDINGS.find((b) => b.name === building);
    const lat = latitude ?? bldg?.lat ?? 39.6795;
    const lng = longitude ?? bldg?.lng ?? -75.7528;

    // --- Deduplication check ---
    const dedupCutoff = new Date();
    dedupCutoff.setDate(dedupCutoff.getDate() - DEDUP_WINDOW_DAYS);

    const { data: existingRows } = await supabaseAdmin
      .from("reports")
      .select("id, upvote_count")
      .eq("building", building)
      .eq("trade", ai_analysis.trade)
      .neq("status", "resolved")
      .gte("created_at", dedupCutoff.toISOString())
      .is("duplicate_of", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const existing = existingRows?.[0] ?? null;

    if (existing) {
      // Increment upvote on the original
      const newUpvotes = (existing.upvote_count ?? 0) + 1;
      await supabaseAdmin
        .from("reports")
        .update({
          upvote_count: newUpvotes,
          urgency_score: calcUrgencyScore({
            priority: ai_analysis.priority,
            upvote_count: newUpvotes,
            safety_concern: ai_analysis.safety_concern,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      // Save as duplicate
      const { data: dupReport, error: dupError } = await supabaseAdmin
        .from("reports")
        .insert({
          building,
          room: room ?? "",
          floor: floor ?? "",
          latitude: lat,
          longitude: lng,
          description,
          photo_base64,
          trade: ai_analysis.trade,
          priority: ai_analysis.priority,
          ai_description: ai_analysis.description,
          suggested_action: ai_analysis.suggested_action,
          safety_concern: ai_analysis.safety_concern,
          estimated_cost: ai_analysis.estimated_cost,
          estimated_time: ai_analysis.estimated_time,
          confidence_score: ai_analysis.confidence_score,
          status: "submitted",
          upvote_count: 0,
          urgency_score: 0,
          duplicate_of: existing.id,
          email_sent: false,
          reporter_email: effectiveReporterEmail,
          reporter_name: effectiveReporterName,
        })
        .select()
        .single();

      if (dupError) throw dupError;

      return NextResponse.json({
        report: dupReport,
        deduplicated: true,
        original_id: existing.id,
      });
    }

    // --- New unique report ---
    const urgency_score = calcUrgencyScore({
      priority: ai_analysis.priority,
      upvote_count: 0,
      safety_concern: ai_analysis.safety_concern,
    });

    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .insert({
        building,
        room: room ?? "",
        floor: floor ?? "",
        latitude: lat,
        longitude: lng,
        description,
        photo_base64,
        trade: ai_analysis.trade,
        priority: ai_analysis.priority,
        ai_description: ai_analysis.description,
        suggested_action: ai_analysis.suggested_action,
        safety_concern: ai_analysis.safety_concern,
        estimated_cost: ai_analysis.estimated_cost,
        estimated_time: ai_analysis.estimated_time,
        confidence_score: ai_analysis.confidence_score,
        status: "dispatched",
        upvote_count: 0,
        urgency_score,
        duplicate_of: null,
        email_sent: false,
        reporter_email: effectiveReporterEmail,
        reporter_name: effectiveReporterName,
      })
      .select()
      .single();

    if (error) throw error;

    // --- Send dispatch email ---
    let emailSent = false;
    try {
      await sendDispatchEmail(report as Report);
      emailSent = true;
      await supabaseAdmin
        .from("reports")
        .update({ email_sent: true, dispatched_at: new Date().toISOString() })
        .eq("id", report.id);
    } catch (emailError) {
      console.error("[/api/report] Email failed:", emailError);
    }

    // --- AI auto-assign to best technician ---
    let assignment = null;
    try {
      const baseUrl = req.nextUrl.origin;
      const assignRes = await fetch(`${baseUrl}/api/ai-assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_id: report.id }),
      });
      if (assignRes.ok) {
        assignment = await assignRes.json();
      }
    } catch (assignError) {
      console.error("[/api/report] Auto-assign failed:", assignError);
    }

    // Auto-escalation for critical safety issues
    if (ai_analysis.safety_concern && ai_analysis.priority === "critical") {
      try {
        const { sendEscalationEmail } = await import("@/lib/email");
        await sendEscalationEmail({
          to: "safety@facilities.udel.edu",
          subject: `🚨 CRITICAL SAFETY ESCALATION: ${building}${room ? ` Room ${room}` : ""}`,
          text: `CRITICAL SAFETY ALERT — IMMEDIATE ACTION REQUIRED\n\nBuilding: ${building}\nRoom: ${room || "N/A"}\nFloor: ${floor || "N/A"}\n\nAI Assessment: ${ai_analysis.description}\nRecommended Action: ${ai_analysis.suggested_action}\n${ai_analysis.risk_escalation ? `\nRisk if unfixed: ${ai_analysis.risk_escalation}` : ""}\n\nThis report was automatically escalated because it was classified as a critical safety hazard by our AI system.\n\nReport ID: ${report.id}`,
          html: `<div style="font-family: -apple-system, sans-serif; max-width: 600px;">
            <div style="background: #ef4444; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">🚨 CRITICAL SAFETY ESCALATION</h2>
            </div>
            <div style="background: #111; color: #ccc; padding: 20px; border: 1px solid #333; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #ef4444; font-weight: bold; font-size: 16px; margin-top: 0;">${building}${room ? `, Room ${room}` : ""}</p>
              <p><strong>AI Assessment:</strong> ${ai_analysis.description}</p>
              <p><strong>Recommended Action:</strong> ${ai_analysis.suggested_action}</p>
              ${ai_analysis.risk_escalation ? `<p style="color: #f97316;"><strong>⚠ Risk if unfixed:</strong> ${ai_analysis.risk_escalation}</p>` : ""}
              <hr style="border-color: #333;">
              <p style="font-size: 12px; color: #666;">Auto-escalated by FixIt AI Safety System • Report #${report.id.slice(0, 8)}</p>
            </div>
          </div>`,
        });
        console.log("[/api/report] Critical safety escalation email sent");
      } catch (escErr) {
        console.error("[/api/report] Escalation email failed:", escErr);
      }
    }

    return NextResponse.json({ report, deduplicated: false, email_sent: emailSent, assignment });
  } catch (error) {
    console.error("[/api/report]", error);
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 }
    );
  }
}
