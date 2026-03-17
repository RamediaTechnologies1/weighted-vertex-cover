import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("fixit_session")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: session, error } = await supabaseAdmin
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (error || !session) {
      const response = NextResponse.json(
        { error: "Session expired" },
        { status: 401 }
      );
      response.cookies.delete("fixit_session");
      return response;
    }

    return NextResponse.json({
      email: session.email,
      role: session.role,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get("fixit_session")?.value;

    if (sessionId) {
      await supabaseAdmin.from("sessions").delete().eq("id", sessionId);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("fixit_session");
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
