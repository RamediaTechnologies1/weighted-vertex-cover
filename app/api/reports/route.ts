import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PATTERN_THRESHOLD, PATTERN_WINDOW_DAYS } from "@/lib/constants";
import type { Trade } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const trade = searchParams.get("trade");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    let query = supabaseAdmin
      .from("reports")
      .select("*")
      .order("urgency_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }
    if (trade) {
      query = query.eq("trade", trade);
    }

    const { data: reports, error } = await query;

    if (error) throw error;

    // --- Pattern detection ---
    const patternCutoff = new Date();
    patternCutoff.setDate(patternCutoff.getDate() - PATTERN_WINDOW_DAYS);

    const { data: recentReports } = await supabaseAdmin
      .from("reports")
      .select("trade")
      .gte("created_at", patternCutoff.toISOString())
      .is("duplicate_of", null);

    const tradeCounts: Partial<Record<Trade, number>> = {};
    for (const r of recentReports ?? []) {
      tradeCounts[r.trade as Trade] = (tradeCounts[r.trade as Trade] ?? 0) + 1;
    }

    const preventiveAlerts = (Object.entries(tradeCounts) as [Trade, number][])
      .filter(([, count]) => count >= PATTERN_THRESHOLD)
      .map(([trade, count]) => ({
        trade,
        count,
        message: `Pattern detected: ${count} ${trade.replace("_", " ")} issues in the last ${PATTERN_WINDOW_DAYS} days. Consider preventive maintenance.`,
      }));

    return NextResponse.json({ reports, preventive_alerts: preventiveAlerts });
  } catch (error) {
    console.error("[/api/reports]", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
