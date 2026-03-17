import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const available = searchParams.get("available");
    const trade = searchParams.get("trade");

    let query = supabaseAdmin.from("technicians").select("*");

    if (available === "true") query = query.eq("is_available", true);
    if (trade) query = query.eq("trade", trade);

    const { data, error } = await query.order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ technicians: data });
  } catch (error) {
    console.error("Fetch technicians error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, trade, assigned_buildings, phone } = body;

    if (!name || !email || !trade) {
      return NextResponse.json(
        { error: "Name, email, and trade are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("technicians")
      .insert({
        name,
        email,
        trade,
        assigned_buildings: assigned_buildings || [],
        phone: phone || null,
        is_available: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A technician with this email already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ technician: data }, { status: 201 });
  } catch (error) {
    console.error("Create technician error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
