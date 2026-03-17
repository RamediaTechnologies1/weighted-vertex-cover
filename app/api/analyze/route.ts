import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photo_base64 } = body;

    if (!photo_base64) {
      return NextResponse.json(
        { error: "photo_base64 is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeImage(photo_base64);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[/api/analyze]", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
