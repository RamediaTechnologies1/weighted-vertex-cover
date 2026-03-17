import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPreventiveMaintenanceEmail } from "@/lib/email";
import { PATTERN_THRESHOLD, PATTERN_WINDOW_DAYS, PRIORITY_BASE_SCORE } from "@/lib/constants";
import type { Trade } from "@/lib/types";

export async function POST() {
  try {
    const actions: string[] = [];

    const patternCutoff = new Date();
    patternCutoff.setDate(patternCutoff.getDate() - PATTERN_WINDOW_DAYS);

    // Get all non-duplicate reports within the pattern window
    const { data: recentReports } = await supabaseAdmin
      .from("reports")
      .select("trade, building, created_at")
      .gte("created_at", patternCutoff.toISOString())
      .is("duplicate_of", null);

    if (!recentReports || recentReports.length === 0) {
      return NextResponse.json({ success: true, actions: ["No recent reports to analyze"], work_orders: [] });
    }

    // Count by trade
    const tradeCounts: Record<string, { count: number; buildings: Set<string> }> = {};
    for (const r of recentReports) {
      const trade = r.trade as string;
      if (!tradeCounts[trade]) {
        tradeCounts[trade] = { count: 0, buildings: new Set() };
      }
      tradeCounts[trade].count++;
      tradeCounts[trade].buildings.add(r.building);
    }

    // Find patterns that exceed threshold
    const patterns = Object.entries(tradeCounts).filter(
      ([, data]) => data.count >= PATTERN_THRESHOLD
    );

    if (patterns.length === 0) {
      return NextResponse.json({ success: true, actions: ["No patterns above threshold"], work_orders: [] });
    }

    const workOrders: { trade: string; count: number; buildings: string[] }[] = [];

    for (const [trade, data] of patterns) {
      const buildings = Array.from(data.buildings);

      // Check if we already generated a preventive WO for this trade recently (within 30 days)
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 30);

      const { data: existingPM } = await supabaseAdmin
        .from("reports")
        .select("id")
        .eq("trade", trade)
        .like("description", "%[Preventive Maintenance]%")
        .gte("created_at", recentCutoff.toISOString())
        .limit(1);

      if (existingPM && existingPM.length > 0) {
        actions.push(`Skipped ${trade}: preventive WO already exists within 30 days`);
        continue;
      }

      // Auto-generate a preventive maintenance work order
      const urgencyScore = (PRIORITY_BASE_SCORE["high"] ?? 7) + 3; // high base + safety bonus

      const { data: pmReport, error } = await supabaseAdmin
        .from("reports")
        .insert({
          building: buildings[0], // Primary building
          room: "",
          floor: "",
          latitude: null,
          longitude: null,
          description: `[Preventive Maintenance] Pattern detected: ${data.count} ${trade.replace("_", " ")} reports across ${buildings.join(", ")} in the last ${PATTERN_WINDOW_DAYS} days. Auto-generated inspection work order.`,
          photo_base64: null,
          trade: trade as Trade,
          priority: "high",
          ai_description: `Preventive maintenance required: ${data.count} ${trade.replace("_", " ")} incidents detected across ${buildings.length} building(s) in ${PATTERN_WINDOW_DAYS} days. This pattern suggests a systemic issue requiring proactive inspection.`,
          suggested_action: `Schedule a comprehensive ${trade.replace("_", " ")} inspection across: ${buildings.join(", ")}. Check for root causes such as aging infrastructure, seasonal factors, or material degradation. Create a preventive maintenance schedule to prevent future incidents.`,
          safety_concern: trade === "electrical" || trade === "structural" || trade === "safety_hazard",
          estimated_cost: "$500-2000",
          estimated_time: "4-8 hours",
          confidence_score: 0.9,
          status: "dispatched",
          upvote_count: data.count,
          urgency_score: urgencyScore,
          duplicate_of: null,
          email_sent: false,
          reporter_email: null,
          reporter_name: "Preventive Maintenance Engine",
        })
        .select()
        .single();

      if (error) {
        console.error(`[preventive] Failed to create WO for ${trade}:`, error);
        continue;
      }

      // Auto-assign to best technician
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
          : "http://localhost:3000";

        // Direct assignment logic (avoid circular fetch)
        const { data: techs } = await supabaseAdmin
          .from("technicians")
          .select("*")
          .eq("is_available", true)
          .eq("trade", trade);

        if (techs && techs.length > 0) {
          await supabaseAdmin
            .from("assignments")
            .insert({
              report_id: pmReport.id,
              technician_id: techs[0].id,
              assigned_by: "preventive_maintenance_engine",
              status: "pending",
              notes: `Preventive maintenance: ${data.count} ${trade} incidents in ${PATTERN_WINDOW_DAYS} days. Inspect: ${buildings.join(", ")}`,
            });
        }
      } catch { /* non-fatal */ }

      // Send notification email
      try {
        await sendPreventiveMaintenanceEmail({
          trade,
          count: data.count,
          buildings,
          windowDays: PATTERN_WINDOW_DAYS,
        });
      } catch { /* non-fatal */ }

      workOrders.push({ trade, count: data.count, buildings });
      actions.push(`Created preventive WO for ${trade}: ${data.count} incidents across ${buildings.join(", ")}`);
    }

    return NextResponse.json({
      success: true,
      actions,
      work_orders: workOrders,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/preventive-maintenance]", error);
    return NextResponse.json({ error: "Preventive maintenance engine failed" }, { status: 500 });
  }
}
