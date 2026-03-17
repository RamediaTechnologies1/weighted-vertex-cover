import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowed = [
      "name", "email", "trade", "assigned_buildings",
      "is_available", "phone", "current_location",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("technicians")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ technician: data });
  } catch (error) {
    console.error("Update technician error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check for active assignments
    const { data: activeAssignments } = await supabaseAdmin
      .from("assignments")
      .select("id")
      .eq("technician_id", id)
      .in("status", ["pending", "accepted", "in_progress"]);

    if (activeAssignments && activeAssignments.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${activeAssignments.length} active assignment(s)` },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin
      .from("technicians")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete technician error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
