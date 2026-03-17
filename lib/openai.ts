import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIAnalysis } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const VISION_PROMPT = `You are a campus safety and maintenance AI inspector. Analyze this image and return ONLY valid JSON with no markdown, no code blocks, no extra text:
{
  "trade": "plumbing|electrical|hvac|structural|custodial|landscaping|safety_hazard",
  "priority": "critical|high|medium|low",
  "description": "Brief description of the issue",
  "suggested_action": "What the maintenance team should do",
  "safety_concern": true or false,
  "estimated_cost": "$X-Y range",
  "estimated_time": "repair time estimate",
  "confidence_score": 0.0 to 1.0,
  "safety_risks": ["slip_fall","fire_hazard","electrical_shock","structural_failure","water_damage","air_quality","security_vulnerability","chemical_exposure","none"],
  "safety_score": 0 to 10,
  "affected_population": "high_traffic|residential|laboratory|office|common_area",
  "risk_escalation": "What happens if this issue is NOT fixed"
}

Trade definitions:
- plumbing: leaks, flooding, broken pipes, clogged drains, bathroom fixtures
- electrical: exposed wires, broken outlets, lighting failures, power issues
- hvac: heating/cooling failures, ventilation problems, thermostat issues
- structural: cracks, broken doors/windows, damaged walls, flooring issues
- custodial: spills, trash overflow, cleaning needed
- landscaping: tree damage, pathway issues, outdoor maintenance
- safety_hazard: immediate danger, fire hazards, trip hazards, biohazards

Priority definitions:
- critical: immediate safety risk, must fix within hours
- high: significant issue affecting many people, fix within 24h
- medium: noticeable problem, fix within a week
- low: minor cosmetic issue, fix when convenient

Safety risk taxonomy — include ALL that apply in the safety_risks array:
- slip_fall: wet floors, uneven surfaces, debris in walkways, broken railings
- fire_hazard: exposed wiring, blocked exits, faulty equipment, flammable materials
- electrical_shock: exposed wires, water near electrical, damaged outlets
- structural_failure: cracks in load-bearing elements, ceiling damage, foundation issues
- water_damage: active leaks, flooding, mold potential, ceiling stains
- air_quality: mold, gas leaks, poor ventilation, chemical fumes
- security_vulnerability: broken locks, damaged doors/windows, broken cameras/lighting
- chemical_exposure: spills, fumes, improper storage
- none: no safety risks identified

safety_score: Rate overall safety risk 0 (no risk) to 10 (immediate life-threatening danger)
affected_population: Estimate based on typical campus building usage
risk_escalation: Describe the realistic worst-case if this goes unfixed for 2 weeks`;

function parseJSON(raw: string): AIAnalysis {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(cleaned);
}

async function analyzeWithOpenAI(imageData: string): Promise<AIAnalysis> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}`, detail: "low" } },
        ],
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  return parseJSON(content);
}

async function analyzeWithClaude(imageData: string): Promise<AIAnalysis> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageData } },
          { type: "text", text: VISION_PROMPT },
        ],
      },
    ],
  });
  const block = response.content[0];
  if (block.type !== "text") throw new Error("No text response from Claude");
  return parseJSON(block.text);
}

async function analyzeWithGemini(imageData: string): Promise<AIAnalysis> {
  const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent([
    VISION_PROMPT,
    { inlineData: { mimeType: "image/jpeg", data: imageData } },
  ]);
  const content = result.response.text();
  if (!content) throw new Error("No response from Gemini");
  return parseJSON(content);
}

async function analyzeWithGroq(imageData: string): Promise<AIAnalysis> {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageData}` } },
        ],
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from Groq");
  return parseJSON(content);
}

type Provider = { name: string; fn: (data: string) => Promise<AIAnalysis> };

export async function analyzeImage(base64Image: string): Promise<AIAnalysis> {
  const imageData = base64Image.replace(/^data:image\/\w+;base64,/, "");

  // Build provider chain in priority order: OpenAI > Claude > Gemini > Groq
  const providers: Provider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push({ name: "OpenAI", fn: analyzeWithOpenAI });
  if (process.env.ANTHROPIC_API_KEY) providers.push({ name: "Claude", fn: analyzeWithClaude });
  if (process.env.GEMINI_API_KEY) providers.push({ name: "Gemini", fn: analyzeWithGemini });
  if (process.env.GROQ_API_KEY) providers.push({ name: "Groq", fn: analyzeWithGroq });

  if (providers.length === 0) {
    throw new Error("No AI provider configured. Set at least one: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or GROQ_API_KEY.");
  }

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      console.log(`[AI] Trying ${provider.name}...`);
      const result = await provider.fn(imageData);
      console.log(`[AI] ${provider.name} succeeded`);
      return result;
    } catch (err) {
      lastError = err as Error;
      console.warn(`[AI] ${provider.name} failed: ${lastError.message}`);
    }
  }

  throw lastError!;
}
