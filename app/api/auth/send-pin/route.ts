import { NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPinEmail } from "@/lib/email";
import { PIN_LENGTH, PIN_EXPIRY_MINUTES } from "@/lib/constants";
import type { UserRole } from "@/lib/types";

const VALID_ROLES: UserRole[] = ["manager", "technician", "user"];

export async function POST(request: Request) {
  try {
    const { email, role } = await request.json();

    if (!email || !role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Valid email and role required" },
        { status: 400 }
      );
    }

    // Generate PIN
    const pin = String(randomInt(10 ** (PIN_LENGTH - 1), 10 ** PIN_LENGTH));
    const pinHash = createHash("sha256").update(pin).digest("hex");

    // Delete any existing PINs for this email+role
    await supabaseAdmin
      .from("auth_pins")
      .delete()
      .eq("email", email)
      .eq("role", role);

    // Save hashed PIN
    const expiresAt = new Date(
      Date.now() + PIN_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("auth_pins")
      .insert({ email, role, pin_hash: pinHash, expires_at: expiresAt });

    if (insertError) {
      console.error("Failed to save PIN:", insertError);
      return NextResponse.json(
        { error: "Failed to generate PIN" },
        { status: 500 }
      );
    }

    // Send PIN via email
    await sendPinEmail(email, pin, role);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send PIN error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
