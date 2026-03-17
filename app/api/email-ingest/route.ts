import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendDispatchEmail } from "@/lib/email";
import { PRIORITY_BASE_SCORE, UDEL_BUILDINGS } from "@/lib/constants";
import type { Report, AIAnalysis, Trade, Priority } from "@/lib/types";

// AI parses an email body into structured maintenance report data
const EMAIL_PARSE_PROMPT = `You are a campus maintenance AI. Parse this email into a structured maintenance report. Return ONLY valid JSON:
{
  "building": "exact building name from this list: Gore Hall, Smith Hall, Memorial Hall, Perkins Student Center, Morris Library, Trabant University Center, ISE Lab, Evans Hall, Brown Lab, Colburn Lab, Spencer Lab, DuPont Hall, Sharp Lab, Purnell Hall, Kirkbride Hall, Mitchell Hall, Willard Hall, STAR Campus, Carpenter Sports Building, Christiana Towers, Campus Center",
  "room": "room number if mentioned, empty string if not",
  "floor": "floor number if mentioned, empty string if not",
  "trade": "plumbing|electrical|hvac|structural|custodial|landscaping|safety_hazard",
  "priority": "critical|high|medium|low",
  "description": "clean summary of the issue",
  "suggested_action": "what maintenance should do",
  "safety_concern": true or false,
  "estimated_cost": "$X-Y range",
  "estimated_time": "repair time estimate",
  "confidence_score": 0.0 to 1.0,
  "safety_risks": ["none"],
  "safety_score": 0 to 10,
  "risk_escalation": "what happens if not fixed"
}

If the building name doesn't exactly match the list, pick the closest match. If no building is mentioned, use "Campus Center" as default.
Determine priority based on safety impact: water/electrical/structural issues that pose immediate danger = critical. Broken fixtures = medium. Cosmetic = low.`;

async function parseEmailWithAI(emailBody: string, subject: string): Promise<AIAnalysis & { building: string; room: string; floor: string }> {
  const fullText = `Subject: ${subject}\n\nBody: ${emailBody}`;

  // Try Groq first (fastest), then OpenAI, then fallback to defaults
  const providers = [
    async () => {
      if (!process.env.GROQ_API_KEY) throw new Error("no key");
      const { default: Groq } = await import("groq-sdk");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const res = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: EMAIL_PARSE_PROMPT },
          { role: "user", content: fullText },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });
      return JSON.parse(res.choices[0].message.content || "{}");
    },
    async () => {
      if (!process.env.OPENAI_API_KEY) throw new Error("no key");
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: EMAIL_PARSE_PROMPT },
          { role: "user", content: fullText },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });
      return JSON.parse(res.choices[0].message.content || "{}");
    },
  ];

  for (const provider of providers) {
    try {
      return await provider();
    } catch {
      continue;
    }
  }

  // Fallback: basic keyword extraction
  const text = fullText.toLowerCase();
  const trade: Trade = text.includes("leak") || text.includes("water") || text.includes("pipe") ? "plumbing"
    : text.includes("electric") || text.includes("wire") || text.includes("outlet") ? "electrical"
    : text.includes("heat") || text.includes("cold") || text.includes("hvac") || text.includes("air") ? "hvac"
    : text.includes("crack") || text.includes("structural") || text.includes("ceiling") ? "structural"
    : text.includes("clean") || text.includes("trash") || text.includes("spill") ? "custodial"
    : "safety_hazard";

  return {
    building: "Campus Center",
    room: "",
    floor: "",
    trade,
    priority: "medium" as Priority,
    description: subject || emailBody.slice(0, 200),
    suggested_action: `Investigate ${trade} issue reported via email.`,
    safety_concern: text.includes("danger") || text.includes("hazard") || text.includes("urgent"),
    estimated_cost: "$50-200",
    estimated_time: "1-2 hours",
    confidence_score: 0.5,
  };
}

function calcUrgencyScore(priority: string, safetyConcern: boolean): number {
  const base = PRIORITY_BASE_SCORE[priority] ?? 1;
  return base + (safetyConcern ? 3 : 0);
}

export async function POST(req: NextRequest) {
  try {
    const { from, subject, body, html } = await req.json();

    if (!body && !html) {
      return NextResponse.json({ error: "Email body is required" }, { status: 400 });
    }

    const emailText = body || html?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || "";
    const senderEmail = from || null;

    // Parse with AI
    const parsed = await parseEmailWithAI(emailText, subject || "");

    // Find building coords
    const bldg = UDEL_BUILDINGS.find((b) => b.name === parsed.building);
    const lat = bldg?.lat ?? 39.6795;
    const lng = bldg?.lng ?? -75.7528;

    const urgencyScore = calcUrgencyScore(parsed.priority, parsed.safety_concern);

    // Insert report
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .insert({
        building: parsed.building,
        room: parsed.room || "",
        floor: parsed.floor || "",
        latitude: lat,
        longitude: lng,
        description: `[Via Email] ${emailText.slice(0, 500)}`,
        photo_base64: null,
        trade: parsed.trade,
        priority: parsed.priority,
        ai_description: parsed.description,
        suggested_action: parsed.suggested_action,
        safety_concern: parsed.safety_concern,
        estimated_cost: parsed.estimated_cost || "$50-200",
        estimated_time: parsed.estimated_time || "1-2 hours",
        confidence_score: parsed.confidence_score || 0.6,
        status: "dispatched",
        upvote_count: 0,
        urgency_score: urgencyScore,
        duplicate_of: null,
        email_sent: false,
        reporter_email: senderEmail,
        reporter_name: null,
      })
      .select()
      .single();

    if (error) throw error;

    // Send dispatch email
    let emailSent = false;
    try {
      await sendDispatchEmail(report as Report);
      emailSent = true;
      await supabaseAdmin
        .from("reports")
        .update({ email_sent: true, dispatched_at: new Date().toISOString() })
        .eq("id", report.id);
    } catch { /* non-fatal */ }

    // Auto-assign
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
    } catch { /* non-fatal */ }

    return NextResponse.json({
      success: true,
      report,
      email_sent: emailSent,
      assignment,
      source: "email_ingestion",
      parsed_fields: {
        building: parsed.building,
        trade: parsed.trade,
        priority: parsed.priority,
        safety_concern: parsed.safety_concern,
      },
    });
  } catch (error) {
    console.error("[/api/email-ingest]", error);
    return NextResponse.json({ error: "Email ingestion failed" }, { status: 500 });
  }
}
