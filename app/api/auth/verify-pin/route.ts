import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SESSION_EXPIRY_HOURS } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["manager", "technician", "user"];

export async function POST(request: Request) {
  try {
    const { email, pin, role } = await request.json();

    if (!email || !pin || !role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Email, PIN, and role required" },
        { status: 400 }
      );
    }

    const pinHash = createHash("sha256").update(pin).digest("hex");

    // Look up matching PIN
    const { data: pins, error: lookupError } = await supabaseAdmin
      .from("auth_pins")
      .select("*")
      .eq("email", email)
      .eq("role", role)
      .eq("pin_hash", pinHash)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (lookupError || !pins || pins.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired PIN" },
        { status: 401 }
      );
    }

    // Create session
    const expiresAt = new Date(
      Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("sessions")
      .insert({ email, role, expires_at: expiresAt })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Delete used PIN
    await supabaseAdmin
      .from("auth_pins")
      .delete()
      .eq("email", email)
      .eq("role", role);

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      role,
      email,
    });

    response.cookies.set("fixit_session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Verify PIN error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
