import { NextRequest, NextResponse } from "next/server";

// Master automation endpoint — runs all engines in sequence
// Can be called by a cron job (Vercel Cron, external scheduler, or manual trigger)
export async function POST(req: NextRequest) {
  try {
    const baseUrl = req.nextUrl.origin;
    const results: Record<string, unknown> = {};

    // 1. Run escalation engine
    try {
      const res = await fetch(`${baseUrl}/api/escalation`, { method: "POST" });
      results.escalation = await res.json();
    } catch (e) {
      results.escalation = { error: String(e) };
    }

    // 2. Run job batching engine
    try {
      const res = await fetch(`${baseUrl}/api/batch-jobs`, { method: "POST" });
      results.batch_jobs = await res.json();
    } catch (e) {
      results.batch_jobs = { error: String(e) };
    }

    // 3. Run preventive maintenance engine
    try {
      const res = await fetch(`${baseUrl}/api/preventive-maintenance`, { method: "POST" });
      results.preventive_maintenance = await res.json();
    } catch (e) {
      results.preventive_maintenance = { error: String(e) };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      engines: results,
    });
  } catch (error) {
    console.error("[/api/automation]", error);
    return NextResponse.json({ error: "Automation hub failed" }, { status: 500 });
  }
}

// GET endpoint for checking automation status / last run
export async function GET() {
  return NextResponse.json({
    engines: [
      { name: "Escalation Engine", endpoint: "/api/escalation", description: "Auto-reassigns unaccepted jobs, notifies managers on SLA breaches" },
      { name: "Job Batching Engine", endpoint: "/api/batch-jobs", description: "Groups same-building same-trade reports into efficient batched work orders" },
      { name: "Email Ingestion", endpoint: "/api/email-ingest", description: "Parses incoming fixit@udel.edu emails into structured AI-classified reports" },
      { name: "Preventive Maintenance", endpoint: "/api/preventive-maintenance", description: "Auto-generates inspection work orders when report patterns are detected" },
      { name: "Follow-up Notifications", endpoint: "Built into /api/assignments/[id]", description: "Auto-emails reporters when their report status changes" },
    ],
    trigger: "POST /api/automation to run all engines",
  });
}
