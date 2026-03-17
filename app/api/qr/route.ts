import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const building = req.nextUrl.searchParams.get("building") || "";
  const floor = req.nextUrl.searchParams.get("floor") || "";
  const room = req.nextUrl.searchParams.get("room") || "";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const reportUrl = `${baseUrl}/user?building=${encodeURIComponent(building)}&floor=${encodeURIComponent(floor)}&room=${encodeURIComponent(room)}`;

  return NextResponse.json({ url: reportUrl, building, floor, room });
}
