import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface VoiceCommandRequest {
  command: string;
  image?: string; // base64 image for vision queries
  context: {
    technicianName: string;
    currentJobs: {
      id: string;
      assignmentId: string;
      status: string;
      building: string;
      room: string;
      trade: string;
      priority: string;
      description: string;
      aiDescription: string;
      suggestedAction: string;
    }[];
  };
}

export async function POST(request: Request) {
  try {
    const { command, image, context } = (await request.json()) as VoiceCommandRequest;

    if (!command) {
      return NextResponse.json({ error: "Command required" }, { status: 400 });
    }

    const jobsSummary = context.currentJobs
      .map(
        (j, i) =>
          `Job ${i + 1} (${j.status}): ${j.trade} issue in ${j.building} ${j.room ? "room " + j.room : ""}. Priority: ${j.priority}. ${j.aiDescription || j.description}. Suggested action: ${j.suggestedAction || "Not specified"}.`
      )
      .join("\n");

    const systemPrompt = `You are FixIt AI, a voice assistant for campus maintenance technicians at the University of Delaware. You speak through smart glasses.

RULES:
- Keep responses SHORT (2-4 sentences max) — technician is working hands-free
- Be direct and practical — give actionable repair guidance
- Reference specific job details when relevant
- If an image is provided, analyze it carefully and give practical repair advice
- If asked for help on a repair, give clear step-by-step guidance
- If you see a safety hazard in an image, warn the technician immediately
- If the command is unclear, ask a brief clarifying question

TECHNICIAN: ${context.technicianName}

CURRENT ASSIGNED JOBS:
${jobsSummary || "No jobs currently assigned."}`;

    // Build messages with optional image
    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [];

    if (image) {
      userContent.push({
        type: "image_url",
        image_url: { url: image, detail: "low" },
      });
      userContent.push({
        type: "text",
        text: command || "What do you see? How should I fix this?",
      });
    } else {
      userContent.push({ type: "text", text: command });
    }

    const completion = await openai.chat.completions.create({
      model: image ? "gpt-4o" : "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "Sorry, I didn't catch that.";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Voice command error:", error);
    return NextResponse.json(
      { error: "Failed to process voice command" },
      { status: 500 }
    );
  }
}
